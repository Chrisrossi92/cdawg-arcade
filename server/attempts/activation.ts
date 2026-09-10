import type {SqlConnection} from '../database/pool.js';
import {RULESET} from './definition.js';
import {canaryConfig} from '../canary.js';
/** Explicit administrator transaction; never invoked by the web runtime. */
export async function activateCanary(c:SqlConnection,env:NodeJS.ProcessEnv=process.env){
 if(['ARCADE_ATTEMPTS_ENABLED','OFFICIAL_SCORING_ENABLED','ARCADE_LEADERBOARDS_ENABLED'].some(k=>env[k]==='true'))throw Error('disable_before_activation');
 const policy=canaryConfig(env),guilds=(await c.query('SELECT g.guild_id,g.discord_guild_id FROM arcade.guilds g WHERE EXISTS(SELECT 1 FROM arcade.guild_participations p WHERE p.guild_id=g.guild_id) FOR UPDATE OF g')).rows.filter(g=>policy.allowsGuild(g.discord_guild_id));
 if(guilds.length!==1)throw Error('verified_canary_required');
 await c.query(`INSERT INTO arcade.game_versions(version_id,game_key,ruleset_id,simulation_digest,validator_revision,tick_rate,max_ticks,issuance_enabled)
 VALUES($1,'balance',$2,$3,$4,$5,$6,false) ON CONFLICT(version_id) DO NOTHING`,[RULESET.versionId,RULESET.id,RULESET.simulationDigest,RULESET.validatorRevision,RULESET.tickRate,RULESET.maxTicks]);
 const v=(await c.query('SELECT * FROM arcade.game_versions WHERE version_id=$1 FOR UPDATE',[RULESET.versionId])).rows[0];
 if(v.ruleset_id!==RULESET.id||v.simulation_digest!==RULESET.simulationDigest||v.validator_revision!==RULESET.validatorRevision||v.tick_rate!==RULESET.tickRate||v.max_ticks!==RULESET.maxTicks||v.game_key!=='balance')throw Error('immutable_rules_mismatch');
 await c.query("UPDATE arcade.guilds SET status='enabled' WHERE guild_id=$1",[guilds[0].guild_id]);
 if(!v.issuance_enabled){
  await c.query('UPDATE arcade.game_versions SET issuance_enabled=true,submission_deadline=NULL WHERE version_id=$1',[RULESET.versionId]);
  await c.query(`INSERT INTO arcade.security_events(event_id,event_type,reason_code,occurred_at,expires_at)
   VALUES(gen_random_uuid(),'ruleset_activation','private_canary',clock_timestamp(),clock_timestamp()+interval '24 months')`);
 }
 return {status:'activated',ruleset:RULESET.id,guildCount:1,semanticsChanged:false};
}
