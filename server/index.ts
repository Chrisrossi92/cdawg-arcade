import { AttemptStore } from './attempts/store.js';
import { restrictedAttemptRole } from './attempts/privileges.js';
import { restrictedSessionRole } from './sessions/privileges.js';
import { Database } from './database/pool.js';
import { databaseConfig } from './database/config.js';
import { SessionStore } from './sessions/store.js';
import { DiscordIdentityProvider } from './sessions/discord.js';
import { createPersistence } from './database/readiness.js';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { createServerApp } from './app.js';
import { loadServerConfig } from './env.js';
import { DiscordTokenExchangeService } from './tokenExchange.js';
import { installShutdown } from './lifecycle.js';

export async function startServer() {
  // Source execution is for local development; compiled execution is production-only.
  if (import.meta.url.endsWith('.js') && process.env.NODE_ENV !== 'production') {
    throw new Error('Compiled runtime requires NODE_ENV=production');
  }
  if (process.env.NODE_ENV !== 'production') {
    const dotenv = await import('dotenv');
    dotenv.config({ quiet: true });
  }
  const config = loadServerConfig();
  let draining = false;
  const dbConfig = databaseConfig();
  const database = dbConfig.mode === 'configured' ? new Database(dbConfig) : undefined;
  const persistence = createPersistence(dbConfig, {database});
  const attemptEnabled = process.env.ARCADE_ATTEMPTS_ENABLED === 'true';
  const sessions = process.env.ARCADE_SESSIONS_ENABLED === 'true' && process.env.OFFICIAL_SCORING_ENABLED === 'false' &&
    process.env.DISCORD_ARCADE_BOT_TOKEN && database ? {
      store: new SessionStore(database), provider: new DiscordIdentityProvider(config,process.env.DISCORD_ARCADE_BOT_TOKEN,fetch,{
        enabled:process.env.ARCADE_PKCE_PROBE_ENABLED === 'true',
        report:outcome=>console.log(JSON.stringify({event:'arcade_pkce_probe',outcome})),
      }), persistence: {
        close: () => persistence.close(),
        check: async () => {
          const health = await persistence.check();
          if (health.status !== 'available') return health;
          try { if (await (attemptEnabled ? restrictedAttemptRole(database) : restrictedSessionRole(database))) return health; } catch { /* Fail closed without driver details. */ }
          return {status:'unavailable' as const,schema:'invalid_configuration' as const};
        },
      },
    } : undefined;
  const attempts = attemptEnabled && sessions && database ? {store:new AttemptStore(database),persistence:sessions.persistence} : undefined;
  const cleanup = sessions ? setInterval(() => {void sessions.persistence.check().then(status => status.status === 'available' ? Promise.all([sessions.store.purge(),attempts?.store.purge()]) : undefined).catch(() => {});},60_000) : undefined;
  cleanup?.unref();
  const app = createServerApp(config, new DiscordTokenExchangeService(config), { isDraining: () => draining, persistence, sessions, attempts });
  const server = createServer({ requestTimeout: 10_000, headersTimeout: 10_000, keepAliveTimeout: 5_000, maxHeaderSize: 16_384 }, app);
  server.setTimeout(10_000, socket => socket.destroy());
  server.on('error', () => { console.error('Arcade runtime failed'); process.exit(1); });
  server.listen(config.port, config.host, () => console.log(JSON.stringify({ event: 'listening', releaseSha: config.releaseSha })));
  installShutdown(server, () => { draining = true; console.log('Arcade draining'); }, undefined, undefined, () => { if (cleanup) clearInterval(cleanup); return persistence.close(); });
  return server;
}
// Importing this module never starts a listener or installs signal handlers.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch(() => { console.error('Arcade startup failed: invalid runtime configuration'); process.exitCode = 1; });
}
