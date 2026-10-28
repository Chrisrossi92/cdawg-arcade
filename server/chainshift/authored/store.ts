import {createHash} from 'node:crypto';
import {DatabaseError,type Database,type SqlConnection} from '../../database/pool.js';
import {retryTransaction} from '../../results/transaction.js';
import {digest,equal} from '../../sessions/crypto.js';
import {displayName} from '../../guild/store.js';
import {AuthoredService,FixedError,type AuthoredAttempt,type FixedState} from './service.js';
import {validAuthoredPublication} from './publication.js';
import {FIXED_RULES,type FixedHome,type FixedView,type FixedRequest,type FixedRow} from '../../../shared/chainshift/authored/contract.js';
import type {RankedCredentials} from '../store.js';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
class Abort extends DatabaseError {constructor(readonly reason:string){super('cancelled');}}
/** One authenticated player's row lock serializes all claims/intents across tabs,
 * guilds and service processes. Every answer/hint/receipt/result commits together. */
export class AuthoredStore {
 constructor(private db:Database,private allowsGuild:(id:string)=>boolean){}
 private async auth(c:SqlConnection,credentials:RankedCredentials,write:boolean){
  if(!/^[A-Za-z0-9_-]{43}$/.test(credentials.token)||!/^\d{17,20}$/.test(credentials.playerId))throw new FixedError('expired_session');
  const s=(await c.query(`SELECT s.*,p.discord_user_id,p.display_name,g.discord_guild_id,g.status AS guild_status FROM arcade.application_sessions s
   JOIN arcade.players p USING(player_id) JOIN arcade.guilds g USING(guild_id)
   WHERE token_digest=$1 AND origin_class='activity' AND transport='cookie' AND revoked_at IS NULL
   AND expires_at>clock_timestamp() AND idle_expires_at>clock_timestamp() FOR SHARE OF s`,[digest(credentials.token)])).rows[0];
  if(!s)throw new FixedError('expired_session');
  if(s.discord_user_id!==credentials.playerId)throw new FixedError('account_changed');
  if(write&&!equal(digest(credentials.csrf??''),s.csrf_digest??''))throw new FixedError('csrf_invalid');
  if(!this.allowsGuild(s.discord_guild_id)||s.guild_status!=='enabled')throw new FixedError('unavailable');
  await c.query('SELECT player_id FROM arcade.players WHERE player_id=$1 FOR UPDATE',[s.player_id]);
  const now=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now as Date;
  if(+s.expires_at<=+now||+s.idle_expires_at<=+now||+s.membership_verified_at>+now+5000||+now-+s.membership_verified_at>30*60_000)throw new FixedError('expired_session');
  return s;
 }
 private async transaction<T>(credentials:RankedCredentials,write:boolean,work:(c:SqlConnection,s:Record<string,any>)=>Promise<T>):Promise<T>{
  try{return await retryTransaction(this.db,async c=>{try{return await work(c,await this.auth(c,credentials,write));}catch(e){if(e instanceof FixedError)throw new Abort(e.code);throw e;}});}
  catch(e){if(e instanceof Abort)throw new FixedError(e.reason);throw e;}
 }
 private async load(c:SqlConnection,s:Record<string,any>){
  const publications=(await c.query('SELECT *,day_key::text AS day FROM arcade.chainshift_authored_puzzles ORDER BY day_key NULLS LAST,puzzle_id')).rows;
  if(publications.some(p=>!validAuthoredPublication(p)))throw new FixedError('unavailable');
  const baseDay=publications.find(p=>p.kind==='daily')?.day??'1900-01-01';
  const rows=(await c.query('SELECT a.*,p.rules_revision,p.content_digest,p.day_key::text AS day FROM arcade.chainshift_authored_attempts a JOIN arcade.chainshift_authored_puzzles p USING(puzzle_id) WHERE player_id=$1 ORDER BY created_at,attempt_id',[s.player_id])).rows;
  const attempts=rows.map(row=>row.state as AuthoredAttempt);
  const now=Number((await c.query('SELECT floor(extract(epoch FROM clock_timestamp())*1000)::text AS ms')).rows[0].ms);
  const state:FixedState={rules:FIXED_RULES,baseDay,attempts};
  return {rows,publications,state,engine:new AuthoredService(()=>now,state)};
 }
 private async persist(c:SqlConnection,s:Record<string,any>,before:Awaited<ReturnType<AuthoredStore['load']>>,engine:AuthoredService){
  for(const value of engine.snapshot().attempts){
   const old=before.rows.find(row=>row.attempt_id===value.id);
   if(old&&JSON.stringify(old.state)===JSON.stringify(value))continue;
   const publication=before.publications.find(p=>p.puzzle_id===value.puzzleId);
   if(!publication||publication.kind!==value.mode||publication.day!==value.day)throw new FixedError('unavailable');
   const state={...value,receipts:{}};
   if(!old)await c.query('INSERT INTO arcade.chainshift_authored_attempts(attempt_id,player_id,puzzle_id,kind,state) VALUES($1,$2,$3,$4,$5)',[value.id,s.player_id,value.puzzleId,value.mode,JSON.stringify(state)]);
   else {const result=await c.query('UPDATE arcade.chainshift_authored_attempts SET state=$3 WHERE attempt_id=$1 AND player_id=$2 AND revision=$4',[value.id,s.player_id,JSON.stringify(state),old.revision]);if(result.rowCount!==1)throw new FixedError('state_conflict');}
  }
 }
 home(credentials:RankedCredentials):Promise<FixedHome>{return this.transaction(credentials,false,async(c,s)=>{const before=await this.load(c,s);before.engine.home(s.discord_user_id,displayName(s.display_name));await this.persist(c,s,before,before.engine);return (await this.load(c,s)).engine.home(s.discord_user_id,displayName(s.display_name));});}
 resume(credentials:RankedCredentials,id:string):Promise<FixedView>{return this.transaction(credentials,false,async(c,s)=>(await this.load(c,s)).engine.resume(s.discord_user_id,id));}
 practice(credentials:RankedCredentials,puzzleId:string,requestId:string):Promise<FixedView>{
  if(!uuid.test(requestId))return Promise.reject(new FixedError('invalid_request'));
  return this.transaction(credentials,true,async(c,s)=>{
   const requestDigest=hash(['practice',puzzleId]),prior=(await c.query('SELECT * FROM arcade.chainshift_authored_actions WHERE player_id=$1 AND request_id=$2',[s.player_id,requestId])).rows[0];
   const before=await this.load(c,s);if(prior){if(prior.request_digest!==requestDigest)throw new FixedError('request_conflict');return before.engine.resume(s.discord_user_id,prior.attempt_id);}
   const view=before.engine.practice(s.discord_user_id,displayName(s.display_name),puzzleId,requestId);await this.persist(c,s,before,before.engine);
   await c.query('INSERT INTO arcade.chainshift_authored_actions(player_id,request_id,attempt_id,request_digest) VALUES($1,$2,$3,$4)',[s.player_id,requestId,view.id,requestDigest]);
   return (await this.load(c,s)).engine.resume(s.discord_user_id,view.id);
  });
 }
 act(credentials:RankedCredentials,id:string,request:FixedRequest):Promise<FixedView>{
  if(!request||!uuid.test(request.requestId)||!request.action)return Promise.reject(new FixedError('invalid_request'));
  return this.transaction(credentials,true,async(c,s)=>{
   const requestDigest=hash([id,request.revision,request.action.kind,request.action.kind==='guess'?request.action.word:null]);
   const prior=(await c.query('SELECT * FROM arcade.chainshift_authored_actions WHERE player_id=$1 AND request_id=$2',[s.player_id,request.requestId])).rows[0];
   const before=await this.load(c,s);if(prior){if(prior.request_digest!==requestDigest||prior.attempt_id!==id)throw new FixedError('request_conflict');return before.engine.resume(s.discord_user_id,id);}
   before.engine.act(s.discord_user_id,id,request);await this.persist(c,s,before,before.engine);
   await c.query('INSERT INTO arcade.chainshift_authored_actions(player_id,request_id,attempt_id,request_digest) VALUES($1,$2,$3,$4)',[s.player_id,request.requestId,id,requestDigest]);
   return (await this.load(c,s)).engine.resume(s.discord_user_id,id);
  });
 }
 board(credentials:RankedCredentials,id:string):Promise<FixedRow[]>{return this.transaction(credentials,false,async(c,s)=>{
  const own=(await this.load(c,s)).engine.resume(s.discord_user_id,id);if(own.mode!=='daily')throw new FixedError('practice_not_ranked');
  const rows=(await c.query(`WITH scored AS (SELECT a.player_id,p.display_name,a.elapsed_ms,(state->>'hints')::integer AS hints,(state->>'mistakes')::integer AS mistakes,
   500+greatest(0,500-floor(elapsed_ms/1000.0)::integer-50*(state->>'hints')::integer) AS score
   FROM arcade.chainshift_authored_attempts a JOIN arcade.players p USING(player_id) WHERE puzzle_id=$1 AND kind='daily' AND completed_at IS NOT NULL),
   ranked AS(SELECT *,rank() OVER(ORDER BY score DESC,elapsed_ms) AS place,row_number() OVER(ORDER BY score DESC,elapsed_ms,player_id) AS display_order FROM scored)
   SELECT * FROM ranked WHERE display_order<=100 OR player_id=$2 ORDER BY display_order`,[own.puzzle.id,s.player_id])).rows;
  return rows.map(row=>({rank:Number(row.place),name:displayName(row.display_name),isYou:row.player_id===s.player_id,score:Number(row.score),hints:row.hints,mistakes:row.mistakes,elapsedMs:Number(row.elapsed_ms)}));
 });}
}
