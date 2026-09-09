import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { createServerApp } from './app.js';
import { loadServerConfig } from './env.js';
import { BoundedLimiter } from './limiter.js';
import { installShutdown } from './lifecycle.js';
import { DiscordTokenExchangeService } from './tokenExchange.js';

const dummy = {
  NODE_ENV: 'production', PORT: '4567', DISCORD_CLIENT_ID: '111111111111111111',
  DISCORD_CLIENT_SECRET: 'DUMMY_ONLY_ARTIFACT_SENTINEL', DISCORD_REDIRECT_URI: 'https://127.0.0.1',
  ALLOWED_ORIGINS: 'https://arcade.cdawgbot.xyz,https://111111111111111111.discordsays.com',
  RELEASE_SHA: 'development-test',
};
const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); vi.useRealTimers(); });
function fixture(overrides: NodeJS.ProcessEnv = {}) {
  const root = mkdtempSync(join(tmpdir(), 'arcade-runtime-test-')); roots.push(root);
  const distDir = join(root, 'dist'); mkdirSync(join(distDir, 'assets'), { recursive: true });
  const contents = { 'index.html': '<html><body>Arcade</body></html>', 'assets/app-12345678.js': 'console.log("public")' };
  const files = Object.fromEntries(Object.entries(contents).map(([name, body]) => {
    writeFileSync(join(distDir, name), body);
    return [name, createHash('sha256').update(body).digest('hex')];
  }));
  const manifestPath = join(root, 'release.json');
  writeFileSync(manifestPath, JSON.stringify({ files, clientId: dummy.DISCORD_CLIENT_ID, apiBase: '/api', version: 'development-test', releaseSha: dummy.RELEASE_SHA }));
  const config = loadServerConfig({ ...dummy, ...overrides });
  const service = { exchangeCode: vi.fn().mockResolvedValue({ access_token: 'dummy-token' }) };
  const options = { distDir, manifestPath };
  return { root, options, config, service, app: createServerApp(config, service, options) };
}

describe('production configuration', () => {
  it('prefers Render PORT and defaults production to all interfaces; local stays loopback', () => {
    expect(loadServerConfig({ ...dummy, SERVER_PORT: '3001' })).toMatchObject({ port: 4567, host: '0.0.0.0' });
    expect(loadServerConfig({})).toMatchObject({ port: 3001, host: '127.0.0.1' });
    expect(loadServerConfig({ ...dummy, HOST: '127.0.0.1' }).host).toBe('127.0.0.1');
  });
  it.each(['0', '-1', '65536', '12.5', 'abc', '3001junk', ''])('rejects invalid port without echoing %s', port => {
    expect(() => loadServerConfig({ PORT: port })).toThrow('Invalid PORT or SERVER_PORT');
  });
  it('rejects hostnames, URLs and injection text', () => {
    for (const host of ['localhost', 'https://example.com', 'untrusted-secret']) expect(() => loadServerConfig({ HOST: host })).toThrow('HOST must be an IP bind address');
  });
  it.each(['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_REDIRECT_URI', 'ALLOWED_ORIGINS', 'RELEASE_SHA', 'PORT'])('cannot be ready without %s', async key => {
    const env: NodeJS.ProcessEnv = { ...dummy }; delete env[key];
    const { options, service } = fixture();
    const app = createServerApp(loadServerConfig(env), service, options);
    await request(app).get('/api/health').expect(200);
    const res = await request(app).get('/api/ready').expect(503);
    expect(Object.keys(res.body).sort()).toEqual(['releaseSha', 'status', 'version']);
    await request(app).post('/api/token').send({ code: 'valid-code' }).expect(503);
    expect(service.exchangeCode).not.toHaveBeenCalled();
  });
  it.each([
    { DISCORD_CLIENT_ID: '222222222222222222' }, { RELEASE_SHA: 'development-other' },
    { DISCORD_REDIRECT_URI: 'http://insecure.example' }, { ALLOWED_ORIGINS: '*' },
    { ALLOWED_ORIGINS: 'https://arcade.cdawgbot.xyz,https://evil.discordsays.com' },
    { DISCORD_CLIENT_SECRET: 'replace-with-secret' },
  ])('fails readiness for invalid or build-mismatched settings', async overrides => {
    const { app } = fixture(overrides);
    await request(app).get('/api/ready').expect(503);
  });
});

