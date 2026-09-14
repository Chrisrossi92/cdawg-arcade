import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const jobs=[
 ['suspended-headless',['scripts/audio-readiness/browser.mjs','--case=suspended-again']],
 ['suspended-headed',['scripts/audio-readiness/browser.mjs','--case=suspended-again','--headed']],
 ...['direct','reconcile','soak','rapid','responsive'].map(mode=>['legacy-'+mode,['scripts/audio-readiness/legacy-browser.mjs',mode]]),
 ['quiet',['scripts/audio-readiness/browser.mjs','--headed','--case=normal','--repeat=3']],
];
const results=[];
for(const [name,args]of jobs){
 console.log('START',name);
 try{const output=execFileSync(process.execPath,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:8*1024*1024});writeFileSync('tmp/audio-readiness/'+name+'.log',output);results.push({name,pass:true});console.log('PASS',name);}
 catch(error){writeFileSync('tmp/audio-readiness/'+name+'.log',String(error.stdout??'')+String(error.stderr??''));results.push({name,pass:false});console.log('FAIL',name);}
 writeFileSync('tmp/audio-readiness/final-browser-jobs.json',JSON.stringify(results,null,2)+'\n');
}
if(results.some(r=>!r.pass))process.exitCode=1;
