import {browser,sleep} from './cdp.mjs';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const mode=process.argv[2]??'direct';
const isolated=process.argv.find(a=>a.startsWith('--case='))?.slice(7);
const runId=randomUUID(),output='tmp/audio-readiness/'+mode+'-legacy.json';
writeFileSync(output,JSON.stringify({status:'running',runId,startedAt:new Date().toISOString()})+'\n');
let b;
try{
 b=await browser(!process.argv.includes('--headed'),{diagnosticsPath:'tmp/audio-readiness/'+mode+'-'+runId+'-cdp.jsonl'});
 await b.send('Emulation.setDeviceMetricsOverride',{width:1400,height:1100,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:'http://127.0.0.1:5231'+(mode==='direct'?'/matrix.html'+(isolated?'?case='+encodeURIComponent(isolated):''):mode==='responsive'?'/lobby/responsive.html':'/lobby/index.html')});
 const button=mode==='direct'?'Run readiness matrix':mode==='soak'?'Run lifecycle soak':mode==='rapid'?'Run rapid preparation cancellation':mode==='responsive'?'Run viewport matrix':'Run readiness reconciliation';
 await b.until(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(button)})`);await sleep(500);await b.click(button);
 const expr=mode==='direct'?"document.querySelector('#status')?.textContent":mode==='responsive'?"document.querySelector('#matrix-report')?.textContent":"document.querySelector('#metrics')?.textContent";
 for(let i=0;i<360;i++){
  const text=await b.evaluate(expr);if(i%15===0)console.log(mode,'running',i*2);
  if(text&&(/FAIL|failed|PASS|reconciliation passed|rapid cancellation passed|\"status\": \"passed\"/.test(text))){writeFileSync('tmp/audio-readiness/'+mode+'-legacy.json',text+'\n');console.log(mode,text.slice(0,180));if(/FAIL|failed/.test(text))process.exitCode=1;break;}
  if(i===359)throw Error('Legacy fixture deadline');await sleep(2000);
 }
}catch(error){writeFileSync(output,JSON.stringify({status:'failed',runId,error:error.message,completed:false})+'\n');throw error;}finally{await b?.close();}
