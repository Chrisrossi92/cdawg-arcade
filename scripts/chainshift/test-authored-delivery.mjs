// Disposable PostgreSQL and fake transport only. No production env files or Discord requests.
import assert from 'node:assert/strict';
import {ephemeral} from './ephemeral.mjs';
import {Database} from '../../build/server/database/pool.js';
import {authoredPlan,publishAuthoredPlan} from '../../build/server/chainshift/authored/publication.js';
import {grantAuthoredRights} from '../../build/server/chainshift/authored/privileges.js';
import {authoredDeliveryReady,grantAuthoredDeliveryRights,authoredDeliveryProfile,authoredDailyMessage} from '../../build/server/chainshift/authored/delivery.js';
import {DurableDailyReconciler} from '../../build/server/chainshift/delivery-store.js';
import {DeliveryError} from '../../build/server/chainshift/discord-delivery.js';
import {ARCADE_APPLICATION_ID,CHAINSHIFT_PILOT_CHANNEL} from '../../build/server/chainshift/live-config.js';
import {loginFixture,fixturePlayers} from './fixtures.mjs';
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++;},ok=a=>{assert.ok(a);checks++;},reject=async f=>{await assert.rejects(f);checks++;};
const c=await ephemeral();let restarted;
try{
 const {db,runtime}=c;await loginFixture(runtime,fixturePlayers.A);await db.query("UPDATE arcade.guilds SET status='enabled'");
 await db.transaction(grantAuthoredRights);
 const today=(await db.query("SELECT to_char(clock_timestamp() AT TIME ZONE 'America/New_York','YYYY-MM-DD') AS day")).rows[0].day;
 const plan=authoredPlan(today);await db.transaction(x=>publishAuthoredPlan(x,plan,true));
 eq(await authoredDeliveryReady(runtime,true),false);await db.transaction(grantAuthoredDeliveryRights);ok(await authoredDeliveryReady(runtime,true));eq(await authoredDeliveryReady(runtime),false);eq(await authoredDeliveryReady(db,true),false);
 const profile={...authoredDeliveryProfile,ready:x=>authoredDeliveryReady(x,true)};let day=today;
 const messages=new Map();let creates=0,recoveries=0,lost=false,rate=false,missing=false;
 const fake={mode:'fake',validateDestination:async()=>fixturePlayers.A.guildId,create:async(f,nonce)=>{creates++;if(rate){rate=false;throw new DeliveryError('rate_limited',70000);}const m={id:String(1549149791915737130n+BigInt(creates)),nonce,...authoredDailyMessage(f,ARCADE_APPLICATION_ID)};messages.set(m.id,m);if(lost){lost=false;throw new DeliveryError('uncertain');}return m;},edit:async(id,f)=>{const m={...messages.get(id),...authoredDailyMessage(f,ARCADE_APPLICATION_ID)};messages.set(id,m);return m;},read:async id=>{if(missing)throw new DeliveryError('missing');return messages.get(id);},recover:async nonce=>{recoveries++;return [...messages.values()].find(m=>m.nonce===nonce)??null;}};
 const config={applicationId:ARCADE_APPLICATION_ID,channelId:CHAINSHIFT_PILOT_CHANNEL,pilotDay:null,allowsGuild:id=>id===fixturePlayers.A.guildId};
 const model=(connection=runtime)=>new DurableDailyReconciler(connection,fake,config,()=>day,profile);
 const first=await model().reconcile();eq(first.state,'created');eq(creates,1);eq((await model().reconcile()).state,'unchanged');eq(creates,1);
 restarted=new Database(c.runtimeConfig);eq((await model(restarted).reconcile()).state,'unchanged');eq(creates,1);
 eq((await db.query('SELECT count(*)::int AS n FROM arcade.chainshift_daily_messages')).rows[0].n,0);
 for(const sql of ['DELETE FROM arcade.chainshift_authored_daily_messages','TRUNCATE arcade.chainshift_authored_daily_messages','UPDATE arcade.chainshift_authored_daily_messages SET channel_id=channel_id','UPDATE arcade.chainshift_authored_daily_messages SET message_id=\'1549149791915737199\''])await reject(()=>runtime.query(sql));
 const clear=()=>db.query("UPDATE arcade.chainshift_authored_daily_messages SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE state<>'blocked'");
 day=plan.entries.filter(e=>e.kind==='daily')[1].day;lost=true;eq((await model().reconcile()).state,'uncertain');eq(creates,2);eq((await model().reconcile()).state,'deferred');await clear();eq((await model(restarted).reconcile()).state,'updated');eq(creates,2);eq(recoveries,1);
 day=plan.entries.filter(e=>e.kind==='daily')[2].day;rate=true;eq((await model().reconcile()).state,'deferred');eq(creates,3);eq((await model().reconcile()).state,'deferred');await clear();eq((await model().reconcile()).state,'created');eq(creates,4);
 missing=true;await db.query("UPDATE arcade.chainshift_authored_daily_messages SET checked_at=clock_timestamp()-interval '20 minutes' WHERE day_key=$1",[day]);eq((await model().reconcile()).state,'blocked');eq((await model().reconcile()).state,'deferred');eq(creates,4);
 await db.query('GRANT UPDATE ON arcade.chainshift_authored_daily_messages TO arcade_session_runtime');eq(await authoredDeliveryReady(runtime,true),false);
 console.log(JSON.stringify({checks,postgres:'disposable',externalCalls:0,legacyReceiptRows:0}));
}finally{await restarted?.close();await c.close();}
