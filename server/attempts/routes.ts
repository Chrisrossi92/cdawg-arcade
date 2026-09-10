import express from 'express';
import { randomUUID } from 'node:crypto';
import type { ServerConfig } from '../env.js';
import type { Persistence } from '../database/readiness.js';
import { BoundedLimiter } from '../limiter.js';
import { readCookie, SESSION_COOKIE } from '../sessions/routes.js';
import { AttemptFailure, type AttemptStore } from './store.js';
export interface AttemptRuntime { store: AttemptStore; persistence: Persistence; }
export function attemptRoutes(config:ServerConfig,runtime?:AttemptRuntime,ready:()=>boolean=()=>true) {
  const router=express.Router();
  const paths=['/balance/attempts','/balance/attempts/submit','/balance/attempts/cancel'];
  const perSocket=new BoundedLimiter({limit:120,windowMs:60_000,maxEntries:2048,cleanupBudget:32});
  const global=new BoundedLimiter({limit:600,windowMs:60_000,maxEntries:1,cleanupBudget:1});
  let pending=0;
  router.all(paths,(req,res,next)=>{
    res.set({'Cache-Control':'no-store','X-Arcade-Diagnostic':randomUUID()});
    const origin=req.headers.origin;
    if (origin!==`https://${config.discordClientId}.discordsays.com` || !config.allowedOrigins.includes(origin)) return res.status(403).json({error:'invalid_origin'});
    res.set({'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Credentials':'true'});
    if (req.method==='OPTIONS') return res.set({'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type, X-Arcade-Origin, X-Arcade-Request, X-Arcade-CSRF','Access-Control-Max-Age':'600'}).status(204).end();
    if (req.method!=='POST') return res.status(405).set('Allow','POST, OPTIONS').json({error:'method_not_allowed'});
    if (req.headers['x-arcade-origin']!==origin || req.headers['x-arcade-request']!=='1') return res.status(403).json({error:'invalid_request'});
    if (!runtime || !ready()) return res.status(503).json({error:'attempts_unavailable'});
    if (!perSocket.allow(req.socket.remoteAddress) || !global.allow('127.0.0.1') || pending>=4) return res.status(429).set('Retry-After','60').json({error:'rate_limited'});
    if (!req.is('application/json') || (req.headers['content-encoding'] && req.headers['content-encoding']!=='identity')) return res.status(415).json({error:'unsupported_media_type'});
    // Only the submission path needs a trace-sized body; inflate is never allowed.
    next();
  });
  router.use(paths,express.json({limit:'68kb',inflate:false}));
  router.all(paths,async(req,res)=>{
    if (pending>=4) return res.status(429).set('Retry-After','60').json({error:'rate_limited'});
    const token=readCookie(req,SESSION_COOKIE),csrf=req.headers['x-arcade-csrf'];
    if (!token) return res.status(401).json({error:'expired_session'});
    if (typeof csrf!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(csrf)) return res.status(403).json({error:'csrf_invalid'});
    const body:unknown=req.body;
    const keys=req.path==='/balance/attempts'?'beginKey,rulesetId':req.path.endsWith('/cancel')?'attemptId':'attemptId,evidence';
    if (!body || typeof body!=='object' || Array.isArray(body) || Object.keys(body).sort().join(',')!==keys || Object.keys(req.query).length) return res.status(400).json({error:'invalid_request'});
    const data=body as Record<string,any>;
    pending++;
    try {
      if ((await runtime!.persistence.check()).status!=='available') return res.status(503).json({error:'attempts_unavailable'});
      const credentials={token,csrf};
      const result=req.path==='/balance/attempts'?await runtime!.store.begin(credentials,data.beginKey,data.rulesetId):
        req.path.endsWith('/cancel')?await runtime!.store.cancel(credentials,data.attemptId):await runtime!.store.submit(credentials,data.attemptId,data.evidence);
      return res.json(result);
    } catch(error) {
      if (error instanceof AttemptFailure) {
        const status=error.code==='csrf_invalid'?403:error.code==='expired_session'?401:error.code==='not_found'?404:error.code==='invalid_request'?400:
          error.code==='attempts_unavailable'?503:error.code==='rate_limited'?429:409;
        if (status===429) res.set('Retry-After','60');
        return res.status(status).json({error:error.code});
      }
      return res.status(503).json({error:'attempts_unavailable'});
    } finally {pending--;}
  });
  return router;
}
