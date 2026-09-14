// Local-only artifact/source audit. Never reads dotenv files or accesses a service.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const sha=data=>createHash('sha256').update(data).digest('hex');
const files=dir=>readdirSync(dir,{recursive:true}).filter(p=>statSync(`${dir}/${p}`).isFile());
const inventory=dir=>Object.fromEntries(files(dir).filter(p=>!p.startsWith('.vite')).map(p=>{const data=readFileSync(`${dir}/${p}`);return[p,{bytes:data.length,gzip:gzipSync(data).length,sha256:sha(data)}];}));
let checks=0;const ok=(v,m)=>{assert(v,m);checks++;};
const protectedPaths=['server','shared','src/official','src/platform','src/arcade','src/games/balance/simulationClock.ts','src/games/balance/simulation.ts','src/games/balance/config.ts','src/games/balance/interruption.ts','src/games/balance/BalanceScene.ts','src/games/balance/rendererReadiness.ts','assets','config','package.json','package-lock.json','render.yaml'];
ok(execFileSync('git',['diff','b226446','--',...protectedPaths],{encoding:'utf8'})==='','protected source changed');
ok(execFileSync('git',['rev-parse','codex/arcade-lobby-release-b'],{encoding:'utf8'}).trim()==='fc57961b098d5132a56a20d36aa135c233e84527','Release B moved');
ok(readFileSync('config/lobby-release.ts','utf8').includes('lobbyReleased = false'),'production lobby enabled');
const before=inventory('/private/tmp/cdawg-audio-baseline/dist'),after=inventory('dist');
const serverBefore=inventory('/private/tmp/cdawg-audio-baseline/build'),serverAfter=inventory('build');
delete serverBefore['release.json']; delete serverAfter['release.json'];
for(const [p,v]of Object.entries(serverBefore))ok(serverAfter[p]?.sha256===v.sha256,`server ${p}`);
const assets=[];
for(const group of ['balance0','balance1','reactions0','reactions1'])for(const ext of ['webp','json']){
 const path=`assets/brand/mascot/runtime/cdawg-mascot-${group}-v004.${ext}`,bytes=readFileSync(path);
 ok(sha(bytes)===sha(execFileSync('git',['show',`b226446:${path}`])),`V004 ${path}`);assets.push({path,bytes:bytes.length,sha256:sha(bytes)});
}
const forbidden=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bAKIA[0-9A-Z]{16}\b/,/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/DUMMY_ONLY_(?:ARTIFACT|DATABASE)_SENTINEL/,/__diag|__audio|fixture-player|CONTEXT_CREATED|COMPOSITE_READY|diagnostic-output/];
let securityFiles=0;
for(const dir of ['dist','build','tmp/lobby-integration/dist'])for(const p of files(dir).filter(p=>/\.(js|css|html|json)$/.test(p))){
 const text=readFileSync(`${dir}/${p}`,'utf8');for(const pattern of forbidden)ok(!pattern.test(text),`artifact boundary ${p}`);securityFiles++;
 if(dir==='dist')ok(!/arcade-lobby|A little dog|GameEntry|Run lifecycle/.test(text),'disabled graph');
}
const total=map=>Object.values(map).reduce((n,v)=>n+v.bytes,0);
const gzip=map=>Object.entries(map).filter(([p])=>p.endsWith('.js')).reduce((n,[,v])=>n+v.gzip,0);
const report={checks,securityFiles,assets,unchangedServerFiles:Object.keys(serverBefore).length,before,after,frontend:{before:total(before),after:total(after),delta:total(after)-total(before)},jsGzip:{before:gzip(before),after:gzip(after),delta:gzip(after)-gzip(before)}};
writeFileSync('tmp/audio-readiness/validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks,securityFiles,unchangedServerFiles:report.unchangedServerFiles,frontend:report.frontend,jsGzip:report.jsGzip}));
