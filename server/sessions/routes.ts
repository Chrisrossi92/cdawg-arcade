import express, { type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { ServerConfig } from '../env.js';
import type { Persistence } from '../database/readiness.js';
import { BoundedLimiter } from '../limiter.js';
import type { IdentityProvider } from './discord.js';
import { SessionFailure, SessionStore } from './store.js';
export const SESSION_COOKIE = '__Host-arcade-session', CHALLENGE_COOKIE = '__Host-arcade-challenge';
const opaque = /^[A-Za-z0-9_-]{43}$/;
export function readCookie(req: Request, name: string): string | null {
  const values = (req.headers.cookie ?? '').split(';').map(x=>x.trim()).filter(x=>x.startsWith(`${name}=`));
  if (values.length !== 1) return null;
  const value = values[0].slice(name.length+1); return opaque.test(value) ? value : null;
}
export function cookie(res: Response, name: string, value: string, age: number) {
  res.append('Set-Cookie', `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=None; Partitioned; Max-Age=${Math.max(0,Math.floor(age))}`);
}
export interface SessionRuntime { store: SessionStore; provider: IdentityProvider; persistence: Persistence; }
export function sessionRoutes(config: ServerConfig, runtime?: SessionRuntime, ready: () => boolean = () => true) {
  const router = express.Router();
  const limiter = new BoundedLimiter({limit:300,windowMs:60_000,maxEntries:2048,cleanupBudget:32});
  const global = new BoundedLimiter({limit:600,windowMs:60_000,maxEntries:1,cleanupBudget:1});
  const events = new BoundedLimiter({limit:10,windowMs:60_000,maxEntries:1,cleanupBudget:1});
  let pending = 0;
  const paths = ['/auth/challenges','/session','/session/renew','/me','/logout','/session/discrepancy'];
  router.all(paths, (req,res,next) => {
    res.set({'Cache-Control':'no-store','X-Arcade-Diagnostic':randomUUID()});
    const origin = req.headers.origin;
    // Browsers omit Origin for same-origin GET. A custom header supplies the
    // expected origin for GET only; CORS and the host-only cookie isolate callers.
    const expected = req.method === 'OPTIONS' ? origin ?? '' : typeof req.headers['x-arcade-origin'] === 'string' ? req.headers['x-arcade-origin'] : '';
    if (!config.allowedOrigins.includes(expected) || (origin && origin !== expected) || (req.method !== 'GET' && req.method !== 'OPTIONS' && origin !== expected)) return res.status(403).json({error:'invalid_origin'});
    if (origin) res.set({'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Credentials':'true'});
    if (req.method === 'OPTIONS') return res.set({'Access-Control-Allow-Methods':'GET, POST','Access-Control-Allow-Headers':'Content-Type, X-Arcade-Origin, X-Arcade-Request, X-Arcade-CSRF','Access-Control-Max-Age':'600'}).status(204).end();
    const method = req.path === '/me' ? 'GET' : 'POST';
    if (req.method !== method) return res.status(405).set('Allow',method).json({error:'method_not_allowed'});
    if (req.headers['x-arcade-request'] !== '1') return res.status(403).json({error:'invalid_request'});
    if (!runtime || !ready()) return res.status(503).json({error:'sessions_unavailable'});
    if (!global.allow('127.0.0.1') || !limiter.allow(req.socket.remoteAddress) || pending>=10) return res.status(429).set('Retry-After','60').json({error:'rate_limited'});
    if (req.method === 'POST' && (!req.is('application/json') || (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity'))) return res.status(415).json({error:'unsupported_media_type'});
    next();
  });
  router.use(paths,express.json({limit:'4kb',inflate:false}));
  router.all(paths,async(req,res) => {
    if (pending>=10) return res.status(429).set('Retry-After','60').json({error:'rate_limited'});
    const origin = req.headers['x-arcade-origin'] as string, store = runtime!.store;
    const token = readCookie(req,SESSION_COOKIE), binding = readCookie(req,CHALLENGE_COOKIE);
    const abort = new AbortController();
    const disconnected = () => {if (!res.writableEnded) abort.abort();}; res.on('close',disconnected);
    pending++;
    try {
      if ((await runtime!.persistence.check()).status !== 'available') return res.status(503).json({error:'sessions_unavailable'});
      if (req.path === '/me') {
        if (!token) throw new SessionFailure('expired'); return res.json(await store.me(token,origin));
      }
      const body: unknown = req.body;
      const auth = req.path === '/session' || req.path === '/session/renew';
      const keys = auth ? ['challengeId','code','instanceId'] : [];
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== keys.length || !Object.keys(body).every(x=>keys.includes(x))) return res.status(400).json({error:'invalid_request'});
      if (token) {
        // Even repeat logout requires proof of possession of its CSRF companion.
        const csrf = req.headers['x-arcade-csrf'];
        if (typeof csrf !== 'string' || !opaque.test(csrf)) throw new SessionFailure('csrf_invalid');
        try { await store.checkCsrf(token,origin,csrf); }
        catch (error) {
          if (!(error instanceof SessionFailure && error.code==='expired' && req.path==='/logout')) throw error;
          const {csrfFor,equal} = await import('./crypto.js');
          if (!equal(csrfFor(token),csrf)) throw new SessionFailure('csrf_invalid');
        }
      }
      if (req.path === '/session/discrepancy') {
        if (!events.allow('127.0.0.1')) return res.status(429).set('Retry-After','60').json({error:'rate_limited'});
        if (!token) throw new SessionFailure('expired');
        await store.discrepancy(token);return res.json({status:'recorded'});
      }
      if (req.path === '/logout') {
        await store.logout(token,binding); cookie(res,SESSION_COOKIE,'',0);cookie(res,CHALLENGE_COOKIE,'',0);return res.json({status:'signed_out'});
      }
      if (req.path === '/auth/challenges') {
        const challenge = await store.challenge(origin,token,binding ?? undefined);
        cookie(res,CHALLENGE_COOKIE,challenge.binding,300);
        return res.json({challengeId:challenge.id,codeChallenge:challenge.codeChallenge,codeChallengeMethod:'S256',expiresIn:300});
      }
      const data = body as Record<string,unknown>;
      if (!binding || typeof data.challengeId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(data.challengeId) ||
          typeof data.code !== 'string' || !/^[A-Za-z0-9._-]{4,512}$/.test(data.code) || typeof data.instanceId !== 'string' || !/^[A-Za-z0-9_-]{1,256}$/.test(data.instanceId)) return res.status(400).json({error:'invalid_request'});
      if (req.path === '/session/renew' && !token) throw new SessionFailure('expired');
      const challenge = await store.consume(data.challengeId,binding,origin,token);
      const verified = await runtime!.provider.verify(data.code,challenge.verifier,data.instanceId,abort.signal);
      abort.signal.throwIfAborted();
      const session = await store.finish(data.challengeId,binding,verified.identity,origin,token);
      cookie(res,SESSION_COOKIE,session.token,(new Date(session.view.expiresAt).getTime()-Date.now())/1000);
      cookie(res,CHALLENGE_COOKIE,'',0);
      return res.json({...session.view,access_token:verified.accessToken});
    } catch (error) {
      if (error instanceof SessionFailure) {
        if (error.code==='expired' || error.code==='account_changed') cookie(res,SESSION_COOKIE,'',0);
        return res.status(error.code==='csrf_invalid'?403:401).json({error:error.code});
      }
      return res.status(503).json({error:'verification_unavailable'});
    } finally { pending--;res.off('close',disconnected); }
  });
  return router;
}
