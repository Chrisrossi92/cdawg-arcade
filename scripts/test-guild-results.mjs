// Only invoked against the harness-owned disposable Postgres with synthetic identities.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import request from 'supertest';
import {AttemptStore as BaseAttemptStore} from '../build/server/attempts/store.js';
import {SessionStore} from '../build/server/sessions/store.js';
import {digest} from '../build/server/sessions/crypto.js';
import {RULESET} from '../build/server/attempts/definition.js';
import {GuildStore as BaseGuildStore,displayName} from '../build/server/guild/store.js';
import {verifyGuild,previewExclusion,lockGuild,addGuildAccepted} from '../build/server/guild/projections.js';
import {verifyPersonal,addAccepted} from '../build/server/results/aggregates.js';
import {grantResultRights} from '../build/server/guild/grants.js';
import {restrictedAttemptRole,restrictedRuntimeRole} from '../build/server/attempts/privileges.js';
import {createServerApp} from '../build/server/app.js';
import {loadServerConfig} from '../build/server/env.js';
const GuildStore=class extends BaseGuildStore {constructor(db,supported){super(db,supported,id=>/^9[0-9]{17}$/.test(id));}};
const AttemptStore=class extends BaseAttemptStore {constructor(db){super(db,id=>/^9[0-9]{17}$/.test(id));}};
export async function testGuildResults(admin,db){
 let checks=0,actor=0,stage='setup';
 const eq=(a,b)=>{assert.deepEqual(a,b);checks++;},ok=x=>{assert.ok(x);checks++;};
 const reject=async(f,code)=>{await assert.rejects(f,code?e=>e.code===code:undefined);checks++;};
 const sessions=new SessionStore(db),attempts=new AttemptStore(db),boards=new GuildStore(db),origin='https://123456789012345678.discordsays.com';
 const idle={rulesetId:RULESET.id,ticks:42,interruptions:0,inputs:[]},higher={...idle,ticks:63,inputs:[[4,-1],[10,1],[15,0],[22,-1],[29,1],[38,0]]};
 const login=async(guild='910000000000000001',user=String(810000000000000000n+BigInt(++actor)),name='Same Name')=>{
  const c=await sessions.challenge(origin,null);await sessions.consume(c.id,c.binding,origin,null);
  const s=await sessions.finish(c.id,c.binding,{userId:user,guildId:guild,displayName:name,avatarHash:null},origin,null);
  await admin.query("UPDATE arcade.guilds SET status='enabled' WHERE discord_guild_id=$1",[guild]);
  const ids=(await db.query('SELECT player_id,guild_id FROM arcade.application_sessions WHERE token_digest=$1',[digest(s.token)])).rows[0];
  return {token:s.token,csrf:s.view.csrf,...ids,user};
 };
 const begin=async(c)=>{const a=await attempts.begin(c,randomUUID(),RULESET.id);await admin.query("UPDATE arcade.attempt_authorizations SET issued_at=clock_timestamp()-interval '10 seconds' WHERE attempt_id=$1",[a.attemptId]);return a;};
 const submit=async(c,e=idle)=>{const a=await begin(c);return {a,result:await attempts.submit(c,a.attemptId,e)};};
 const events=async(c)=>(await db.query('SELECT sequence::text,new_ticks,previous_ticks FROM arcade.guild_record_events WHERE guild_id=$1 AND version_id=$2 ORDER BY sequence',[c.guild_id,RULESET.versionId])).rows;
 try{
  await admin.transaction(grantResultRights);await admin.transaction(grantResultRights);eq(await restrictedAttemptRole(db),true);eq(await restrictedRuntimeRole(db,false),true);eq(await restrictedRuntimeRole(db,true),true);
  stage='strict best and stable metadata';
  const c=await login();eq((await boards.leaderboard(c.token)).entries,[]);
  const first=await submit(c);eq(first.result.personalBest,true);eq(first.result.guildBest,true);eq(first.result.newGuildRecord,true);eq(first.result.recordSequence,'1');
  const firstPage=await boards.leaderboard(c.token);eq(firstPage.entries.length,1);eq(firstPage.ownEntry.rank,'1');eq(firstPage.ownEntry.inPage,true);
  const equal=await submit(c);eq(equal.result.guildBest,false);eq(equal.result.newGuildRecord,false);eq((await boards.leaderboard(c.token)).entries,firstPage.entries);
  const improved=await submit(c,higher);eq(improved.result.guildBest,true);eq(improved.result.recordSequence,'2');
  const lower=await submit(c);eq(lower.result.guildBest,false);eq(lower.result.recordSequence,null);
  eq(await attempts.submit(c,first.a.attemptId,idle),first.result);eq(await attempts.status(c.token,first.a.attemptId),first.result);
  await reject(()=>attempts.submit(c,first.a.attemptId,higher),'submission_conflict');
  eq(await events(c),[{sequence:'1',new_ticks:42,previous_ticks:null},{sequence:'2',new_ticks:63,previous_ticks:42}]);
  eq((await verifyGuild(db)).status,'consistent');eq((await verifyPersonal(db)).status,'consistent');
  stage='concurrent first, equal and higher/lower';
  for(const [guild,second] of [['910000000000000002',idle],['910000000000000003',higher]]){
   const a=await login(guild),b=await login(guild),aa=await begin(a),ba=await begin(b);
   const result=await Promise.all([attempts.submit(a,aa.attemptId,idle),attempts.submit(b,ba.attemptId,second)]);eq(result.every(r=>r.reason==='accepted'),true);
   const ev=await events(a);eq(ev.map(r=>r.sequence),ev.map((_,i)=>String(i+1)));eq(ev.at(-1).new_ticks,second.ticks);
   if(second===idle)eq(ev.length,1);else ok(ev.length===1||ev.length===2);
   eq((await boards.leaderboard(a.token)).entries.length,2);eq((await verifyGuild(db)).status,'consistent');
  }
  stage='guild isolation, names and pagination';
  const pageUsers=[];for(let i=0;i<30;i++){const u=await login('910000000000000004');await submit(u);pageUsers.push(u);}
  const last=pageUsers.at(-1),page=await boards.leaderboard(last.token);eq(page.entries.length,25);eq(page.ownEntry.rank,'30');eq(page.ownEntry.inPage,false);
  const tail=await boards.leaderboard(last.token,{cursor:page.nextCursor});eq(tail.entries.length,5);eq(tail.nextCursor,null);eq(tail.ownEntry.inPage,true);
  const all=[...page.entries,...tail.entries];eq(new Set(all.map(r=>r.playerTag)).size,30);eq(all.map(r=>r.rank),Array.from({length:30},(_,i)=>String(i+1)));eq((await boards.leaderboard(last.token,{limit:'100'})).entries.length,30);
  for(const limit of ['0','101','-1','1.5','01','NaN'])await reject(()=>boards.leaderboard(c.token,{limit}),'invalid_request');
  for(const cursor of ['', 'bad',Buffer.from('{}').toString('base64url'),page.nextCursor+'='])await reject(()=>boards.leaderboard(c.token,{cursor}),'invalid_cursor');
  await reject(()=>boards.leaderboard(c.token,{cursor:page.nextCursor}),'invalid_cursor');
  await reject(()=>boards.leaderboard(c.token,{guild:last.guild_id}),'invalid_request');await reject(()=>boards.leaderboard(c.token,{ruleset:'unsupported'}),'invalid_request');
  eq(all[0].displayName,all[1].displayName);ok(all[0].playerTag!==all[1].playerTag);
  const renamed=await login('910000000000000004',last.user,'<script> & New Name');const named=await boards.leaderboard(renamed.token);eq(named.ownEntry.playerTag,page.ownEntry.playerTag);eq(named.ownEntry.displayName,'&lt;script&gt; &amp; New Name');eq(named.ownEntry.rank,'30');
  eq(displayName('x'.repeat(100)).length,80);eq(displayName('\u202e\u0001'), 'Player');
  const cross=await login('910000000000000005',last.user);eq((await boards.leaderboard(cross.token)).ownEntry,null);await submit(cross,higher);eq((await boards.leaderboard(cross.token)).ownEntry.rank,'1');eq((await boards.leaderboard(last.token)).ownEntry.rank,'30');
  const serialized=JSON.stringify(named);for(const privateValue of [last.user,last.player_id,last.guild_id,last.token,last.csrf])ok(!serialized.includes(privateValue));
  // A changed board invalidates the revision-bound cursor instead of skipping/misordering entries.
  await submit(last,higher);await reject(()=>boards.leaderboard(last.token,{cursor:page.nextCursor}),'invalid_cursor');
  stage='complete tuple and administrative recalculation';
  const tieUsers=[await login('910000000000000006'),await login('910000000000000006')].sort((a,b)=>a.player_id.localeCompare(b.player_id));
  // Historical synthetic facts deliberately share a timestamp to exercise the UUID tie-break.
  for(const u of tieUsers){const a=await begin(u);await admin.transaction(async tx=>{
   await lockGuild(tx,u.player_id,u.guild_id,RULESET.versionId);
   await tx.query(`INSERT INTO arcade.game_attempts(attempt_id,player_id,guild_id,version_id,disposition,ticks,max_ticks,interruption_count,accepted_at,reason_code,evidence_digest,validator_revision)
    VALUES($1,$2,$3,$4,'accepted',42,18000,0,'2000-01-01T00:00:00Z','accepted',$5,'synthetic_tie')`,[a.attemptId,u.player_id,u.guild_id,RULESET.versionId,'b'.repeat(64)]);
   await addAccepted(tx,a.attemptId);await addGuildAccepted(tx,a.attemptId);await tx.query("UPDATE arcade.attempt_authorizations SET state='submitted' WHERE attempt_id=$1",[a.attemptId]);
  });}
  const tied=await boards.leaderboard(tieUsers[1].token,{limit:'1'});eq(tied.entries[0].playerTag,digest(tieUsers[0].guild_id+'/'+tieUsers[0].player_id).slice(0,20));eq(tied.ownEntry.rank,'2');eq((await boards.leaderboard(tieUsers[1].token,{cursor:tied.nextCursor,limit:'1'})).entries[0].isYou,true);eq((await events(tieUsers[0])).length,1);
  const beforeAdmin=await events(last);eq(await previewExclusion(db,last.guild_id,RULESET.versionId,[last.player_id]),{mode:'administrative_preview',entries:'29',recordTicks:42,competitiveEventsCreated:0});eq(await events(last),beforeAdmin);
  await admin.query("UPDATE arcade.players SET display_name='Deleted player',avatar_hash=NULL WHERE player_id=$1",[tieUsers[0].player_id]);eq((await boards.leaderboard(tieUsers[1].token)).entries[0].displayName,'Deleted player');eq((await events(tieUsers[0])).length,1);eq((await verifyGuild(db)).status,'consistent');
  stage='ruleset archive';
  const archive=(await db.query("SELECT ruleset_id FROM arcade.game_versions WHERE version_id='00000000-0000-4000-8000-000000000001'")).rows[0].ruleset_id;
  const archiveStore=new GuildStore(db,[RULESET.id,archive]);eq((await archiveStore.leaderboard(c.token,{ruleset:archive})).entries,[]);eq((await archiveStore.leaderboard(c.token,{ruleset:archive})).archived,true);
  const fresh=(await boards.leaderboard(last.token)).nextCursor;await reject(()=>archiveStore.leaderboard(last.token,{ruleset:archive,cursor:fresh}),'invalid_cursor');
  stage='failure atomicity';
  for(const [table,timing,deferred] of [['guild_leaderboard_entries','BEFORE INSERT',false],['guild_record_events','BEFORE INSERT',false],['guild_record_events','AFTER INSERT',true]]){
   const u=await login(String(920000000000000000n+BigInt(++actor))),a=await begin(u);
   await admin.query("CREATE FUNCTION arcade.guild_test_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'PRIVATE_TEST_FAULT'; RETURN NEW; END $$");
   await admin.query(`CREATE ${deferred?'CONSTRAINT ':''}TRIGGER guild_test_fault ${timing} ON arcade.${table} ${deferred?'DEFERRABLE INITIALLY DEFERRED ':''}FOR EACH ROW EXECUTE FUNCTION arcade.guild_test_fault()`);
   await reject(()=>attempts.submit(u,a.attemptId,idle));
   await admin.query(`DROP TRIGGER guild_test_fault ON arcade.${table}`);await admin.query('DROP FUNCTION arcade.guild_test_fault()');
   for(const t of ['game_attempts','guild_leaderboard_entries','guild_game_records','guild_record_events'])eq((await db.query(`SELECT count(*)::int n FROM arcade.${t} WHERE guild_id=$1`,[u.guild_id])).rows[0].n,0);
   eq((await attempts.submit(u,a.attemptId,idle)).recordSequence,'1');
  }
  stage='reconstruction mismatch and administration preview';
  const snapshot=await events(c),before=await verifyGuild(db);
  const preview=await previewExclusion(db,c.guild_id,RULESET.versionId,[c.player_id]);eq(preview,{mode:'administrative_preview',entries:'0',recordTicks:null,competitiveEventsCreated:0});eq(await events(c),snapshot);eq(await verifyGuild(db),before);
  // Restricted role cannot mutate or delete the immutable event history.
  await reject(()=>db.query('UPDATE arcade.guild_record_events SET new_ticks=new_ticks'));await reject(()=>db.query('DELETE FROM arcade.guild_record_events'));
  await admin.query("UPDATE arcade.guild_leaderboard_entries SET best_accepted_at=best_accepted_at+interval '1 second' WHERE guild_id=$1",[c.guild_id]);eq((await verifyGuild(db)).boardMismatches,'1');await reject(()=>boards.leaderboard(c.token),'projection_mismatch');
  const pending=await begin(c);await reject(()=>attempts.submit(c,pending.attemptId,idle),'aggregate_mismatch');
  await admin.query("UPDATE arcade.guild_leaderboard_entries SET best_accepted_at=best_accepted_at-interval '1 second' WHERE guild_id=$1",[c.guild_id]);
  await admin.query('UPDATE arcade.guild_game_records SET sequence=sequence+1 WHERE guild_id=$1',[c.guild_id]);eq((await verifyGuild(db)).recordMismatches,'1');await admin.query('UPDATE arcade.guild_game_records SET sequence=sequence-1 WHERE guild_id=$1',[c.guild_id]);
  const saved=(await admin.query('DELETE FROM arcade.guild_record_events WHERE guild_id=$1 AND sequence=2 RETURNING *',[c.guild_id])).rows[0];eq((await verifyGuild(db)).eventMismatches,'1');
  await admin.query('INSERT INTO arcade.guild_record_events(event_id,guild_id,version_id,sequence,record_attempt_id,new_ticks,previous_attempt_id,previous_ticks,occurred_at) SELECT $1,$2,$3,$4,$5,$6,$7,$8,accepted_at FROM arcade.game_attempts WHERE attempt_id=$5',[saved.event_id,saved.guild_id,saved.version_id,saved.sequence,saved.record_attempt_id,saved.new_ticks,saved.previous_attempt_id,saved.previous_ticks]);
  eq((await verifyGuild(db)).status,'consistent');
  const columns=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='arcade' AND table_name='guild_record_events'")).rows.map(r=>r.column_name);ok(columns.every(n=>!/(channel|message|delivery|token|mention)/.test(n)));
  stage='API gates and outage';
  const config=loadServerConfig({DISCORD_CLIENT_ID:'123456789012345678',ALLOWED_ORIGINS:origin}),auth={exchangeCode:async()=>({access_token:'unused'})};
  const h={'X-Arcade-Origin':origin,'X-Arcade-Request':'1',Cookie:'__Host-arcade-session='+c.token};
  const app=createServerApp(config,auth,{guild:{store:boards,persistence:{check:async()=>({status:'available',schema:'compatible'}),close:async()=>{}}}});
  const response=await request(app).get('/api/guild/balance/leaderboard').set(h).expect(200);eq(response.headers['cache-control'],'no-store');
  await request(app).get('/api/guild/balance/leaderboard?guild_id=private').set(h).expect(400);checks++;
  await request(app).get('/api/guild/balance/leaderboard').expect(403);checks++;
  await request(app).get('/api/guild/balance/leaderboard').set({'X-Arcade-Origin':origin,'X-Arcade-Request':'1'}).expect(401);checks++;
  const disabled=createServerApp(config,auth),disabledResult=await request(disabled).get('/api/guild/balance/leaderboard').set(h).expect(503);eq(disabledResult.body,{error:'leaderboard_unavailable'});
  const down=createServerApp(config,auth,{guild:{store:boards,persistence:{check:async()=>({status:'unavailable'}),close:async()=>{}}}});eq((await request(down).get('/api/guild/balance/leaderboard').set(h).expect(503)).body,{error:'leaderboard_unavailable'});
  await admin.query("UPDATE arcade.guilds SET status='disabled' WHERE guild_id=$1",[c.guild_id]);await reject(()=>boards.leaderboard(c.token),'expired_session');await admin.query("UPDATE arcade.guilds SET status='enabled' WHERE guild_id=$1",[c.guild_id]);
  eq(await verifyGuild(db),before);eq((await verifyPersonal(db)).status,'consistent');
  console.log(`Guild leaderboard/record Postgres suite passed: ${checks} checks; no Discord delivery.`);
 }catch(error){console.error('Guild fixture stage:',stage);throw error;}
}
