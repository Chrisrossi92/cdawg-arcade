import {lockGuild,addGuildAccepted,verifyGuild} from '../build/server/guild/projections.js';
// Invoked only inside the owned disposable Postgres harness, with synthetic identities.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import request from 'supertest';
import {AttemptStore as BaseAttemptStore} from '../build/server/attempts/store.js';
import {SessionStore} from '../build/server/sessions/store.js';
import {digest} from '../build/server/sessions/crypto.js';
import {RULESET} from '../build/server/attempts/definition.js';
import {verifyPersonal,addAccepted} from '../build/server/results/aggregates.js';
import {DatabaseError} from '../build/server/database/pool.js';
import {createServerApp} from '../build/server/app.js';
import {loadServerConfig} from '../build/server/env.js';
const AttemptStore=class extends BaseAttemptStore {constructor(db){super(db,id=>/^9[0-9]{17}$/.test(id));}};
export async function testPersonalResults(admin,db) {
  let checks=0,stage='setup',actor=0;
  const eq=(a,b)=>{assert.deepEqual(a,b);checks++;},ok=x=>{assert.ok(x);checks++;};
  const rejects=async(f,code)=>{await assert.rejects(f,code?e=>e.code===code:undefined);checks++;};
  const sessions=new SessionStore(db),store=new AttemptStore(db),origin='https://123456789012345678.discordsays.com';
  const idle={rulesetId:RULESET.id,ticks:42,interruptions:0,inputs:[]};
  const improved={...idle,ticks:63,inputs:[[4,-1],[10,1],[15,0],[22,-1],[29,1],[38,0]]};
  const login=async(userId=String(800000000000000000n+BigInt(++actor)),guildId='900000000000000001')=>{
    const c=await sessions.challenge(origin,null);await sessions.consume(c.id,c.binding,origin,null);
    const s=await sessions.finish(c.id,c.binding,{userId,guildId,displayName:'Synthetic Personal Player',avatarHash:null},origin,null);
    await admin.query("UPDATE arcade.guilds SET status='enabled' WHERE discord_guild_id=$1",[guildId]);
    return {token:s.token,csrf:s.view.csrf};
  };
  const begin=async(c,age=10)=>{const a=await store.begin(c,randomUUID(),RULESET.id);await admin.query("UPDATE arcade.attempt_authorizations SET issued_at=clock_timestamp()-($2*interval '1 second') WHERE attempt_id=$1",[a.attemptId,age]);return a;};
  const identity=async(c)=>(await db.query('SELECT session_id,player_id,guild_id FROM arcade.application_sessions WHERE token_digest=$1',[digest(c.token)])).rows[0];
  const count=async(table,id)=>(await db.query(`SELECT count(*)::int n FROM arcade.${table} WHERE attempt_id=$1`,[id])).rows[0].n;
  const facts=async(c)=>{const s=await identity(c);return (await db.query('SELECT * FROM arcade.personal_game_stats WHERE player_id=$1 AND version_id=$2',[s.player_id,RULESET.versionId])).rows[0];};
  const submit=async(c,e=idle)=>{const a=await begin(c);return {a,result:await store.submit(c,a.attemptId,e)};};
  async function trigger(table,timing,body,deferred=false){
    await admin.query(`CREATE FUNCTION arcade.personal_test_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${body}; RETURN NEW; END $$`);
    await admin.query(`CREATE ${deferred?'CONSTRAINT ':''}TRIGGER personal_test_fault ${timing} ON arcade.${table} ${deferred?'DEFERRABLE INITIALLY DEFERRED ':''}FOR EACH ROW EXECUTE FUNCTION arcade.personal_test_fault()`);
  }
  async function clear(table){await admin.query(`DROP TRIGGER personal_test_fault ON arcade.${table}`);await admin.query('DROP FUNCTION arcade.personal_test_fault()');}
  try {
    const c=await login();eq((await store.stats(c.token)).acceptedCount,'0');eq((await store.recent(c.token)).attempts,[]);
    stage='count, totals and best';
    const first=await submit(c);eq(first.result.reason,'accepted');
    let stats=await store.stats(c.token);eq(stats.acceptedCount,'1');eq(stats.totalTicks,'42');eq(stats.best.attemptId,first.a.attemptId);
    eq(stats.averageTicks,'42.000000');eq(stats.averageSeconds,'0.700000');
    const firstTime=stats.firstAcceptedAt;
    await store.submit(c,first.a.attemptId,idle);eq((await store.stats(c.token)).acceptedCount,'1');
    await rejects(()=>store.submit(c,first.a.attemptId,improved),'submission_conflict');
    await submit(c);eq((await store.stats(c.token)).best.attemptId,first.a.attemptId);
    const higher=await submit(c,improved);eq((await store.stats(c.token)).best.attemptId,higher.a.attemptId);
    await submit(c);stats=await store.stats(c.token);eq(stats.acceptedCount,'4');eq(stats.totalTicks,'189');eq(stats.averageTicks,'47.250000');eq(stats.averageSeconds,'0.787500');eq(stats.firstAcceptedAt,firstTime);ok(stats.lastAcceptedAt>=firstTime);
    eq((await store.recent(c.token)).attempts.length,4);eq((await store.recent(c.token)).attempts[0].ticks,42);
    stage='isolation';
    const stranger=await login();eq((await store.stats(stranger.token)).best,null);
    await rejects(()=>store.status(stranger.token,first.a.attemptId),'not_found');await rejects(()=>store.status(stranger.token,randomUUID()),'not_found');
    await rejects(()=>store.submit(stranger,first.a.attemptId,idle),'not_found');
    const source=await identity(c);
    const strangerResult=await submit(stranger,improved);
    await rejects(()=>admin.query('UPDATE arcade.personal_game_stats SET best_attempt_id=$2,best_ticks=63 WHERE player_id=$1 AND version_id=$3',[source.player_id,strangerResult.a.attemptId,RULESET.versionId]));
    const discord=(await db.query('SELECT discord_user_id FROM arcade.players WHERE player_id=$1',[source.player_id])).rows[0].discord_user_id;
    const anotherGuild=await login(discord,'900000000000000002');await rejects(()=>store.status(anotherGuild.token,first.a.attemptId),'not_found');
    await submit(anotherGuild,improved);eq((await store.stats(c.token)).acceptedCount,'5');eq((await store.stats(c.token)).best.attemptId,higher.a.attemptId);
    const body=JSON.stringify(await store.stats(c.token));for(const privateValue of [discord,source.player_id,source.guild_id,source.session_id,c.token,c.csrf])ok(!body.includes(privateValue));
    // Another ruleset's valid immutable fact is separate, even for the same player.
    const v='00000000-0000-4000-8000-000000000001',foreignVersionAttempt=randomUUID();
    await admin.query(`INSERT INTO arcade.attempt_authorizations(attempt_id,player_id,guild_id,version_id,session_id,begin_key,issued_at,submit_deadline,retry_deadline,state)
      VALUES($1,$2,$3,$4,$5,$6,now(),now()+interval '5 minutes',now()+interval '15 minutes','submitted')`,[foreignVersionAttempt,source.player_id,source.guild_id,v,source.session_id,randomUUID()]);
    await admin.query(`INSERT INTO arcade.game_attempts(attempt_id,player_id,guild_id,version_id,disposition,ticks,max_ticks,interruption_count,accepted_at,reason_code,evidence_digest,validator_revision)
      VALUES($1,$2,$3,$4,'accepted',100,18000,0,now(),'accepted',$5,'synthetic_version')`,[foreignVersionAttempt,source.player_id,source.guild_id,v,'a'.repeat(64)]);
    await addAccepted(admin,foreignVersionAttempt);await admin.transaction(async c=>{await lockGuild(c,source.player_id,source.guild_id,v);await addGuildAccepted(c,foreignVersionAttempt);});eq((await store.stats(c.token)).acceptedCount,'5');eq((await store.recent(c.token)).attempts.length,5);
    await rejects(()=>admin.query('UPDATE arcade.personal_game_stats SET best_attempt_id=$2,best_ticks=100 WHERE player_id=$1 AND version_id=$3',[source.player_id,foreignVersionAttempt,RULESET.versionId]));
    stage='terminal rejection and retention';
    const rejected=await begin(c);const bad={...idle,inputs:[[0,9]],privateField:'DO_NOT_PERSIST_SENTINEL'};
    const invalid=await store.submit(c,rejected.attemptId,bad);eq(invalid.reason,'rejected_invalid_trace');eq(await count('attempt_traces',rejected.attemptId),0);
    eq(await store.submit(c,rejected.attemptId,{privateField:'DO_NOT_PERSIST_SENTINEL',inputs:[[0,9]],interruptions:0,ticks:42,rulesetId:RULESET.id}),invalid);
    await rejects(()=>store.submit(c,rejected.attemptId,idle),'submission_conflict');
    eq((await submit(c,{...idle,interruptions:1})).result.reason,'rejected_interrupted');
    eq((await submit(c,{...idle,ticks:43})).result.reason,'rejected_impossible_result');
    eq((await submit(c,{...idle,rulesetId:'unknown'})).result.reason,'rejected_version');
    const disabled=await begin(c);await admin.query('UPDATE arcade.game_versions SET issuance_enabled=false WHERE version_id=$1',[RULESET.versionId]);
    eq((await store.submit(c,disabled.attemptId,idle)).reason,'rejected_version');await admin.query('UPDATE arcade.game_versions SET issuance_enabled=true WHERE version_id=$1',[RULESET.versionId]);
    const expired=await begin(c,400);await admin.query("UPDATE arcade.attempt_authorizations SET submit_deadline=clock_timestamp()-interval '1 second' WHERE attempt_id=$1",[expired.attemptId]);eq((await store.submit(c,expired.attemptId,idle)).reason,'expired');
    const cancelled=await begin(c);await store.cancel(c,cancelled.attemptId);eq((await store.status(c.token,cancelled.attemptId)).outcome,'practice_only');eq(await count('game_attempts',cancelled.attemptId),0);
    eq((await store.stats(c.token)).acceptedCount,'5');
    eq((await db.query('SELECT extract(epoch FROM(t.expires_at-a.accepted_at))::int seconds FROM arcade.attempt_traces t JOIN arcade.game_attempts a USING(attempt_id) WHERE a.attempt_id=$1',[first.a.attemptId])).rows[0].seconds,604800);
    stage='reconstruction';
    eq((await verifyPersonal(db)).status,'consistent');
    await admin.query('UPDATE arcade.personal_game_stats SET official_count=official_count+1 WHERE player_id=$1 AND version_id=$2',[source.player_id,RULESET.versionId]);
    eq((await verifyPersonal(db)).mismatches,'1');await rejects(()=>store.stats(c.token),'aggregate_mismatch');
    const pending=await begin(c);await rejects(()=>store.submit(c,pending.attemptId,idle),'aggregate_mismatch');eq(await count('game_attempts',pending.attemptId),0);
    // Explicit synthetic fixture repair only; no production repair tool is exposed.
    await admin.query('UPDATE arcade.personal_game_stats SET official_count=official_count-1 WHERE player_id=$1 AND version_id=$2',[source.player_id,RULESET.versionId]);
    await store.submit(c,pending.attemptId,idle);eq((await verifyPersonal(db)).status,'consistent');
    stage='failure atomicity';
    for(const [table,timing,deferred] of [['game_attempts','BEFORE INSERT',false],['personal_game_stats','BEFORE INSERT',false],['attempt_authorizations','AFTER UPDATE',true]]){
      const owner=await login(),a=await begin(owner);await trigger(table,timing,"RAISE EXCEPTION 'PRIVATE_FAULT_SENTINEL'",deferred);
      await rejects(()=>store.submit(owner,a.attemptId,idle));await clear(table);
      eq(await count('game_attempts',a.attemptId),0);eq(await count('attempt_traces',a.attemptId),0);eq(await facts(owner),undefined);
      eq((await db.query('SELECT state,submission_digest FROM arcade.attempt_authorizations WHERE attempt_id=$1',[a.attemptId])).rows[0],{state:'open',submission_digest:null});
      eq((await store.submit(owner,a.attemptId,idle)).reason,'accepted');eq((await store.stats(owner.token)).acceptedCount,'1');
    }
    stage='known abort retries';
    await admin.query('CREATE SEQUENCE arcade.personal_retry_seq');await admin.query('GRANT USAGE,SELECT ON SEQUENCE arcade.personal_retry_seq TO arcade_session_runtime');
    for(const code of ['40001','40P01']){
      const owner=await login(),a=await begin(owner);await admin.query('ALTER SEQUENCE arcade.personal_retry_seq RESTART WITH 1');
      await trigger('personal_game_stats','BEFORE INSERT',`IF nextval('arcade.personal_retry_seq')=1 THEN RAISE EXCEPTION USING ERRCODE='${code}',MESSAGE='synthetic_abort'; END IF`);
      eq((await store.submit(owner,a.attemptId,idle)).reason,'accepted');await clear('personal_game_stats');eq((await store.stats(owner.token)).acceptedCount,'1');eq((await db.query('SELECT last_value::int n FROM arcade.personal_retry_seq')).rows[0].n,2);
    }
    stage='uncertain commit and restart';
    const lostOwner=await login(),lostAttempt=await begin(lostOwner);let transactions=0;
    const uncertain=new AttemptStore({transaction:async work=>{transactions++;await db.transaction(work);throw new DatabaseError('unavailable');}});
    await rejects(()=>uncertain.submit(lostOwner,lostAttempt.attemptId,idle),'unavailable');eq(transactions,1);
    const restarted=new AttemptStore(db);eq((await restarted.status(lostOwner.token,lostAttempt.attemptId)).reason,'accepted');
    eq((await restarted.submit(lostOwner,lostAttempt.attemptId,idle)).reason,'accepted');eq((await restarted.stats(lostOwner.token)).acceptedCount,'1');
    const concurrency=await login(),ca=await begin(concurrency);const racesIdentical=await Promise.allSettled(Array.from({length:8},()=>store.submit(concurrency,ca.attemptId,idle)));eq(racesIdentical.filter(x=>x.status==='fulfilled').length,8);const results=racesIdentical.map(x=>x.value);eq(new Set(results.map(x=>JSON.stringify(x))).size,1);eq((await store.stats(concurrency.token)).acceptedCount,'1');
    const mixed=await begin(concurrency);const races=await Promise.allSettled([store.submit(concurrency,mixed.attemptId,idle),store.submit(concurrency,mixed.attemptId,improved)]);eq(races.filter(x=>x.status==='fulfilled').length,1);eq(races.filter(x=>x.status==='rejected'&&x.reason.code==='submission_conflict').length,1);eq((await store.stats(concurrency.token)).acceptedCount,'2');
    stage='expiry during submission';
    const aging=await login(),agingAttempt=await begin(aging);
    await admin.query("UPDATE arcade.application_sessions SET idle_expires_at=clock_timestamp()+interval '1 second' WHERE token_digest=$1",[digest(aging.token)]);
    let pausedAfterAggregate=false;
    // Hold the real transaction after aggregate SQL, without exceeding a single-query timeout.
    const slow=new AttemptStore({transaction:work=>db.transaction(c=>work({query:async(sql,values)=>{
      const result=await c.query(sql,values);
      if(sql.startsWith('INSERT INTO arcade.personal_game_stats')){pausedAfterAggregate=true;await new Promise(r=>setTimeout(r,1100));}
      return result;
    }}))});
    await rejects(()=>slow.submit(aging,agingAttempt.attemptId,idle),'expired_session');ok(pausedAfterAggregate);eq(await count('game_attempts',agingAttempt.attemptId),0);eq(await facts(aging),undefined);
    stage='owner API';
    const app=createServerApp(loadServerConfig({DISCORD_CLIENT_ID:'123456789012345678',ALLOWED_ORIGINS:origin}),{exchangeCode:async()=>({access_token:'unused'})},{attempts:{store,persistence:{check:async()=>({status:'available',schema:'compatible'}),close:async()=>{}}}});
    const h={'X-Arcade-Origin':origin,'X-Arcade-Request':'1',Cookie:'__Host-arcade-session='+lostOwner.token};
    const response=await request(app).get('/api/me/balance/stats').set(h).expect(200);eq(response.body.acceptedCount,'1');eq(response.headers['cache-control'],'no-store');
    await request(app).get('/api/me/balance/attempts').set(h).expect(200);checks++;
    const foreign=await request(app).get('/api/me/balance/attempts/'+first.a.attemptId).set(h).expect(404);const missing=await request(app).get('/api/me/balance/attempts/'+randomUUID()).set(h).expect(404);eq(foreign.body,missing.body);
    const returned=await request(app).get('/api/me/balance/attempts/'+lostAttempt.attemptId).set(h).expect(200);eq(returned.body.reason,'accepted');
    stage='cleanup';
    const statsBefore=await store.stats(lostOwner.token);await admin.query("UPDATE arcade.attempt_traces SET expires_at=clock_timestamp()-interval '1 second'");await store.purge();eq((await db.query('SELECT count(*)::int n FROM arcade.attempt_traces')).rows[0].n,0);eq(await store.stats(lostOwner.token),statsBefore);eq((await verifyPersonal(db)).status,'consistent');
    eq((await verifyGuild(db)).status,'consistent');
    console.log(`Personal results/statistics Postgres suite passed: ${checks} checks; personal and guild projections consistent.`);
  }catch(error){console.error('Personal fixture stage:',stage);throw error;}
}
