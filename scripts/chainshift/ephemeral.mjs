// Owns a fresh disposable loopback cluster. Never reads DATABASE_URL or dotenv.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync,existsSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {Database} from '../../build/server/database/pool.js';
import {databaseConfig} from '../../build/server/database/config.js';
import {migrate} from '../../build/server/database/migrations.js';
import {grantChainshiftRights} from '../../build/server/chainshift/privileges.js';
export async function ephemeral(){
 const root=mkdtempSync(join(tmpdir(),'arcade-chainshift-pg-'));writeFileSync(join(root,'OWNED_DISPOSABLE_CLUSTER'),'Chainshift fixture only');
 const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C'};
 const bin=process.env.ARCADE_TEST_PG_BIN??execFileSync('pg_config',['--bindir'],{env,encoding:'utf8'}).trim();
 const dockerMode=!existsSync(join(bin,'postgres'));
 const dockerConfig=join(root,'docker');mkdirSync(dockerConfig);writeFileSync(join(dockerConfig,'config.json'),'{"auths":{}}');
 const container='arcade-chainshift-'+randomBytes(6).toString('hex');
 if(dockerMode){const endpoint=execFileSync('docker',['context','inspect','--format','{{.Endpoints.docker.Host}}'],{encoding:'utf8'}).trim();if(!endpoint.startsWith('unix://'))throw new Error('Disposable runner requires a local Docker socket');env.DOCKER_HOST=endpoint;}
 const docker=args=>execFileSync('docker',['--config',dockerConfig,...args],{env,stdio:['ignore','pipe','pipe']});
 const run=(name,args)=>dockerMode?docker(['exec',container,name,...args.map((arg,i)=>args[i-1]==='-p'?'5432':arg.replace(root,'/tmp'))]):execFileSync(join(bin,name),args,{env,stdio:['ignore','pipe','pipe']});
 const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
 const name='arcade_test_chainshift_'+randomBytes(6).toString('hex');let started=false,db,runtime;
 const close=async()=>{await runtime?.close();await db?.close();if(started){if(dockerMode)docker(['rm','--force',container]);else run('pg_ctl',['-D',join(root,'data'),'-m','immediate','-w','stop']);started=false;}rmSync(root,{recursive:true,force:true});};
 try{
  if(dockerMode){docker(['run','--detach','--rm','--name',container,'--label','arcade.disposable-test=true','--tmpfs','/var/lib/postgresql','--publish',`127.0.0.1:${port}:5432`,'--env','POSTGRES_USER=arcade_test','--env','POSTGRES_HOST_AUTH_METHOD=trust','postgres:18.6']);started=true;let ready=false;for(let i=0;i<120;i++){try{run('pg_isready',['-h','127.0.0.1','-p',String(port),'-U','arcade_test']);ready=true;break;}catch{await new Promise(r=>setTimeout(r,250));}}if(!ready)throw new Error('Disposable PostgreSQL startup failed');}else{
  run('initdb',['-D',join(root,'data'),'-U','arcade_test','-A','trust','--no-locale','-E','UTF8']);
  run('pg_ctl',['-D',join(root,'data'),'-l',join(root,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port} -k ${root}`,'-w','start']);started=true;}
  run('createdb',['-h','127.0.0.1','-p',String(port),'-U','arcade_test',name]);
  const config=user=>databaseConfig({PERSISTENCE_CONFIGURED:'true',DATABASE_URL:`postgresql://${user}@127.0.0.1:${port}/${name}`,DATABASE_TLS_MODE:'disable',DATABASE_POOL_MAX:'5'});
  db=new Database(config('arcade_test'));await migrate(db);
  await db.transaction(async c=>{
   await c.query('CREATE ROLE arcade_session_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS');
   await c.query('GRANT USAGE ON SCHEMA arcade TO arcade_session_runtime');
   await c.query('GRANT SELECT ON arcade.schema_migrations,arcade.players,arcade.guilds,arcade.guild_participations,arcade.application_sessions,arcade.auth_challenges TO arcade_session_runtime');
   await c.query('GRANT INSERT,UPDATE ON arcade.players,arcade.guilds,arcade.guild_participations,arcade.application_sessions TO arcade_session_runtime');
   await c.query('GRANT DELETE ON arcade.application_sessions TO arcade_session_runtime');
   await c.query('GRANT INSERT,UPDATE,DELETE ON arcade.auth_challenges TO arcade_session_runtime');
   await grantChainshiftRights(c);
  });
  runtime=new Database(config('arcade_session_runtime'));return {db,runtime,close};
 }catch(e){await close();throw e;}
}
