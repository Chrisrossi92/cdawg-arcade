import { attemptRoutes, type AttemptRuntime } from './attempts/routes.js';
import { sessionRoutes, type SessionRuntime } from './sessions/routes.js';
import type { Persistence } from './database/readiness.js';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import type { ServerConfig } from './env.js';
import type { TokenExchangeService } from './tokenExchange.js';
import { SafeTokenExchangeError } from './tokenExchange.js';
import { BoundedLimiter } from './limiter.js';
import { loadArtifacts } from './artifacts.js';

const codePattern = /^[A-Za-z0-9._-]{4,512}$/;
export interface AppOptions { distDir?: string; manifestPath?: string; isDraining?: () => boolean; limiter?: BoundedLimiter; persistence?: Persistence; sessions?: SessionRuntime; attempts?: AttemptRuntime }
export function createServerApp(config: ServerConfig, tokenExchange: TokenExchangeService, options: AppOptions = {}) {
  const app = express();
  // Render documents TLS termination, but no invariant hop count or trusted ingress CIDRs.
  // Trust zero forwarded hops; this service does not need proxy-derived protocol/host/identity.
  app.set('trust proxy', false);
  app.disable('x-powered-by');
  const artifacts = loadArtifacts(config, options.distDir, options.manifestPath);
  const limiter = options.limiter ?? new BoundedLimiter();
  const globalLimiter = new BoundedLimiter({ limit: 600, windowMs: 60_000, maxEntries: 1, cleanupBudget: 1 });
  let pending = 0;
  const ready = () => !options.isDraining?.() && (!config.production || (config.missingRequired.length === 0 && artifacts.ready()));
  app.use((_req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' });
    // No X-Frame-Options: Discord must embed this document.
    next();
  });
  const release = { releaseSha: config.releaseSha, version: artifacts.manifest?.version ?? 'development-unconfigured' };
  app.get('/api/health', (_req, res) => res.json({ status: 'alive', ...release }));
  app.get('/api/ready', (_req, res) => res.status(ready() ? 200 : 503).json({ status: ready() ? 'ready' : 'unready', ...release }));
  app.get('/api/persistence/ready', async (_req, res) => {
    const result = options.isDraining?.() ? { status: 'unavailable', schema: 'closed' } : await options.persistence?.check() ?? { status: 'unavailable', schema: 'absent' };
    return res.status(result.status === 'available' ? 200 : 503).json({ ...result, ...release });
  });
  app.use('/api', attemptRoutes(config, options.attempts, ready));
  app.use('/api', sessionRoutes(config, options.sessions, ready));
  app.use('/api', (req, res, next) => {
    if (options.isDraining?.()) return res.status(503).json({ error: 'service_unavailable' });
    const origin = req.headers.origin;
    const devActivity = !config.production && !!origin && /^https:\/\/\d+\.discordsays\.com$/.test(origin);
    if (origin && !config.allowedOrigins.includes(origin) && !devActivity) return res.status(400).json({ error: 'invalid_request' });
    next();
  });
  app.use('/api', cors({ origin: true, methods: ['GET', 'HEAD', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'], maxAge: 600 }));
  app.all('/api/token', (req, res, next) => {
    if (req.method !== 'POST') return res.status(405).set('Allow', 'POST, OPTIONS').json({ error: 'method_not_allowed' });
    if (!globalLimiter.allow('127.0.0.1') || !limiter.allow(req.socket.remoteAddress) || pending >= 20) {
      return res.status(429).set('Retry-After', '60').json({ error: 'rate_limited' });
    }
    if (!req.is('application/json') || (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity')) return res.status(415).json({ error: 'unsupported_media_type' });
    if (config.production && !ready()) return res.status(503).json({ error: 'service_unavailable' });
    next();
  });
  app.post('/api/token', express.json({ limit: '8kb', inflate: false }), async (req, res) => {
    const body = req.body;
    if (!body || Array.isArray(body) || Object.keys(body).length !== 1 || typeof body.code !== 'string' || !codePattern.test(body.code)) {
      return res.status(400).json({ error: 'invalid_authorization_code' });
    }
    if (pending >= 20) return res.status(429).set('Retry-After', '60').json({ error: 'rate_limited' });
    const cancellation = new AbortController();
    const disconnected = () => { if (!res.writableEnded) cancellation.abort(); };
    res.on('close', disconnected);
    pending++;
    try {
      const token = await tokenExchange.exchangeCode(body.code, cancellation.signal);
      return res.json({ access_token: token.access_token, token_type: token.token_type, expires_in: token.expires_in, scope: token.scope });
    } catch (error) {
      const known = error instanceof SafeTokenExchangeError && error.code === 'discord_token_exchange_failed';
      return res.status(known && error.status >= 400 && error.status < 500 ? 400 : 502)
        .json({ error: known ? 'discord_token_exchange_failed' : 'token_exchange_unavailable' });
    } finally {
      pending--;
      res.off('close', disconnected);
    }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));
  if (config.production) app.use((req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).json({ error: 'method_not_allowed' });
    let path: string;
    try { path = decodeURIComponent(req.path); } catch { return res.status(400).json({ error: 'invalid_request' }); }
    // Only manifest-listed files or extensionless SPA routes can reach the HTML shell.
    if (path.includes('\\') || path.includes('%') || path.split('/').some(x => x.startsWith('.')) ||
        /^\/(?:src|server|build|docs|node_modules|scripts|api)(?:\/|$)/i.test(path)) return res.status(404).json({ error: 'not_found' });
    if (!ready()) return res.status(503).json({ error: 'service_unavailable' });
    const name = path.slice(1);
    const file = artifacts.file(name);
    if (file) {
      res.set('Cache-Control', name.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
      return res.sendFile(file, { cacheControl: false, dotfiles: 'deny' }, err => { if (err) next(err); });
    }
    if (path.startsWith('/assets/') || path.includes('.') || !req.accepts('html')) return res.status(404).json({ error: 'not_found' });
    const index = artifacts.file('index.html');
    if (!index) return res.status(503).json({ error: 'service_unavailable' });
    res.set('Cache-Control', 'no-cache');
    return res.sendFile(index, { cacheControl: false }, err => { if (err) next(err); });
  });
  const safeErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (res.headersSent) { res.destroy(); return; }
    res.status(error?.type === 'entity.too.large' ? 413 : 400).set('Cache-Control', 'no-store').json({ error: 'invalid_request' });
  };
  app.use(safeErrorHandler);
  return app;
}
