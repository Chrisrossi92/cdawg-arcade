import type { SqlConnection } from '../database/pool.js';
import { restrictedSessionRole } from '../sessions/privileges.js';
export async function restrictedAttemptRole(db:SqlConnection):Promise<boolean> {
  if (!await restrictedSessionRole(db,true,true,true)) return false;
  const result=await db.query(`SELECT
    has_table_privilege(current_user,'arcade.attempt_authorizations','SELECT') AND
    has_table_privilege(current_user,'arcade.attempt_authorizations','INSERT') AND
    has_table_privilege(current_user,'arcade.attempt_authorizations','UPDATE') AND
    has_table_privilege(current_user,'arcade.game_attempts','SELECT') AND
    has_table_privilege(current_user,'arcade.game_attempts','INSERT') AND
    has_table_privilege(current_user,'arcade.attempt_traces','SELECT') AND
    has_table_privilege(current_user,'arcade.attempt_traces','INSERT') AND
    has_table_privilege(current_user,'arcade.attempt_traces','DELETE') AND
    has_table_privilege(current_user,'arcade.personal_game_stats','SELECT') AND
    has_table_privilege(current_user,'arcade.personal_game_stats','INSERT') AND
    has_table_privilege(current_user,'arcade.personal_game_stats','UPDATE') AND
    has_table_privilege(current_user,'arcade.guild_leaderboard_entries','SELECT') AND
    has_table_privilege(current_user,'arcade.guild_game_records','SELECT') AND
    has_table_privilege(current_user,'arcade.guild_record_events','SELECT') AND
    has_table_privilege(current_user,'arcade.guild_leaderboard_entries','INSERT') AND has_table_privilege(current_user,'arcade.guild_leaderboard_entries','UPDATE') AND
    has_table_privilege(current_user,'arcade.guild_game_records','INSERT') AND has_table_privilege(current_user,'arcade.guild_game_records','UPDATE') AND
    has_table_privilege(current_user,'arcade.guild_record_events','INSERT') AS required,
    has_table_privilege(current_user,'arcade.attempt_authorizations','DELETE,TRUNCATE,REFERENCES,TRIGGER') OR
    has_table_privilege(current_user,'arcade.game_attempts','UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR
    has_any_column_privilege(current_user,'arcade.game_attempts','UPDATE,REFERENCES') OR
    has_table_privilege(current_user,'arcade.attempt_traces','UPDATE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(current_user,'arcade.attempt_traces','UPDATE,REFERENCES') OR has_table_privilege(current_user,'arcade.personal_game_stats','DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(current_user,'arcade.personal_game_stats','REFERENCES') OR has_table_privilege(current_user,'arcade.guild_leaderboard_entries','DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_table_privilege(current_user,'arcade.guild_game_records','DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_table_privilege(current_user,'arcade.guild_record_events','UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_any_column_privilege(current_user,'arcade.guild_record_events','UPDATE,REFERENCES')
    OR has_any_column_privilege(current_user,'arcade.guild_game_records','REFERENCES')
    OR has_any_column_privilege(current_user,'arcade.guild_leaderboard_entries','REFERENCES') AS excessive`);
  return result.rows[0]?.required===true && result.rows[0]?.excessive===false;
}

// Grants and feature availability are independent. Disabled routes stay disabled even
// when the exact future result privileges have been staged by an administrator.
export async function restrictedRuntimeRole(db:SqlConnection,attemptsEnabled:boolean):Promise<boolean> {
  return attemptsEnabled ? restrictedAttemptRole(db) : await restrictedSessionRole(db) || await restrictedAttemptRole(db);
}
