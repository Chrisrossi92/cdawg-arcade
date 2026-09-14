import {test} from 'vitest';
import assert from 'node:assert/strict';
import {transport} from './cdp-transport.mjs';
class Socket extends EventTarget {
  send(value){this.last=JSON.parse(value);}
  reply(result){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({id:this.last.id,result})}));}
}
test('bounded timeout removes pending request; a late response is recorded without crashing',async()=>{
 const socket=new Socket(),events=[],t=transport(socket,{timeoutMs:15,record:e=>events.push(e)});
 await assert.rejects(t.send('Runtime.evaluate',{expression:'unresolved promise'}),/CDP timeout: Runtime.evaluate/);
 assert.equal(t.pendingCount(),0);socket.reply({value:'late'});
 assert.equal(events.at(-1).event,'late-response');
});
test('socket loss rejects unresolved evaluation immediately and clears its timer',async()=>{
 const socket=new Socket(),t=transport(socket);const request=t.send('Runtime.evaluate');
 socket.dispatchEvent(new Event('close'));await assert.rejects(request,/connection closed/);assert.equal(t.pendingCount(),0);
});
test('large resolved response is returned intact, without increasing request deadline',async()=>{
 const socket=new Socket(),t=transport(socket),value='x'.repeat(200000);const request=t.send('Runtime.evaluate');socket.reply({value});
 assert.equal((await request).value,value);assert.equal(t.pendingCount(),0);
});
test('send failure releases pending session state',async()=>{
 const socket=new Socket();socket.send=()=>{throw Error('closed socket');};const t=transport(socket);
 await assert.rejects(t.send('Runtime.evaluate'),/closed socket/);assert.equal(t.pendingCount(),0);
});
test.each(['evaluation','startup'])('failed %s replaces an older passing report with fresh failure evidence',async failure=>{
 const fs=await import('node:fs');const os=await import('node:os');const path=await import('node:path');const {spawnSync}=await import('node:child_process');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'arcade-report-test-'));
 try {
  fs.mkdirSync(path.join(root,'tmp/audio-readiness'),{recursive:true});const output=path.join(root,'tmp/audio-readiness/direct-legacy.json');fs.writeFileSync(output,'{"status":"passed","old":true}');
  const source=fs.readFileSync(new URL('./legacy-browser.mjs',import.meta.url),'utf8').replace("import {browser,sleep} from './cdp.mjs';", failure==='startup'?"const sleep=async()=>{};const browser=async()=>{throw Error('injected transport failure');};":"const sleep=async()=>{};const browser=async()=>({send:async()=>{},until:async()=>{throw Error('injected transport failure');},close:async()=>{}});");
  const result=spawnSync(process.execPath,['--input-type=module','--eval',source],{cwd:root,encoding:'utf8'});assert.notEqual(result.status,0);
  const report=JSON.parse(fs.readFileSync(output,'utf8'));assert.equal(report.status,'failed');assert.equal(report.error,'injected transport failure');assert.equal(report.completed,false);assert(report.runId);assert.equal(report.old,undefined);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
