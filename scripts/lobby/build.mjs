import {execFileSync} from 'node:child_process';
// Public fixture client ID only: local browser practice never initializes the SDK.
execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--mode','lobby-integration','--outDir','tmp/lobby-integration/dist','--manifest'],{stdio:'inherit',env:{PATH:process.env.PATH,NODE_ENV:'production',VITE_API_BASE_URL:'/api',VITE_DISCORD_CLIENT_ID:'123456789012345678',VITE_APP_VERSION:'development-lobby-integration'}});
