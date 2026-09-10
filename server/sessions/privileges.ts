import type {SqlConnection} from '../database/pool.js';
export async function restrictedSessionRole(db:SqlConnection, attemptWrites = false, personalWrites = false):Promise<boolean> {
  const role=await db.query(`SELECT rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user`);
  if (!role.rows[0] || Object.values(role.rows[0]).some(Boolean)) return false;
  const result=await db.query(`SELECT
    EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='arcade' AND pg_has_role(current_user,c.relowner,'MEMBER')) AS owns_relations,
    has_schema_privilege(current_user,'arcade','CREATE') AS can_create,
    EXISTS(SELECT 1 FROM unnest($1::text[]) AS t
      WHERE (has_table_privilege(current_user,'arcade.'||t,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(current_user,'arcade.'||t,'INSERT,UPDATE,REFERENCES'))) AS score_write`, [attemptWrites ? [...(personalWrites?[]:['personal_game_stats']),'guild_leaderboard_entries','guild_game_records','guild_record_events','game_versions','schema_migrations'] : ['attempt_authorizations','game_attempts','attempt_traces','personal_game_stats','guild_leaderboard_entries','guild_game_records','guild_record_events','game_versions','schema_migrations']]);
  return !!result.rows[0] && !Object.values(result.rows[0]).some(Boolean);
}
