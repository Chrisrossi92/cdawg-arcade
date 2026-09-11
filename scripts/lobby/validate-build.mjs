import assert from 'node:assert/strict';
import {build} from 'vite';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
let checks=0;const ok=(value,message)=>{assert.ok(value,message);checks++;};
const sha=data=>createHash('sha256').update(data).digest('hex');
const files=root=>Object.fromEntries(fs.readdirSync(root,{recursive:true}).filter(p=>fs.statSync(`${root}/${p}`).isFile()&&!p.startsWith('.vite')).map(p=>{const data=fs.readFileSync(`${root}/${p}`);return [p,{bytes:data.length,gzip:gzipSync(data).length,sha256:sha(data)}];}));
const baseline=JSON.parse(fs.readFileSync('docs/brand/lobby-baseline.json'));
const disabled=files('dist'),enabled=files('tmp/lobby-integration/dist');
const report={baseline:'758c926e9a733f0c83a904515c4654b2227e7728',gate:false,disabled,enabled};
const total=map=>Object.values(map).reduce((n,f)=>n+f.bytes,0);
report.baselineFrontendBytes=total(Object.fromEntries(Object.entries(baseline).filter(([p])=>p.startsWith('dist/'))));report.disabledBytes=total(disabled);report.enabledBytes=total(enabled);report.disabledDelta=report.disabledBytes-report.baselineFrontendBytes;
report.unchangedBaselineFiles=Object.keys(baseline).filter(p=>fs.existsSync(p)&&sha(fs.readFileSync(p))===baseline[p].sha256);
for(const [p,f] of Object.entries(baseline).filter(([p])=>p.startsWith('build/server/')||p.endsWith('.webp')||p.endsWith('.css')))ok(fs.existsSync(p)&&sha(fs.readFileSync(p))===f.sha256,`protected artifact ${p}`);
for(const [p] of Object.entries(disabled)){ok(!/host-|tag-|cdawg-horizontal|woff|GameEntry/.test(p),'lobby asset in disabled output');if(p.endsWith('.js')||p.endsWith('.html'))ok(!/A little dog|arcade\/balance|arcade-lobby|Fixture Player|TEST FIXTURES|Run lifecycle soak|DUMMY_ONLY|\/Users\//.test(fs.readFileSync('dist/'+p,'utf8')),'lobby/source/fixture data in disabled output');}
for(const p of Object.keys(enabled)){if(p.endsWith('.js')||p.endsWith('.html'))ok(!/Fixture Player|TEST FIXTURES|Run lifecycle soak|DUMMY_ONLY|\/Users\//.test(fs.readFileSync('tmp/lobby-integration/dist/'+p,'utf8')),'fixture/private data in enabled output');}
for(const mode of ['production','lobby-integration']){
 const ids=[];await build({mode,logLevel:'silent',build:{write:false},plugins:[{name:'lobby-graph-audit',generateBundle(_options,bundle){for(const output of Object.values(bundle)){if(output.type==='chunk')ids.push(...Object.keys(output.modules));}}}]});
 ok(ids.some(id=>id.endsWith('/src/arcade/ArcadeApp.tsx'))===(mode==='lobby-integration'),'gate entry graph');ok(!ids.some(id=>/scripts\/lobby\/harness|scripts\/brand\/preview/.test(id)),'diagnostics graph');
 if(mode==='production')ok(!ids.some(id=>/\/src\/arcade\/|assets\/brand\/arcade/.test(id)),'lobby modules in disabled graph');
}
const manifest=JSON.parse(fs.readFileSync('tmp/lobby-integration/dist/.vite/manifest.json'));
const entry=manifest['index.html'],game=manifest['src/arcade/GameEntry.tsx'];ok(entry?.isEntry&&game?.isDynamicEntry,'dynamic game boundary');ok(!entry.imports?.some(p=>/GameEntry/.test(p)),'game statically imported');
report.initial=Object.fromEntries(Object.entries(enabled).filter(([p])=>[entry.file,...entry.css??[],...entry.assets??[]].includes(p)));
report.initialBytes=total(report.initial);report.gameChunkBytes=enabled[game.file].bytes;
report.checks=checks;fs.writeFileSync('docs/brand/lobby-build-validation.json',JSON.stringify(report,null,2)+'\n');console.log(`Lobby build/gate/isolation: ${checks} checks; disabled ${report.disabledBytes} (${report.disabledDelta>=0?'+':''}${report.disabledDelta}); enabled ${report.enabledBytes}; initial ${report.initialBytes}; game ${report.gameChunkBytes}`);
