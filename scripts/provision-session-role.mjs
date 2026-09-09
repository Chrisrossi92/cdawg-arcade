// Explicit owner-run administration on existing Arcade compute. No secret output.
// Owner supplies a new password privately through ARCADE_RUNTIME_PASSWORD.
import {Database} from '../build/server/database/pool.js';
import {databaseConfig} from '../build/server/database/config.js';
const password=process.env.ARCADE_RUNTIME_PASSWORD;
if (!password || password.length<32 || password.length>128 || !/^[A-Za-z0-9_-]+$/.test(password)) {
  console.error('Runtime password missing or invalid; no changes made');process.exit(1);
}
const db=new Database(databaseConfig());
try {
  await db.transaction(async c=>{
    if ((await c.query("SELECT 1 FROM pg_roles WHERE rolname='arcade_session_runtime'")).rowCount) throw new Error('role_exists');
    // PostgreSQL role passwords do not accept bind parameters; strict base64url
    // validation above makes this generated SQL literal unambiguous. Never log SQL.
    await c.query(`CREATE ROLE arcade_session_runtime LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
    await c.query('GRANT USAGE ON SCHEMA arcade TO arcade_session_runtime');
    await c.query('GRANT SELECT ON ALL TABLES IN SCHEMA arcade TO arcade_session_runtime');
    await c.query('GRANT INSERT,UPDATE ON arcade.players,arcade.guilds,arcade.guild_participations,arcade.application_sessions TO arcade_session_runtime');
    await c.query('GRANT DELETE ON arcade.application_sessions TO arcade_session_runtime');
    await c.query('GRANT INSERT,UPDATE,DELETE ON arcade.auth_challenges TO arcade_session_runtime');
    await c.query('GRANT INSERT,DELETE ON arcade.security_events TO arcade_session_runtime');
  });
  console.log('Restricted Arcade runtime role created; no credential displayed');
} catch {console.error('Runtime role provisioning failed; no raw database error displayed');process.exitCode=1;}
finally {delete process.env.ARCADE_RUNTIME_PASSWORD;await db.close();}
