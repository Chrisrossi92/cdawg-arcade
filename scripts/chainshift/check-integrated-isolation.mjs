import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const code=async dir=>(await Promise.all((await readdir(dir)).filter(f=>f.endsWith('.js')).map(f=>readFile(dir+'/'+f,'utf8')))).join('\n');
const normal=await code('dist/assets'),candidate=await code('tmp/chainshift/arcade-dist/assets');
for(const marker of ['chainshift-graph-v2','chainshift-local-v2-001','OFFICIAL DAILY RESULTS','Play Chainshift','LOCAL CANDIDATE'])assert.ok(!normal.includes(marker),'Normal runtime leak: '+marker);
for(const marker of ['shortestCertificate','diversityCertificate','candidateValidation','recognizability','shortestRoutes','review-data','reports-v2'])assert.ok(!candidate.includes(marker),'Integrated review leak: '+marker);
assert.match(candidate,/OFFICIAL DAILY RESULTS/);assert.match(candidate,/chainshift-graph-v2/);
assert.ok(!candidate.includes('LOCAL CANDIDATE · MOCK SESSIONS'),'Fixture harness in shipping-shaped candidate');
const manifest=JSON.parse(await readFile('tmp/chainshift/arcade-dist/.vite/manifest.json','utf8'));
const entry=manifest['index.html'];assert.ok(entry.dynamicImports.includes('src/arcade/ChainshiftEntry.tsx'));
const visited=new Set();async function inspect(key){if(visited.has(key))return;visited.add(key);const chunk=manifest[key];assert.ok(chunk,'Missing manifest dependency');const source=await readFile('tmp/chainshift/arcade-dist/'+chunk.file,'utf8');assert.ok(!source.includes('Phaser'),'Phaser in Chainshift dependency '+key);assert.ok(!key.includes('GameEntry'),'Balance imported by Chainshift');for(const dependency of chunk.imports??[])await inspect(dependency);}
await inspect('src/arcade/ChainshiftEntry.tsx');
const chainChunk=await readFile('tmp/chainshift/arcade-dist/'+manifest['src/arcade/ChainshiftEntry.tsx'].file,'utf8');assert.ok(!chainChunk.includes('BALANCE_REPLAY_V1'),'Balance replay in Chainshift chunk');
console.log('Integrated candidate is lazy, DOM-only and excludes solution-bearing review artifacts; normal build excludes Chainshift gameplay and fixtures. Approved practice graph remains in the gated candidate.');
