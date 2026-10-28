import express from 'express';
import type {ServerConfig} from '../../env.js';
import type {Persistence} from '../../database/readiness.js';
import {readCookie,SESSION_COOKIE} from '../../sessions/routes.js';
import {BoundedLimiter} from '../../limiter.js';
import {FixedError} from './service.js';
import type {AuthoredStore} from './store.js';
import type {RankedCredentials} from '../store.js';
export interface AuthoredRuntime {store:AuthoredStore;persistence:Persistence;candidateOrigin?:string}
export function authoredRoutes(config:ServerConfig,runtime?:AuthoredRuntime,ready:()=>boolean=()=>true){
 const router=express.Router(),prefix='/chainshift-authored-v2',limiter=new BoundedLimiter({limit:180,windowMs:60_000,maxEntries:2048,cleanupBudget:32});let pending=0;
 router.use(prefix,(req,res,next)=>{
  res.set('Cache-Control','no-store');const read=req.method==='GET',origin=req.headers.origin??(read?req.headers['x-arcade-origin']:undefined);
  if(typeof origin!=='string'||!config.allowedOrigins.includes(origin)||(origin!==`https://${config.discordClientId}.discordsays.com`&&origin!==runtime?.candidateOrigin))return res.status(403).json({error:'invalid_origin'});
  res.set({'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true',Vary:'Origin'});
  if(req.method==='OPTIONS')return res.set({'Access-Control-Allow-Methods':'GET, POST','Access-Control-Allow-Headers':'Content-Type, X-Arcade-Origin, X-Arcade-Request, X-Arcade-CSRF, X-Arcade-Player'}).status(204).end();
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'method_not_allowed'});
  if(req.headers['x-arcade-origin']!==origin||req.headers['x-arcade-request']!=='1')return res.status(403).json({error:'invalid_request'});
  if(!runtime||!ready())return res.status(503).json({error:'authored_unavailable'});
  if(pending>=8||!limiter.allow(req.socket.remoteAddress))return res.status(429).json({error:'rate_limited'});
  if(!read&&(!req.is('application/json')||(req.headers['content-encoding']&&req.headers['content-encoding']!=='identity')))return res.status(415).json({error:'unsupported_media_type'});
  if(read&&(req.headers['transfer-encoding']||Number(req.headers['content-length']??0)>0))return res.status(400).json({error:'invalid_request'});next();
 });
 router.use(prefix,express.json({limit:'2kb',inflate:false}));
 const handle=(operation:(credentials:RankedCredentials,req:express.Request)=>Promise<unknown>)=>async(req:express.Request,res:express.Response)=>{
  pending++;try{
   if(Object.keys(req.query).length)throw new FixedError('invalid_request');
   if((await runtime!.persistence.check()).status!=='available')return res.status(503).json({error:'authored_unavailable'});
   const token=readCookie(req,SESSION_COOKIE),playerId=req.headers['x-arcade-player'],csrf=req.headers['x-arcade-csrf'];
   if(!token)throw new FixedError('expired_session');if(typeof playerId!=='string')throw new FixedError('invalid_request');
   if(req.method==='POST'&&(typeof csrf!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(csrf)))throw new FixedError('csrf_invalid');
   res.json(await operation({token,playerId,csrf:typeof csrf==='string'?csrf:undefined},req));
  }catch(e){const code=e instanceof FixedError?e.code:'unavailable';res.status(code==='expired_session'?401:['account_changed','csrf_invalid'].includes(code)?403:code==='invalid_request'?400:code==='not_found'?404:code==='unavailable'?503:409).json({error:code});}finally{pending--;}
 };
 const exact=(value:unknown,keys:string)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===keys;
 router.get(prefix+'/home',handle(c=>runtime!.store.home(c)));
 router.get(prefix+'/attempt/:id',handle((c,r)=>runtime!.store.resume(c,String(r.params.id))));
 router.get(prefix+'/attempt/:id/board',handle((c,r)=>runtime!.store.board(c,String(r.params.id))));
 router.post(prefix+'/practice',handle((c,r)=>{if(!exact(r.body,'puzzleId,requestId')||typeof r.body.puzzleId!=='string'||typeof r.body.requestId!=='string')throw new FixedError('invalid_request');return runtime!.store.practice(c,r.body.puzzleId,r.body.requestId);}));
 router.post(prefix+'/attempt/:id/action',handle((c,r)=>{if(!exact(r.body,'action,requestId,revision')||!exact(r.body.action,r.body.action?.kind==='guess'?'kind,word':'kind')||(r.body.action?.kind==='guess'&&(typeof r.body.action.word!=='string'||r.body.action.word.length>64)))throw new FixedError('invalid_request');return runtime!.store.act(c,String(r.params.id),r.body);}));
 return router;
}
