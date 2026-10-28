import {dailyActivityMessage,type DailyFacts,type DailyActivityMessage} from './projections.js';
import {approvedChannel,snowflake,ARCADE_APPLICATION_ID,type LiveDeliveryConfig} from './live-config.js';
export type DeliveryErrorCode='rate_limited'|'transient'|'uncertain'|'malformed'|'missing'|'forbidden'|'invalid_channel'|'invalid_configuration';
export class DeliveryError extends Error {
 constructor(readonly code:DeliveryErrorCode,readonly retryMs=60_000){super('Chainshift delivery '+code);}
}
export interface DeliveryMessage {id:string;nonce?:string;content:string;components:unknown}
export interface DailyTransport {
 readonly mode:'fake'|'discord';
 validateDestination():Promise<string>;
 create(facts:DailyFacts,nonce:string):Promise<DeliveryMessage>;
 edit(id:string,facts:DailyFacts):Promise<DeliveryMessage>;
 read(id:string):Promise<DeliveryMessage>;
 recover(nonce:string,since:Date):Promise<DeliveryMessage|null>;
}
/** Narrow bot REST adapter. No command registration, results sharing, delete or arbitrary channel API. */
export class DiscordDailyDelivery implements DailyTransport {
 readonly mode='discord' as const;
 private cooldownUntil=0;
 constructor(private config:LiveDeliveryConfig,private token:string,private transport:typeof fetch=fetch,private now=Date.now,private payload:typeof dailyActivityMessage=dailyActivityMessage){
  approvedChannel(config.channelId);
  if(config.applicationId!==ARCADE_APPLICATION_ID||!token)throw new DeliveryError('invalid_configuration');
 }
 private async request(path:string,method:'GET'|'POST'|'PATCH'='GET',body?:unknown):Promise<any>{
  approvedChannel(this.config.channelId);
  if(this.now()<this.cooldownUntil)throw new DeliveryError('rate_limited',this.cooldownUntil-this.now());
  try{
   const response=await this.transport('https://discord.com/api/v10'+path,{method,headers:{Authorization:'Bot '+this.token,'Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(8000)});
   const remaining=response.headers.get('x-ratelimit-remaining'),reset=Number(response.headers.get('x-ratelimit-reset-after'));
   if(remaining==='0'&&Number.isFinite(reset)&&reset>0)this.cooldownUntil=Math.max(this.cooldownUntil,this.now()+reset*1000);
   if(response.status===401||response.status===403){await response.body?.cancel();throw new DeliveryError('forbidden');}
   if(response.status===404){await response.body?.cancel();throw new DeliveryError('missing');}
   if(response.status>=500){await response.body?.cancel();throw new DeliveryError(method==='POST'?'uncertain':'transient');}
   const reader=response.body?.getReader();if(!reader)throw new DeliveryError('malformed');
   let bytes=0;const chunks:Uint8Array[]=[];
   for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>262144){await reader.cancel();throw new DeliveryError('malformed');}chunks.push(part.value);}
   let data:any;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new DeliveryError('malformed');}
   if(response.status===429){
    const seconds=Math.max(Number(response.headers.get('retry-after'))||0,Number(data?.retry_after)||0);
    // Invalid/unreasonably long delays fail closed instead of retrying sooner than Discord permits.
    if(!Number.isFinite(seconds)||seconds<=0||seconds>86400)throw new DeliveryError('forbidden');
    this.cooldownUntil=Math.max(this.cooldownUntil,this.now()+Math.ceil(seconds*1000));
    throw new DeliveryError('rate_limited',Math.ceil(seconds*1000));
   }
   if(!response.ok)throw new DeliveryError('invalid_channel');
   return data;
  }catch(e){if(e instanceof DeliveryError)throw e;throw new DeliveryError(method==='POST'?'uncertain':'transient');}
 }
 private message(raw:any,expectedId?:string,nonce?:string):DeliveryMessage {
  if(!raw||!snowflake(raw.id)||raw.channel_id!==this.config.channelId||raw.author?.id!==this.config.applicationId||
    raw.author?.bot!==true||raw.webhook_id||(expectedId&&raw.id!==expectedId)||
    (nonce&&String(raw.nonce)!==nonce)||typeof raw.content!=='string'||!Array.isArray(raw.components))throw new DeliveryError('malformed');
  return {id:raw.id,nonce:raw.nonce===undefined?undefined:String(raw.nonce),content:raw.content,components:raw.components};
 }
 async validateDestination():Promise<string>{
  const c=await this.request('/channels/'+this.config.channelId);
  if(c.id!==this.config.channelId||c.type!==0||!snowflake(c.guild_id)||!this.config.allowsGuild(c.guild_id))throw new DeliveryError('invalid_channel');
  return c.guild_id;
 }
 async create(facts:DailyFacts,nonce:string):Promise<DeliveryMessage>{
  if(!/^[a-f0-9]{24}$/.test(nonce))throw new DeliveryError('invalid_configuration');
  const body={...this.payload(facts,this.config.applicationId),nonce,enforce_nonce:true,tts:false};
  return this.message(await this.request('/channels/'+this.config.channelId+'/messages','POST',body),undefined,nonce);
 }
 async edit(id:string,facts:DailyFacts):Promise<DeliveryMessage>{
  if(!snowflake(id))throw new DeliveryError('invalid_configuration');
  // Verify bot ownership first; neither recovered nor persisted IDs can authorize editing a foreign message.
  await this.read(id);
  return this.message(await this.request('/channels/'+this.config.channelId+'/messages/'+id,'PATCH',this.payload(facts,this.config.applicationId)),id);
 }
 async read(id:string):Promise<DeliveryMessage>{
  if(!snowflake(id))throw new DeliveryError('invalid_configuration');
  return this.message(await this.request('/channels/'+this.config.channelId+'/messages/'+id),id);
 }
 async recover(nonce:string,since:Date):Promise<DeliveryMessage|null>{
  if(!/^[a-f0-9]{24}$/.test(nonce)||!Number.isFinite(+since))throw new DeliveryError('invalid_configuration');
  const lower=BigInt(Math.max(0,+since-5000-1420070400000))<<22n;
  let before:string|undefined;let match:DeliveryMessage|null=null;
  // A fixed five-page bound avoids API churn; an incomplete search never authorizes another POST.
  for(let page=0;page<5;page++){
   const rows=await this.request('/channels/'+this.config.channelId+'/messages?limit=100'+(before?'&before='+before:''));
   if(!Array.isArray(rows)||rows.length>100||rows.some(r=>!snowflake(r.id)||r.channel_id!==this.config.channelId))throw new DeliveryError('malformed');
   let oldest:bigint|undefined;
   for(const raw of rows){const id=BigInt(raw.id);oldest=oldest===undefined||id<oldest?id:oldest;
    if(id>=lower&&String(raw.nonce)===nonce&&raw.author?.id===this.config.applicationId){const found=this.message(raw,undefined,nonce);if(match&&match.id!==found.id)throw new DeliveryError('malformed');match=found;}
   }
   if(rows.length<100||oldest===undefined||oldest<lower)return match;
   const next=oldest.toString();if(next===before)throw new DeliveryError('malformed');before=next;
  }
  // Do not adopt a possible match from an incomplete/ambiguous scan.
  throw new DeliveryError('uncertain',300_000);
 }
}
export function matchesPayload(message:DeliveryMessage,payload:DailyActivityMessage){
 const rows=message.components as any[];
 if(!Array.isArray(rows)||rows.length!==1||rows[0]?.type!==1||!Array.isArray(rows[0].components)||rows[0].components.length!==1)return false;
 const b=rows[0].components[0],expected=payload.components[0].components[0];
 return message.content===payload.content&&b?.type===2&&b.style===5&&b.label===expected.label&&b.url===expected.url&&b.disabled!==true;
}
