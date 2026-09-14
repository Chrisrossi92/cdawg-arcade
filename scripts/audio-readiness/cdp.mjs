// Owns a disposable Chrome profile. Only loopback fixture pages are navigated.
import {spawn} from 'node:child_process';
import {mkdtempSync, readFileSync, existsSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function browser(headless = true) {
  const profile = mkdtempSync(join(tmpdir(), 'arcade-audio-chrome-'));
  const child = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    `--user-data-dir=${profile}`, '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-sync', '--disable-component-update',
    ...(headless ? ['--headless=new'] : []), 'about:blank',
  ], {stdio:'ignore'});
  try {
    for (let i=0; !existsSync(join(profile,'DevToolsActivePort')); i++) {
      if (i>100 || child.exitCode !== null) throw Error('Disposable Chromium unavailable'); await sleep(100);
    }
    const port = readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {method:'PUT',signal:AbortSignal.timeout(15000)})).json();
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject) => {socket.onopen=resolve;socket.onerror=reject;});
    let sequence=0;const pending=new Map();
    socket.onmessage=event=>{const data=JSON.parse(event.data);if(data.id){const p=pending.get(data.id);pending.delete(data.id);if(data.error)p.reject(Error(data.error.message));else p.resolve(data.result);}};
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;const timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},20000);pending.set(id,{resolve:v=>{clearTimeout(timeout);resolve(v);},reject:e=>{clearTimeout(timeout);reject(e);}});socket.send(JSON.stringify({id,method,params}));});
    await send('Page.enable');await send('Runtime.enable');
    const evaluate=async expression=>{const response=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw Error('Fixture evaluation failed');return response.result.value;};
    const until=async(expression,timeout=25000)=>{const end=Date.now()+timeout;while(!await evaluate(expression)){if(Date.now()>end)throw Error('Fixture wait expired: '+expression.slice(0,100));await sleep(50);}};
    const click=async text=>{const box=await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.replace('→','').trim()===${JSON.stringify(text)}&&!b.disabled);if(!b)return null;b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);if(!box)throw Error('Missing fixture control: '+text);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...box});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...box});};
    return {send,evaluate,until,click,async close(){try{await send('Browser.close');}catch{}socket.close();child.kill();await sleep(250);rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200});}};
  } catch(error) {child.kill();await sleep(250);rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200});throw error;}
}
