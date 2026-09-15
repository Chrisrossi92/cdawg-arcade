import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {browser,sleep} from '../audio-readiness/cdp.mjs';
const results=[],output='tmp/countdown-correction/lifecycle-controls.json';
try{
 for(const path of ['direct','lobby'])for(const muted of [false,true])for(const again of [false,true])for(const control of path==='direct'?['freeze']:['freeze','cancel','identity']){
  console.log('START',path,muted?'muted':'audio',again?'Again':'Start',control);
  const b=await browser();
  try{
   await b.send('Page.navigate',{url:'http://127.0.0.1:5231'+(path==='direct'?'/candidate.html?activity=1&buffered=1':'/lobby/index.html?buffered=1')});
   await b.until("!!document.querySelector('#root button')");
   if(path==='lobby'){await b.evaluate("(()=>{const s=document.querySelector('#scenario');s.value='official';s.dispatchEvent(new Event('change'));})()");await b.until("[...document.querySelectorAll('button')].some(b=>b.textContent.replace('→','').trim()==='Play Balance')");await b.click('Play Balance');}
   await b.until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Start Game')");
   await b.evaluate(`(()=>{window.__countdownEvents=[];const emit=window.__diag.emit;window.__diag.emit=(event,values={})=>{window.__countdownEvents.push({event,ms:performance.now(),hidden:document.hidden,...values});emit(event,values);};document.querySelectorAll('.audio-controls input').forEach(e=>{if(e.checked===${muted})e.click();});})()`);
   if(again){await b.click('Start Game');await b.until("!!document.querySelector('.result-panel')||!!document.querySelector('.pause-panel')");assert.equal(await b.evaluate("!!document.querySelector('.pause-panel')"),false);}
   const initialScenes=await b.evaluate("window.__countdownEvents.filter(e=>e.event==='SCENE_CREATE').length-window.__countdownEvents.filter(e=>e.event==='SCENE_DESTROY').length");
   await b.evaluate('window.__countdownEvents.length=0;window.__countdownProbe={next:null,offset:0}');await b.click(again?'Play Again':'Start Game');
   await b.until("window.__countdownEvents.some(e=>e.event==='COUNTDOWN_BASELINE')");await b.evaluate('window.__countdownProbe.next=250');await b.until('window.__countdownProbe.next===null');
   assert.equal(await b.evaluate("window.__countdownEvents.filter(e=>e.event==='OFFICIAL_INTERRUPT').length"),0);
   if(control==='freeze'){await b.send('Page.setWebLifecycleState',{state:'frozen'});await sleep(250);await b.send('Page.setWebLifecycleState',{state:'active'});await b.until("!!document.querySelector('.pause-panel')");}
   else{
    if(control==='cancel')await b.click('Leave run · Back to Arcade');
    else await b.evaluate("(()=>{const s=document.querySelector('#scenario');s.value='practice';s.dispatchEvent(new Event('change'));})()");
    await b.until("[...document.querySelectorAll('button')].some(b=>['Play Balance','Play practice'].includes(b.textContent.replace('→','').trim()))");await sleep(1000);
   }
   const result=await b.evaluate('({events:window.__countdownEvents,clock:window.__diag.clockSnapshot(),canvases:document.querySelectorAll("canvas").length})');results.push({path,muted,again,control,...result});
   const events=n=>result.events.filter(e=>e.event===n);
   assert.equal(events('ATTEMPT_ISSUED').length,1);assert.equal(events('CLOCK_FIRST').length,0);assert.equal(events('SUBMIT').length,0);
   assert(events('OFFICIAL_INTERRUPT').length>0);
   if(control==='freeze'){assert(events('VISIBILITY_HANDLER').some(e=>e.hidden));assert.equal(result.clock.ticks,0);assert.equal(result.clock.accumulator,0);}
   else{assert.equal(result.canvases,0);assert.equal(initialScenes+events('SCENE_CREATE').length,events('SCENE_DESTROY').length);}
   console.log('PASS',path,muted?'muted':'audio',again?'Again':'Start',control);
   writeFileSync(output,JSON.stringify({status:'running',results},null,2));
  }catch(error){
   try{writeFileSync('tmp/countdown-correction/lifecycle-failure-state.json',JSON.stringify({path,muted,again,control,state:await b.evaluate('({text:document.querySelector("#root")?.innerText,hidden:document.hidden,focused:document.hasFocus(),events:window.__countdownEvents??window.__diag?.events})')},null,2));}catch{/* Diagnostics never convert a failure into success. */}
   throw error;
  }finally{await b.close();}
 }
 writeFileSync(output,JSON.stringify({status:'passed',results},null,2));
}catch(error){writeFileSync(output,JSON.stringify({status:'failed',error:error.message,results},null,2));throw error;}
