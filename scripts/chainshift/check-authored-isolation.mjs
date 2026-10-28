import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const code=async directory=>(await Promise.all((await readdir(directory)).filter(f=>f.endsWith('.js')).map(f=>readFile(directory+'/'+f,'utf8')))).join('\n');
const normal=await code('dist/assets'),candidate=await code('tmp/chainshift/authored-dist/assets');
assert.ok(!normal.includes('chainshift-authored-v2'),'Authored game leaked through disabled release gate');
assert.ok(!normal.includes('Play Chainshift'),'Disabled game advertised in ordinary build');
for(const text of ['authored-001','authored-p08','CHAINSHIFT_AUTHORED_PACK_B64','shortestCertificate','review-data','LOCAL CANDIDATE · MOCK SESSIONS','chainshift-graph-v2'])assert.ok(!candidate.includes(text),'Authored bundle leak: '+text);
assert.match(candidate,/chainshift-authored-v2/);assert.match(candidate,/REVEAL NEXT LETTER/);
const directory='tmp/chainshift/authored-dist',manifest=JSON.parse(await readFile(directory+'/.vite/manifest.json','utf8'));
assert.ok(manifest['index.html'].dynamicImports.includes('src/arcade/AuthoredChainshiftEntry.tsx'));
const visited=new Set();async function inspect(key){if(visited.has(key))return;visited.add(key);const chunk=manifest[key];assert.ok(chunk);const source=await readFile(directory+'/'+chunk.file,'utf8');assert.ok(!/Phaser|BALANCE_REPLAY_V1/.test(source),'Unrelated engine in authored game');for(const dependency of chunk.imports??[])await inspect(dependency);}
await inspect('src/arcade/AuthoredChainshiftEntry.tsx');
console.log('Authored isolation passed: lazy DOM game; no answer catalog, legacy dictionary, sealed research, mock host or Phaser; ordinary release gate stays off.');
