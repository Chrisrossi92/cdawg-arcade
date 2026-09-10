import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {canaryConfig} from '../build/server/canary.js';
import {AttemptStore} from '../build/server/attempts/store.js';
import {GuildStore} from '../build/server/guild/store.js';
import {SessionStore} from '../build/server/sessions/store.js';
import {activateCanary} from '../build/server/attempts/activation.js';
import {RULESET} from '../build/server/attempts/definition.js';
export async function testCanary(admin,db){
 let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};const reject=async(f,code)=>{await assert.rejects(f,e=>e.code===code);checks++;};
 const origin='https://123456789012345678.discordsays.com',guild='930000000000000001';
 const env={ARCADE_CANARY_GUILD_IDS:guild,ARCADE_ATTEMPTS_ENABLED:'true',OFFICIAL_SCORING_ENABLED:'true',ARCADE_LEADERBOARDS_ENABLED:'true'};
 const policy=canaryConfig(env),sessions=new SessionStore(db,Date.now,policy);
 async function login(guildId){const c=await sessions.challenge(origin,null);await sessions.consume(c.id,c.binding,origin,null);const s=await sessions.finish(c.id,c.binding,{userId:'830000000000000001',guildId,displayName:'Canary fixture',avatarHash:null},origin,null);await admin.query("UPDATE arcade.guilds SET status='enabled' WHERE discord_guild_id=$1",[guildId]);return {token:s.token,csrf:s.view.csrf};}
 const owner=await login(guild),other=await login('930000000000000002');
 eq((await sessions.me(owner.token,origin)).officialAvailability,'eligible');eq((await sessions.me(other.token,origin)).officialAvailability,'other-server');
 const store=new AttemptStore(db,policy.allowsGuild),board=new GuildStore(db,undefined,policy.allowsGuild);
 await reject(()=>store.begin(other,randomUUID(),RULESET.id),'attempts_unavailable');await reject(()=>store.stats(other.token),'attempts_unavailable');await reject(()=>board.leaderboard(other.token),'board_unavailable');
 await reject(()=>new AttemptStore(db).begin(owner,randomUUID(),RULESET.id),'attempts_unavailable');await reject(()=>new GuildStore(db).leaderboard(owner.token),'board_unavailable');
 const a=await store.begin(owner,randomUUID(),RULESET.id);eq(a.rulesetId,RULESET.id);
 const revoked=new AttemptStore(db,()=>false);await reject(()=>revoked.submit(owner,a.attemptId,{rulesetId:RULESET.id,ticks:42,interruptions:0,inputs:[]}),'attempts_unavailable');
 eq((await db.query('SELECT count(*)::int n FROM arcade.game_attempts WHERE attempt_id=$1',[a.attemptId])).rows[0].n,0);await store.cancel(owner,a.attemptId);
 const denied=new SessionStore(db,Date.now,canaryConfig({...env,OFFICIAL_SCORING_ENABLED:'false'}));eq((await denied.me(owner.token,origin)).officialAvailability,'unavailable');
 // Audited activation never changes immutable semantics, and cannot run with enabled flags.
 await assert.rejects(()=>admin.transaction(c=>activateCanary(c,env)));checks++;
 const disabled={...env,ARCADE_ATTEMPTS_ENABLED:'false',OFFICIAL_SCORING_ENABLED:'false',ARCADE_LEADERBOARDS_ENABLED:'false'};
 await admin.query('UPDATE arcade.game_versions SET issuance_enabled=false WHERE version_id=$1',[RULESET.versionId]);
 const first=await admin.transaction(c=>activateCanary(c,disabled));eq(first.semanticsChanged,false);eq(first.guildCount,1);eq(await admin.transaction(c=>activateCanary(c,disabled)),first);
 eq((await db.query("SELECT count(*)::int n FROM arcade.security_events WHERE event_type='ruleset_activation'")).rows[0].n,1);
 await admin.query("DELETE FROM arcade.security_events WHERE event_type='ruleset_activation'");
 console.log(`Private canary Postgres suite passed: ${checks} checks; synthetic identities only.`);
}
