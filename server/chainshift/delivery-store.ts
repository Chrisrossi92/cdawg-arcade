import {createHash} from 'node:crypto';
import type {Database,SqlConnection} from '../database/pool.js';
import {schemaStatus} from '../database/migrations.js';
import {chainshiftReady} from './privileges.js';
import {approvedChannel,type LiveDeliveryConfig} from './live-config.js';
import {validPublication} from './publication.js';
import {dailyProjection,dailyActivityMessage,type DailyProjection} from './projections.js';
import {DeliveryError,matchesPayload,dailyMessageDigest,type DailyTransport} from './discord-delivery.js';
export const deliveryHash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const deliveryMutableColumns=['state','message_id','digest','revision','update_key','last_error','failures','next_attempt_at','create_attempted_at','reconciled_at','checked_at'] as const;
export async function grantDeliveryRights(c:SqlConnection){
 await c.query('GRANT SELECT,INSERT ON arcade.chainshift_daily_messages TO arcade_session_runtime');
 await c.query(`GRANT UPDATE(${deliveryMutableColumns.join(',')}) ON arcade.chainshift_daily_messages TO arcade_session_runtime`);
}
export async function deliveryReady(c:SqlConnection){
 if(await schemaStatus(c)!=='compatible'||!await chainshiftReady(c))return false;
 const r=(await c.query(`SELECT
 EXISTS(SELECT 1 FROM arcade.schema_migrations WHERE version=3) AND
 EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid='arcade.chainshift_daily_messages'::regclass AND t.tgname='guard_chainshift_delivery' AND t.tgenabled='O') AND
 has_table_privilege(current_user,'arcade.chainshift_daily_messages','SELECT') AND
 has_table_privilege(current_user,'arcade.chainshift_daily_messages','INSERT') AND
 NOT EXISTS(SELECT 1 FROM unnest($1::text[]) col WHERE NOT has_column_privilege(current_user,'arcade.chainshift_daily_messages',col,'UPDATE')) AS required,
 has_table_privilege(current_user,'arcade.chainshift_daily_messages','UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR
 has_any_column_privilege(current_user,'arcade.chainshift_daily_messages','REFERENCES') OR
 EXISTS(SELECT 1 FROM unnest(ARRAY['channel_id','day_key','puzzle_id','discord_guild_id','operation_key','nonce','created_at','updated_at']) col
 WHERE has_column_privilege(current_user,'arcade.chainshift_daily_messages',col,'UPDATE')) AS excessive`,[[...deliveryMutableColumns]])).rows[0];
 return r?.required===true&&r.excessive===false;
}
/** No player/session/query input. NY day and aggregate facts are selected in the same DB snapshot. */
export async function currentDeliveryFacts(c:SqlConnection,fixtureDay?:string):Promise<DailyProjection>{
 const p=(await c.query(`SELECT p.*,p.day_key::text AS day_key,
 (SELECT count(*)::text FROM arcade.chainshift_attempts a WHERE a.puzzle_id=p.puzzle_id AND a.state='completed') AS completions,
 (SELECT min(final_shifts) FROM arcade.chainshift_attempts a WHERE a.puzzle_id=p.puzzle_id AND a.state='completed') AS shortest,
 (SELECT elapsed_ms::text FROM arcade.chainshift_attempts a WHERE a.puzzle_id=p.puzzle_id AND a.state='completed' ORDER BY final_shifts,elapsed_ms LIMIT 1) AS fastest
 FROM arcade.chainshift_puzzles p WHERE day_key=COALESCE($1::date,(clock_timestamp() AT TIME ZONE 'America/New_York')::date)`,[fixtureDay??null])).rows[0];
 if(!p||!validPublication(p))throw new DeliveryError('invalid_configuration');
 return dailyProjection({puzzleId:p.puzzle_id,day:p.day_key,puzzleNumber:p.certificate.number,start:p.start_word,finish:p.finish_word,completedPlayers:Number(p.completions),shortestShifts:p.shortest,fastestAtShortestMs:p.fastest===null?null:Number(p.fastest)});
}
export type ReconcileState='disabled'|'unavailable'|'outside_pilot'|'busy'|'created'|'updated'|'unchanged'|'deferred'|'uncertain'|'blocked';
export interface ReconcileResult {state:ReconcileState;error?:string;messageId?:string}
/** One channel-wide session lock also serializes rollover and Discord rate-limit recovery.
 * Each intent/state write autocommits before HTTP; a crash cannot roll back the create marker. */
