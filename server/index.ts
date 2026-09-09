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
  const persistence = createPersistence();
  const app = createServerApp(config, new DiscordTokenExchangeService(config), { isDraining: () => draining, persistence });
  const server = createServer({ requestTimeout: 10_000, headersTimeout: 10_000, keepAliveTimeout: 5_000, maxHeaderSize: 16_384 }, app);
  server.setTimeout(10_000, socket => socket.destroy());
  server.on('error', () => { console.error('Arcade runtime failed'); process.exit(1); });
  server.listen(config.port, config.host, () => console.log(JSON.stringify({ event: 'listening', releaseSha: config.releaseSha })));
  installShutdown(server, () => { draining = true; console.log('Arcade draining'); }, undefined, undefined, () => persistence.close());
  return server;
}
// Importing this module never starts a listener or installs signal handlers.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch(() => { console.error('Arcade startup failed: invalid runtime configuration'); process.exitCode = 1; });
}
