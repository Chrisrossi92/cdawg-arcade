import type {SqlConnection} from '../database/pool.js';
// Explicit additive administration only. Never creates a role or changes a password.
export async function grantResultRights(c:SqlConnection) {
  const r=(await c.query("SELECT rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls FROM pg_roles WHERE rolname='arcade_session_runtime'")).rows[0];
  if(!r||Object.values(r).some(Boolean))throw Error('restricted_role_required');
  await c.query('GRANT SELECT ON arcade.attempt_authorizations,arcade.game_attempts,arcade.attempt_traces,arcade.personal_game_stats,arcade.guild_leaderboard_entries,arcade.guild_game_records,arcade.guild_record_events TO arcade_session_runtime');
  await c.query('GRANT INSERT,UPDATE ON arcade.attempt_authorizations,arcade.personal_game_stats,arcade.guild_leaderboard_entries,arcade.guild_game_records TO arcade_session_runtime');
  await c.query('GRANT INSERT ON arcade.game_attempts,arcade.attempt_traces,arcade.guild_record_events TO arcade_session_runtime');
  await c.query('GRANT DELETE ON arcade.attempt_traces TO arcade_session_runtime');
}
