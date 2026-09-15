// Sequential disposable browsers; preserve failures without automatic retries.
import {execFileSync} from 'node:child_process';
import {copyFileSync,mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('tmp/iphone',{recursive:true});mkdirSync('tmp/countdown-correction',{recursive:true});
const results=[];
const jobs=[
 ['direct-fixture',['node_modules/vite/bin/vite.js','build','--config','scripts/countdown/vite.config.ts']],
 ['lobby-fixture',['node_modules/vite/bin/vite.js','build','--config','scripts/countdown/lobby.config.ts','--base=/lobby/']],
 ['mobile',['scripts/iphone/browser.mjs']],
 ['mobile-interruptions',['scripts/iphone/interruption-browser.mjs']],
 ['desktop-context',['scripts/soft-launch/browser.mjs']],
 ['iphone-context',['scripts/soft-launch/browser.mjs','--iphone']],
 ['countdown-matrix',['scripts/countdown/browser.mjs']],
 ['readiness-lifecycle',['scripts/countdown/validation-browser.mjs']],
 ['aggregate',['scripts/countdown/reports.mjs']],
 ['acceptance',['scripts/iphone/reports.mjs']],
];
for(const [name,args] of jobs){
 console.log('START',name);
 try{const output=execFileSync(process.execPath,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:32*1024*1024});writeFileSync(`tmp/iphone/${name}-gate.log`,output);if(name==='countdown-matrix')copyFileSync('tmp/countdown-correction/browser.json','tmp/countdown-correction/matrix.json');results.push({name,pass:true});console.log('PASS',name);}
 catch(error){writeFileSync(`tmp/iphone/${name}-gate.log`,String(error.stdout??'')+String(error.stderr??''));results.push({name,pass:false});console.log('FAIL',name);}
 writeFileSync('tmp/iphone/browser-gates.json',JSON.stringify(results,null,2));
}
if(results.some(row=>!row.pass))process.exitCode=1;
