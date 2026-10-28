import type {RankedIdentity} from '../ranked';
import {FIXED_RULES,type FixedHome,type FixedView,type FixedRow,type FixedRequest} from '../../../../shared/chainshift/authored/contract';
export class AuthoredApiError extends Error {constructor(readonly code:string){super(code);}}
export class AuthoredApi {
 constructor(private identity:RankedIdentity){}
 private async request<T>(path:string,body?:unknown):Promise<T>{
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8000);
  try{const response=await fetch('/api/chainshift-authored-v2'+path,{method:body?'POST':'GET',credentials:'include',cache:'no-store',signal:abort.signal,headers:{'X-Arcade-Origin':location.origin,'X-Arcade-Request':'1','X-Arcade-Player':this.identity.player.id,...(body?{'Content-Type':'application/json','X-Arcade-CSRF':this.identity.csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});
   const value=await response.json();if(!response.ok)throw new AuthoredApiError(typeof value.error==='string'?value.error:'unavailable');
   const views=path==='/home'?[value.daily,value.practiceAttempt]:path.endsWith('/board')?[]:[value];
   if(views.some(v=>v&&v.rules!==FIXED_RULES))throw new AuthoredApiError('incompatible_rules');
   return value as T;
  }finally{clearTimeout(timer);}
 }
 home=()=>this.request<FixedHome>('/home');
 resume=(id:string)=>this.request<FixedView>('/attempt/'+encodeURIComponent(id));
 act=(id:string,request:FixedRequest)=>this.request<FixedView>('/attempt/'+encodeURIComponent(id)+'/action',request);
 practice=(puzzleId:string,requestId:string)=>this.request<FixedView>('/practice',{puzzleId,requestId});
 board=(id:string)=>this.request<FixedRow[]>('/attempt/'+encodeURIComponent(id)+'/board');
}
