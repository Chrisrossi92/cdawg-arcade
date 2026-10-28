import type {Database,SqlConnection} from '../../database/pool.js';
import {canaryConfig} from '../../canary.js';
import {authoredServerEnabled} from '../../../config/chainshift-release.js';
import {chainshiftActivityUrl} from '../../../shared/chainshift/activity-launch.js';
import {ARCADE_APPLICATION_ID,CHAINSHIFT_PILOT_CHANNEL,type LiveDeliveryConfig} from '../live-config.js';
import {dailyProjection,type DailyFacts,type DailyActivityMessage} from '../projections.js';
import {DurableDailyReconciler,DeliveryNotDue as NoDaily,deliveryMutableColumns,type DeliveryProfile,type ReconcileResult} from '../delivery-store.js';
import {DiscordDailyDelivery} from '../discord-delivery.js';
import {scheduleDailyWorker,type DailyWorker} from '../delivery-worker.js';
import {authoredReady} from './privileges.js';
import {authoredById} from './catalog.js';
import {validAuthoredPublication} from './publication.js';
export const AUTHORED_DELIVERY_HOUR=9;
/** Independent opt-in: never enables legacy ranked or delivery. All times are New York wall time. */
export function authoredDeliveryConfig(env:NodeJS.ProcessEnv):LiveDeliveryConfig|null {
 if(env.CHAINSHIFT_AUTHORED_DAILY_DELIVERY_ENABLED!=='true'||!authoredServerEnabled(env)||env.ARCADE_SESSIONS_ENABLED!=='true'||
 env.CHAINSHIFT_AUTHORED_DAILY_CHANNEL_ID!==CHAINSHIFT_PILOT_CHANNEL||env.DISCORD_CLIENT_ID!==ARCADE_APPLICATION_ID||!env.DISCORD_ARCADE_BOT_TOKEN)return null;
 return {applicationId:ARCADE_APPLICATION_ID,channelId:CHAINSHIFT_PILOT_CHANNEL,pilotDay:null,allowsGuild:canaryConfig(env).allowsGuild};
}
/** Static daily invitation: no answers, identities, live score edits, mentions or result notifications. */
export function authoredDailyMessage(facts:DailyFacts,applicationId:string):DailyActivityMessage {
 const p=dailyProjection(facts);
 return {content:`⛓️ **Today's ChainShift · ${p.day}**\nFive missing words. One chain. How quickly can you connect them?\nFinish for 500 points; speed and fewer assists earn up to 1,000.\nPlay today's daily below—and compare scores without sharing answers!`,allowed_mentions:{parse:[]},
 components:[{type:1,components:[{type:2,style:5,label:"Play Today's Chain",url:chainshiftActivityUrl(applicationId)}]}]};
}
export async function grantAuthoredDeliveryRights(c:SqlConnection){
 await c.query('GRANT SELECT,INSERT ON arcade.chainshift_authored_daily_messages TO arcade_session_runtime');
 await c.query(`GRANT UPDATE(${deliveryMutableColumns.join(',')}) ON arcade.chainshift_authored_daily_messages TO arcade_session_runtime`);
}
export async function authoredDeliveryReady(c:SqlConnection,allowFixture=false){
 if(!await authoredReady(c,true,allowFixture))return false;
 const r=(await c.query(`SELECT EXISTS(SELECT 1 FROM arcade.schema_migrations WHERE version=5) AND
 EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='guard_chainshift_authored_delivery' AND tgenabled='O') AND
 has_table_privilege(current_user,'arcade.chainshift_authored_daily_messages','SELECT') AND
 has_table_privilege(current_user,'arcade.chainshift_authored_daily_messages','INSERT') AND
 NOT EXISTS(SELECT 1 FROM unnest($1::text[]) col WHERE NOT has_column_privilege(current_user,'arcade.chainshift_authored_daily_messages',col,'UPDATE')) AND
 NOT has_table_privilege(current_user,'arcade.chainshift_authored_daily_messages','UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AND
 NOT has_any_column_privilege(current_user,'arcade.chainshift_authored_daily_messages','REFERENCES') AND
 NOT EXISTS(SELECT 1 FROM unnest(ARRAY['channel_id','day_key','puzzle_id','discord_guild_id','operation_key','nonce','created_at','updated_at']) col WHERE has_column_privilege(current_user,'arcade.chainshift_authored_daily_messages',col,'UPDATE')) AS ready`,[[...deliveryMutableColumns]])).rows[0];
 return r?.ready===true;
}
export async function authoredDeliveryFacts(c:SqlConnection,fixtureDay?:string){
 const clock=(await c.query(`SELECT to_char(clock_timestamp() AT TIME ZONE 'America/New_York','YYYY-MM-DD') AS day,
 extract(hour FROM clock_timestamp() AT TIME ZONE 'America/New_York')::int AS hour`)).rows[0];
 if(!fixtureDay&&clock.hour<AUTHORED_DELIVERY_HOUR)throw new NoDaily('before_post_time');
 const row=(await c.query(`SELECT *,day_key::text AS day FROM arcade.chainshift_authored_puzzles WHERE kind='daily' AND day_key=$1::date`,[fixtureDay??clock.day])).rows[0];
 if(!row)throw new NoDaily('empty_queue');
 if(!validAuthoredPublication(row))throw Error('invalid authored publication');
 const p=authoredById(row.puzzle_id)!;
 return dailyProjection({puzzleId:p.id,day:row.day,start:p.words[0],finish:p.words[6],completedPlayers:0,shortestShifts:null,fastestAtShortestMs:null});
}
export const authoredDeliveryProfile:DeliveryProfile={table:'arcade.chainshift_authored_daily_messages',keyVersion:'chainshift-authored-daily-v2',ready:authoredDeliveryReady,facts:authoredDeliveryFacts,payload:authoredDailyMessage};
export function startAuthoredDailyWorker(db:Database|undefined,env:NodeJS.ProcessEnv=process.env,artifactReady=false,report:(r:ReconcileResult)=>void=r=>console.log(JSON.stringify({event:'chainshift_authored_daily_delivery',...r}))):DailyWorker {
 const config=authoredDeliveryConfig(env);
 if(!config||!db||!artifactReady)return {stop:async()=>{}};
 const transport=new DiscordDailyDelivery(config,env.DISCORD_ARCADE_BOT_TOKEN!,fetch,Date.now,authoredDailyMessage);
 const reconciler=new DurableDailyReconciler(db,transport,config,undefined,authoredDeliveryProfile);
 return scheduleDailyWorker(async()=>{try{return await reconciler.reconcile();}catch(e){if(e instanceof NoDaily)return {state:'deferred',error:e.reason};throw e;}},report);
}
