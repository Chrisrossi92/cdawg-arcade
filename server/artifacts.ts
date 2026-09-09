import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeVersion, type ServerConfig } from './env.js';

export const defaultDist = fileURLToPath(new URL('../../dist/', import.meta.url));
export const defaultManifest = fileURLToPath(new URL('../release.json', import.meta.url));
export interface ReleaseManifest { clientId: string; apiBase: string; version: string; releaseSha: string; files: Record<string, string> }
export function publicFile(name: string): boolean {
  return name === 'index.html' || /^assets\/[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8,}\.(?:js|css|png|jpg|jpeg|webp|svg|woff2?|mp3|ogg|wav)$/.test(name);
}
export function safeFile(root: string, name: string): string | undefined {
  if (!publicFile(name)) return;
  try {
    if (lstatSync(resolve(root)).isSymbolicLink()) return;
    const base = realpathSync(root);
    const path = resolve(base, name);
    // Reject symlinks even when their target happens to be inside dist.
    if (realpathSync(path) !== path || !path.startsWith(base + sep) || !lstatSync(path).isFile()) return;
    return path;
  } catch { return; }
}
export function loadArtifacts(config: ServerConfig, root = defaultDist, manifestPath = defaultManifest) {
  let manifest: ReleaseManifest | undefined;
  try {
    const candidate = JSON.parse(readFileSync(manifestPath, 'utf8')) as ReleaseManifest;
    const names = Object.keys(candidate.files);
    if (candidate.clientId !== config.discordClientId || candidate.apiBase !== '/api' ||
        !safeVersion.test(candidate.version) || candidate.releaseSha !== config.releaseSha ||
        !names.includes('index.html') || !names.some(x => x.endsWith('.js')) || names.length > 256) throw new Error();
    for (const name of names) {
      const file = safeFile(root, name);
      if (!file || createHash('sha256').update(readFileSync(file)).digest('hex') !== candidate.files[name]) throw new Error();
    }
    manifest = candidate;
  } catch { /* Missing, stale, unsafe, or mismatched build stays unready. */ }
  return {
    manifest,
    ready: () => !!manifest && Object.keys(manifest.files).every(name => !!safeFile(root, name)),
    file: (name: string) => manifest && Object.hasOwn(manifest.files, name) ? safeFile(root, name) : undefined,
  };
}
