import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const root='tmp/audio-readiness/';
const read=file=>JSON.parse(readFileSync(root+file));
const stats=values=>{const x=values.filter(Number.isFinite).sort((a,b)=>a-b),round=n=>n===undefined?null:Math.round(n*100)/100;return {n:x.length,median:round(x[Math.floor(x.length/2)]),p95:x.length>=20?round(x[Math.ceil(x.length*.95)-1]):null,max:round(x.at(-1))};};
const originals=read('browser-headless.json');
const reruns=['browser-headless-retry.json','browser-headless-reject.json'].flatMap(read);
const headlessSuspended=read('browser-headless-suspended-again.json');
const corrected=originals.map(row=>[...reruns,...headlessSuspended].find(r=>r.path===row.path&&r.spec.name===row.spec.name)??row);
const headedSuspended=read('browser-headed-suspended-again.json');
const headed=read('browser-headed.json').map(row=>headedSuspended.find(r=>r.path===row.path&&r.spec.name===row.spec.name)??row);
const quiet=read('browser-headed-normal-repeat.json');
const all=[...corrected,...headed,...quiet];
const concise=row=>({path:row.path,headed:row.headed,spec:row.spec,pass:!!row.pass,error:row.error,runs:row.runs.map(run=>{
 if(run.cancelled)return run;
 const events=run.events,find=name=>events.find(e=>e.event===name),last=name=>events.filter(e=>e.event===name).at(-1);
 return {paused:run.paused,overflow:run.overflow,preparationFrames:{count:events.filter(e=>e.event==='FRAME_RENDERED').length,allV004:events.filter(e=>e.event==='FRAME_RENDERED').every(e=>e.v004&&!e.legacy),allZeroTicks:events.filter(e=>e.event==='FRAME_RENDERED').every(e=>e.ticks===0)},events:events.filter(e=>!['CLOCK_FRAME','FRAME_RENDERED','AUDIO_CUE'].includes(e.event)),firstGameplaySound:events.find(e=>e.event==='AUDIO_CUE'&&e.ms>=(find('CLOCK_FIRST')?.ms??Infinity)),frameTiming:stats(events.filter(e=>e.event==='CLOCK_FRAME').map(e=>e.delta)),audioNodes:stats(run.native.filter(e=>e.event==='NODE_CREATED').map(e=>e.duration)),activeAudioNodes:stats(run.native.filter(e=>e.event==='NODE_CREATED'&&e.ms>=(find('CLOCK_FIRST')?.ms??Infinity)).map(e=>e.duration)),startToCompositeMs:last('COMPOSITE_READY')?.ms-last('START_ACTIVATE')?.ms,native:run.native.filter(e=>(e.event!=='NODE_CREATED'||e.duration>5)&&(e.event!=='GAIN_CONNECTED'||e.destination||e.ms<(find('COUNTDOWN_START')?.ms??Infinity)))};
 })});
const normal=all.filter(row=>row.spec.name.startsWith('normal')&&row.pass);
const measurements={};
for(const path of ['direct','lobby']){
 const rows=normal.filter(r=>r.path===path),runs=rows.flatMap(r=>r.runs);
 measurements[path]={runs:runs.length,startToComposite:stats(runs.map(run=>run.events.find(e=>e.event==='COMPOSITE_READY').ms-run.events.find(e=>e.event==='START_ACTIVATE').ms)),frames:stats(runs.flatMap(run=>run.events.filter(e=>e.event==='CLOCK_FRAME').map(e=>e.delta))),firstUseNode:stats(runs.flatMap(run=>run.native.filter(e=>e.event==='NODE_CREATED').slice(0,1).map(e=>e.duration))),activeNode:stats(runs.flatMap(run=>{const start=run.events.find(e=>e.event==='CLOCK_FIRST').ms;return run.native.filter(e=>e.event==='NODE_CREATED'&&e.ms>=start).map(e=>e.duration);})),unexpectedPauses:runs.filter(r=>r.paused).length};
}
const issues=originals.filter(r=>!r.pass).map(concise);
const negative=read('browser-before.json');
const summary={finalScenarios:all.length,passingScenarios:all.filter(r=>r.pass).length,completedRuns:all.flatMap(r=>r.runs).filter(r=>r.events?.some(e=>e.event==='SUBMIT')).length,cancellations:all.flatMap(r=>r.runs).filter(r=>r.cancelled).length,intentionalInterruptions:all.flatMap(r=>r.runs).filter(r=>r.events?.some(e=>e.event==='SUBMIT'&&e.interruptions===1)).length,headlessInitialFailures:issues.map(r=>({path:r.path,case:r.spec.name,error:r.error})),measurements};
writeFileSync('docs/audio-readiness/browser-evidence.json',JSON.stringify({summary,negativeControl:negative.map(concise),retainedInitialFailures:issues,final:all.map(concise)},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
assert(all.every(r=>r.pass),'Incomplete browser matrix');
assert(negative.every(r=>r.expectedRegression),'Baseline did not reproduce late audio initialization');
