import cors from 'cors';
import express from 'express';
import type { ServerConfig } from './env';
import type { TokenExchangeService } from './tokenExchange';
import { SafeTokenExchangeError } from './tokenExchange';

const codePattern = /^[A-Za-z0-9._-]{4,512}$/;

export function createServerApp(config: ServerConfig, tokenExchange: TokenExchangeService) {
  const app = express();
  const requestCounts = new Map<string, { count: number; resetAt: number }>();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.allowedOrigins.includes(origin) || isDiscordActivityProxyOrigin(origin)) return callback(null, true);
        return callback(new Error('origin_not_allowed'));
      },
    }),
  );
  app.use(express.json({ limit: '8kb' }));
  app.use((req, res, next) => {
    req.setTimeout(10_000);
    res.setTimeout(10_000);
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'cdawg-arcade-auth',
      appVersion: config.appVersion,
      discordConfigPresent: config.discordConfigPresent,
      missingRequired: config.missingRequired,
    });
  });

  app.post('/api/token', (req, res, next) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const current = requestCounts.get(key) ?? { count: 0, resetAt: now + 60_000 };
    if (current.resetAt < now) {
      current.count = 0;
      current.resetAt = now + 60_000;
    }
    current.count += 1;
    requestCounts.set(key, current);
    if (current.count > 20) return res.status(429).json({ error: 'rate_limited' });
    return next();
  });

  app.post('/api/token', async (req, res) => {
    const code = req.body?.code;
    if (typeof code !== 'string' || !codePattern.test(code)) {
      return res.status(400).json({ error: 'invalid_authorization_code' });
    }
    try {
      const token = await tokenExchange.exchangeCode(code);
      return res.json({
        access_token: token.access_token,
        token_type: token.token_type,
        expires_in: token.expires_in,
        scope: token.scope,
      });
    } catch (error) {
      if (error instanceof SafeTokenExchangeError) {
        return res.status(error.status >= 400 && error.status < 500 ? 400 : 502).json({ error: error.code });
      }
      return res.status(502).json({ error: 'token_exchange_unavailable' });
    }
  });

  return app;
}

function isDiscordActivityProxyOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && url.hostname.endsWith('.discordsays.com');
  } catch {
    return false;
  }
}
