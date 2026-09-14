import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {browser,sleep} from './cdp.mjs';
const headed=process.argv.includes('--headed');
const before=process.argv.includes('--before');
const repeat=Number(process.argv.find(a=>a.startsWith('--repeat='))?.slice(9)??1);
const single=process.argv.find(a=>a.startsWith('--case='))?.slice(7);
const results=[];
function install() {
  const a=window.__audio={events:[],native:[],contexts:[],mode:'normal',first:true};
  const emit=(event,values={})=>a.native.push({event,ms:performance.now(),...values});
  const busy=ms=>{const end=performance.now()+ms;while(performance.now()<end){}};
  const Native=window.AudioContext;
  window.AudioContext=class extends Native {
    constructor(...args){const t=performance.now();if(a.mode==='context-failure')throw Error('fixture');if(a.mode==='construction-218')busy(218);super(...args);a.contexts.push(this);emit('CONTEXT_CREATED',{duration:performance.now()-t});}
    resume(){emit('RESUME_CALLED',{state:this.state});if(a.mode==='reject')return Promise.reject(Error('fixture'));if(a.mode==='timeout')return new Promise(()=>{});const p=super.resume();return p.then(()=>new Promise(resolve=>setTimeout(()=>{emit('RESUME_COMPLETED');resolve();},a.mode==='resume-250'?250:0)));}
    createOscillator(){const t=performance.now();if(a.first&&a.mode==='warmup-218')busy(218);a.first=false;const node=super.createOscillator();emit('NODE_CREATED',{duration:performance.now()-t});return node;}
    createGain(){const gain=super.createGain(),connect=gain.connect,destination=this.destination;gain.connect=function(...args){emit('GAIN_CONNECTED',{gain:gain.gain.value,destination:args[0]===destination});return connect.apply(this,args);};return gain;}
  };
  let last=performance.now();const tick=now=>{if(now-last>50)emit('FRAME_GAP',{delta:now-last});last=now;requestAnimationFrame(tick);};requestAnimationFrame(tick);
}
const all=[
  {name:'normal',mode:'normal'}, {name:'resume-250',mode:'resume-250'},
  {name:'construction-218',mode:'construction-218'}, {name:'warmup-218',mode:'warmup-218'},
  {name:'reject',mode:'reject',degraded:true}, {name:'context-failure',mode:'context-failure',degraded:true},
  {name:'timeout',mode:'timeout',degraded:true}, {name:'retry',mode:'reject',retry:true},
  {name:'music-only',music:true,sfx:false}, {name:'both-muted',music:false,sfx:false},
  {name:'both-enabled',music:true,sfx:true}, {name:'suspended-again',suspend:true},
  {name:'active-stall',stall:true}, {name:'cancel-stale',cancel:true,mode:'resume-250'},
  {name:'narrow-reduced',width:375,height:667,reduced:true}, {name:'pop-out',width:800,height:600},
];
const b=await browser(!headed);
try {
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`(${install.toString()})()`});
 for(const path of (before?['before']:['direct','lobby']))for(const spec of all.filter(s=>single?s.name===single:before?s.name==='construction-218':true).flatMap(s=>Array.from({length:repeat},(_,i)=>({...s,name:s.name+(repeat>1?'-'+i:'')})))) {
  const row={path,headed,spec,runs:[]};results.push(row);
  try {
   await b.send('Network.enable');await b.send('Network.clearBrowserCache');
   await b.send('Emulation.setDeviceMetricsOverride',{width:spec.width??1280,height:spec.height??900,deviceScaleFactor:1,mobile:false});
   await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:spec.reduced?'reduce':'no-preference'}]});
   const url=path==='lobby'?'/lobby/index.html?buffered=1':path==='before'?'/before/candidate.html?activity=1&buffered=1':'/candidate.html?activity=1&buffered=1';
   await b.send('Page.navigate',{url:'http://127.0.0.1:5231'+url});
   await b.until("!!document.querySelector('#root button')");
   if(path==='lobby'){
    await b.evaluate("(()=>{const s=document.querySelector('#scenario');s.value='official';s.dispatchEvent(new Event('change'));})()");
    await b.until("[...document.querySelectorAll('button')].some(b=>b.textContent.replace('→','').trim()==='Play Balance')");await sleep(250);await b.click('Play Balance');
   }
   await b.until("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Start Game')");await sleep(300);
   await b.evaluate(`(()=>{const a=window.__audio;a.mode=${JSON.stringify(spec.mode??'normal')};const original=window.__diag.emit;window.__diag.emit=(event,values={})=>{a.events.push({event,ms:performance.now(),...values});original(event,values);};${spec.music!==undefined?`document.querySelector('.audio-controls input').checked!==${spec.music}&&document.querySelector('.audio-controls input').click();`:''}${spec.sfx!==undefined?`document.querySelectorAll('.audio-controls input')[1].checked!==${spec.sfx}&&document.querySelectorAll('.audio-controls input')[1].click();`:''}})()`);
   for(let run=0;run<(spec.cancel||before?1:2);run++){
    if(run&&spec.suspend)await b.evaluate('Promise.all(window.__audio.contexts.map(c=>c.suspend()))');
    await b.evaluate('window.__audio.events=[];window.__audio.native=[]');
    await b.click(run?'Play Again':'Start Game');
    // A rapid duplicate cannot obtain another latch/issuance.
    await b.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Start Game')?.click()");
    if(spec.cancel){await b.until("!!document.querySelector('.renderer-preparation')");await b.click('Back');await sleep(800);const e=await b.evaluate('window.__audio.events');assert(!e.some(e=>e.event==='ATTEMPT_ISSUED'));row.runs.push({cancelled:true,events:e});break;}
    if(spec.degraded||(spec.retry&&run===0)){
     await b.until("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Play without sound')",22000);
     assert.equal(await b.evaluate("window.__audio.events.filter(e=>e.event==='ATTEMPT_ISSUED').length"),0);
     if(spec.retry){await b.evaluate("window.__audio.mode='normal'");await b.click('Retry sound');}
     else await b.click('Play without sound');
    }
    if(spec.stall){await b.until("window.__audio.events.some(e=>e.event==='CLOCK_FIRST')");await b.evaluate('(()=>{const end=performance.now()+250;while(performance.now()<end){}})()');await b.until("!!document.querySelector('.pause-panel')");const paused=await b.evaluate('window.__audio.events');assert(paused.some(e=>e.event==='CLOCK_INTERRUPTED'));assert(!paused.some(e=>e.event==='SUBMIT'));await b.click('Resume');}
    if(before){await sleep(3500);}else await b.until("!!document.querySelector('.result-panel') || !!document.querySelector('.pause-panel')");
    const capture=await b.evaluate('({events:window.__audio.events,native:window.__audio.native,paused:!!document.querySelector(".pause-panel"),overflow:document.documentElement.scrollWidth>innerWidth})');row.runs.push(capture);
    const events=capture.events;const find=event=>event==='COMPOSITE_READY'?events.filter(e=>e.event===event).at(-1):events.find(e=>e.event===event);
    if(before){assert(find('COUNTDOWN_START').ms<capture.native.find(e=>e.event==='CONTEXT_CREATED').ms);row.expectedRegression=true;break;}
    assert(!capture.paused,'unexpected pause');assert(!capture.overflow,'horizontal overflow');
    assert(find('RENDERER_READY').ms<=find('COMPOSITE_READY').ms);assert(find('COMPOSITE_READY').ms<=find('ATTEMPT_ISSUED').ms);assert(find('ATTEMPT_ISSUED').ms<=find('COUNTDOWN_START').ms);
    assert.equal(find('CLOCK_FIRST').ticks,0);assert.equal(find('CLOCK_FIRST').accumulator,0);
    assert(find('CLOCK_FIRST').ms-find('COUNTDOWN_START').ms>=2390);
    assert.equal(find('SUBMIT').ticks,42);assert.equal(find('SUBMIT').interruptions,spec.stall?1:0);
    assert.equal(events.filter(e=>e.event==='ATTEMPT_ISSUED').length,1);
    assert(!capture.native.some(e=>e.event==='CONTEXT_CREATED'&&e.ms>=find('COUNTDOWN_START').ms),'late context initialization');
    assert(capture.native.filter(e=>e.event==='NODE_CREATED'&&e.ms>=find('CLOCK_FIRST').ms).every(e=>e.duration<100),'long gameplay audio initialization');
    const preGains=capture.native.filter(e=>e.event==='GAIN_CONNECTED'&&e.ms<find('COUNTDOWN_START').ms);assert(preGains.filter(e=>e.destination).every(e=>e.gain===0));
    if(!spec.degraded&&spec.name!=='both-muted')assert(find('AUDIO_WARMED').ms<=find('COMPOSITE_READY').ms);
    if(spec.degraded||spec.name==='both-muted')assert(!capture.native.some(e=>e.event==='NODE_CREATED'&&e.ms>=find('COUNTDOWN_START').ms));
   }
   row.pass=true;console.log('PASS',path,spec.name);
  }catch(error){row.error=error.message;row.evidence=await b.evaluate('({events:window.__audio?.events,native:window.__audio?.native,text:document.querySelector("#root")?.textContent?.slice(0,1200)})').catch(()=>null);console.log('FAIL',path,spec.name,error.message);}
  writeFileSync(`tmp/audio-readiness/browser-${before?'before':headed?'headed':'headless'}${single?'-'+single:''}${repeat>1?'-repeat':''}.json`,JSON.stringify(results,null,2)+'\n');
 }
}finally{await b.close();}
if(results.some(r=>!r.pass))process.exitCode=1;
