// Synthetic mobile events, loopback only; never a native iPhone certification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browser,sleep} from '../audio-readiness/cdp.mjs';
const b=await browser(),rows=[];
try{
 for(const event of ['pagehide','freeze']){
  await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await b.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await b.send('Page.navigate',{url:'http://127.0.0.1:5231/lobby/index.html'});await b.until("!!document.querySelector('.arcade-lobby')");
  await b.evaluate("document.querySelector('#controls').style.display='none'");
  await b.click('Play practice');await b.until("!!document.querySelector('.balance-start-panel')");await b.click('Start Game');await b.until("!!document.querySelector('.phase-playing')||!!document.querySelector('.pause-panel')");assert(!await b.evaluate("!!document.querySelector('.pause-panel')"));
  const point=await b.evaluate("(()=>{const r=document.querySelector('.control-left').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,id:1};})()");
  await b.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await b.until("!!document.querySelector('.control-left.is-pressed')");
  await b.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await b.until("!document.querySelector('.control-button.is-pressed')");
  await b.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await b.until("!!document.querySelector('.control-left.is-pressed')");
  await b.evaluate(`${event==='freeze'?'document':'window'}.dispatchEvent(new Event(${JSON.stringify(event)}))`);await b.until("!!document.querySelector('.pause-panel')");assert(!await b.evaluate("!!document.querySelector('.control-button.is-pressed')"));
  const before=await b.evaluate('window.__diag.clockSnapshot().ticks');await sleep(600);await b.evaluate("window.dispatchEvent(new Event('pageshow'));document.dispatchEvent(new Event('resume'))");await sleep(100);assert.equal(await b.evaluate('window.__diag.clockSnapshot().ticks'),before);assert(await b.evaluate("!!document.querySelector('.pause-panel')"));
  await b.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await b.click('Leave run · Back to Arcade');await b.until("!!document.querySelector('.arcade-lobby')");assert.equal(await b.evaluate("document.querySelectorAll('#root canvas').length"),0);
  rows.push({event,pointerUpCleared:true,heldInputCleared:true,pausedTicks:before,automaticResume:false,canvasesAfterReturn:0});
 }
 fs.writeFileSync('tmp/iphone/interruptions.json',JSON.stringify({status:'passed',rows},null,2));console.log(JSON.stringify({status:'passed',cases:rows.length}));
}catch(error){fs.writeFileSync('tmp/iphone/interruptions.json',JSON.stringify({status:'failed',error:error.message,rows},null,2));throw error;}finally{await b.close();}