describe('production static boundary and health', () => {
  it('serves a verified build with distinct HTML and hashed asset caches', async () => {
    const { app } = fixture();
    for (const path of ['/', '/index.html', '/practice/replay']) {
      const res = await request(app).get(path).expect(200);
      expect(res.headers['cache-control']).toBe('no-cache'); expect(res.type).toBe('text/html');
    }
    const asset = await request(app).get('/assets/app-12345678.js').expect(200);
    expect(asset.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(asset.headers['x-content-type-options']).toBe('nosniff');
    expect(asset.headers['x-powered-by']).toBeUndefined();
    expect(asset.headers['x-frame-options']).toBeUndefined();
    await request(app).head('/').expect(200);
  });
  it('exposes only safe release fields', async () => {
    const { app } = fixture();
    expect((await request(app).get('/api/ready').expect(200)).body).toEqual({ status: 'ready', version: 'development-test', releaseSha: 'development-test' });
    const health = await request(app).get('/api/health').expect(200);
    expect(health.body).toEqual({ status: 'alive', version: 'development-test', releaseSha: 'development-test' });
    expect(health.headers['cache-control']).toBe('no-store');
  });
  it('keeps unknown API and forbidden paths out of SPA fallback', async () => {
    const { app } = fixture();
    for (const path of ['/api/missing', '/.env', '/.git/config', '/src/main.tsx', '/docs/runbook', '/server/index.ts', '/build/server/index.js', '/node_modules/express/package.json', '/package.json', '/assets/nope.js', '/%2eenv', '/assets/%2f..%2fpackage.json', '/%252e%252e/.env']) {
      const res = await request(app).get(path).expect(404);
      expect(res.type).toBe('application/json');
    }
  });
  it('fails safely for missing, corrupt, and symlink artifacts', async () => {
    for (const mode of ['missing-index', 'missing-asset', 'corrupt', 'symlink', 'symlink-root', 'missing-manifest']) {
      const { root, config, service, options } = fixture();
      if (mode === 'symlink-root') {
        const outside = join(root, 'outside');
        mkdirSync(outside);
        rmSync(options.distDir, { recursive: true });
        symlinkSync(outside, options.distDir);
        options.distDir += '/';
      }
      else if (mode === 'missing-manifest') rmSync(options.manifestPath);
      else if (mode === 'missing-index') rmSync(join(options.distDir, 'index.html'));
      else {
        const asset = join(options.distDir, 'assets/app-12345678.js'); rmSync(asset);
        if (mode === 'corrupt') writeFileSync(asset, 'bad');
        if (mode === 'symlink') { writeFileSync(join(root, 'private.js'), 'secret'); symlinkSync(join(root, 'private.js'), asset); }
      }
      const app = createServerApp(config, service, options);
      await request(app).get('/api/ready').expect(503);
      await request(app).get('/').expect(503);
    }
  });
  it('detects removal or symlink substitution after startup', async () => {
    const { app, options, root } = fixture();
    await request(app).get('/api/ready').expect(200);
    rmSync(join(options.distDir, 'index.html'));
    writeFileSync(join(root, 'private.html'), 'private');
    symlinkSync(join(root, 'private.html'), join(options.distDir, 'index.html'));
    await request(app).get('/api/ready').expect(503);
    await request(app).get('/').expect(503);
  });
});

describe('production token policy', () => {
  it('returns no-store tokens only for a valid JSON POST', async () => {
    const { app, service } = fixture();
    const res = await request(app).post('/api/token').send({ code: 'valid-code' }).expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(service.exchangeCode.mock.calls[0][1]).toBeInstanceOf(AbortSignal);
    for (const method of ['get', 'put', 'delete', 'head'] as const) await request(app)[method]('/api/token').expect(405);
    await request(app).post('/api/token').type('text').send('valid-code').expect(415);
    await request(app).post('/api/token').set('Content-Encoding', 'gzip').type('json').send('{}').expect(415);
  });
  it('rejects malformed, extra, oversized, and non-object bodies before exchange', async () => {
    const { app, service } = fixture();
    for (const body of [{}, { code: '' }, { code: 'x'.repeat(513) }, { code: 'abcd', upstream: 'https://evil.example' }, { code: ['abcd'] }, ['abcd']]) {
      await request(app).post('/api/token').send(body).expect(400);
    }
    await request(app).post('/api/token').type('json').send('{').expect(400);
    const res = await request(app).post('/api/token').send({ code: 'x'.repeat(9000) }).expect(413);
    expect(res.body).toEqual({ error: 'invalid_request' });
    expect(res.headers['cache-control']).toBe('no-store');
    expect(service.exchangeCode).not.toHaveBeenCalled();
  });
  it('permits exact production and Activity origins with correct preflight', async () => {
    const { app } = fixture();
    for (const origin of dummy.ALLOWED_ORIGINS.split(',')) {
      const res = await request(app).options('/api/token').set('Origin', origin).set('Access-Control-Request-Method', 'POST').set('Access-Control-Request-Headers', 'content-type').expect(204);
      expect(res.headers['access-control-allow-origin']).toBe(origin);
      expect(res.headers['access-control-allow-headers']).toBe('Content-Type');
      expect(res.headers.vary).toContain('Origin');
    }
    for (const origin of ['null', 'https://222222222222222222.discordsays.com', 'https://arcade.cdawgbot.xyz.evil.example']) {
      const res = await request(app).options('/api/token').set('Origin', origin).set('Access-Control-Request-Method', 'POST').expect(400);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    }
  });
  it('does not trust forwarded identity, protocol or host; spoofing cannot evade limiter', async () => {
    const { config, service, options } = fixture();
    const limiter = new BoundedLimiter({ limit: 2, windowMs: 60000, maxEntries: 2, cleanupBudget: 1 });
    const app = createServerApp(config, service, { ...options, limiter });
    expect(app.get('trust proxy')).toBe(false);
    for (const value of ['1.2.3.4', 'garbage, 5.6.7.8']) {
      await request(app).post('/api/token').set('X-Forwarded-For', value).set('X-Forwarded-Host', 'evil.example').set('X-Forwarded-Proto', 'https').send({ code: 'valid-code' }).expect(200);
    }
    const res = await request(app).post('/api/token').set('X-Forwarded-For', '9.9.9.9').send({ code: 'valid-code' }).expect(429);
    expect(res.body).toEqual({ error: 'rate_limited' }); expect(res.headers['retry-after']).toBe('60'); expect(limiter.size).toBe(1);
  });
  it('keeps fixed upstream, forbids redirects, and propagates timeout and cancellation', async () => {
    vi.useFakeTimers();
    const config = loadServerConfig(dummy);
    let signal: AbortSignal | undefined;
    const fetchMock = vi.fn((_url, options: RequestInit) => {
      signal = options.signal as AbortSignal;
      return Promise.reject(new Error('private upstream failure'));
    });
    const service = new DiscordTokenExchangeService(config, fetchMock as unknown as typeof fetch);
    const controller = new AbortController();
    await expect(service.exchangeCode('valid-code', controller.signal)).rejects.toThrow();
    expect(fetchMock.mock.calls[0][0]).toBe('https://discord.com/api/oauth2/token');
    expect(fetchMock.mock.calls[0][1].redirect).toBe('error');
    controller.abort(); expect(signal?.aborted).toBe(true);
  });
  it('aborts the Discord operation at the eight-second deadline, including body reads', async () => {
    vi.useFakeTimers();
    const timeoutController = new AbortController();
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation(ms => {
      setTimeout(() => timeoutController.abort(), ms);
      return timeoutController.signal;
    });
    try {
      const fetchMock = vi.fn(async (_url, options: RequestInit) => ({
        ok: true,
        json: () => new Promise((_resolve, reject) => options.signal!.addEventListener('abort', () => reject(new Error('cancelled')))),
      }));
      const service = new DiscordTokenExchangeService(loadServerConfig(dummy), fetchMock as unknown as typeof fetch);
      const operation = service.exchangeCode('valid-code');
      const assertion = expect(operation).rejects.toMatchObject({ code: 'discord_token_exchange_failed' });
      await vi.advanceTimersByTimeAsync(8000);
      await assertion;
      expect(timeout).toHaveBeenCalledWith(8000);
    } finally { timeout.mockRestore(); }
  });
  it('cancels an upstream exchange when the client disconnects', async () => {
    const { config, options } = fixture();
    let accepted: () => void = () => {};
    const incoming = new Promise<void>(resolve => { accepted = resolve; });
    let cancelled: () => void = () => {};
    const cancellation = new Promise<void>(resolve => { cancelled = resolve; });
    const app = createServerApp(config, { exchangeCode: (_code, signal) => new Promise((_resolve, reject) => {
      signal!.addEventListener('abort', () => { cancelled(); reject(new Error('cancelled')); }); accepted();
    }) }, options);
    const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    try {
      const controller = new AbortController();
      const call = fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/api/token`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'valid-code' }), signal: controller.signal,
      });
      const assertion = expect(call).rejects.toThrow();
      await incoming; controller.abort(); await assertion; await cancellation;
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  });
  it('bounds concurrent upstream calls while allowing a shared Discord burst', async () => {
    const { config, options } = fixture();
    const releases: (() => void)[] = [];
    const service = { exchangeCode: vi.fn(() => new Promise<{ access_token: string }>(resolve => releases.push(() => resolve({ access_token: 'dummy' })))) };
    const app = createServerApp(config, service, options);
    const calls = Array.from({ length: 20 }, () => request(app).post('/api/token').send({ code: 'valid-code' }).then(res => res.status));
    try {
      await vi.waitFor(() => expect(service.exchangeCode).toHaveBeenCalledTimes(20));
      await request(app).post('/api/token').send({ code: 'valid-code' }).expect(429);
    } finally { releases.forEach(release => release()); }
    expect(await Promise.all(calls)).toEqual(Array(20).fill(200));
  });
  it('sanitizes upstream exceptions', async () => {
    const { config, options } = fixture();
    const app = createServerApp(config, { exchangeCode: async () => { throw new Error(dummy.DISCORD_CLIENT_SECRET); } }, options);
    const res = await request(app).post('/api/token').send({ code: 'valid-code' }).expect(502);
    expect(res.body).toEqual({ error: 'token_exchange_unavailable' });
  });
});

describe('bounded rate storage', () => {
  it('expires records with bounded cleanup and rejects new identities at capacity', () => {
    const limiter = new BoundedLimiter({ limit: 2, windowMs: 10, maxEntries: 3, cleanupBudget: 1 });
    for (const ip of ['1.1.1.1', '2.2.2.2', '3.3.3.3']) expect(limiter.allow(ip, 0)).toBe(true);
    expect(limiter.allow('4.4.4.4', 1)).toBe(false); expect(limiter.size).toBe(3);
    limiter.sweep(10); expect(limiter.size).toBe(2);
    limiter.sweep(10); limiter.sweep(10); expect(limiter.size).toBe(0);
    expect(limiter.allow('4.4.4.4', 10)).toBe(true);
  });
  it('coalesces malformed and high-cardinality text and caps memory under pressure', () => {
    const limiter = new BoundedLimiter({ limit: 2, windowMs: 10, maxEntries: 10, cleanupBudget: 2 });
    expect(limiter.allow('bad', 0)).toBe(true); expect(limiter.allow('worse', 0)).toBe(true);
    expect(limiter.allow('x'.repeat(10000), 0)).toBe(false); expect(limiter.size).toBe(1);
    for (let i = 0; i < 1000; i++) limiter.allow(`10.0.${Math.floor(i / 256)}.${i % 256}`, 1);
    expect(limiter.size).toBe(10);
  });
});

describe('lifecycle', () => {
  it('importing entrypoint never registers signal listeners', async () => {
    const before = [process.listenerCount('SIGTERM'), process.listenerCount('SIGINT')];
    await import('./index.js');
    expect([process.listenerCount('SIGTERM'), process.listenerCount('SIGINT')]).toEqual(before);
  });
  it('drains an in-flight response, stops listening, disposes handlers and ignores repeat stop', async () => {
    let complete: () => void = () => {};
    let accepted: () => void = () => {};
    const incoming = new Promise<void>(r => { accepted = r; });
    const server = createServer((_req, res) => { complete = () => res.end('done'); accepted(); });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const address = server.address() as { port: number };
    const response = fetch(`http://127.0.0.1:${address.port}`);
    await incoming;
    const exited = vi.fn(); const draining = vi.fn();
    const lifecycle = installShutdown(server, draining, exited);
    const closed = once(server, 'close');
    lifecycle.stop(); lifecycle.stop();
    expect(draining).toHaveBeenCalledTimes(1); expect(server.listening).toBe(false); expect(exited).not.toHaveBeenCalled();
    complete(); expect(await (await response).text()).toBe('done'); await closed;
    expect(exited).toHaveBeenCalledWith(0); lifecycle.dispose();
  });
  it('forces bounded termination when drain stalls', () => {
    vi.useFakeTimers();
    const server = { close: vi.fn(), closeIdleConnections: vi.fn(), closeAllConnections: vi.fn() } as unknown as Server;
    const exit = vi.fn(); const lifecycle = installShutdown(server, vi.fn(), exit, 100);
    lifecycle.stop(); vi.advanceTimersByTime(100);
    expect(server.closeAllConnections).toHaveBeenCalledTimes(1); expect(exit).toHaveBeenCalledWith(1);
    lifecycle.dispose();
  });
});
