import { execFileSync } from 'node:child_process';
const env = {
  PATH: process.env.PATH,
  NODE_ENV: 'production', VITE_DISCORD_CLIENT_ID: '111111111111111111',
  VITE_API_BASE_URL: '/api', VITE_APP_VERSION: 'development-phase3b',
  RELEASE_SHA: 'development-phase3b',
  DISCORD_CLIENT_SECRET: 'DUMMY_ONLY_ARTIFACT_SENTINEL',
};
execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build:production'], { stdio: 'inherit', env });
execFileSync(process.execPath, ['scripts/smoke-production.mjs'], { stdio: 'inherit', env: { PATH: process.env.PATH } });
