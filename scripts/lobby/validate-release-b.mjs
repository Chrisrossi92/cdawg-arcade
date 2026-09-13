// Release B gate/artifact audit. No network, deployment or database access.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,brotliCompressSync} from 'node:zlib';
import {build} from 'vite';
const baseline='b2264466101956fd081e6326ccaa2935fc658650';
let checks=0;const ok=(value,message)=>{assert.ok(value,message);checks++;};
const sha=b=>createHash('sha256').update(b).digest('hex');
const inventory=root=>Object.fromEntries(fs.readdirSync(root,{recursive:true}).filter(p=>fs.statSync(`${root}/${p}`).isFile()&&!p.startsWith('.vite/')).sort().map(p=>{const b=fs.readFileSync(`${root}/${p}`);return[p,{bytes:b.length,gzip:gzipSync(b).length,brotli:brotliCompressSync(b).length,sha256:sha(b)}];}));
const protectedPaths=['src','server','shared','assets','vite.config.ts','package-lock.json','render.yaml'];
const changes=execFileSync('git',['diff',baseline,'--name-only','--',...protectedPaths],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
ok(changes.every(p=>p.endsWith('.test.ts')||p.endsWith('.test.tsx')),'production implementation changed');
ok(/export const lobbyReleased = true;/.test(fs.readFileSync('config/lobby-release.ts','utf8')),'source gate not enabled');
const production=inventory('dist'),local=inventory('tmp/lobby-integration/dist'),backend=inventory('build');
const accepted=JSON.parse(fs.readFileSync('docs/brand/lobby-repeatability.json'));
for(const [p,h] of Object.entries(accepted.hashes.build).filter(([p])=>p!=='release.json'))ok(backend[p]?.sha256===h,`backend unchanged ${p}`);
for(const [p,f]of Object.entries(production)){
 ok(!/\.(?:blend|glb|psd|map)$|turnaround|expressions|movement|board|SKILL|AGENTS|fixture|preview|harness/i.test(p),'source/test artifact shipped');
 if(/\.(?:js|html|css)$/.test(p))ok(!/Fixture Player|fixture-player|TEST FIXTURES|Run lifecycle soak|__diag|DUMMY_ONLY|\/Users\//.test(fs.readFileSync('dist/'+p,'utf8')),'diagnostic/private data shipped');
}
for(const [p,f] of Object.entries(production).filter(([p])=>/v004.*webp$/.test(p)&&p.includes('mascot-')))ok(accepted.hashes.dist[p]===f.sha256,'V004 atlas changed');
let graph;await build({mode:'production',logLevel:'silent',build:{write:false},plugins:[{name:'release-b-graph',generateBundle(_options,bundle){graph=Object.values(bundle).filter(x=>x.type==='chunk').map(x=>({file:x.fileName,entry:x.isEntry,dynamic:x.isDynamicEntry,imports:x.imports,dynamicImports:x.dynamicImports,modules:Object.keys(x.modules)}));}}]});
const entry=graph.find(x=>x.entry),game=graph.find(x=>x.modules.some(p=>p.endsWith('/src/arcade/GameEntry.tsx')));
ok(entry?.modules.some(p=>p.endsWith('/src/arcade/main.tsx')),'ordinary production entry is not lobby');
ok(game?.dynamic,'game not deferred');ok(!entry.modules.some(p=>/phaser|BalanceScene/.test(p)),'game in initial entry');
ok(!graph.some(c=>c.modules.some(p=>/scripts\/(?:lobby|readiness|brand)/.test(p))),'test graph included');
const manifest=JSON.parse(fs.readFileSync('build/release.json'));
for(const [p,h]of Object.entries(manifest.files))ok(production[p]?.sha256===h,'release hash mismatch');
ok(Object.keys(manifest.files).length===Object.keys(production).length,'unmanifested artifact');
const entryPath=fs.readFileSync('dist/index.html','utf8').match(/src="\/(assets\/[^" ]+\.js)"/)[1];
const gamePath=Object.keys(production).find(p=>/GameEntry-.*\.js$/.test(p));
const initial=Object.fromEntries(Object.entries(production).filter(([p])=>p==='index.html'||p===entryPath||p.endsWith('.woff2')||p.endsWith('.svg')||p.includes('host-')||(/\.css$/.test(p)&&!p.includes('GameEntry-'))));
const deferred=Object.fromEntries(Object.entries(production).filter(([p])=>p===gamePath||p.includes('mascot-')||p.includes('GameEntry-')&&p.endsWith('.css')));
const total=(map,key='bytes')=>Object.values(map).reduce((s,f)=>s+f[key],0);
const report={baseline,gate:true,release:manifest.releaseSha,checks,production,backend,local,initial,deferred,totals:{production:total(production),initial:total(initial),initialGzip:total(initial,'gzip'),initialBrotli:total(initial,'brotli'),deferred:total(deferred)},graph:graph.map(({modules,...c})=>({...c,moduleCount:modules.length}))};
fs.mkdirSync('tmp/release-b',{recursive:true});fs.writeFileSync('tmp/release-b/artifacts.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks,release:report.release,...report.totals}));