export class DeliveryNotDue extends Error {constructor(readonly reason:'before_post_time'|'empty_queue'){super(reason);}}
export interface DeliveryProfile {
 table:'arcade.chainshift_daily_messages'|'arcade.chainshift_authored_daily_messages';
 keyVersion:string;
 ready:(c:SqlConnection)=>Promise<boolean>;
 facts:(c:SqlConnection,day?:string)=>Promise<DailyProjection>;
 payload:typeof dailyActivityMessage;
}
const legacyProfile:DeliveryProfile={table:'arcade.chainshift_daily_messages',keyVersion:'chainshift-daily-v1',ready:deliveryReady,facts:currentDeliveryFacts,payload:dailyActivityMessage};
export class DurableDailyReconciler {
 constructor(private db:Database,private transport:DailyTransport,private config:LiveDeliveryConfig,private fixtureDay?:()=>string,private profile:DeliveryProfile=legacyProfile){approvedChannel(config.channelId);}
 async reconcile():Promise<ReconcileResult>{
  if(!await this.profile.ready(this.db))return {state:'unavailable'};
  return await this.db.exclusive('chainshift-daily:'+this.config.channelId,async c=>{
   // Channel-wide durable cooldown covers every day, worker and process restart.
   const cooldown=(await c.query(`SELECT 1 FROM ${this.profile.table} WHERE channel_id=$1 AND next_attempt_at>clock_timestamp() LIMIT 1`,[this.config.channelId])).rowCount;
   if(cooldown)return {state:'deferred'};
   let p:DailyProjection;
   try{p=await this.profile.facts(c,this.fixtureDay?.());}catch(e){if(e instanceof DeliveryNotDue)return {state:'deferred',error:e.reason};throw e;}
   if(this.config.pilotDay!==null&&p.day!==this.config.pilotDay)return {state:'outside_pilot'};
   const key=deliveryHash([this.profile.keyVersion,this.config.channelId,p.puzzleId,p.day]);
   let row=(await c.query(`SELECT * FROM ${this.profile.table} WHERE channel_id=$1 AND day_key=$2`,[this.config.channelId,p.day])).rows[0];
   if(row?.state==='blocked')return {state:'blocked',error:row.last_error};
   const guildRows=(await c.query("SELECT discord_guild_id FROM arcade.guilds WHERE status='enabled' LIMIT 1001")).rows;
   const allowed=guildRows.filter(g=>this.config.allowsGuild(g.discord_guild_id));
   if(guildRows.length>1000||allowed.length!==1)return {state:'blocked',error:'invalid_configuration'};
   const guild=allowed[0].discord_guild_id;
   await c.query(`INSERT INTO ${this.profile.table}(channel_id,day_key,puzzle_id,discord_guild_id,operation_key,nonce)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(channel_id,day_key) DO NOTHING`,[this.config.channelId,p.day,p.puzzleId,guild,key,key.slice(0,24)]);
   row=(await c.query(`SELECT *,next_attempt_at>clock_timestamp() AS deferred,checked_at IS NULL OR checked_at<clock_timestamp()-interval '10 minutes' AS verify_due FROM ${this.profile.table} WHERE channel_id=$1 AND day_key=$2`,[this.config.channelId,p.day])).rows[0];
   if(row.puzzle_id!==p.puzzleId||row.discord_guild_id!==guild||row.operation_key!==key)return {state:'blocked',error:'invalid_configuration'};
   if(row.deferred)return {state:'deferred'};
   const payload=this.profile.payload(p,this.config.applicationId),digest=dailyMessageDigest(payload);
   if(row.state==='posted'&&row.digest===digest&&!row.verify_due)return {state:'unchanged',messageId:row.message_id};
   let messageId:string|null=row.message_id,created=false,creating=false;
   try{
    if(await this.transport.validateDestination()!==guild)throw new DeliveryError('invalid_channel');
    // Sparse integrity probes detect manual deletion and repair a late/out-of-order ambiguous edit.
    if(messageId&&row.digest===digest&&matchesPayload(await this.transport.read(messageId),payload)){
     await c.query(`UPDATE ${this.profile.table} SET checked_at=clock_timestamp() WHERE channel_id=$1 AND day_key=$2`,[this.config.channelId,p.day]);
     return {state:'unchanged',messageId};
    }
    if(!messageId&&row.state==='uncertain'){
     const recovered=await this.transport.recover(row.nonce,row.create_attempted_at);
     if(!recovered)throw new DeliveryError('uncertain',300_000);
     messageId=recovered.id;
     await c.query(`UPDATE ${this.profile.table} SET state='posted',message_id=$3,last_error=NULL WHERE channel_id=$1 AND day_key=$2`,[this.config.channelId,p.day,messageId]);
    }
    if(!messageId){
     // A dead process between this commit and POST is deliberately held as uncertain, never reissued.
     await c.query(`UPDATE ${this.profile.table} SET state='uncertain',create_attempted_at=COALESCE(create_attempted_at,clock_timestamp()),last_error=NULL WHERE channel_id=$1 AND day_key=$2`,[this.config.channelId,p.day]);
     creating=true;const sent=await this.transport.create(p,row.nonce);creating=false;messageId=sent.id;created=true;
     await c.query(`UPDATE ${this.profile.table} SET state='posted',message_id=$3,last_error=NULL WHERE channel_id=$1 AND day_key=$2`,[this.config.channelId,p.day,messageId]);
     if(matchesPayload(sent,payload)){
      await this.success(c,p.day,messageId,digest,key,row.revision);return {state:'created',messageId};
     }
    }
    const updateKey=key+':'+(row.revision+1)+':'+digest;
    await c.query(`UPDATE ${this.profile.table} SET update_key=$3 WHERE channel_id=$1 AND day_key=$2`,[this.config.channelId,p.day,updateKey]);
    const edited=await this.transport.edit(messageId,p);
    if(!matchesPayload(edited,payload))throw new DeliveryError('malformed');
    await this.success(c,p.day,messageId,digest,key,row.revision);return {state:created?'created':'updated',messageId};
   }catch(e){
    const state=(await c.query(`SELECT state FROM ${this.profile.table} WHERE channel_id=$1 AND day_key=$2`,[this.config.channelId,p.day])).rows[0].state;
    return this.fail(c,p.day,e,state,creating);
   }
  })??{state:'busy'};
 }
 private async success(c:SqlConnection,day:string,id:string,digest:string,key:string,revision:number){
  await c.query(`UPDATE ${this.profile.table} SET digest=$3,revision=revision+1,update_key=$4,last_error=NULL,failures=0,
   reconciled_at=clock_timestamp(),checked_at=clock_timestamp(),next_attempt_at=clock_timestamp() WHERE channel_id=$1 AND day_key=$2 AND message_id=$5`,[this.config.channelId,day,digest,key+':'+(revision+1)+':'+digest,id]);
 }
 private async fail(c:SqlConnection,day:string,error:unknown,state:string,definitiveCreateRejection=false):Promise<ReconcileResult>{
  const e=error instanceof DeliveryError?error:new DeliveryError(state==='uncertain'?'uncertain':'transient');
  const blocked=['forbidden','invalid_channel','invalid_configuration','missing'].includes(e.code);
  // Only a definitive 429 rejection may permit another POST; uncertain/malformed/server failures never do.
  const nextState=blocked?'blocked':state==='uncertain'&&definitiveCreateRejection&&e.code==='rate_limited'?'prepared':state;
  const failures=(await c.query(`SELECT failures FROM ${this.profile.table} WHERE channel_id=$1 AND day_key=$2`,[this.config.channelId,day])).rows[0].failures;
  const delay=e.code==='rate_limited'?Math.max(60_000,e.retryMs):Math.max(e.retryMs,Math.min(3600_000,60_000*2**Math.min(failures,6)));
  await c.query(`UPDATE ${this.profile.table} SET state=$3,last_error=$4,failures=failures+1,
   next_attempt_at=clock_timestamp()+($5::double precision*interval '1 millisecond') WHERE channel_id=$1 AND day_key=$2`,[this.config.channelId,day,nextState,e.code,delay]);
  return {state:blocked?'blocked':nextState==='uncertain'?'uncertain':'deferred',error:e.code};
 }
}
