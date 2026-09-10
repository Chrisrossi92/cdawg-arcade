import {buildApiUrl} from '../api/url';
import type {RunEvidence} from './trace';
export interface Authorization {attemptId:string;rulesetId:string;tickRate:number;maxTicks:number;retryDeadline:string;}
export interface OfficialResult {attemptId:string;disposition:string;ticks:number;reason:string;personalBest?:boolean;guildBest?:boolean;newGuildRecord?:boolean;recordSequence?:string|null;}
export interface Stats {acceptedCount:string;averageSeconds:string;best:{ticks:number;attemptId:string}|null;}
export interface Entry {playerTag:string;displayName:string;ticks:number;rank:string;isYou:boolean;}
export interface Board {entries:Entry[];ownEntry:(Entry&{inPage:boolean})|null;record:{displayName:string;ticks:number;sequence:string}|null;}
export class OfficialError extends Error {constructor(readonly code:string){super('Shared scores unavailable');}}
export class OfficialClient {
 private csrf='';
 constructor(private fetcher:typeof fetch=globalThis.fetch.bind(globalThis),private origin=globalThis.location?.origin??''){}
 private async request(path:string,body?:unknown){
  let response:Response;try{response=await this.fetcher(buildApiUrl(path),{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json','X-Arcade-Request':'1','X-Arcade-Origin':this.origin,...(this.csrf?{'X-Arcade-CSRF':this.csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});}catch{throw new OfficialError('unconfirmed');}
  let value:any;try{value=await response.json();}catch{throw new OfficialError('unconfirmed');}
  if(!response.ok)throw new OfficialError(['expired','expired_session','retry_expired','not_found','submission_conflict','attempts_unavailable'].includes(value?.error)?value.error:'unavailable');return value;
 }
 async connect(user:string,guild:string){const s=await this.request('/me');if(s.status!=='verified'||s.player?.id!==user||s.guild?.id!==guild||!/^[A-Za-z0-9_-]{43}$/.test(s.csrf))throw new OfficialError('expired_session');this.csrf=s.csrf;return ['eligible','other-server','practice'].includes(s.officialAvailability)?s.officialAvailability as 'eligible'|'other-server'|'practice':'unavailable' as const;}
 async begin():Promise<Authorization>{const a=await this.request('/balance/attempts',{beginKey:crypto.randomUUID(),rulesetId:'balance-replay-v1'});if(a.rulesetId!=='balance-replay-v1'||a.tickRate!==60||a.maxTicks!==18000||typeof a.attemptId!=='string'||!Number.isFinite(Date.parse(a.retryDeadline)))throw new OfficialError('unavailable');return a;}
 submit(a:Authorization,evidence:RunEvidence):Promise<OfficialResult>{return this.request('/balance/attempts/submit',{attemptId:a.attemptId,evidence});}
 status(a:Authorization):Promise<OfficialResult>{return this.request('/me/balance/attempts/'+encodeURIComponent(a.attemptId));}
 cancel(a:Authorization){return this.request('/balance/attempts/cancel',{attemptId:a.attemptId});}
 stats():Promise<Stats>{return this.request('/me/balance/stats');}
 board():Promise<Board>{return this.request('/guild/balance/leaderboard');}
 recent():Promise<{attempts:{ticks:number;acceptedAt:string}[]}>{return this.request('/me/balance/attempts');}
 clear(){this.csrf='';}
}
