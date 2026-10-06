// Public synthetic build settings only. No private environment reaches the frontend or any live worker.
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const env={PATH:process.env.PATH,NODE_ENV:'production',VITE_DISCORD_CLIENT_ID:'1525643672194908330',DISCORD_CLIENT_ID:'1525643672194908330',VITE_API_BASE_URL:'/api',RELEASE_SHA:'development-chainshift-pilot-test',CHAINSHIFT_PILOT_BUILD:'true'};
execFileSync(process.execPath,['scripts/build-production.mjs'],{env,stdio:'inherit'});
const manifest=JSON.parse(readFileSync('build/release.json','utf8'));assert.equal(manifest.chainshiftPilot,true);
const code=readdirSync('dist/assets').filter(f=>f.endsWith('.js')).map(f=>readFileSync('dist/assets/'+f,'utf8')).join('\n');
assert.match(code,/OFFICIAL DAILY RESULTS/);assert.match(code,/chainshift-graph-v2/);
for(const text of ['LOCAL CANDIDATE · MOCK SESSIONS','shortestCertificate','diversityCertificate','shortestRoutes','DISCORD_ARCADE_BOT_TOKEN','CHAINSHIFT_DAILY_DELIVERY_ENABLED'])assert.ok(!code.includes(text),'Pilot frontend leak: '+text);
execFileSync(process.execPath,['scripts/smoke-production.mjs'],{env:{PATH:process.env.PATH},stdio:'inherit'});
console.log('Shipping-shaped pilot artifact verified; server delivery config absent; no deployment or Discord posting.');
