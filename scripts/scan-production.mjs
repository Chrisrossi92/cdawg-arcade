import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Never opens any local environment file. Report only file/rule, never matched text.
const rules = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['github-token', /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/],
  ['aws-key', /AKIA[0-9A-Z]{16}/],
  ['discord-token', /[A-Za-z0-9_-]{24,28}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{25,}/],
  ['literal-client-secret', /DISCORD_CLIENT_SECRET\s*[=:]\s*['"]?(?!replace-with-|DUMMY_|process\.|env\.|'|"|$)[A-Za-z0-9_-]{24,}/m],
];
let checked = 0;
const failures = [];
function scan(path, content, artifact = false) {
  checked++;
  for (const [name, pattern] of rules) if (pattern.test(content)) failures.push(`${path}: ${name}`);
  if (artifact && (content.includes(process.cwd()) || /\/Users\/|\/home\/[a-z][a-z0-9_-]*\//.test(content))) failures.push(`${path}: absolute-local-path`);
  if (artifact && content.includes('DUMMY_ONLY_ARTIFACT_SENTINEL')) failures.push(`${path}: dummy-secret`);
  if (path.startsWith('dist/') && /DISCORD_CLIENT_SECRET|DISCORD_REDIRECT_URI|ALLOWED_ORIGINS|RELEASE_SHA|DISCORD_ARCADE_BOT_TOKEN|ARCADE_ATTEMPTS_ENABLED|ARCADE_LEADERBOARDS_ENABLED|ARCADE_CANARY_GUILD_IDS|ARCADE_CANARY_GUILD_HASH|ARCADE_SESSIONS_ENABLED|ARCADE_PKCE_PROBE_ENABLED|ARCADE_RUNTIME_PASSWORD/.test(content)) failures.push(`${path}: server-only-variable`);
}
const source = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\0').filter(Boolean);
for (const path of new Set(source)) {
  if (/^\.env(?:$|\.)/.test(path) && path !== '.env.example') { failures.push(`${path}: tracked-environment-file`); continue; }
  scan(path, readFileSync(path, 'utf8'));
}
const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
for (const path of staged) {
  if (/^\.env(?:$|\.)/.test(path) && path !== '.env.example') continue;
  scan(`staged:${path}`, execFileSync('git', ['show', `:${path}`], { encoding: 'utf8' }));
}
function artifacts(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isSymbolicLink()) { failures.push(`${path}: artifact-symlink`); continue; }
    if (item.isDirectory()) artifacts(path);
    else {
      if (/\.env|\.map$|\.tsx?$/.test(item.name)) failures.push(`${path}: unexpected-artifact`);
      scan(path, readFileSync(path, 'utf8'), true);
    }
  }
}
artifacts('dist'); artifacts('build');
execFileSync('git', ['check-ignore', '-q', '.env']);
const trackedEnv = execFileSync('git', ['ls-files', '--', '.env'], { encoding: 'utf8' });
if (trackedEnv.trim()) failures.push('.env: tracked');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Security pattern scan passed: ${checked} source/staged/artifact files; local .env ignored and untracked; values not read`);
