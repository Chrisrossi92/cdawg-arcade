import {OfficialClient,type Authorization,type OfficialResult,type Stats,type Board} from './client';
import {TraceRecorder,type RunEvidence} from './trace';
export type OfficialPhase='practice'|'eligible'|'other-server'|'unavailable'|'preparing'|'running'|'checking'|'accepted'|'nonqualifying'|'unconfirmed';
export interface OfficialView {phase:OfficialPhase;interrupted:boolean;result:OfficialResult|null;stats:Stats|null;board:Board|null;loading:boolean;issuanceMs?:number;}
export class OfficialController {
 view:OfficialView={phase:'practice',interrupted:false,result:null,stats:null,board:null,loading:false};
 private listeners=new Set<()=>void>();private epoch=0;private a:Authorization|null=null;private evidence:RunEvidence|null=null;private expiry?:ReturnType<typeof setTimeout>;private busy=false;
 readonly trace=new TraceRecorder();
 constructor(private client=new OfficialClient()){}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return ()=>{this.listeners.delete(listener);};};
 private publish(p:Partial<OfficialView>){this.view={...this.view,...p};this.listeners.forEach(f=>f());}
 private clearTrace(){this.evidence=null;this.trace.clear();if(this.expiry)clearTimeout(this.expiry);this.expiry=undefined;}
 reset(){this.epoch++;this.busy=false;this.a=null;this.clearTrace();this.client.clear();this.publish({phase:'practice',interrupted:false,result:null,stats:null,board:null,loading:false});}
 async connect(user:string,guild:string){this.reset();const epoch=this.epoch;try{const phase=await this.client.connect(user,guild);if(epoch===this.epoch){this.publish({phase});if(phase==='eligible')await this.refresh();}}catch{if(epoch===this.epoch)this.publish({phase:'unavailable'});}}
 async start():Promise<'official'|'practice'|'failed'|'busy'>{
  if(this.busy||['preparing','checking','running'].includes(this.view.phase))return 'busy';
  if(this.view.phase==='practice'||this.view.phase==='other-server'||this.view.phase==='unavailable')return 'practice';
  this.clearTrace();this.a=null;this.busy=true;const epoch=this.epoch,start=performance.now();this.publish({phase:'preparing',interrupted:false,result:null});
  try{const a=await this.client.begin();if(epoch!==this.epoch)return 'failed';this.a=a;this.trace.begin();this.publish({phase:'running',issuanceMs:Math.round(performance.now()-start)});this.expiry=setTimeout(()=>{this.clearTrace();this.a=null;if(this.view.phase==='unconfirmed')this.publish({phase:'nonqualifying'});else if(this.view.phase==='running')this.publish({phase:'nonqualifying',interrupted:true});},Math.max(0,Date.parse(a.retryDeadline)-Date.now()));return 'official';}
  catch{if(epoch===this.epoch)this.publish({phase:'unavailable'});return 'failed';}finally{if(epoch===this.epoch)this.busy=false;}
 }
 interrupt(){if(this.a){this.trace.interrupt();this.publish({interrupted:true});}}
 practice(){this.epoch++;if(this.a)void this.client.cancel(this.a).catch(()=>{});this.a=null;this.busy=false;this.clearTrace();this.publish({phase:'practice',interrupted:false,result:null});}
 async finish(ticks:number){if(!this.a)return;this.evidence=this.trace.freeze(this.a.rulesetId,ticks);this.trace.clear();await this.send(false);}
 private async send(retry:boolean){
  if(this.busy||!this.a||!this.evidence)return;this.busy=true;const a=this.a,evidence=this.evidence,epoch=this.epoch;this.publish({phase:'checking'});
  try{
   let result:OfficialResult|undefined;
   if(retry){try{const saved=await this.client.status(a);if(['accepted','rejected','practice','expired'].includes(saved.disposition))result=saved;}catch{ /* Exact submission can safely recover an unconfirmed result. */ }}
   if(!result)result=await this.client.submit(a,evidence);
   if(epoch!==this.epoch)return;
   if(result.attemptId!==a.attemptId||!['accepted','rejected','practice','expired'].includes(result.disposition)||!Number.isSafeInteger(result.ticks)||result.ticks<0||result.ticks>18000)throw Error('invalid_result');
   if(result.disposition==='accepted'&&(evidence.interruptions!==0||result.ticks!==evidence.ticks))throw Error('invalid_result');
   this.clearTrace();this.a=null;this.publish({phase:result.disposition==='accepted'?'accepted':'nonqualifying',result});if(result.disposition==='accepted')void this.refresh();
  }catch{if(epoch===this.epoch)this.publish({phase:'unconfirmed'});}finally{if(epoch===this.epoch)this.busy=false;}
 }
 retry(){return this.send(true);}
 async refresh(){const epoch=this.epoch;this.publish({loading:true});const [stats,board]=await Promise.allSettled([this.client.stats(),this.client.board()]);if(epoch!==this.epoch)return;this.publish({loading:false,stats:stats.status==='fulfilled'?stats.value:null,board:board.status==='fulfilled'?board.value:null});}
 recent(){return this.client.recent();}
}
