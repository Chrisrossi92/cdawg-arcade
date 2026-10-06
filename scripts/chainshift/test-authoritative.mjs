import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import request from 'supertest';
import {ephemeral} from './ephemeral.mjs';
import {fixtureOrigin,fixturePlayers,loginFixture,seedFixture} from './fixtures.mjs';
import {ChainshiftStore} from '../../build/server/chainshift/store.js';
import {chainshiftReady} from '../../build/server/chainshift/privileges.js';
import {createServerApp} from '../../build/server/app.js';
import {loadServerConfig} from '../../build/server/env.js';
import {schemaStatus,migrate,readMigrations} from '../../build/server/database/migrations.js';
import {createManifest} from '../../build/shared/chainshift/manifest.js';
import {enrichedReferee} from '../../build/shared/chainshift/enrichment/graph-v2.js';
import {publishLocalCandidate} from '../../build/server/chainshift/publication.js';
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++;},ok=x=>{assert.ok(x);checks++;};
const rejects=async(f,reason)=>{await assert.rejects(f,reason?e=>e.reason===reason:undefined);checks++;};
const cluster=await ephemeral();const {db,runtime}=cluster;
try{
 await db.query('ALTER TABLE arcade.chainshift_attempts DISABLE TRIGGER guard_chainshift_attempt');eq(await chainshiftReady(runtime),false);await db.query('ALTER TABLE arcade.chainshift_attempts ENABLE TRIGGER guard_chainshift_attempt');
 await db.query('GRANT INSERT ON arcade.chainshift_puzzles TO arcade_session_runtime');eq(await chainshiftReady(runtime),false);await db.query('REVOKE INSERT ON arcade.chainshift_puzzles FROM arcade_session_runtime');
 eq(await schemaStatus(runtime),'compatible');eq(await migrate(db),0);eq(await chainshiftReady(runtime),true);eq(await chainshiftReady(db),false);
 const changed=readMigrations().map(m=>({...m,checksum:'f'.repeat(64)}));eq(await schemaStatus(db,changed),'checksum_mismatch');await rejects(()=>migrate(db,changed));
 for(const sql of ['CREATE TABLE arcade.forbidden(id int)','DELETE FROM arcade.chainshift_attempts','UPDATE arcade.chainshift_attempts SET claimed_at=clock_timestamp()','UPDATE arcade.chainshift_puzzles SET publication_state=\'unpublished\'','DELETE FROM arcade.chainshift_actions','UPDATE arcade.game_versions SET issuance_enabled=true'])await rejects(()=>runtime.query(sql));
 const manifest=await seedFixture(db),id=manifest.id;
 await rejects(()=>publishLocalCandidate(db,{...manifest,checksum:'wrong'}));await rejects(()=>publishLocalCandidate(db,manifest));
 await rejects(()=>db.query('UPDATE arcade.chainshift_puzzles SET graph_checksum=$1 WHERE puzzle_id=$2',['wrong',id]));
 let day=manifest.day;const store=new ChainshiftStore(runtime,()=>true,()=>day);
 const A=await loginFixture(runtime,fixturePlayers.A),B=await loginFixture(runtime,fixturePlayers.B),A2=await loginFixture(runtime,fixturePlayers.A2);
 await db.query("UPDATE arcade.guilds SET status='enabled'");
 const a=A.credentials,b=B.credentials,a2=A2.credentials;
 const daily=await store.daily(a);eq(daily.puzzle.id,id);eq(daily.attempt,null);ok(!JSON.stringify(daily).match(/certificate|shortest|diversity|cold|war/));
 const emptySummary=await store.dailySummary(a,id,'global');eq(emptySummary.completedPlayers,0);eq(emptySummary.shortestShifts,null);eq(emptySummary.fastestAtShortestMs,null);ok(!JSON.stringify(emptySummary).match(/route|certificate|cold|war|playerId|csrf/));await rejects(()=>store.ownResultSummary(a,id),'not_found');
 const starts=await Promise.all(Array.from({length:6},(_,i)=>store.start(i%2?a:a2,id)));eq(new Set(starts.map(r=>r.attempt.attemptId)).size,1);
 let active=starts[0].attempt;const aid=active.attemptId;eq(active.route,['ice']);eq((await db.query('SELECT count(*)::int n FROM arcade.chainshift_attempts')).rows[0].n,1);
 const originalStart=active.claimedAt;eq((await store.resume(a2,aid)).claimedAt,originalStart);
 await rejects(()=>store.resume(b,aid),'not_found');await rejects(()=>store.start({...a,playerId:b.playerId},id),'account_changed');await rejects(()=>store.start({...a,csrf:'wrong'},id),'csrf_invalid');await rejects(()=>store.daily({...a,token:'x'.repeat(43)}),'expired_session');
 const mutate=async(word,kind='shift',creds=a)=>{const reply=await store.mutate(creds,aid,randomUUID(),active.revision,kind,word);active=reply.attempt;return reply;};
 let key=randomUUID();const firstRevision=active.revision;const first=await store.mutate(a,aid,key,firstRevision,'shift','box');active=first.attempt;eq(active.route,['ice','box']);
 const retry=await store.mutate(a2,aid,key,firstRevision,'shift','box');eq(retry.duplicate,true);eq(retry.attempt.route,active.route);eq(retry.attempt.revision,active.revision);
 await rejects(()=>store.mutate(a,aid,key,firstRevision,'shift','cold'),'request_conflict');
 const concurrent=await Promise.allSettled(['car','office'].map(word=>store.mutate(a,aid,randomUUID(),active.revision,'shift',word)));eq(concurrent.filter(r=>r.status==='fulfilled').length,1);eq(concurrent.filter(r=>r.status==='rejected'&&r.reason.reason==='state_conflict').length,1);active=await store.resume(a,aid);
 // Return from whichever box shift won; removed links never become score facts.
 await mutate(undefined,'backtrack');eq(active.route,['ice','box']);
 let r=await mutate('not-a-word');eq(r.feedback.kind,'rejected');eq(active.route,['ice','box']);r=await mutate('boxes');eq(r.feedback.kind,'rejected');
 key=randomUUID();const rev=active.revision;r=await store.mutate(a,aid,key,rev,'backtrack');active=r.attempt;eq(active.route,['ice']);r=await store.mutate(a,aid,key,rev,'backtrack');eq(r.duplicate,true);eq(r.attempt.route,['ice']);r=await mutate(undefined,'backtrack');eq(active.route,['ice']);
 // Real database clock advances during absence; no client clock is submitted.
 const before=(await store.resume(a,aid)).elapsedMs;await db.query('SELECT pg_sleep(0.08)');const resumed=await store.resume(a2,aid);ok(resumed.elapsedMs>=before+65);eq(resumed.claimedAt,originalStart);
 for(const word of ['cold','war'])await mutate(word);key=randomUUID();const finalRevision=active.revision;const completed=await store.mutate(a,aid,key,finalRevision,'shift','room');active=completed.attempt;
 eq(active.state,'completed');eq(active.shifts,3);eq(active.route,['ice','cold','war','room']);eq(active.claimedAt,originalStart);
 const retries=await Promise.all(Array.from({length:4},()=>store.mutate(a2,aid,key,finalRevision,'shift','room')));eq(new Set(retries.map(r=>r.attempt.completedAt)).size,1);eq(new Set(retries.map(r=>r.attempt.elapsedMs)).size,1);
 const again=retries[0];eq(again.attempt.completedAt,active.completedAt);eq(again.attempt.elapsedMs,active.elapsedMs);eq((await store.start(a,id)).attempt.state,'completed');
 await rejects(()=>store.mutate(a,aid,randomUUID(),active.revision,'shift','cold'),'completed');await rejects(()=>store.mutate(a,aid,randomUUID(),active.revision,'backtrack'),'completed');
 await rejects(()=>runtime.query('UPDATE arcade.chainshift_attempts SET route=$2,revision=revision+1 WHERE attempt_id=$1',[aid,['ice','box']]));await rejects(()=>db.query('DELETE FROM arcade.chainshift_attempts WHERE attempt_id=$1',[aid]));
 const timer=(await db.query('SELECT elapsed_ms::text AS ms,floor(extract(epoch FROM(completed_at-claimed_at))*1000)::text AS computed FROM arcade.chainshift_attempts WHERE attempt_id=$1',[aid])).rows[0];eq(timer.ms,timer.computed);eq(Number(timer.ms),active.elapsedMs);
 await rejects(()=>store.routes(b,id,'global'),'routes_locked');let board=await store.leaderboard(b,id,'global');eq(board.rows.length,1);eq(board.own,null);ok(!JSON.stringify(board).match(/route|cold|war/));
 const beginB=await store.start(b,id);let ba=beginB.attempt;for(const word of ['box','car','pool','party','room'])ba=(await store.mutate(b,ba.attemptId,randomUUID(),ba.revision,'shift',word)).attempt;
 board=await store.leaderboard(b,id,'global');eq(board.rows.map(r=>r.shifts),[3,5]);eq(board.own.shifts,5);eq(board.rows.map(r=>r.rank),[1,2]);
 const summary=await store.dailySummary(b,id,'global');eq(summary.completedPlayers,2);eq(summary.shortestShifts,3);eq(summary.fastestAtShortestMs,active.elapsedMs);ok(!JSON.stringify(summary).match(/route|cold|war/));const result=await store.ownResultSummary(a,id);eq(result.shifts,3);eq(result.elapsedMs,active.elapsedMs);ok(!JSON.stringify(result).match(/route|cold|war|playerId/));eq((await store.dailySummary(a2,id,'guild')).completedPlayers,1);
 const routes=await store.routes(b,id,'global');eq(routes.rows[0].route,['ice','cold','war','room']);eq(routes.rows[1].route,['ice','box','car','pool','party','room']);
 const guild=await store.leaderboard(a2,id,'guild');eq(guild.rows.length,1);eq(guild.own.shifts,3);eq((await db.query('SELECT count(*)::int n FROM arcade.chainshift_attempts')).rows[0].n,2);
 // Publication rollover uses an injected selection fixture; existing attempts retain their original pinned puzzle.
 const next=new Date(day+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);const nextDay=next.toISOString().slice(0,10);
 const m2=createManifest(enrichedReferee,{id:'chainshift-local-ranked-002',number:2,day:nextDay,start:'soup',finish:'house',generatedAt:manifest.generatedAt});await publishLocalCandidate(db,m2);
 const oldOpen=await store.start((await loginFixture(runtime,{...fixturePlayers.B,userId:'678901234567890123'})).credentials,id);day=nextDay;
 eq((await store.resume(b,ba.attemptId)).puzzle.id,id);eq((await store.start(a,m2.id)).attempt.puzzle.id,m2.id);await rejects(()=>store.start(a,id),'state_conflict');
 const C=(await loginFixture(runtime,{...fixturePlayers.B,userId:'678901234567890123'})).credentials;eq((await store.daily(C)).attempt.attemptId,oldOpen.attempt.attemptId);eq((await store.resume(C,oldOpen.attempt.attemptId)).puzzle.id,id);
 // Missing publication and mismatched graph fail closed, including resume.
 day='2099-01-01';eq((await store.daily(a)).attempt.puzzle.id,m2.id);await rejects(()=>store.daily(b),'unavailable');day=manifest.day;
 const bad={...manifest,id:'chainshift-local-ranked-bad',day:'2099-01-02'};
 await db.query(`INSERT INTO arcade.chainshift_puzzles(puzzle_id,day_key,start_word,finish_word,graph_version,graph_checksum,rules_revision,publication_state,certificate) VALUES($1,$2,'ice','room','wrong','wrong','wrong','local-candidate',$3)`,[bad.id,bad.day,JSON.stringify(bad)]);day=bad.day;await rejects(()=>store.start(a,bad.id),'unavailable');day=manifest.day;
 // Exact score ties have equal rank, deterministic player-id display order; milliseconds break equal shifts.
 const tiedDay='2099-01-03';const tied=createManifest(enrichedReferee,{id:'chainshift-local-ranked-ties',number:3,day:tiedDay,start:'ice',finish:'room',generatedAt:manifest.generatedAt});await publishLocalCandidate(db,tied);
 const tiedPlayers=[];for(const userId of ['890123456789012345','901234567890123456','912345678901234567']){const login=await loginFixture(runtime,{...fixturePlayers.B,userId});const player=(await db.query('SELECT player_id,guild_id FROM arcade.application_sessions WHERE token_digest=$1',[(await import('../../build/server/sessions/crypto.js')).digest(login.token)])).rows[0];tiedPlayers.push({...player,credentials:login.credentials});}
 // Owner-only construction of deterministic scored fixtures in this disposable cluster.
 await db.transaction(async c=>{await c.query('ALTER TABLE arcade.chainshift_attempts DISABLE TRIGGER USER');for(let i=0;i<3;i++)await c.query(`INSERT INTO arcade.chainshift_attempts(attempt_id,puzzle_id,player_id,launch_guild_id,claimed_at,route,revision,state,completed_at,final_shifts,elapsed_ms) VALUES($1,$2,$3,$4,'2026-10-01T00:00:00Z',$5,3,'completed',$6,3,$7)`,[randomUUID(),tied.id,tiedPlayers[i].player_id,tiedPlayers[i].guild_id,['ice','cold','war','room'],i===2?'2026-10-01T00:00:00.500Z':'2026-10-01T00:00:01Z',i===2?500:1000]);await c.query('ALTER TABLE arcade.chainshift_attempts ENABLE TRIGGER USER');});
 const ties=await store.leaderboard(tiedPlayers[0].credentials,tied.id,'global');eq(ties.rows.map(r=>r.elapsedMs),[500,1000,1000]);eq(ties.rows.map(r=>r.rank),[1,2,2]);eq(ties.own.rank,2);eq((await store.leaderboard(tiedPlayers[0].credentials,tied.id,'global')).rows.map(r=>r.playerTag),ties.rows.map(r=>r.playerTag));
 const tieSummary=await store.dailySummary(tiedPlayers[0].credentials,tied.id,'global');eq(tieSummary.completedPlayers,3);eq(tieSummary.shortestShifts,3);eq(tieSummary.fastestAtShortestMs,500);
 const unauthorized=await loginFixture(runtime,{...fixturePlayers.A,userId:'923456789012345678'});await rejects(()=>store.routes(unauthorized.credentials,tied.id,'global'),'routes_locked');
 // Continue the old-day active run after rollover and prove the result stays on its original puzzle.
 let ca=await store.resume(C,oldOpen.attempt.attemptId);day=nextDay;for(const word of ['cold','war','room'])ca=(await store.mutate(C,ca.attemptId,randomUUID(),ca.revision,'shift',word)).attempt;eq(ca.puzzle.id,id);eq(ca.state,'completed');day=manifest.day;
 const config=loadServerConfig({DISCORD_CLIENT_ID:'123456789012345678',DISCORD_CLIENT_SECRET:'synthetic',ALLOWED_ORIGINS:fixtureOrigin});
 const persistence={check:async()=>({status:'available',schema:'compatible'}),close:async()=>{}};
 const app=createServerApp(config,{exchangeCode:async()=>({access_token:'unused'})},{chainshift:{store,persistence}});
 const headers=c=>({Origin:fixtureOrigin,'X-Arcade-Origin':fixtureOrigin,'X-Arcade-Request':'1','X-Arcade-Player':c.playerId,'X-Arcade-CSRF':c.csrf,Cookie:'__Host-arcade-session='+c.token});
 const get=path=>request(app).get('/api/chainshift'+path).set(headers(b));
 eq((await get('/daily')).status,200);const boardResponse=await get('/puzzle/'+id+'/leaderboard');eq(boardResponse.status,200);ok(!boardResponse.text.match(/route|certificate|cold|war/));
 eq((await get('/puzzle/'+id+'/routes')).status,200);
 const denied=await request(app).get('/api/chainshift/puzzle/'+tied.id+'/routes').set(headers(unauthorized.credentials));eq(denied.status,403);eq(denied.body,{error:'routes_locked'});
 const stale=await loginFixture(runtime,{...fixturePlayers.B,userId:'934567890123456789'});await db.query("UPDATE arcade.application_sessions SET idle_expires_at=clock_timestamp()-interval '1 second' WHERE token_digest=$1",[(await import('../../build/server/sessions/crypto.js')).digest(stale.token)]);await rejects(()=>store.daily(stale.credentials),'expired_session');
 eq((await request(app).get('/api/chainshift/daily').set({...headers(a),Origin:'https://evil.invalid'})).status,403);
 eq((await request(app).get('/api/chainshift/daily').set({...headers(a),'X-Arcade-Player':b.playerId})).status,403);
 eq((await request(app).post('/api/chainshift/start').set(headers(a)).send({puzzleId:id,elapsedMs:0})).status,400);
 eq((await request(app).post('/api/chainshift/start').set({...headers(a),'X-Arcade-CSRF':'z'.repeat(43)}).send({puzzleId:id})).status,403);
 eq((await request(createServerApp(config,{exchangeCode:async()=>({access_token:'unused'})})).get('/api/chainshift/daily').set(headers(a))).status,503);
 const revocation=await loginFixture(runtime,{...fixturePlayers.A,userId:'789012345678901234'});await db.query('UPDATE arcade.application_sessions SET revoked_at=clock_timestamp() WHERE token_digest=$1',[(await import('../../build/server/sessions/crypto.js')).digest(revocation.token)]);await rejects(()=>store.daily(revocation.credentials),'expired_session');
 eq((await db.query('SELECT count(*)::int n FROM arcade.game_attempts')).rows[0].n,0);eq(await chainshiftReady(runtime),true);
 console.log(`Chainshift real ephemeral PostgreSQL acceptance passed: ${checks} checks; no production credentials or database used.`);
}finally{await cluster.close();}
