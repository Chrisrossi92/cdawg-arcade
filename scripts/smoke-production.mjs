import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdtempSync, cpSync, readFileSync, readdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const release = JSON.parse(readFileSync('build/release.json', 'utf8'));
const secret = 'DUMMY_ONLY_ARTIFACT_SENTINEL';
const root = mkdtempSync(join(tmpdir(), 'arcade-production-'));
const safeEnv = {
  NODE_ENV: 'production', HOST: '127.0.0.1',
  DISCORD_CLIENT_ID: release.clientId, DISCORD_CLIENT_SECRET: secret,
  DISCORD_REDIRECT_URI: 'https://127.0.0.1',
  ALLOWED_ORIGINS: `https://arcade.cdawgbot.xyz,https://${release.clientId}.discordsays.com`,
  RELEASE_SHA: release.releaseSha,
};
let child;
let checks = 0;
function check(condition) { assert.ok(condition); checks++; }
async function availablePort() {
  const probe = createServer();
  probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  return port;
}
async function launch(overrides = {}) {
  const port = await availablePort();
  let logs = '';
  child = spawn(process.execPath, ['build/server/index.js'], { cwd: root, env: { ...safeEnv, PORT: String(port), ...overrides }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', x => { logs += x; }); child.stderr.on('data', x => { logs += x; });
  const exit = once(child, 'exit');
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error('Compiled runtime exited before listening');
    try { await fetch(base + '/api/health'); return { base, exit, logs: () => logs }; } catch { await new Promise(r => setTimeout(r, 50)); }
  }
  throw new Error('Compiled runtime did not listen');
}
async function stop(run, signal = 'SIGTERM') {
  child.kill(signal);
  const timeout = setTimeout(() => child.kill('SIGKILL'), 15_000);
  try { const [code, signal] = await run.exit; assert.equal(code, 0, `Runtime termination: ${signal ?? code}`); checks++; } finally { clearTimeout(timeout); }
  await assert.rejects(fetch(run.base + '/api/health')); checks++;
  check(!run.logs().includes(secret) && !run.logs().includes(root));
}
function scan(dir, frontend = false) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) { scan(path, frontend); continue; }
    check(!/\.env|\.map$|\.ts$|\.tsx$/.test(item.name));
    const data = readFileSync(path, 'utf8');
    check(!data.includes('DUMMY_ONLY_DATABASE_SENTINEL') && !data.includes(secret) && !data.includes(process.cwd()) && !data.includes('/Users/'));
    if (frontend) check(!/DISCORD_CLIENT_SECRET|DISCORD_REDIRECT_URI|ALLOWED_ORIGINS|RELEASE_SHA|DATABASE_URL|PERSISTENCE_CONFIGURED|DISCORD_ARCADE_BOT_TOKEN|ARCADE_ATTEMPTS_ENABLED|ARCADE_SESSIONS_ENABLED|ARCADE_RUNTIME_PASSWORD/.test(data));
    else if (item.name.endsWith('.js')) check(!/from ['"]tsx|import\(['"]tsx|tsx watch/.test(data));
  }
}
try {
  cpSync('build', join(root, 'build'), { recursive: true });
  cpSync('dist', join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'package.json'), '{"type":"module"}');
  // No source, dotenv files, or scripts are copied into the runtime fixture.
  symlinkSync(resolve('node_modules'), join(root, 'node_modules'), 'dir');
  scan(join(root, 'dist'), true); scan(join(root, 'build'));
  for (const mode of ['', 'development']) {
    const invalid = spawn(process.execPath, ['build/server/index.js'], { cwd: root, env: { ...safeEnv, NODE_ENV: mode, PORT: '4179' }, stdio: 'ignore' });
    const [code] = await once(invalid, 'exit');
    check(code === 1);
  }
  const run = await launch();
  const health = await fetch(run.base + '/api/health');
  check(health.status === 200);
  const healthBody = await health.json();
  check(Object.keys(healthBody).sort().join(',') === 'releaseSha,status,version');
  check(healthBody.releaseSha === release.releaseSha && healthBody.version === release.version);
  check((await fetch(run.base + '/api/ready')).status === 200);
  for (const path of ['/', '/practice/replay']) {
    const res = await fetch(run.base + path);
    check(res.status === 200 && res.headers.get('content-type').includes('text/html') && res.headers.get('cache-control') === 'no-cache');
  }
  const activityOrigin=`https://${release.clientId}.discordsays.com`;
  for (const path of ['/api/balance/attempts','/api/balance/attempts/submit','/api/balance/attempts/cancel']) {
    const r=await fetch(run.base+path,{method:'POST',headers:{Origin:activityOrigin,'X-Arcade-Origin':activityOrigin,'X-Arcade-Request':'1','Content-Type':'application/json'},body:'{}'});
    check(r.status===503);check((await r.json()).error==='attempts_unavailable');check(r.headers.get('cache-control')==='no-store');
  }
  const asset = Object.keys(release.files).find(x => x.endsWith('.js'));
  const assetResponse = await fetch(run.base + '/' + asset);
  check(assetResponse.status === 200 && assetResponse.headers.get('cache-control').includes('immutable'));
  await assetResponse.arrayBuffer();
  for (const path of ['/api/unknown', '/.env', '/.git/config', '/server/index.ts', '/build/release.json', '/docs/README.md', '/assets/missing.js', '/%2eenv', '/%252e%252e/package.json', '/assets/%2f..%2fpackage.json']) {
    const res = await fetch(run.base + path); check(res.status === 404 && !res.headers.get('content-type').includes('text/html'));
  }
  const bad = await fetch(run.base + '/api/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  check(bad.status === 400 && bad.headers.get('cache-control') === 'no-store');
  const method = await fetch(run.base + '/api/token'); check(method.status === 405);
  const preflight = await fetch(run.base + '/api/token', { method: 'OPTIONS', headers: { Origin: 'https://arcade.cdawgbot.xyz', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
  check(preflight.status === 204 && preflight.headers.get('access-control-allow-origin') === 'https://arcade.cdawgbot.xyz');
  const denied = await fetch(run.base + '/api/token', { method: 'OPTIONS', headers: { Origin: 'https://unapproved.example', 'Access-Control-Request-Method': 'POST' } });
  check(denied.status === 400 && !denied.headers.has('access-control-allow-origin'));
  await stop(run);
  const missingConfig = await launch({ DISCORD_CLIENT_SECRET: '' });
  check((await fetch(missingConfig.base + '/api/health')).status === 200);
  check((await fetch(missingConfig.base + '/api/ready')).status === 503);
  check((await fetch(missingConfig.base + '/')).status === 503);
  await stop(missingConfig, 'SIGINT');
  rmSync(join(root, 'dist'), { recursive: true });
  const missingAssets = await launch();
  check((await fetch(missingAssets.base + '/api/ready')).status === 503);
  await stop(missingAssets);
  console.log(`Compiled production smoke passed: ${checks} assertions; dummy configuration only`);
} finally {
  if (child && child.exitCode === null) child.kill('SIGKILL');
  rmSync(root, { recursive: true, force: true });
}
