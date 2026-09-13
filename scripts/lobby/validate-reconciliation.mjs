import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const baseline='b2264466101956fd081e6326ccaa2935fc658650';
assert.equal(execFileSync('git',['diff',baseline,'--','server','shared','src/official','src/platform','src/games/balance/simulation.ts','src/games/balance/simulationClock.ts','src/games/balance/interruption.ts','src/games/balance/config.ts','assets/brand/mascot','package-lock.json','render.yaml'],{encoding:'utf8'}),'');
assert.match(fs.readFileSync('config/lobby-release.ts','utf8'),/lobbyReleased = true/);
for(const name of ['BalanceScene.ts','BalanceGameCanvas.tsx','managedGame.ts','rendererLease.ts','rendererReadiness.ts','mascot/ResultMascot.tsx']){
 const p='src/games/balance/'+name;
 assert.equal(fs.readFileSync(p,'utf8'),execFileSync('git',['show',baseline+':'+p],{encoding:'utf8'}));
}
const d=JSON.parse(fs.readFileSync('docs/brand/release-b-browser.json'));
assert.equal(d.status,'reconciliation passed');assert.equal(d.reconciliation.length,26);assert.deepEqual(d.errors,[]);
for(const row of d.reconciliation){let ready=-1,start=-1,expectedTicks=0;for(const event of row.events??[]){
 if(event.event==='PREPARATION_START'){start=event.ms;expectedTicks=0;}
 if(event.event==='PAUSE_POLICY')expectedTicks=event.ticks;
 if(event.event==='RENDERER_READY')ready=event.ms;
 if(event.event==='ATTEMPT_ISSUED')assert.ok(start>=0&&ready>=start&&event.ms>=ready);
 if(event.event==='FRAME_RENDERED')assert.ok(event.v004&&!event.legacy);
 if(event.event==='CLOCK_FIRST'){assert.ok(event.ticks===expectedTicks&&event.accumulator===0);expectedTicks=null;}
 if(event.event==='SUBMIT')assert.equal(event.ticks,42);
}}
const end=d.reconciliation.at(-1);assert.equal(end.final.listeners,end.baseline.listeners);
for(const key of ['timers','intervals','frames','audioOpen','canvases'])assert.equal(end.final[key],0);
assert.equal(end.final.auth,1);assert.equal(end.final.hostListeners,1);assert.equal(end.final.attempts,17);assert.equal(end.final.submissions,17);assert.equal(end.final.practiceResults,5);
console.log('Reconciliation: protected source unchanged; 26 scenario/checkpoint records; readiness ordering and bounded resources pass.');
