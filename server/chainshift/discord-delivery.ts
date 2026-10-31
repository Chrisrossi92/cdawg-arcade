import {createHash} from 'node:crypto';
import {dailyActivityMessage,type DailyFacts,type DailyActivityMessage} from './projections.js';
import {approvedChannel,snowflake,ARCADE_APPLICATION_ID,type LiveDeliveryConfig} from './live-config.js';
export type DeliveryErrorCode='rate_limited'|'transient'|'uncertain'|'malformed'|'missing'|'forbidden'|'invalid_channel'|'invalid_configuration';
export class DeliveryError extends Error {
 constructor(readonly code:DeliveryErrorCode,readonly retryMs=60_000){super('Chainshift delivery '+code);}
}
export interface DeliveryMessage {id:string;nonce?:string;content:string;components:unknown;attachments?:any[];embeds?:any[]}
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
 private async request(path:string,method:'GET'|'POST'|'PATCH'='GET',body?:any,image?:DailyActivityMessage['image']):Promise<any>{
  approvedChannel(this.config.channelId);
  if(this.now()<this.cooldownUntil)throw new DeliveryError('rate_limited',this.cooldownUntil-this.now());
  try{
   let encoded:FormData|string|undefined;const headers:Record<string,string>={Authorization:'Bot '+this.token};
   if(image){if(image.data.length>1500000||createHash('sha256').update(image.data).digest('hex')!==image.sha256||image.filename!==`chainshift-${body.content.match(/\d{4}-\d{2}-\d{2}/)?.[0]}-${image.sha256}.png`)throw new DeliveryError('invalid_configuration');const form=new FormData();form.append('payload_json',JSON.stringify({...body,attachments:[{id:0,filename:image.filename,description:image.description}]}));form.append('files[0]',new Blob([new Uint8Array(image.data).buffer],{type:'image/png'}),image.filename);encoded=form;}
   else{headers['Content-Type']='application/json';if(body)encoded=JSON.stringify(body);}
   const response=await this.transport('https://discord.com/api/v10'+path,{method,headers,
    ...(encoded?{body:encoded}:{}),redirect:'error',signal:AbortSignal.timeout(8000)});
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
  return {id:raw.id,nonce:raw.nonce===undefined?undefined:String(raw.nonce),content:raw.content,components:raw.components,attachments:raw.attachments,embeds:raw.embeds};
 }
 async validateDestination():Promise<string>{
  const c=await this.request('/channels/'+this.config.channelId);
  if(c.id!==this.config.channelId||c.type!==0||!snowflake(c.guild_id)||!this.config.allowsGuild(c.guild_id))throw new DeliveryError('invalid_channel');
  return c.guild_id;
 }
 async create(facts:DailyFacts,nonce:string):Promise<DeliveryMessage>{
  if(!/^[a-f0-9]{24}$/.test(nonce))throw new DeliveryError('invalid_configuration');
  const {image,...payload}=this.payload(facts,this.config.applicationId);const body={...payload,nonce,enforce_nonce:true,tts:false};
  return this.message(await this.request('/channels/'+this.config.channelId+'/messages','POST',body,image),undefined,nonce);
 }
 async edit(id:string,facts:DailyFacts):Promise<DeliveryMessage>{
  if(!snowflake(id))throw new DeliveryError('invalid_configuration');
  // Verify bot ownership first; neither recovered nor persisted IDs can authorize editing a foreign message.
  await this.read(id);
  const {image,...payload}=this.payload(facts,this.config.applicationId);return this.message(await this.request('/channels/'+this.config.channelId+'/messages/'+id,'PATCH',payload,image),id);
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
 const image=payload.image;if(image){
  const files=message.attachments;if(!Array.isArray(files)||files.length>1||!Array.isArray(message.embeds)||message.embeds.length!==1)return false;
  if(files.length===1){const a=files[0];if(a.filename!==image.filename||a.size!==image.data.length||a.description!==image.description||a.content_type!==undefined&&a.content_type!=='image/png'||a.width!==undefined&&a.width!==1200||a.height!==undefined&&a.height!==820)return false;}
  const embedded=message.embeds[0].image;if(!embedded||embedded.width!==undefined&&embedded.width!==1200||embedded.height!==undefined&&embedded.height!==820)return false;
  // Discord documents that embed-referenced attachments may be omitted from attachments[].
  if(embedded.url==='attachment://'+image.filename){if(files.length!==1)return false;}
  else try{const url=new URL(embedded.url);if(url.protocol!=='https:'||url.hostname!=='cdn.discordapp.com'||!url.pathname.startsWith('/attachments/1549149791915737129/')||!url.pathname.endsWith('/'+image.filename))return false;}catch{return false;}
 }

 return message.content===payload.content&&b?.type===2&&b.style===5&&b.label===expected.label&&b.url===expected.url&&b.disabled!==true;
}

/** Image bytes are bound by SHA-256, not serialized into the durable digest. */
export function dailyMessageDigest(payload:DailyActivityMessage){const {image,...rest}=payload;return createHash('sha256').update(JSON.stringify(image?{...rest,image:{filename:image.filename,sha256:image.sha256,description:image.description}}:rest)).digest('hex');}
