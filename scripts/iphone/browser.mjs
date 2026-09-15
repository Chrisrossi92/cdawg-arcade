// Bounded, synthetic, loopback-only iPhone coverage. Never uses a real Discord identity.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browser,sleep} from '../audio-readiness/cdp.mjs';
const out='tmp/iphone';fs.mkdirSync(out,{recursive:true});
const b=await browser(true,{diagnosticsPath:out+'/cdp.jsonl'}),rows=[];
const fixtures=[[320,568,20,0,0],[375,667,20,0,0],[390,844,59,34,0],[430,932,59,34,0],[844,390,0,21,59],[932,430,0,21,59],[1440,900,0,0,0],[390,844,59,34,0,3]];
const capture=async name=>fs.writeFileSync(`${out}/${name}.png`,Buffer.from((await b.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
const rect=async selector=>b.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
const touch=async(type,points)=>b.send('Input.dispatchTouchEvent',{type,touchPoints:points.map((p,i)=>({id:i+1,radiusX:5,radiusY:5,...p}))});
const tapButton=async text=>{
 const select=`[...document.querySelectorAll('button')].find(e=>e.textContent.replace('→','').trim()===${JSON.stringify(text)}&&!e.disabled)`;
 assert(await b.evaluate(`!!(${select})`),'missing button '+text);await b.evaluate(`(${select}).scrollIntoView({behavior:'instant',block:'center'})`);await sleep(100);
 const point=await b.evaluate(`(()=>{const r=(${select}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);assert(await b.evaluate(`document.elementFromPoint(${point.x},${point.y})?.closest('button')===(${select})`),'button is not hittable after scrolling: '+text);await touch('touchStart',[point]);await touch('touchEnd',[]);
};
try{
 for(const [width,height,top,bottom,side,density=1] of fixtures.filter(f=>!process.argv[2]||f[0]===Number(process.argv[2]))){
  await b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:density,mobile:width<1000});
  await b.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await b.send('Page.navigate',{url:'http://127.0.0.1:5231/lobby/index.html'});await b.until("!!document.querySelector('.arcade-lobby')");
  await b.evaluate("window.__mobileEvents=[];const emit=window.__diag.emit;window.__diag.emit=(event,values={})=>{window.__mobileEvents.push({event,...values});emit(event,values);};");
  await b.evaluate(`for(const [key,value] of Object.entries({top:${top},bottom:${bottom},left:${side},right:${side}}))document.documentElement.style.setProperty('--discord-safe-area-inset-'+key,value+'px');`);
  await b.evaluate("document.querySelector('#controls').style.display='none';document.documentElement.style.scrollBehavior='auto';");await sleep(100);
  const layout=await b.evaluate(`(()=>{const r=document.querySelector('.arcade-lobby').getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,scrollWidth:document.documentElement.scrollWidth,width:innerWidth,safeTop:getComputedStyle(document.body).paddingTop};})()`);
  assert(layout.scrollWidth<=width+1,`lobby overflow ${width}`);assert(layout.left>=side&&layout.right<=width-side+1);assert(layout.top>=top);assert.equal(Number.parseFloat(layout.safeTop),top);
  await capture(`${width}x${height}-dpr${density}-lobby`);const skip=await b.evaluate("(()=>{const e=document.querySelector('.skip-link');e.focus({preventScroll:true});const r=e.getBoundingClientRect();e.blur();return{x:r.x,y:r.y};})()");assert(skip.x>=side&&skip.y>=top,'skip link outside safe area');
  await b.evaluate("document.querySelector('#root .identity-button').click()");await b.until("!!document.querySelector('dialog[open]')");
  const dialog=await b.evaluate("(()=>{const r=document.querySelector('dialog[open]').getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom};})()");
  assert(dialog.top>=top&&dialog.bottom<=height-bottom+1&&dialog.left>=side&&dialog.right<=width-side+1,`unsafe dialog ${width}: ${JSON.stringify(dialog)}`);await capture(`${width}x${height}-dpr${density}-settings`);await tapButton('Close');await b.until("!document.querySelector('dialog[open]')");await b.until("document.activeElement.matches('.identity-button')",1000);
  await tapButton('Play practice');await b.until("!!document.querySelector('.balance-start-panel')");await capture(`${width}x${height}-dpr${density}-start`);
  await b.evaluate("document.querySelector('.balance-start-panel .primary-button').scrollIntoView({behavior:'instant',block:'center'})");await sleep(100);const start=await rect('.balance-start-panel .primary-button');await touch('touchStart',[start]);await touch('touchEnd',[]);
  await b.until("!!document.querySelector('.phase-countdown')||!!document.querySelector('.renderer-preparation')");
  await b.until("!!document.querySelector('.phase-playing')||!!document.querySelector('.pause-panel')");assert(!await b.evaluate("!!document.querySelector('.pause-panel')"),'unexpected pause');
  const controls=await b.evaluate("[...document.querySelectorAll('.control-button')].map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};})");
  assert(controls.every(r=>r.width>=44&&r.height>=44&&r.x>=side&&r.right<=width-side+1&&r.y>=top&&r.bottom<=height-bottom+1),`unsafe controls ${width}: ${JSON.stringify(controls)}`);
  const gestureViewport=await b.evaluate('({x:scrollX,y:scrollY,scale:visualViewport?.scale??1})');const left=await rect('.control-left'),right=await rect('.control-right');const startAt=performance.now();await touch('touchStart',[left]);await b.until("document.querySelector('.control-left').classList.contains('is-pressed')",1000);const latency=performance.now()-startAt;
  await touch('touchMove',[right]);assert(await b.evaluate("document.querySelector('.control-left').classList.contains('is-pressed')"),'sliding lost capture');
  await touch('touchStart',[left,right]);assert(await b.evaluate("document.querySelector('.control-right').classList.contains('is-pressed')"),'second finger not authoritative');
  assert.deepEqual(await b.evaluate('({x:scrollX,y:scrollY,scale:visualViewport?.scale??1})'),gestureViewport,'game gesture scrolled or zoomed the page');await touch('touchCancel',[]);await b.until("!!document.querySelector('.pause-panel')");assert(!await b.evaluate("!!document.querySelector('.control-button.is-pressed')"));await capture(`${width}x${height}-dpr${density}-paused`);
  const beforeResize=await b.evaluate("document.querySelectorAll('#root canvas').length");await b.send('Emulation.setDeviceMetricsOverride',{width:height,height:width,deviceScaleFactor:density,mobile:width<1000});await sleep(150);assert.equal(await b.evaluate("document.querySelectorAll('#root canvas').length"),beforeResize);assert(await b.evaluate("!!document.querySelector('.pause-panel')"));await b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:density,mobile:width<1000});await sleep(150);await tapButton('Resume');await b.until("!document.querySelector('.pause-panel')");await b.until("!!document.querySelector('.result-panel')||!!document.querySelector('.pause-panel')");assert(!await b.evaluate("!!document.querySelector('.pause-panel')"));await capture(`${width}x${height}-dpr${density}-result`);
  await tapButton('Back to Arcade');await b.until("!!document.querySelector('.arcade-lobby')");assert.equal(await b.evaluate("document.querySelectorAll('#root canvas').length"),0);
  await b.until("['scenes','timers','intervals','frames','audioOpen','canvases'].every(k=>JSON.parse(document.querySelector('#metrics').textContent).current[k]===0)",12000);const resources=await b.evaluate("JSON.parse(document.querySelector('#metrics').textContent).current");for(const key of ['scenes','timers','intervals','frames','audioOpen','canvases'])assert.equal(resources[key],0,key);const frameDeltas=await b.evaluate("window.__mobileEvents.filter(e=>e.event==='CLOCK_FRAME').map(e=>e.delta)");
  console.log('PASS viewport',width,height);rows.push({frameDeltas,resources,width,height,density,insets:{top,bottom,side},layout,dialog,controls,touchRoundTripMs:latency,touchCancelPaused:true,slidingCapture:true,multitouch:true,canvasesAfterReturn:0});
 }
 fs.writeFileSync(out+'/mobile.json',JSON.stringify({status:'passed',simulated:true,rows},null,2));console.log(JSON.stringify({status:'passed',viewports:rows.length,touchRuns:rows.length}));
}catch(e){fs.writeFileSync(out+'/mobile.json',JSON.stringify({status:'failed',error:e.message,rows},null,2));fs.writeFileSync(out+'/failure-events.json',JSON.stringify(await b.evaluate('window.__mobileEvents'),null,2));fs.writeFileSync(out+'/failure-dom.txt',await b.evaluate('document.body.innerText'));await capture('failure');throw e;}finally{await b.close();}
