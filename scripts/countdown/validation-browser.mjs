// Sequential browsers avoid creating validation-induced host contention.
import {execFileSync} from 'node:child_process';
import {copyFileSync,writeFileSync,mkdirSync} from 'node:fs';
mkdirSync('tmp/audio-readiness',{recursive:true});mkdirSync('tmp/countdown-correction',{recursive:true});
const root='tmp/countdown-correction',results=[];
const jobs=[
 ['lifecycle-controls',['scripts/countdown/lifecycle.mjs']],
 ['audio-matrix',['scripts/audio-readiness/browser.mjs']],
 ['standard-direct-build',['node_modules/vite/bin/vite.js','build','--config','scripts/readiness/vite.config.ts']],
 ['standard-lobby-build',['node_modules/vite/bin/vite.js','build','--config','scripts/lobby/harness/vite.config.mjs','--base=/lobby/']],
 ['renderer-matrix',['scripts/audio-readiness/legacy-browser.mjs','direct']],
 ['reconciliation',['scripts/audio-readiness/legacy-browser.mjs','reconcile']],
 ['rapid',['scripts/audio-readiness/legacy-browser.mjs','rapid']],
 ['responsive',['scripts/audio-readiness/legacy-browser.mjs','responsive']],
 ['soak-1',['scripts/audio-readiness/legacy-browser.mjs','soak']],
 ['soak-2',['scripts/audio-readiness/legacy-browser.mjs','soak']],
 ['countdown-direct-build',['node_modules/vite/bin/vite.js','build','--config','scripts/countdown/vite.config.ts']],
 ['countdown-lobby-build',['node_modules/vite/bin/vite.js','build','--config','scripts/countdown/lobby.config.ts','--base=/lobby/']],
 ['quiet-repeat',['scripts/countdown/browser.mjs','--case=quiet','--repeat=2']],
 ['stall-repeat',['scripts/countdown/browser.mjs','--case=real-stall','--repeat=2']],
 ['active-repeat',['scripts/countdown/browser.mjs','--case=active-stall','--repeat=2']],
 ['suspended-headless',['scripts/audio-readiness/browser.mjs','--case=suspended-again']],
 ['suspended-headed',['scripts/audio-readiness/browser.mjs','--case=suspended-again','--headed']],
 ['quiet-headed',['scripts/audio-readiness/browser.mjs','--case=normal','--repeat=3','--headed']],
];
writeFileSync(`${root}/browser-jobs.json`,JSON.stringify(results));
for(const [name,args] of jobs){
 console.log('START',name);
 try{
  const output=execFileSync(process.execPath,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:16*1024*1024});writeFileSync(`${root}/${name}.log`,output);
  if(name.startsWith('soak'))copyFileSync('tmp/audio-readiness/soak-legacy.json',`${root}/${name}.json`);
  if(name.endsWith('repeat'))copyFileSync(`${root}/browser.json`,`${root}/${name}.json`);
  results.push({name,pass:true});console.log('PASS',name);
 }catch(error){writeFileSync(`${root}/${name}.log`,String(error.stdout??'')+String(error.stderr??''));results.push({name,pass:false});writeFileSync(`${root}/browser-jobs.json`,JSON.stringify(results,null,2));console.log('FAIL',name);}
 writeFileSync(`${root}/browser-jobs.json`,JSON.stringify(results,null,2));
}

if(results.some(result=>!result.pass))process.exitCode=1;
