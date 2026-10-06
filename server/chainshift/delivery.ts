import {createHash} from 'node:crypto';
import {dailyProjection,resultProjection,type DailyProjection,type ResultProjection} from './projections.js';
export const liveChainshiftDeliveryEnabled = false;
export interface Destination {key:string}
export interface MessageReceipt {messageId:string;digest:string;revision:number}
/** A future Discord adapter MUST honor operation keys, suppress all mentions and refuse unresolved launch actions.
 * No live adapter exists in Slice 6. The model can hold an unresolved action without claiming it is clickable. */
export interface ChainshiftDelivery {
 readonly mode:'fake'|'discord';
 createDaily(destination:Destination,projection:DailyProjection,operationKey:string):Promise<string>;
 updateDaily(destination:Destination,messageId:string,projection:DailyProjection,operationKey:string):Promise<void>;
 publishResult(destination:Destination,projection:ResultProjection,operationKey:string):Promise<string>;
}
/** Future storage must provide durable, cross-process exclusion and durable receipts. */
export interface DailyMessageRepository {
 exclusive<T>(identity:string,work:()=>Promise<T>):Promise<T>;
 read(identity:string):Promise<MessageReceipt|null>;
 write(identity:string,receipt:MessageReceipt):Promise<void>;
}
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** Explicit local-model authorization; never wired to application startup or completion. */
export class ChainshiftReconciler {
 constructor(private repository:DailyMessageRepository,private delivery:ChainshiftDelivery,private candidateModel=false){}
 async reconcile(destination:Destination,input:DailyProjection){
  if(!this.candidateModel||this.delivery.mode!=='fake')throw new Error('Chainshift delivery disabled');
  if(!destination.key||destination.key.length>128)throw new Error('Invalid destination');
  const projection=dailyProjection(input); // Re-allowlist even forged/extended objects.
  const identity=hash(['chainshift-daily',destination.key,projection.day]);
  return this.repository.exclusive(identity,async()=>{
   const previous=await this.repository.read(identity),digest=hash(projection);
   if(previous?.digest===digest)return {...previous,changed:false};
   // Stable create key covers a lost response or receipt; content changes never create a second daily message.
   const messageId=previous?.messageId??await this.delivery.createDaily(destination,projection,identity+':create');
   // Reconcile even after create: a retry may have recovered an earlier create payload.
   await this.delivery.updateDaily(destination,messageId,projection,identity+':update:'+((previous?.revision??0)+1)+':'+digest);
   const receipt={messageId,digest,revision:(previous?.revision??0)+1};await this.repository.write(identity,receipt);return {...receipt,changed:true};
  });
 }
 async share(destination:Destination,input:ResultProjection,shareKey:string,consented:boolean){
  if(!this.candidateModel||this.delivery.mode!=='fake'||!consented)throw new Error('Chainshift result sharing disabled');
  if(!destination.key||!shareKey||shareKey.length>128)throw new Error('Invalid share request');
  return this.delivery.publishResult(destination,resultProjection(input),hash(['chainshift-result',destination.key,shareKey]));
 }
}
/** Test-only in-memory contract implementations: no HTTP/Discord dependency and no production wiring. */
export class MemoryDailyMessages implements DailyMessageRepository {
 private rows=new Map<string,MessageReceipt>();private locks=new Map<string,Promise<unknown>>();
 async exclusive<T>(key:string,work:()=>Promise<T>):Promise<T>{
  const previous=this.locks.get(key)??Promise.resolve();const current=previous.catch(()=>{}).then(work);this.locks.set(key,current);
  try{return await current;}finally{if(this.locks.get(key)===current)this.locks.delete(key);}
 }
 async read(key:string){return this.rows.get(key)??null;}
 async write(key:string,receipt:MessageReceipt){this.rows.set(key,{...receipt});}
}
export class FakeChainshiftDelivery implements ChainshiftDelivery {
 readonly mode='fake' as const;
 readonly messages=new Map<string,{destination:Destination;projection:DailyProjection|ResultProjection}>();readonly operations:string[]=[];
 private receipts=new Map<string,string>();loseNextResponse=false;
 async createDaily(d:Destination,p:DailyProjection,key:string){return this.create(d,dailyProjection(p),key);}
 private async create(d:Destination,p:DailyProjection|ResultProjection,key:string){
  const prior=this.receipts.get(key);if(prior)return prior;
  const id='fake-message-'+(this.messages.size+1);this.messages.set(id,{destination:{...d},projection:p});this.receipts.set(key,id);this.operations.push('create:'+id);
  if(this.loseNextResponse){this.loseNextResponse=false;throw new Error('Simulated lost response');}return id;
 }
 async updateDaily(d:Destination,id:string,p:DailyProjection,key:string){if(this.receipts.has(key))return;
  if(this.messages.get(id)?.destination.key!==d.key)throw new Error('Unknown message');this.messages.set(id,{destination:{...d},projection:dailyProjection(p)});this.receipts.set(key,id);this.operations.push('update:'+id);
 }
 async publishResult(d:Destination,p:ResultProjection,key:string){return this.create(d,resultProjection(p),key);}
}
