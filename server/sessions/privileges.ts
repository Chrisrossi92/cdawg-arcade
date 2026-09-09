import type {SqlConnection} from '../database/pool.js';
export async function restrictedSessionRole(db:SqlConnection):Promise<boolean> {
  const role=await db.query(`SELECT rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user`);
  if (!role.rows[0] || Object.values(role.rows[0]).some(Boolean)) return false;
  const result=await db.query(`SELECT
    EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='arcade' AND pg_has_role(current_user,c.relowner,'MEMBER')) AS owns_relations,
    has_schema_privilege(current_user,'arcade','CREATE') AS can_create,
    EXISTS(SELECT 1 FROM unnest(ARRAY['attempt_authorizations','game_attempts','attempt_traces','personal_game_stats','guild_leaderboard_entries','guild_game_records','guild_record_events','game_versions','schema_migrations']) AS t
      WHERE has_table_privilege(current_user,'arcade.'||t,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) AS score_write`);
  return !!result.rows[0] && !Object.values(result.rows[0]).some(Boolean);
}
