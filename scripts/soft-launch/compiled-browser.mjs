// Own disposable browser, loopback-only untouched compiled candidate. No production requests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browser,sleep} from '../audio-readiness/cdp.mjs';
const out='tmp/soft-launch',rows=[];const b=await browser(true,{diagnosticsPath:out+'/compiled-cdp.jsonl'});
try{
 await b.send('Network.enable');await b.send('Network.clearBrowserCache');
 for(const cache of ['cold','warm']){
  await b.send('Page.navigate',{url:'http://127.0.0.1:5254/'});await b.until("!!document.querySelector('.arcade-lobby')");await sleep(300);
  const initial=await b.evaluate("performance.getEntriesByType('resource').map(e=>({name:new URL(e.name).pathname,encoded:e.encodedBodySize,transfer:e.transferSize,duration:e.duration}))");
  assert(!initial.some(e=>/GameEntry|mascot-.*v004/.test(e.name)),'game fetched before lobby entry');
  const accessibility=await b.evaluate("(()=>{const nodes=[...document.querySelectorAll('button,a,input')].filter(e=>e.getBoundingClientRect().height);return {unnamed:nodes.filter(e=>!(e.getAttribute('aria-label')||e.textContent.trim()||e.closest('label')?.textContent.trim())).length,images:[...document.images].every(e=>e.hasAttribute('alt')),headings:document.querySelectorAll('h1').length}})()");
  assert.equal(accessibility.unnamed,0);assert(accessibility.images);assert.equal(accessibility.headings,1);
  await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  const focus=await b.evaluate("document.activeElement.tagName");assert(['BUTTON','A','INPUT'].includes(focus),'keyboard focus missing');
  const label=await b.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Play practice')).textContent.replace('→','').trim()");
  const start=Date.now();await b.click(label);await b.until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Start Game')");
  const entryMs=Date.now()-start;
  await b.click('Start Game');await b.until("!!document.querySelector('.result-panel')||!!document.querySelector('.pause-panel')");
  assert.equal(await b.evaluate("!!document.querySelector('.pause-panel')"),false,'compiled practice paused; inspect phase before classification');
  await b.click('Play Again');await b.until("!!document.querySelector('.result-panel')||!!document.querySelector('.pause-panel')");
  assert.equal(await b.evaluate("!!document.querySelector('.pause-panel')"),false,'compiled Play Again paused; inspect phase before classification');
  await b.click('Back to Arcade');await b.until("!!document.querySelector('.arcade-lobby')");
  const resources=await b.evaluate("performance.getEntriesByType('resource').map(e=>({name:new URL(e.name).pathname,encoded:e.encodedBodySize,transfer:e.transferSize,duration:e.duration}))");
  rows.push({cache,entryMs,initial,resources,accessibility,keyboardFocus:focus});
 }
 fs.writeFileSync(out+'/compiled-browser.json',JSON.stringify({status:'passed',rows},null,2));console.log(JSON.stringify({status:'passed',runs:4,entryMs:rows.map(r=>({cache:r.cache,ms:r.entryMs}))}));
}catch(error){fs.writeFileSync(out+'/compiled-browser.json',JSON.stringify({status:'failed',error:error.message,rows},null,2));throw error;}finally{await b.close();}
