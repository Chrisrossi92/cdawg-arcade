// Audit fresh browser results, including resource baselines; no production access.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const root='tmp/countdown-correction',read=p=>JSON.parse(readFileSync(p,'utf8'));
const matrix=read(`${root}/matrix.json`),lifecycle=read(`${root}/lifecycle-controls.json`);
assert.equal(matrix.status,'passed');assert.equal(lifecycle.status,'passed');
assert.equal(matrix.results.length,40);assert.equal(lifecycle.results.length,16);
const all=[matrix,...['quiet-repeat','stall-repeat','active-repeat'].map(n=>read(`${root}/${n}.json`))];
let runs=0,cleanTransitions=0,discarded=0,realCountdownStalls=0,activeStalls=0;
for(const group of all){assert.equal(group.status,'passed');for(const row of group.results)for(const run of row.runs){
 runs++;const es=run.events,first=n=>es.find(e=>e.event===n),active=es.findIndex(e=>e.event==='ACTIVE_TRANSITION');
 assert(!es.slice(0,active<0?es.length:active).some(e=>['CLOCK_FIRST','CLOCK_FRAME'].includes(e.event)));
 for(const frame of es.filter(e=>e.event==='COUNTDOWN_FRAME'&&e.delta>100+1e-7)){
  const next=es.slice(es.indexOf(frame)+1).find(e=>e.event==='COUNTDOWN_RESULT');assert.equal(next.elapsed,frame.elapsed);assert.equal(next.result,'counting');discarded++;
 }
 if(active>=0){assert.equal(first('ACTIVE_TRANSITION').ticks,0);assert.equal(first('ACTIVE_TRANSITION').accumulator,0);cleanTransitions++;}
 if(row.name==='real-stall'){assert(!first('OFFICIAL_INTERRUPT'));assert.equal(first('SUBMIT').interruptions,0);realCountdownStalls++;}
 if(row.name==='active-stall'){assert(first('CLOCK_INTERRUPTED'));assert(first('OFFICIAL_INTERRUPT'));activeStalls++;}
}}
const audio=read('tmp/audio-readiness/browser-headless.json');assert.equal(audio.length,32);assert(audio.every(r=>r.pass));
const renderer=read('tmp/audio-readiness/renderer-matrix.json');assert.equal(renderer.length,17);assert(renderer.every(r=>!r.failure));
const reconciliation=read('tmp/audio-readiness/reconcile-legacy.json');assert.equal(reconciliation.status,'reconciliation passed');assert.equal(reconciliation.reconciliation.length,26);assert.deepEqual(reconciliation.errors,[]);
const soaks=['soak-1','soak-2'].map(n=>read(`${root}/${n}.json`));
for(const soak of soaks){
 assert.equal(soak.status,'passed');const first=soak.samples[0],last=soak.current;
 for(const k of ['scenes','timers','intervals','frames','audioOpen','canvases'])assert.equal(last[k],0,k);
 assert.equal(last.listeners,first.listeners);assert.equal(last.hostListeners,first.hostListeners);assert.equal(last.peakScenes,1);
 assert.equal(last.accepted,4);assert.equal(last.cancels,20);assert.equal(last.resumes,0);assert.equal(last.practiceResults,0);assert.deepEqual(soak.errors,[]);
}
const summary={runs,cleanTransitions,discarded,realCountdownStalls,activeStalls,lifecycleControls:lifecycle.results.length,audioScenarios:audio.length,rendererScenarios:renderer.length,reconciliationCheckpoints:26,soaks:soaks.map(s=>s.current)};
writeFileSync(`${root}/browser-summary.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
