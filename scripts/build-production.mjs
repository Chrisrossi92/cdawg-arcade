import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Explicit allowlist. Neither Vite nor TypeScript receives backend credentials.
const release = process.env.RELEASE_SHA ?? process.env.RENDER_GIT_COMMIT ?? '';
const version = process.env.VITE_APP_VERSION ?? release;
const clientId = process.env.VITE_DISCORD_CLIENT_ID ?? '';
const apiBase = process.env.VITE_API_BASE_URL;
const releasePattern = /^(?:[a-f0-9]{40}|development-[a-z0-9.-]{1,48})$/;
if (!/^\d{17,20}$/.test(clientId) || apiBase !== '/api' || !releasePattern.test(release) || !releasePattern.test(version)) {
  console.error('Invalid public production configuration: check client ID, /api base, and release metadata');
  process.exit(1);
}
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_ID !== clientId) {
  console.error('Public and backend Discord client IDs do not match');
  process.exit(1);
}
const env = { PATH: process.env.PATH, NODE_ENV: 'production', VITE_DISCORD_CLIENT_ID: clientId, VITE_API_BASE_URL: apiBase, VITE_APP_VERSION: version };
rmSync('build', { recursive: true, force: true });
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { stdio: 'inherit', env });
execFileSync(process.execPath, ['scripts/build-server.mjs'], { stdio: 'inherit', env });
const files = {};
function collect(dir = '') {
  for (const entry of readdirSync(join('dist', dir), { withFileTypes: true })) {
    const name = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory() && name === 'assets') collect(name);
    else if (entry.isFile() && (name === 'index.html' || /^assets\/[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8,}\.(?:js|css|png|jpg|jpeg|webp|svg|woff2?|mp3|ogg|wav)$/.test(name))) {
      files[name] = createHash('sha256').update(readFileSync(join('dist', name))).digest('hex');
    } else throw new Error('Unexpected frontend artifact');
  }
}
collect();
mkdirSync('build', { recursive: true });
writeFileSync('build/release.json', JSON.stringify({ clientId, apiBase, version, releaseSha: release, files }, null, 2) + '\n');
console.log('Production artifacts built with public release metadata');
