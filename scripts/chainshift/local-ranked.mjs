import {randomUUID} from 'node:crypto';
// Safe candidate only: new owned PostgreSQL, mocked Discord verification, loopback API/UI.
// Does not read dotenv, production credentials, or caller-supplied database URLs.
import express from 'express';
import {createServer as httpServer} from 'node:http';
import {createServer as viteServer} from 'vite';
import {ephemeral} from './ephemeral.mjs';
import {fixturePlayers,fixtureOrigin,loginFixture,seedFixture} from './fixtures.mjs';
import {ChainshiftStore} from '../../build/server/chainshift/store.js';
import {chainshiftReady} from '../../build/server/chainshift/privileges.js';
import {createServerApp} from '../../build/server/app.js';
import {loadServerConfig} from '../../build/server/env.js';
const cluster=await ephemeral();let server,vite,stopping=false;
async function close(){if(stopping)return;stopping=true;await vite?.close();if(server)await new Promise(r=>server.close(r));await cluster.close();}
process.once('SIGINT',()=>{void close();});process.once('SIGTERM',()=>{void close();});
try{
 await seedFixture(cluster.db);const sessions=new Map();for(const key of Object.keys(fixturePlayers))await loginFixture(cluster.runtime,fixturePlayers[key]);await cluster.db.query("UPDATE arcade.guilds SET status='enabled'");
 const origin='http://127.0.0.1:5264';
 const config=loadServerConfig({DISCORD_CLIENT_ID:'123456789012345678',DISCORD_CLIENT_SECRET:'synthetic-local-only',ALLOWED_ORIGINS:origin+','+fixtureOrigin});
 const persistence={check:async()=>({status:await chainshiftReady(cluster.runtime)?'available':'unavailable',schema:'compatible'}),close:async()=>{}};
 const app=express();app.disable('x-powered-by');
 const selected=req=>sessions.get(/\bchainshift_fixture=([a-f0-9-]{36})\b/.exec(req.headers.cookie??'')?.[1]);
 const account=req=>selected(req)?.account??'A';
 app.all('/api/local/identity',express.json({limit:'1kb'}),async(req,res)=>{
  res.set('Cache-Control','no-store');
  if(req.headers['x-arcade-request']!=='1'||(req.headers.origin??req.headers['x-arcade-origin'])!==origin)return res.status(403).json({error:'invalid_origin'});
  if(!['GET','POST'].includes(req.method))return res.status(405).end();
  let key=account(req);if(req.method==='POST'){if(!req.body||Object.keys(req.body).join(',')!=='account'||!Object.hasOwn(fixturePlayers,req.body.account))return res.status(400).end();key=req.body.account;}
  try{
   // Synthetic provider verification may renew sessions; it never resets an attempt.
   const s=await loginFixture(cluster.runtime,fixturePlayers[key]);const binding=randomUUID();sessions.set(binding,{...s,account:key});
   res.cookie('chainshift_fixture',binding,{httpOnly:true,sameSite:'strict',path:'/'});
   return res.json({account:key,identity:{player:s.view.player,csrf:s.view.csrf}});
  }catch{return res.status(503).json({error:'fixture_unavailable'});}
 });
 app.use('/api/chainshift',(req,_res,next)=>{const s=selected(req);req.headers.cookie=s?'__Host-arcade-session='+s.token:'';next();});
 app.use(createServerApp(config,{exchangeCode:async()=>{throw new Error('No live Discord');}},{chainshift:{store:new ChainshiftStore(cluster.runtime,()=>true),persistence,candidateOrigin:origin}}));
 server=httpServer(app);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(5265,'127.0.0.1',resolve);});
 vite=await viteServer({configFile:'scripts/chainshift/ranked.vite.config.ts'});await vite.listen();
 console.log('Disposable ranked Chainshift ready at http://127.0.0.1:5264/ · mock players only · stop with Ctrl-C.');
}catch{await close();console.error('Local ranked candidate startup failed; no private configuration used.');process.exitCode=1;}
