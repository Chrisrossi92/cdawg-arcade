// Acceptance reads actual outputs; a failed or incomplete report cannot become a pass.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const project=read('tmp/iphone/suites.json');assert.equal(project.length,17);assert(project.every(x=>x.pass));
const mobile=read('tmp/iphone/mobile.json');assert.equal(mobile.status,'passed');assert.equal(mobile.rows.length,8);assert(mobile.rows.some(x=>x.density===3));
for(const row of mobile.rows)for(const key of ['scenes','timers','intervals','frames','audioOpen','canvases'])assert.equal(row.resources[key],0,key);
const interruptions=read('tmp/iphone/interruptions.json');assert.equal(interruptions.status,'passed');assert.equal(interruptions.rows.length,2);
for(const path of ['tmp/soft-launch/ui-browser.json','tmp/iphone/context/ui-browser.json']){const report=read(path);assert.equal(report.status,'passed');assert.equal(report.rows.length,21);}
const artifacts=read('tmp/iphone/artifacts.json');assert(artifacts.reproducible&&artifacts.serverUnchanged);assert.equal(artifacts.base,'fb8fa515f8113cbdad0e283cd72c5862d38c6883');
const matrix=read('tmp/countdown-correction/matrix.json');assert.equal(matrix.status,'passed');assert.equal(matrix.results.length,40);assert.equal(matrix.results.reduce((n,row)=>n+row.runs.length,0),80);
const jobs=read('tmp/countdown-correction/browser-jobs.json');assert.equal(jobs.length,18);assert(jobs.every(x=>x.pass));
const summary=read('tmp/countdown-correction/browser-summary.json');assert.equal(summary.lifecycleControls,16);assert.equal(summary.audioScenarios,32);assert.equal(summary.rendererScenarios,17);assert.equal(summary.reconciliationCheckpoints,26);assert.equal(summary.soaks.length,2);
const stats=values=>{const sorted=[...values].sort((a,b)=>a-b);assert(sorted.length>0&&sorted.every(Number.isFinite));return{count:sorted.length,min:sorted[0],median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)};};
const mobileMetrics={frames:stats(mobile.rows.flatMap(row=>row.frameDeltas)),touchRoundTrips:stats(mobile.rows.map(row=>row.touchRoundTripMs))};
const output={mobileMetrics,status:'passed',projectGroups:17,mobileCases:8,interruptionCases:2,contextSuites:2,countdownCases:40,countdownCaptures:80,readinessJobs:18,reproducible:true,serverUnchanged:true,summary};
writeFileSync('tmp/iphone/final-gates.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output));
