// Local mocked official attempts only. Every unexpected pause fails; only deliberate controls resume.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {browser,sleep} from '../audio-readiness/cdp.mjs';
const root='tmp/countdown-correction';mkdirSync(root,{recursive:true});
const results=[];
const selected=process.argv.find(a=>a.startsWith('--case='))?.slice(7);
const repeat=Number(process.argv.find(a=>a.startsWith('--repeat='))?.slice(9)??1);
const cases=['quiet','gap-99.9','gap-100','gap-100.1','multiple','real-stall','active-stall','blur','hidden','button-cancel'];
// Bound independent full-page fixture history; SPA reuse is covered by lifecycle soaks.
let b;
try{
 for(let iteration=0;iteration<repeat;iteration++)for(const path of ['direct','lobby'])for(const muted of [false,true]){
  b=await browser(true,{diagnosticsPath:`${root}/browser-${iteration}-${path}-${muted}.jsonl`});
  for(const name of cases.filter(c=>!selected||selected===c)){
  const row={iteration,path,muted,name,runs:[]};results.push(row);
  await b.send('Network.enable');await b.send('Network.clearBrowserCache');
  await b.send('Page.navigate',{url:'http://127.0.0.1:5231'+(path==='direct'?'/candidate.html?activity=1&buffered=1':'/lobby/index.html?buffered=1')});
  await b.until("!!document.querySelector('#root button')");
  if(path==='lobby'){await b.evaluate("(()=>{const s=document.querySelector('#scenario');s.value='official';s.dispatchEvent(new Event('change'));})()");await b.until("[...document.querySelectorAll('button')].some(b=>b.textContent.replace('→','').trim()==='Play Balance')");await b.click('Play Balance');}
  await b.until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Start Game')");
  await b.evaluate(`(()=>{window.__countdownEvents=[];const emit=window.__diag.emit;window.__diag.emit=(event,values={})=>{window.__countdownEvents.push({event,ms:performance.now(),hidden:document.hidden,...values});emit(event,values);};document.querySelectorAll('.audio-controls input').forEach(e=>{if(e.checked===${muted})e.click();});})()`);
  for(let run=0;run<2;run++){
   await b.evaluate('window.__countdownEvents.length=0;window.__countdownProbe={next:null,offset:0}');
   await b.click(run?'Play Again':'Start Game');
   await b.until("window.__countdownEvents.some(e=>e.event==='COUNTDOWN_BASELINE')");
   const gaps=name.startsWith('gap-')?[Number(name.slice(4))]:name==='multiple'?[101,250,5000]:name==='active-stall'?[250]:[];
   for(const gap of gaps){
    await b.evaluate(`window.__countdownProbe.next=${gap}`);
    await b.until('window.__countdownProbe.next===null');
   }
   if(name==='real-stall')await b.evaluate('(()=>{const end=performance.now()+250;while(performance.now()<end){}})()');
   const pausedControl=['active-stall','blur','hidden','button-cancel'].includes(name);
   if(name==='active-stall'){await b.until("window.__countdownEvents.some(e=>e.event==='CLOCK_FIRST')");await b.evaluate('(()=>{const end=performance.now()+250;while(performance.now()<end){}})()');}
   if(name==='blur')await b.evaluate("window.dispatchEvent(new Event('blur'))");
   if(name==='hidden')await b.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))");
   if(name==='button-cancel')await b.evaluate("document.querySelector('.control-deck button').dispatchEvent(new PointerEvent('pointercancel',{bubbles:true}))");
   await b.until("!!document.querySelector('.result-panel')||!!document.querySelector('.pause-panel')");
   const capture=await b.evaluate('({events:window.__countdownEvents,paused:!!document.querySelector(".pause-panel"),clock:window.__diag.clockSnapshot()})');row.runs.push(capture);
   const es=capture.events,events=n=>es.filter(e=>e.event===n),first=n=>events(n)[0];
   assert.equal(capture.paused,pausedControl,`${path}/${name}: unexpected pause state`);
   for(const n of ['COMPOSITE_READY','ATTEMPT_ISSUED','COUNTDOWN_START'])assert.equal(events(n).length,1,n);
   assert(first('RENDERER_READY').ms<=first('COMPOSITE_READY').ms);
   assert.equal(first('COMPOSITE_READY').audio,muted?'muted':'ready');
   assert(first('COMPOSITE_READY').ms<=first('ATTEMPT_ISSUED').ms&&first('ATTEMPT_ISSUED').ms<=first('COUNTDOWN_START').ms);
   for(const e of events('COUNTDOWN_FRAME')){
    const result=es.slice(es.indexOf(e)+1).find(x=>x.event==='COUNTDOWN_RESULT');
    assert(result,'missing countdown result');
    assert(Math.abs(result.elapsed-e.elapsed-(e.delta>100+1e-7?0:e.delta))<1e-6,'discarded gap credited');
   }
   for(const gap of gaps)assert(events('COUNTDOWN_FRAME').some(e=>Math.abs(e.delta-gap)<1e-6),'injected frame missing');
   if(name==='real-stall')assert(events('COUNTDOWN_FRAME').some(e=>e.delta>100),'real stall not observed');
   if(!pausedControl){
    assert.equal(events('PAUSE_POLICY').length,0);assert.equal(events('OFFICIAL_INTERRUPT').length,0);
    assert.equal(first('SUBMIT').interruptions,0);
   }else{
    assert(events('OFFICIAL_INTERRUPT').length>0);
    if(name==='active-stall')assert(events('CLOCK_INTERRUPTED').length>0);
    else assert.deepEqual(capture.clock,{ticks:0,accumulator:0,phase:'countdown'});
   }
   if(!pausedControl||name==='active-stall'){
    for(const n of ['ACTIVE_TRANSITION','CLOCK_FIRST']){assert.equal(first(n).ticks,0);assert.equal(first(n).accumulator,0);}
    assert(first('COUNTDOWN_START').ms<first('ACTIVE_TRANSITION').ms);
    assert(!es.slice(0,es.indexOf(first('ACTIVE_TRANSITION'))).some(e=>e.event==='CLOCK_FRAME'||e.event==='CLOCK_FIRST'),'simulation ran during countdown');
   }
   if(pausedControl){
    if(name==='hidden')await b.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))");
    await b.click('Resume');await b.until("!!document.querySelector('.result-panel')||!!document.querySelector('.pause-panel')");
    assert.equal(await b.evaluate("!!document.querySelector('.pause-panel')"),false,'unexpected second pause');
    await b.until("window.__countdownEvents.some(e=>e.event==='SUBMIT')");
    assert.equal(await b.evaluate("window.__countdownEvents.find(e=>e.event==='SUBMIT').interruptions"),1);
   }
   console.log('PASS',iteration,path,muted?'muted':'audio',name,run);
   writeFileSync(root+'/browser.json',JSON.stringify({status:'running',results},null,2));
  }
 }
  await b.close();b=undefined;
 }
 writeFileSync(root+'/browser.json',JSON.stringify({status:'passed',results},null,2));
}catch(error){writeFileSync(root+'/browser.json',JSON.stringify({status:'failed',error:error.message,results},null,2));throw error;}
finally{if(b)await b.close();}
