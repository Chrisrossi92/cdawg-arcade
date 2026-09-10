import express from 'express';
import type {ServerConfig} from '../env.js';
import type {Persistence} from '../database/readiness.js';
import {readCookie,SESSION_COOKIE} from '../sessions/routes.js';
import {BoundedLimiter} from '../limiter.js';
import {GuildStore,BoardFailure,type BoardQuery} from './store.js';
export interface GuildRuntime {store:GuildStore;persistence:Persistence;}
export function guildRoutes(config:ServerConfig,runtime?:GuildRuntime,ready:()=>boolean=()=>true){
  const router=express.Router(),limiter=new BoundedLimiter({limit:120,windowMs:60000,maxEntries:2048,cleanupBudget:32});const globalLimiter=new BoundedLimiter({limit:600,windowMs:60000,maxEntries:1,cleanupBudget:1});let pending=0;
  router.all('/guild/balance/leaderboard',async(req,res)=>{
    res.set('Cache-Control','no-store');const expected=`https://${config.discordClientId}.discordsays.com`,origin=req.headers.origin??req.headers['x-arcade-origin'];
    if(origin!==expected||!config.allowedOrigins.includes(expected))return res.status(403).json({error:'invalid_origin'});
    res.set({'Access-Control-Allow-Origin':expected,Vary:'Origin','Access-Control-Allow-Credentials':'true'});
    if(req.method==='OPTIONS')return res.set({'Access-Control-Allow-Methods':'GET','Access-Control-Allow-Headers':'X-Arcade-Origin, X-Arcade-Request','Access-Control-Max-Age':'600'}).status(204).end();
    if(req.method!=='GET')return res.set('Allow','GET, OPTIONS').status(405).json({error:'method_not_allowed'});
    if(req.headers['x-arcade-origin']!==expected||req.headers['x-arcade-request']!=='1')return res.status(403).json({error:'invalid_request'});
    if(!runtime||!ready())return res.status(503).json({error:'leaderboard_unavailable'});
    if(pending>=4||!globalLimiter.allow('all')||!limiter.allow(req.socket.remoteAddress))return res.status(429).set('Retry-After','60').json({error:'rate_limited'});
    if(req.headers['transfer-encoding']||(req.headers['content-length']&&req.headers['content-length']!=='0'))return res.status(400).json({error:'invalid_request'});
    const token=readCookie(req,SESSION_COOKIE);if(!token)return res.status(401).json({error:'expired_session'});
    pending++;
    try{if((await runtime.persistence.check()).status!=='available')return res.status(503).json({error:'leaderboard_unavailable'});
      return res.json(await runtime.store.leaderboard(token,req.query as BoardQuery));
    }catch(e){if(e instanceof BoardFailure)return res.status(e.code==='expired_session'?401:['invalid_request','invalid_cursor'].includes(e.code)?400:503).json({error:['board_unavailable','projection_mismatch'].includes(e.code)?'leaderboard_unavailable':e.code});
      return res.status(503).json({error:'leaderboard_unavailable'});
    }finally{pending--;}
  });return router;
}
