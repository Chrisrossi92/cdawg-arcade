import { rmSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
rmSync('build/server', { recursive: true, force: true });
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.server.json'], { stdio: 'inherit' });

cpSync('server/database/migrations', 'build/server/database/migrations', { recursive: true });
