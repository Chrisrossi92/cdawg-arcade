import express from 'express';
import type {ServerConfig} from '../env.js';
import type {Persistence} from '../database/readiness.js';
import {readCookie,SESSION_COOKIE} from '../sessions/routes.js';
import {BoundedLimiter} from '../limiter.js';
import {ChainshiftFailure,type ChainshiftStore,type RankedCredentials} from './store.js';
export interface ChainshiftRuntime {store:ChainshiftStore;persistence:Persistence;candidateOrigin?:string}
export function chainshiftRoutes(config:ServerConfig,runtime?:ChainshiftRuntime,ready:()=>boolean=()=>true){
 const router=express.Router(),limiter=new BoundedLimiter({limit:120,windowMs:60_000,maxEntries:2048,cleanupBudget:32});let pending=0;
 router.use('/chainshift',(req,res,next)=>{
  const read=req.method==='GET';const origin=req.headers.origin??(read?req.headers['x-arcade-origin']:undefined);
  const allowed=`https://${config.discordClientId}.discordsays.com`;
  res.set('Cache-Control','no-store');
  if(typeof origin!=='string'||!config.allowedOrigins.includes(origin)||(origin!==allowed&&origin!==runtime?.candidateOrigin))return res.status(403).json({error:'invalid_origin'});
  res.set({'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Vary':'Origin'});
  if(req.method==='OPTIONS')return res.set({'Access-Control-Allow-Methods':'GET, POST','Access-Control-Allow-Headers':'Content-Type, X-Arcade-Origin, X-Arcade-Request, X-Arcade-CSRF, X-Arcade-Player'}).status(204).end();
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'method_not_allowed'});
  if(req.headers['x-arcade-origin']!==origin||req.headers['x-arcade-request']!=='1')return res.status(403).json({error:'invalid_request'});
  if(!runtime||!ready())return res.status(503).json({error:'chainshift_unavailable'});
  if(pending>=8||!limiter.allow(req.socket.remoteAddress))return res.status(429).json({error:'rate_limited'});
  if(!read&&(!req.is('application/json')||(req.headers['content-encoding']&&req.headers['content-encoding']!=='identity')))return res.status(415).json({error:'unsupported_media_type'});
  if(read&&(req.headers['transfer-encoding']||Number(req.headers['content-length']??0)>0))return res.status(400).json({error:'invalid_request'});
  next();
 });
 router.use('/chainshift',express.json({limit:'2kb',inflate:false}));
 const handle=(operation:(c:RankedCredentials,req:express.Request)=>Promise<unknown>)=>async(req:express.Request,res:express.Response)=>{
  pending++;
  try {
   if((await runtime!.persistence.check()).status!=='available')return res.status(503).json({error:'chainshift_unavailable'});
   const token=readCookie(req,SESSION_COOKIE);if(!token)return res.status(401).json({error:'expired_session'});
   const playerId=req.headers['x-arcade-player'],csrf=req.headers['x-arcade-csrf'];
   if(typeof playerId!=='string')return res.status(400).json({error:'invalid_request'});
   if(req.method==='POST'&&(typeof csrf!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(csrf)))return res.status(403).json({error:'csrf_invalid'});
   return res.json(await operation({token,playerId,csrf:typeof csrf==='string'?csrf:undefined},req));
  }catch(e){
   if(e instanceof ChainshiftFailure){const status=e.reason==='expired_session'?401:['csrf_invalid','account_changed','routes_locked'].includes(e.reason)?403:e.reason==='not_found'?404:e.reason==='invalid_request'?400:e.reason==='unavailable'?503:409;return res.status(status).json({error:e.reason});}
   return res.status(503).json({error:'chainshift_unavailable'});
  }finally{pending--;}
 };
 const exact=(req:express.Request,keys:string)=>{if(!req.body||Array.isArray(req.body)||typeof req.body!=='object'||Object.keys(req.body).sort().join(',')!==keys||Object.keys(req.query).length)throw new ChainshiftFailure('invalid_request');};
 router.get('/chainshift/daily',handle((c,req)=>{if(Object.keys(req.query).length)throw new ChainshiftFailure('invalid_request');return runtime!.store.daily(c);}));
 router.post('/chainshift/start',handle((c,req)=>{exact(req,'puzzleId');if(typeof req.body.puzzleId!=='string')throw new ChainshiftFailure('invalid_request');return runtime!.store.start(c,req.body.puzzleId);}));
 router.get('/chainshift/attempt/:id',handle((c,req)=>{if(Object.keys(req.query).length)throw new ChainshiftFailure('invalid_request');return runtime!.store.resume(c,String(req.params.id));}));
 for(const kind of ['shift','backtrack'] as const)router.post(`/chainshift/attempt/:id/${kind}`,handle((c,req)=>{
  exact(req,kind==='shift'?'requestId,revision,word':'requestId,revision');return runtime!.store.mutate(c,String(req.params.id),req.body.requestId,req.body.revision,kind,req.body.word);
 }));
 for(const kind of ['leaderboard','routes'] as const)router.get(`/chainshift/puzzle/:id/${kind}`,handle((c,req)=>{
  if(Object.keys(req.query).some(key=>key!=='scope')||!['global','guild'].includes(String(req.query.scope??'global')))throw new ChainshiftFailure('invalid_request');
  const scope=(req.query.scope??'global') as 'global'|'guild';return kind==='leaderboard'?runtime!.store.leaderboard(c,String(req.params.id),scope):runtime!.store.routes(c,String(req.params.id),scope);
 }));
 return router;
}
