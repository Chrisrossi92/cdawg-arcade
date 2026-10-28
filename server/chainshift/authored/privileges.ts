import type {SqlConnection} from '../../database/pool.js';
import {schemaStatus} from '../../database/migrations.js';
import {restrictedRuntimeRole} from '../../attempts/privileges.js';
import {authoredCatalogApproved,authoredCatalog} from './catalog.js';
import {validAuthoredPublication} from './publication.js';
export async function grantAuthoredRights(c:SqlConnection){
 await c.query('GRANT SELECT ON arcade.chainshift_authored_puzzles,arcade.chainshift_authored_attempts,arcade.chainshift_authored_actions TO arcade_session_runtime');
 await c.query('GRANT INSERT ON arcade.chainshift_authored_attempts,arcade.chainshift_authored_actions TO arcade_session_runtime');
 await c.query('GRANT UPDATE(state) ON arcade.chainshift_authored_attempts TO arcade_session_runtime');
}
export async function authoredReady(c:SqlConnection,requireContent=true,allowFixture=false):Promise<boolean>{
 if(await schemaStatus(c)!=='compatible'||!await restrictedRuntimeRole(c,false))return false;
 const r=(await c.query(`SELECT EXISTS(SELECT 1 FROM arcade.schema_migrations WHERE version=4) AND
 (SELECT count(*) FROM pg_trigger WHERE tgname IN ('immutable_authored_publication','immutable_authored_receipt','guard_authored_attempt') AND tgenabled='O')=3 AND
 has_table_privilege(current_user,'arcade.chainshift_authored_puzzles','SELECT') AND
 has_table_privilege(current_user,'arcade.chainshift_authored_attempts','SELECT') AND has_table_privilege(current_user,'arcade.chainshift_authored_attempts','INSERT') AND
 has_column_privilege(current_user,'arcade.chainshift_authored_attempts','state','UPDATE') AND
 has_table_privilege(current_user,'arcade.chainshift_authored_actions','SELECT') AND has_table_privilege(current_user,'arcade.chainshift_authored_actions','INSERT') AS required,
 has_table_privilege(current_user,'arcade.chainshift_authored_puzzles','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(current_user,'arcade.chainshift_authored_puzzles','INSERT,UPDATE,REFERENCES') OR
 has_table_privilege(current_user,'arcade.chainshift_authored_attempts','UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR
 EXISTS(SELECT 1 FROM unnest(ARRAY['attempt_id','player_id','puzzle_id','kind','revision','created_at','started_at','completed_at','elapsed_ms']) col WHERE has_column_privilege(current_user,'arcade.chainshift_authored_attempts',col,'UPDATE')) OR
 has_table_privilege(current_user,'arcade.chainshift_authored_actions','UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(current_user,'arcade.chainshift_authored_actions','UPDATE,REFERENCES') AS excessive`)).rows[0];
 if(r?.required!==true||r.excessive!==false)return false;
 if(!requireContent)return true;
 if(!authoredCatalogApproved&&!allowFixture)return false;
 const rows=(await c.query('SELECT * FROM arcade.chainshift_authored_puzzles')).rows;
 return rows.length===authoredCatalog.length&&rows.every(validAuthoredPublication)&&rows.filter(r=>r.kind==='practice').length===8;
}
