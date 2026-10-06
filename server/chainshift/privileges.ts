import {schemaStatus} from '../database/migrations.js';
import type {SqlConnection} from '../database/pool.js';
import {restrictedRuntimeRole} from '../attempts/privileges.js';
export async function grantChainshiftRights(c:SqlConnection){
 await c.query('GRANT SELECT ON arcade.chainshift_puzzles,arcade.chainshift_attempts,arcade.chainshift_actions TO arcade_session_runtime');
 await c.query('GRANT INSERT ON arcade.chainshift_attempts,arcade.chainshift_actions TO arcade_session_runtime');
 await c.query('GRANT UPDATE(route,revision,state) ON arcade.chainshift_attempts TO arcade_session_runtime');
}
export async function chainshiftReady(c:SqlConnection):Promise<boolean>{
 if(await schemaStatus(c)!=='compatible'||!await restrictedRuntimeRole(c,false))return false;
 const r=(await c.query(`SELECT
 EXISTS(SELECT 1 FROM arcade.schema_migrations WHERE version=2) AND
 (SELECT count(*) FROM pg_trigger t JOIN pg_class r ON r.oid=t.tgrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='arcade' AND t.tgname IN ('immutable_chainshift_puzzle','immutable_chainshift_action','guard_chainshift_attempt') AND t.tgenabled='O')=3 AND
 has_table_privilege(current_user,'arcade.chainshift_puzzles','SELECT') AND
 has_table_privilege(current_user,'arcade.chainshift_attempts','SELECT') AND has_table_privilege(current_user,'arcade.chainshift_attempts','INSERT') AND
 has_table_privilege(current_user,'arcade.chainshift_actions','SELECT') AND has_table_privilege(current_user,'arcade.chainshift_actions','INSERT') AND
 has_column_privilege(current_user,'arcade.chainshift_attempts','route','UPDATE') AND
 has_column_privilege(current_user,'arcade.chainshift_attempts','revision','UPDATE') AND
 has_column_privilege(current_user,'arcade.chainshift_attempts','state','UPDATE') AS required,
 has_table_privilege(current_user,'arcade.chainshift_puzzles','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES') OR
 has_any_column_privilege(current_user,'arcade.chainshift_puzzles','INSERT,UPDATE,REFERENCES') OR
 has_table_privilege(current_user,'arcade.chainshift_attempts','UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES') OR
 EXISTS(SELECT 1 FROM unnest(ARRAY['attempt_id','puzzle_id','player_id','launch_guild_id','claimed_at','completed_at','final_shifts','elapsed_ms']) t WHERE has_column_privilege(current_user,'arcade.chainshift_attempts',t,'UPDATE')) OR
 has_table_privilege(current_user,'arcade.chainshift_actions','UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES') OR
 has_any_column_privilege(current_user,'arcade.chainshift_actions','UPDATE,REFERENCES') AS excessive`)).rows[0];
 return r?.required===true&&r.excessive===false;
}
