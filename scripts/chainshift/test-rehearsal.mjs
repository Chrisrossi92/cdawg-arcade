// Slice 7: deterministic adversarial rehearsal. Owns only a disposable PostgreSQL cluster.
import assert from 'node:assert/strict';
import request from 'supertest';
import {createServerApp} from '../../build/server/app.js';
import {loadServerConfig} from '../../build/server/env.js';
import {ChainshiftReconciler,FakeChainshiftDelivery,MemoryDailyMessages,liveChainshiftDeliveryEnabled} from '../../build/server/chainshift/delivery.js';
import {dailyProjection,dailyCopy,resultProjection,resultCopy} from '../../build/server/chainshift/projections.js';
import {chainshiftServerEnabled,chainshiftEnabled} from '../../build/config/chainshift-release.js';
import {randomUUID} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
import {ephemeral} from './ephemeral.mjs';
import {fixtureOrigin,fixturePlayers,loginFixture,seedFixture} from './fixtures.mjs';
import {ChainshiftStore} from '../../build/server/chainshift/store.js';
import {chainshiftReady} from '../../build/server/chainshift/privileges.js';
import {Database,DatabaseError} from '../../build/server/database/pool.js';
import {databaseConfig} from '../../build/server/database/config.js';
import {createManifest} from '../../build/shared/chainshift/manifest.js';
import {enrichedReferee} from '../../build/shared/chainshift/enrichment/graph-v2.js';
import {publishLocalCandidate} from '../../build/server/chainshift/publication.js';
import {dayKey} from '../../build/shared/chainshift/daily.js';
import {digest} from '../../build/server/sessions/crypto.js';
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++;},ok=x=>{assert.ok(x);checks++;};
const fails=async(f,reason)=>{await assert.rejects(f,e=>!reason||e.reason===reason);checks++;};
const cluster=await ephemeral();const {db,runtime}=cluster;
try {
 const manifest=await seedFixture(db),store=new ChainshiftStore(runtime,()=>true);
 const credentials={};
 for(const [persona,userId] of Object.entries({A:fixturePlayers.A.userId,B:fixturePlayers.B.userId,C:fixturePlayers.C.userId,D:'789012345678901234',E:'890123456789012345'}))credentials[persona]=(await loginFixture(runtime,{...fixturePlayers.A,userId,displayName:'Rehearsal '+persona})).credentials;
 const d2=(await loginFixture(runtime,{...fixturePlayers.A2,userId:credentials.D.playerId,displayName:'Rehearsal D'})).credentials;
 await db.query("UPDATE arcade.guilds SET status='enabled'");
 eq((await store.daily(credentials.A)).puzzle.day,manifest.day);
 eq((await store.leaderboard(credentials.E,manifest.id,'global')).rows,[]);
 eq((await store.dailySummary(credentials.E,manifest.id,'global')).completedPlayers,0);
 // E has no official attempt despite local/practice activity; query is read-only before verified Start.
 eq((await store.daily(credentials.E)).attempt,null);
 const starts=await Promise.all(Array.from({length:12},(_,i)=>store.start(i%2?credentials.D:d2,manifest.id)));
 eq(new Set(starts.map(x=>x.attempt.attemptId)).size,1);
 let d=starts[0].attempt;const start=d.claimedAt;
 const duplicate=async(kind,word)=>{
  const id=randomUUID(),revision=d.revision;
  // First successful response deliberately discarded: identical retries model a lost response and multiple tabs.
  const first=await store.mutate(credentials.D,d.attemptId,id,revision,kind,word);
  const replies=await Promise.all(Array.from({length:8},(_,i)=>store.mutate(i%2?credentials.D:d2,d.attemptId,id,revision,kind,word)));
  for(const reply of replies){eq(reply.duplicate,true);eq(reply.attempt.route,first.attempt.route);eq(reply.attempt.revision,first.attempt.revision);eq(reply.attempt.completedAt,first.attempt.completedAt);if(first.attempt.state==='completed')eq(reply.attempt.elapsedMs,first.attempt.elapsedMs);}
  d=first.attempt;return first;
 };
 await duplicate('shift','box');eq(d.route,['ice','box']);
 await duplicate('shift','not-a-word');eq(d.route,['ice','box']);
 await duplicate('backtrack');eq(d.route,['ice']);
 await fails(()=>store.mutate(credentials.D,d.attemptId,randomUUID(),0,'shift','cold'),'state_conflict');
 await duplicate('shift','cold');await duplicate('shift','war');
 const before=(await store.resume(d2,d.attemptId)).elapsedMs;await db.query('SELECT pg_sleep(0.12)');
 ok((await store.resume(credentials.D,d.attemptId)).elapsedMs>=before+100);
 await duplicate('shift','room');eq(d.shifts,3);eq(d.claimedAt,start);
 const completed=d;await db.query('SELECT pg_sleep(0.05)');eq((await store.resume(d2,d.attemptId)).elapsedMs,completed.elapsedMs);
 eq((await store.start(d2,manifest.id)).attempt.attemptId,d.attemptId);
 await fails(()=>store.mutate(credentials.D,d.attemptId,randomUUID(),d.revision,'backtrack'),'completed');
 for(const scope of ['global','guild']){
  const board=await store.leaderboard(credentials.E,manifest.id,scope);ok(!JSON.stringify(board).match(/route|cold|war|certificate/));
  await fails(()=>store.routes(credentials.E,manifest.id,scope),'routes_locked');
 }
 await fails(()=>store.ownResultSummary(credentials.E,manifest.id),'not_found');
 // C exercises a long route, multiple removals, absence, resume and completion.
 let c=(await store.start(credentials.C,manifest.id)).attempt;
 const change=async(kind,word)=>{c=(await store.mutate(credentials.C,c.attemptId,randomUUID(),c.revision,kind,word)).attempt;};
 for(const word of ['box','car','pool','party','food','truck','stop','sign','language','school','board','game','ball','park','bench','mark','down','town','hall','pass'])await change('shift',word);
 await change('backtrack');await change('backtrack');eq(c.route.at(-1),'town');
 const cStart=c.claimedAt,elapsed=c.elapsedMs;await db.query('SELECT pg_sleep(0.10)');c=await store.resume(credentials.C,c.attemptId);eq(c.claimedAt,cStart);ok(c.elapsedMs>=elapsed+85);
 // Return along the route to PARTY, then use the approved PARTY → ROOM edge.
 while(c.route.at(-1)!=='party')await change('backtrack');await change('shift','room');
 eq(c.state,'completed');eq(c.shifts,5);eq(c.route,['ice','box','car','pool','party','room']);
 // E's subsequent verified Start is still available and coherent.
 eq((await store.daily(credentials.E)).attempt,null);const e=(await store.start(credentials.E,manifest.id)).attempt;eq(e.route,['ice']);eq(e.state,'active');
 // Penetrate every exposed HTTP boundary as incomplete E after other players completed.
 const config=loadServerConfig({DISCORD_CLIENT_ID:'123456789012345678',DISCORD_CLIENT_SECRET:'synthetic',ALLOWED_ORIGINS:fixtureOrigin});
 const app=createServerApp(config,{exchangeCode:async()=>({access_token:'unused'})},{chainshift:{store,persistence:{check:async()=>({status:'available',schema:'compatible'}),close:async()=>{}}}});
 const headers={Origin:fixtureOrigin,'X-Arcade-Origin':fixtureOrigin,'X-Arcade-Request':'1','X-Arcade-Player':credentials.E.playerId,'X-Arcade-CSRF':credentials.E.csrf,Cookie:'__Host-arcade-session='+credentials.E.token};
 for(const path of ['/daily','/attempt/'+e.attemptId,'/puzzle/'+manifest.id+'/leaderboard','/puzzle/'+manifest.id+'/leaderboard?scope=guild','/puzzle/'+manifest.id+'/routes','/attempt/'+d.attemptId]){
  const response=await request(app).get('/api/chainshift'+path).set(headers);
  eq(response.status,path.endsWith('/routes')?403:path.endsWith(d.attemptId)?404:200);
  ok(!response.text.match(/cold|war|certificate|shortestRoutes|Rehearsal D.*route/));
  ok(response.headers['cache-control'].includes('no-store'));
 }
 // Expiry mid-attempt cannot append or fabricate completion. Reauthentication resumes identical facts.
 await db.query("UPDATE arcade.application_sessions SET idle_expires_at=clock_timestamp()-interval '1 second' WHERE token_digest=$1",[digest(credentials.E.token)]);
 await fails(()=>store.mutate(credentials.E,e.attemptId,randomUUID(),e.revision,'shift','cold'),'expired_session');
 const renewed=(await loginFixture(runtime,{...fixturePlayers.A,userId:credentials.E.playerId,displayName:'Rehearsal E'})).credentials;
 eq((await store.resume(renewed,e.attemptId)).route,['ice']);eq((await store.start(renewed,manifest.id)).attempt.attemptId,e.attemptId);
 await fails(()=>store.resume({...renewed,playerId:credentials.B.playerId},e.attemptId),'account_changed');
 // Reconnect a fresh restricted pool, rather than substituting an in-memory repository.
 const connection=(await db.query("SELECT current_database() AS name,inet_server_port() AS port")).rows[0];
 // Docker's server port differs from its host port; the existing runtime config is intentionally private.
 // Close/reconnect happens through pool lifecycle: a terminated idle backend is replaced on the next transaction.
 const pid=(await runtime.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 await db.query('SELECT pg_terminate_backend($1)',[pid]);await new Promise(r=>setTimeout(r,30));
 eq(await chainshiftReady(runtime),true);eq((await store.resume(d2,d.attemptId)).completedAt,completed.completedAt);
 ok(connection.name.startsWith('arcade_test_chainshift_'));
 // PostgreSQL and JS day keys agree around NY midnight and both DST transitions, independently of session TZ.
 const times=[['2026-10-07T03:59:59Z','2026-10-06'],['2026-10-07T04:00:00Z','2026-10-07'],['2026-03-08T06:59:59Z','2026-03-08'],['2026-03-08T07:00:00Z','2026-03-08'],['2026-11-01T05:30:00Z','2026-11-01'],['2026-11-01T06:30:00Z','2026-11-01']];
 for(const zone of ['UTC','Asia/Tokyo','America/Los_Angeles'])for(const [time,expected] of times){
  const value=await db.transaction(async q=>{await q.query("SELECT set_config('TimeZone',$1,true)",[zone]);return (await q.query("SELECT to_char($1::timestamptz AT TIME ZONE 'America/New_York','YYYY-MM-DD') AS day",[time])).rows[0].day;});eq(value,expected);eq(dayKey(Date.parse(time)),expected);
 }
 // Finish N after rollover, then deliberately start N+1 without rewriting the historical result.
 let selectedDay=manifest.day;const rollover=new ChainshiftStore(runtime,()=>true,()=>selectedDay);
 let old=(await rollover.start(credentials.B,manifest.id)).attempt;const oldStart=old.claimedAt;
 const tomorrow=new Date(manifest.day+'T12:00:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1);selectedDay=tomorrow.toISOString().slice(0,10);
 const nextManifest=createManifest(enrichedReferee,{id:'chainshift-local-ranked-007',number:2,day:selectedDay,start:'soup',finish:'house',generatedAt:manifest.generatedAt});await publishLocalCandidate(db,nextManifest);
 eq((await rollover.daily(credentials.A)).puzzle.id,nextManifest.id);const carry=await rollover.daily(credentials.B);eq(carry.puzzle.id,nextManifest.id);eq(carry.attempt.puzzle.id,manifest.id);eq(carry.attempt.claimedAt,oldStart);
 for(const word of ['cold','war','room'])old=(await rollover.mutate(credentials.B,old.attemptId,randomUUID(),old.revision,'shift',word)).attempt;
 eq(old.puzzle.id,manifest.id);eq(old.puzzle.checksum,manifest.checksum);eq(old.state,'completed');eq((await rollover.start(credentials.B,nextManifest.id)).attempt.puzzle.id,nextManifest.id);eq((await rollover.resume(credentials.B,old.attemptId)).completedAt,old.completedAt);
 await fails(()=>db.query('UPDATE arcade.chainshift_puzzles SET rules_revision=$1 WHERE puzzle_id=$2',['future',manifest.id]));
 // Missing migration and incompatible metadata must fail readiness; restore only our owned fixture.
 await db.transaction(async q=>{await q.query('DELETE FROM arcade.schema_migrations WHERE version=2');await q.query('SET LOCAL ROLE arcade_session_runtime');eq(await chainshiftReady(q),false);throw new DatabaseError('cancelled');}).catch(e=>{assert.equal(e.code,'cancelled');});
 await db.transaction(async q=>{await q.query("UPDATE arcade.schema_migrations SET checksum=repeat('0',64) WHERE version=2");await q.query('SET LOCAL ROLE arcade_session_runtime');eq(await chainshiftReady(q),false);throw new DatabaseError('cancelled');}).catch(e=>{assert.equal(e.code,'cancelled');});
 eq(await chainshiftReady(runtime),true);
 const unavailable=new Database(databaseConfig({PERSISTENCE_CONFIGURED:'true',DATABASE_URL:'postgresql://synthetic@127.0.0.1:1/arcade_test_unavailable',DATABASE_TLS_MODE:'disable'}));
 try{await fails(()=>new ChainshiftStore(unavailable,()=>true).start(renewed,manifest.id));}finally{await unavailable.close();}
 eq((await db.query('SELECT count(*)::int n FROM arcade.game_attempts')).rows[0].n,0);
 // Independently misconfigured gates reject all nonliteral/partial combinations.
 for(const arcade of [undefined,'false','true','TRUE','1'])for(const ranked of [undefined,'false','true','TRUE','1'])eq(chainshiftServerEnabled({CHAINSHIFT_ARCADE_ENABLED:arcade,CHAINSHIFT_RANKED_ENABLED:ranked}),arcade==='true'&&ranked==='true');
 for(const mode of ['production','development','lobby-integration','test'])eq(chainshiftEnabled(mode),false);eq(chainshiftEnabled('chainshift-integration'),true);eq(liveChainshiftDeliveryEnabled,false);
 const storage=new MemoryDailyMessages(),fake=new FakeChainshiftDelivery(),model=new ChainshiftReconciler(storage,fake,true),destination={key:'synthetic-guild-one'};
 const snapshots=[];let first;
 for(const [count,shifts,time] of [[0,null,null],[1,5,51000],[3,5,38000],[4,3,45000],[5,3,45000]]){
  const projection=dailyProjection({puzzleId:manifest.id,day:manifest.day,start:'ice',finish:'room',completedPlayers:count,shortestShifts:shifts,fastestAtShortestMs:time,route:['poison-spoiler']});
  const receipt=await model.reconcile(destination,projection);first??=receipt.messageId;eq(receipt.messageId,first);snapshots.push(dailyCopy(projection));ok(!JSON.stringify(projection).includes('poison-spoiler'));
 }
 fake.loseNextResponse=true;const next=dailyProjection({puzzleId:'next-day',day:'2099-01-01',start:'ice',finish:'room',completedPlayers:0,shortestShifts:null,fastestAtShortestMs:null});
 await fails(()=>model.reconcile(destination,next));const restarted=new ChainshiftReconciler(storage,fake,true);await restarted.reconcile(destination,next);eq(fake.messages.size,2);eq((await restarted.reconcile(destination,next)).changed,false);
 const liveCalls=[];const live=new ChainshiftReconciler(storage,{mode:'discord',createDaily:()=>liveCalls.push(1),updateDaily:()=>liveCalls.push(1),publishResult:()=>liveCalls.push(1)},true);await fails(()=>live.reconcile(destination,next));eq(liveCalls,[]);
 const result=resultProjection({puzzleId:manifest.id,day:manifest.day,displayName:'Rehearsal D',shifts:d.shifts,elapsedMs:d.elapsedMs,route:d.route});ok(!JSON.stringify(result).match(/route|cold|war/));snapshots.push(resultCopy(result));
 mkdirSync('tmp/chainshift/slice7-evidence',{recursive:true});writeFileSync('tmp/chainshift/slice7-evidence/fake-delivery.txt',snapshots.join('\n\n'));
 mkdirSync('tmp/chainshift/slice7-evidence',{recursive:true});writeFileSync('tmp/chainshift/slice7-evidence/database.json',JSON.stringify({checks,passed:true,node:process.version,personas:['A','B','C','D','E'],twoGuilds:true,day:manifest.day,reconnect:'terminated idle backend replaced',timeZones:['UTC','Asia/Tokyo','America/Los_Angeles']},null,2));
 console.log(`Slice 7 disposable PostgreSQL rehearsal passed: ${checks} checks.`);
}finally{await cluster.close();}
