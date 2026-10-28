import express from 'express';
import {AuthoredService,FixedError} from './service.js';
import {BoundedLimiter} from '../../limiter.js';
import type {FixedRequest} from '../../../shared/chainshift/authored/contract.js';
/** Explicit local fixture adapter only; deliberately absent from server/app.ts. */
export function localAuthoredRoutes(service:AuthoredService,origin:string,authenticate:(req:express.Request,write:boolean)=>Promise<{id:string;name:string}>){
 const router=express.Router(),limiter=new BoundedLimiter({limit:180,windowMs:60_000,maxEntries:64,cleanupBudget:16});
 router.use((req,res,next)=>{
  res.set('Cache-Control','no-store');
  if(req.headers['x-arcade-request']!=='1'||req.headers['x-arcade-origin']!==origin||(req.method==='POST'&&req.headers.origin!==origin))return res.status(403).json({error:'invalid_origin'});
  if(!['GET','POST'].includes(req.method))return res.status(405).end();
  if(req.method==='POST'&&!req.is('application/json'))return res.status(415).json({error:'invalid_request'});
  if(!limiter.allow(req.socket.remoteAddress))return res.status(429).json({error:'rate_limited'});next();
 });
 router.use(express.json({limit:'2kb',inflate:false}));
 const exact=(value:unknown,keys:string)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===keys;
 const handle=(operation:(p:{id:string;name:string},req:express.Request)=>unknown)=>async(req:express.Request,res:express.Response)=>{
  try{if(Object.keys(req.query).length)throw new FixedError('invalid_request');const p=await authenticate(req,req.method==='POST');res.json(operation(p,req));}
  catch(e){const code=e instanceof FixedError?e.code:'unavailable';res.status(code==='unavailable'?503:code==='not_found'?404:['expired_session','account_changed','csrf_invalid'].includes(code)?403:code==='invalid_request'?400:409).json({error:code});}
 };
 router.get('/home',handle(p=>service.home(p.id,p.name)));
 router.get('/attempt/:id',handle((p,r)=>service.resume(p.id,String(r.params.id))));
 router.post('/practice',handle((p,r)=>{if(!exact(r.body,'puzzleId,requestId')||typeof r.body.puzzleId!=='string'||typeof r.body.requestId!=='string')throw new FixedError('invalid_request');return service.practice(p.id,p.name,r.body.puzzleId,r.body.requestId);}));
 router.post('/attempt/:id/action',handle((p,r)=>{
  if(!exact(r.body,'action,requestId,revision')||!exact(r.body.action,r.body.action?.kind==='guess'?'kind,word':'kind')||(r.body.action?.kind==='guess'&&(typeof r.body.action.word!=='string'||r.body.action.word.length>64)))throw new FixedError('invalid_request');
  return service.act(p.id,String(r.params.id),r.body as FixedRequest);
 }));
 router.get('/attempt/:id/board',handle((p,r)=>service.board(p.id,String(r.params.id))));
 router.use(((error,_req,res,_next)=>{res.status(error?.type==='entity.too.large'?413:400).json({error:'invalid_request'});}) as express.ErrorRequestHandler);
 return router;
}
