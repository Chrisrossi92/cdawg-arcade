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
const countdownCorrection=process.argv.includes('--countdown-correction');
const protectedPaths=['server','shared','src/official','src/platform','src/arcade','src/games/balance/simulationClock.ts','src/games/balance/simulation.ts','src/games/balance/config.ts','src/games/balance/interruption.ts','src/games/balance/BalanceScene.ts','src/games/balance/rendererReadiness.ts','assets','config','package.json','package-lock.json','render.yaml'];
ok(execFileSync('git',['diff','b226446','--',...protectedPaths.filter(p=>!countdownCorrection||p!=='src/games/balance/simulationClock.ts')],{encoding:'utf8'})==='','protected source changed');

if(countdownCorrection){
 const path='src/games/balance/simulationClock.ts';
 const reviewed=execFileSync('git',['show',`432cba05fbd0c8842524143b04f0bef53ad54f53:${path}`],{encoding:'utf8'});
 const expected=reviewed.replace('/** Countdown is presentation time, never survival time. Restarts after an interruption. */','/** Countdown is presentation time; exceptional foreground gaps contribute no time. */').replace("    if (!Number.isFinite(delta) || delta < 0 || delta > MAX_FRAME_MS + EPSILON) return 'interrupted';", "    if (!Number.isFinite(delta) || delta < 0) return 'interrupted';\n    // Rebase above without crediting stalled presentation time. Lifecycle events\n    // still interrupt independently; the active simulation keeps its 100 ms guard.\n    if (delta > MAX_FRAME_MS + EPSILON) return 'counting';");
 ok(readFileSync(path,'utf8')===expected,'countdown correction exceeds reviewed scope');
}
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
const forbidden=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bAKIA[0-9A-Z]{16}\b/,/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/DUMMY_ONLY_(?:ARTIFACT|DATABASE)_SENTINEL/,/__diag|__audio|__countdown|COUNTDOWN_FRAME|OFFICIAL_INTERRUPT|fixture-player|CONTEXT_CREATED|COMPOSITE_READY|clockSnapshot|AUDIO_NODE_CREATED|RECOVERY_CHOICE|OLD_EXPECTATION_REJECTED|diagnostic-output/];
let securityFiles=0;
for(const dir of ['dist','build','tmp/lobby-integration/dist'])for(const p of files(dir).filter(p=>/\.(js|css|html|json)$/.test(p))){
 const text=readFileSync(`${dir}/${p}`,'utf8');for(const pattern of forbidden)ok(!pattern.test(text),`artifact boundary ${p}`);securityFiles++;
 if(dir==='dist')ok(!/arcade-lobby|A little dog|GameEntry|Run lifecycle/.test(text),'disabled graph');
}
const total=map=>Object.values(map).reduce((n,v)=>n+v.bytes,0);
const gzip=map=>Object.entries(map).filter(([p])=>p.endsWith('.js')).reduce((n,[,v])=>n+v.gzip,0);
const report={checks,securityFiles,assets,unchangedServerFiles:Object.keys(serverBefore).length,before,after,frontend:{before:total(before),after:total(after),delta:total(after)-total(before)},jsGzip:{before:gzip(before),after:gzip(after),delta:gzip(after)-gzip(before)}};
writeFileSync('tmp/audio-readiness/validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks,securityFiles,unchangedServerFiles:report.unchangedServerFiles,frontend:report.frontend,jsGzip:report.jsGzip}));
