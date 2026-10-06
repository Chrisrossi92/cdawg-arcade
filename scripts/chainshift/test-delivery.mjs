// Real disposable PostgreSQL plus fake external transport; never reads production credentials or calls Discord.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ephemeral} from './ephemeral.mjs';
import {loginFixture,fixturePlayers} from './fixtures.mjs';
import {Database} from '../../build/server/database/pool.js';
import {DurableDailyReconciler,grantDeliveryRights,deliveryReady,currentDeliveryFacts,deliveryHash} from '../../build/server/chainshift/delivery-store.js';
import {DeliveryError} from '../../build/server/chainshift/discord-delivery.js';
import {CHAINSHIFT_PILOT_CHANNEL,ARCADE_APPLICATION_ID} from '../../build/server/chainshift/live-config.js';
import {dailyActivityMessage} from '../../build/server/chainshift/projections.js';
import {ChainshiftStore} from '../../build/server/chainshift/store.js';
import {createManifest} from '../../build/shared/chainshift/manifest.js';
import {enrichedReferee} from '../../build/shared/chainshift/enrichment/graph-v2.js';
import {publishLocalCandidate} from '../../build/server/chainshift/publication.js';
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++;},ok=x=>{assert.ok(x);checks++;},rejects=async f=>{await assert.rejects(f);checks++;};
class FakeTransport {
 mode='fake';messages=new Map();creates=0;edits=0;recoveries=0;failCreate=null;failEdit=null;pause=null;guild=fixturePlayers.A.guildId;
 async validateDestination(){return this.guild;}
 async create(facts,nonce){
  this.creates++;if(this.pause)await this.pause;
  if(this.failCreate==='before'){this.failCreate=null;throw new DeliveryError('uncertain');}
  if(this.failCreate==='rate'){this.failCreate=null;throw new DeliveryError('rate_limited',70000);}
  const id=((BigInt(Date.now()-1420070400000)<<22n)+BigInt(this.creates)).toString();
  const m={id,nonce,...dailyActivityMessage(facts,ARCADE_APPLICATION_ID)};this.messages.set(id,m);
  if(this.failCreate==='after'){this.failCreate=null;throw new DeliveryError('uncertain');}return m;
 }
 async edit(id,facts){
  this.edits++;if(!this.messages.has(id))throw new DeliveryError('missing');
  if(this.failEdit==='rate'){this.failEdit=null;throw new DeliveryError('rate_limited',120000);}
  const m={...this.messages.get(id),...dailyActivityMessage(facts,ARCADE_APPLICATION_ID)};this.messages.set(id,m);
  if(this.failEdit==='after'){this.failEdit=null;throw new DeliveryError('transient');}return m;
 }
 async read(id){if(!this.messages.has(id))throw new DeliveryError('missing');return this.messages.get(id);}
 async recover(nonce){this.recoveries++;if(this.failCreate==='recovery-rate'){this.failCreate=null;throw new DeliveryError('rate_limited');}return [...this.messages.values()].find(m=>m.nonce===nonce)??null;}
}
const cluster=await ephemeral();const {db,runtime}=cluster;let restarted;
const artifactRoot=mkdtempSync(join(tmpdir(),'chainshift-delivery-publication-'));
try{
 eq(await deliveryReady(runtime),false);await db.transaction(grantDeliveryRights);eq(await deliveryReady(runtime),true);eq(await deliveryReady(db),false);
 await db.query('GRANT UPDATE ON arcade.chainshift_daily_messages TO arcade_session_runtime');eq(await deliveryReady(runtime),false);await db.query('REVOKE UPDATE ON arcade.chainshift_daily_messages FROM arcade_session_runtime');await db.transaction(grantDeliveryRights);
 await db.query('ALTER TABLE arcade.chainshift_daily_messages DISABLE TRIGGER guard_chainshift_delivery');eq(await deliveryReady(runtime),false);await db.query('ALTER TABLE arcade.chainshift_daily_messages ENABLE TRIGGER guard_chainshift_delivery');eq(await deliveryReady(runtime),true);
 for(const sql of ['DELETE FROM arcade.chainshift_daily_messages','TRUNCATE arcade.chainshift_daily_messages','UPDATE arcade.chainshift_daily_messages SET channel_id=\'123456789012345678\'','UPDATE arcade.chainshift_daily_messages SET created_at=clock_timestamp()','CREATE TABLE arcade.forbidden_delivery(i int)'])await rejects(()=>runtime.query(sql));
 const today=(await db.query("SELECT to_char(clock_timestamp() AT TIME ZONE 'America/New_York','YYYY-MM-DD') AS day")).rows[0].day;
 const manifest=createManifest(enrichedReferee,{id:'chainshift-local-ranked-001',number:1,day:today,start:'ice',finish:'room',generatedAt:'2026-10-04T00:00:00.000Z'});
 const reviewed=join(artifactRoot,'reviewed.json');writeFileSync(reviewed,JSON.stringify(manifest));
 const pool=cluster.adminConfig.pool,cliEnv={PATH:process.env.PATH,PERSISTENCE_CONFIGURED:'true',DATABASE_URL:`postgresql://${pool.user}@127.0.0.1:${pool.port}/${pool.database}`,DATABASE_TLS_MODE:'disable',CHAINSHIFT_DAILY_PILOT_DAY:manifest.day};
 const publish=(env=cliEnv)=>execFileSync(process.execPath,['build/server/database/cli.js','publish-chainshift-pilot',reviewed],{env,stdio:['ignore','pipe','pipe']}).toString();
 ok(publish().includes('"status":"published"'));ok(publish().includes('"editorialApprovalChanged":false'));
 for(const flag of ['CHAINSHIFT_ARCADE_ENABLED','CHAINSHIFT_RANKED_ENABLED','CHAINSHIFT_DAILY_DELIVERY_ENABLED'])await rejects(async()=>publish({...cliEnv,[flag]:'true'}));
 await rejects(async()=>publish({...cliEnv,CHAINSHIFT_DAILY_PILOT_DAY:'2099-01-01'}));
 writeFileSync(reviewed,JSON.stringify({...manifest,id:'chainshift-local-conflicting-pilot'}));await rejects(async()=>publish());writeFileSync(reviewed,JSON.stringify(manifest));
 const A=await loginFixture(runtime,fixturePlayers.A),B=await loginFixture(runtime,fixturePlayers.B);
 await db.query("UPDATE arcade.guilds SET status='enabled'");let day=manifest.day;
 const fake=new FakeTransport();const config={applicationId:ARCADE_APPLICATION_ID,channelId:CHAINSHIFT_PILOT_CHANNEL,pilotDay:day,allowsGuild:id=>id===fake.guild};
 const newModel=(connection=runtime,c=config)=>new DurableDailyReconciler(connection,fake,c,()=>day);
 let model=newModel();
 // 1. Morning zero-completion create; one durable message receipt.
 const first=await model.reconcile();eq(first.state,'created');eq(fake.creates,1);eq(fake.edits,0);ok(fake.messages.get(first.messageId).content.includes('0 completed'));ok(!fake.messages.get(first.messageId).content.includes('Shortest'));
 eq((await currentDeliveryFacts(runtime,day)).completedPlayers,0);eq((await currentDeliveryFacts(runtime)).day,day);
 // 2/3. New connection + reconciler recovers only database state and does not repost.
 restarted=new Database(cluster.runtimeConfig);model=newModel(restarted);eq(await model.reconcile(),{state:'unchanged',messageId:first.messageId});eq(fake.creates,1);
 const row=()=>db.query('SELECT * FROM arcade.chainshift_daily_messages WHERE channel_id=$1 AND day_key=$2',[CHAINSHIFT_PILOT_CHANNEL,day]).then(r=>r.rows[0]);
 let receipt=await row();eq(receipt.message_id,first.messageId);eq(receipt.revision,1);eq(receipt.state,'posted');ok(receipt.create_attempted_at instanceof Date);ok(receipt.reconciled_at instanceof Date);
 for(const sql of ["UPDATE arcade.chainshift_daily_messages SET message_id='1549149791915737131'", "UPDATE arcade.chainshift_daily_messages SET state='prepared'", 'UPDATE arcade.chainshift_daily_messages SET revision=revision+2'])await rejects(()=>runtime.query(sql));
 await rejects(()=>runtime.query('INSERT INTO arcade.chainshift_daily_messages(channel_id,day_key,puzzle_id,discord_guild_id,operation_key,nonce) VALUES($1,$2,$3,$4,$5,$6)',[CHAINSHIFT_PILOT_CHANNEL,day,manifest.id,fake.guild,'a'.repeat(64),'a'.repeat(24)]));
 // 4. First official completion updates the existing message, not a client-supplied projection.
 const game=new ChainshiftStore(runtime,()=>true,()=>day);
 const finish=async(credentials,words)=>{let a=(await game.start(credentials,manifest.id)).attempt;for(const word of words)a=(await game.mutate(credentials,a.attemptId,randomUUID(),a.revision,'shift',word)).attempt;return a;};
 await finish(A.credentials,['box','car','pool','party','room']);eq((await model.reconcile()).state,'updated');eq(fake.messages.size,1);ok(fake.messages.get(first.messageId).content.includes('1 completed'));ok(fake.messages.get(first.messageId).content.includes('5 shifts'));
 // 5. Better official score edits the same message; private route/identity never appears.
 await finish(B.credentials,['cold','war','room']);eq((await model.reconcile()).state,'updated');eq(fake.creates,1);ok(fake.messages.get(first.messageId).content.includes('2 completed'));ok(fake.messages.get(first.messageId).content.includes('3 shifts'));
 ok(!JSON.stringify([...fake.messages.values()]).match(/cold|war|certificate|playerId|csrf|shortestRoutes/));
 const setDay=async(number,start='soup',finish='house')=>{const d=new Date(manifest.day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+number);day=d.toISOString().slice(0,10);const m=createManifest(enrichedReferee,{id:'chainshift-local-delivery-day-'+number,number:100+number,day,start,finish,generatedAt:manifest.generatedAt});await publishLocalCandidate(db,m);config.pilotDay=day;return m;};
 const clearDelay=()=>db.query('UPDATE arcade.chainshift_daily_messages SET next_attempt_at=clock_timestamp()-interval \'1 second\' WHERE state<>\'blocked\'');
 // 6. Lost create response with real durable uncertain marker; recovery after connection/process replacement is GET-only.
 await setDay(1);fake.failCreate='after';eq((await model.reconcile()).state,'uncertain');eq(fake.messages.size,2);eq((await row()).state,'uncertain');eq((await model.reconcile()).state,'deferred');await clearDelay();
 model=newModel();const recovered=await model.reconcile();eq(recovered.state,'updated');eq(fake.messages.size,2);eq(fake.creates,2);eq(fake.recoveries,1);eq((await row()).message_id,recovered.messageId);
 // 7. Rollover creates one new message; concurrent processes skip the same session lock.
 await setDay(2);let release;fake.pause=new Promise(r=>release=r);const running=model.reconcile();
 for(let n=0;n<100&&fake.creates<3;n++)await new Promise(r=>setTimeout(r,5));eq(fake.creates,3);
 const concurrent=await Promise.all(Array.from({length:6},()=>newModel(restarted).reconcile()));eq(concurrent.map(r=>r.state),Array(6).fill('busy'));release();eq((await running).state,'created');fake.pause=null;eq((await model.reconcile()).state,'unchanged');eq(fake.messages.size,3);
 // 8. Missing/wrong destination fails before any create. DB also enforces channel/puzzle-day identity.
 for(const channelId of ['',fixturePlayers.A.guildId])await rejects(async()=>newModel(runtime,{...config,channelId}));eq(fake.creates,3);
 await rejects(()=>runtime.query('INSERT INTO arcade.chainshift_daily_messages(channel_id,day_key,puzzle_id,discord_guild_id,operation_key,nonce) VALUES($1,$2,$3,$4,$5,$6)',[fixturePlayers.A.guildId,day,'chainshift-local-delivery-day-2',fake.guild,'b'.repeat(64),'b'.repeat(24)]));
 await rejects(()=>runtime.query('INSERT INTO arcade.chainshift_daily_messages(channel_id,day_key,puzzle_id,discord_guild_id,operation_key,nonce) VALUES($1,$2,$3,$4,$5,$6)',[CHAINSHIFT_PILOT_CHANNEL,'2099-02-01','chainshift-local-delivery-day-2',fake.guild,'b'.repeat(64),'b'.repeat(24)]));
 // Death before POST holds publication uncertain, including when recovery itself gets 429. Never retries create.
 await setDay(3);fake.failCreate='before';eq((await model.reconcile()).state,'uncertain');eq(fake.creates,4);await clearDelay();fake.failCreate='recovery-rate';eq((await model.reconcile()).state,'uncertain');eq((await row()).state,'uncertain');await clearDelay();eq((await model.reconcile()).state,'uncertain');eq(fake.creates,4);eq(fake.messages.size,3);
 // A definitive create 429 may be retried, with durable Retry-After even across restart.
 await clearDelay();await setDay(4);fake.failCreate='rate';eq((await model.reconcile()).state,'deferred');receipt=await row();eq(receipt.state,'prepared');ok(+receipt.next_attempt_at-Date.now()>65000);eq((await newModel(restarted).reconcile()).state,'deferred');await clearDelay();eq((await model.reconcile()).state,'created');eq(fake.messages.size,4);
 // Lost edit response reapplies the same message ID, never creates. Deleted receipt becomes terminal.
 const fourth=await row();await db.query("UPDATE arcade.chainshift_daily_messages SET digest=$1 WHERE day_key=$2",['f'.repeat(64),day]);fake.failEdit='after';eq((await model.reconcile()).state,'deferred');eq((await row()).message_id,fourth.message_id);await clearDelay();eq((await model.reconcile()).state,'updated');eq(fake.messages.size,4);
 // Sparse integrity checks repair a delayed stale edit even if the desired digest is already current.
 await db.query("UPDATE arcade.chainshift_daily_messages SET checked_at=clock_timestamp()-interval '11 minutes' WHERE day_key=$1",[day]);fake.messages.get(fourth.message_id).content='stale external edit';eq((await model.reconcile()).state,'updated');ok(fake.messages.get(fourth.message_id).content.includes('0 completed'));
 await db.query("UPDATE arcade.chainshift_daily_messages SET checked_at=clock_timestamp()-interval '11 minutes' WHERE day_key=$1",[day]);const edits=fake.edits;eq((await model.reconcile()).state,'unchanged');eq(fake.edits,edits);
 await db.query("UPDATE arcade.chainshift_daily_messages SET checked_at=clock_timestamp()-interval '11 minutes' WHERE day_key=$1",[day]);fake.messages.delete(fourth.message_id);eq((await model.reconcile()).state,'blocked');const creates=fake.creates;eq((await model.reconcile()).state,'deferred');
 await db.query("ALTER TABLE arcade.chainshift_daily_messages DISABLE TRIGGER guard_chainshift_delivery");await db.query('UPDATE arcade.chainshift_daily_messages SET next_attempt_at=clock_timestamp()-interval \'1 second\'');await db.query("ALTER TABLE arcade.chainshift_daily_messages ENABLE TRIGGER guard_chainshift_delivery");eq((await newModel(restarted).reconcile()).state,'blocked');eq(fake.creates,creates);
 await rejects(()=>runtime.query("UPDATE arcade.chainshift_daily_messages SET state='prepared' WHERE day_key=$1",[day]));
 // Pilot expires at next NY day; normal rollover plumbing only proceeds with a separately configured pilot day.
 await setDay(5);config.pilotDay=manifest.day;eq((await model.reconcile()).state,'outside_pilot');eq(fake.creates,creates);
 eq((await db.query('SELECT count(*)::int AS n FROM arcade.chainshift_daily_messages')).rows[0].n,5);
 // Continuous capability (still fake-only here) rolls over automatically; pilot configuration remains bounded.
 const continuous=newModel(runtime,{...config,pilotDay:null});eq((await continuous.reconcile()).state,'created');eq((await continuous.reconcile()).state,'unchanged');
 await setDay(6);eq((await continuous.reconcile()).state,'created');eq((await continuous.reconcile()).state,'unchanged');eq(fake.creates,creates+2);
 // Actual process death after the durable dispatch marker: session lock releases, intent does not roll back.
 const crashManifest=await setDay(7),crashKey=deliveryHash(['chainshift-daily-v1',CHAINSHIFT_PILOT_CHANNEL,crashManifest.id,day]);
 await runtime.query('INSERT INTO arcade.chainshift_daily_messages(channel_id,day_key,puzzle_id,discord_guild_id,operation_key,nonce) VALUES($1,$2,$3,$4,$5,$6)',[CHAINSHIFT_PILOT_CHANNEL,day,crashManifest.id,fake.guild,crashKey,crashKey.slice(0,24)]);
 const runtimePool=cluster.runtimeConfig.pool,crashEnv={PATH:process.env.PATH,PERSISTENCE_CONFIGURED:'true',DATABASE_URL:`postgresql://${runtimePool.user}@127.0.0.1:${runtimePool.port}/${runtimePool.database}`,DATABASE_TLS_MODE:'disable',FIXTURE_DAY:day};
 const child=spawn(process.execPath,['--input-type=module','-e',String.raw`import {Database} from './build/server/database/pool.js';import {databaseConfig} from './build/server/database/config.js';const cfg=databaseConfig();if(cfg.pool?.host!=='127.0.0.1'||!cfg.pool?.database.startsWith('arcade_test_chainshift_'))throw Error('fixture only');const db=new Database(cfg);await db.exclusive('chainshift-daily:1549149791915737129',async c=>{await c.query("UPDATE arcade.chainshift_daily_messages SET state='uncertain',create_attempted_at=clock_timestamp() WHERE channel_id='1549149791915737129' AND day_key=$1",[process.env.FIXTURE_DAY]);process.stdout.write('LOCKED\n');await new Promise(()=>{});});`],{env:crashEnv,stdio:['ignore','pipe','ignore']});
 try{
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('owned crash fixture did not start')),5000);child.stdout.once('data',chunk=>{clearTimeout(timeout);chunk.toString().includes('LOCKED')?resolve():reject(Error('owned crash fixture failed'));});child.once('exit',()=>{clearTimeout(timeout);reject(Error('owned crash fixture exited early'));});});
  eq((await newModel(restarted).reconcile()).state,'busy');const exited=once(child,'exit');child.kill('SIGKILL');await exited;
 }finally{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');}
 eq((await row()).state,'uncertain');const beforeCrash=fake.creates;eq((await newModel(restarted).reconcile()).state,'uncertain');eq(fake.creates,beforeCrash);
 eq((await db.query("SELECT count(*)::int n FROM arcade.schema_migrations WHERE version=3")).rows[0].n,1);
 console.log(JSON.stringify({status:'pass',checks,acceptance:'morning/restart/update/lost-response/rollover/allowlist',liveCalls:0}));
}finally{await restarted?.close();await cluster.close();rmSync(artifactRoot,{recursive:true,force:true});}
