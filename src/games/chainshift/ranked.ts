import type {DailyView,RankedAttempt,RankedReply,RankedBoard,RankedRoutes} from '../../../shared/chainshift/competition';
import type {GameState,LocalPuzzle} from './state';
export interface RankedIdentity {player:{id:string;displayName:string};csrf:string}
export class RankedApiError extends Error {constructor(readonly code:string){super(code);}}
export class RankedApi {
 constructor(readonly identity:RankedIdentity,private transport:typeof fetch=(...args)=>fetch(...args),private origin=location.origin){}
 async request<T>(path:string,body?:unknown):Promise<T>{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
  try{const response=await this.transport('/api/chainshift'+path,{method:body===undefined?'GET':'POST',signal:controller.signal,credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json','X-Arcade-Origin':this.origin,'X-Arcade-Request':'1','X-Arcade-Player':this.identity.player.id,...(body!==undefined?{'X-Arcade-CSRF':this.identity.csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const value=await response.json();if(!response.ok)throw new RankedApiError(typeof value.error==='string'?value.error:'unavailable');return value as T;}finally{clearTimeout(timeout);}
 }
 daily(){return this.request<DailyView>('/daily');}
 start(puzzleId:string){return this.request<RankedReply>('/start',{puzzleId});}
 resume(attemptId:string){return this.request<RankedAttempt>('/attempt/'+encodeURIComponent(attemptId));}
 action(a:RankedAttempt,id:string,kind:'shift'|'backtrack',word?:string){return this.request<RankedReply>(`/attempt/${encodeURIComponent(a.attemptId)}/${kind}`,{requestId:id,revision:a.revision,...(kind==='shift'?{word}: {})});}
 board(puzzle:string,scope:'global'|'guild'){return this.request<RankedBoard>(`/puzzle/${encodeURIComponent(puzzle)}/leaderboard?scope=${scope}`);}
 routes(puzzle:string,scope:'global'|'guild'){return this.request<RankedRoutes>(`/puzzle/${encodeURIComponent(puzzle)}/routes?scope=${scope}`);}
}
export function rankedState(view:DailyView,reply:RankedReply|null,anchor:number):GameState{
 const attempt=reply?.attempt??view.attempt,p=attempt?.puzzle??view.puzzle;
 const puzzle:LocalPuzzle={...p,number:1,graphMinimum:0};
 const elapsed=attempt?.elapsedMs??0,startedAt=attempt?anchor-elapsed:null;
 const result=attempt?.state==='completed'?{puzzleId:p.id,graphVersion:p.graphVersion,checksum:p.checksum,rulesRevision:p.rulesRevision,route:attempt.route,shifts:attempt.shifts,startedAt:startedAt!,completedAt:anchor,elapsedMs:elapsed}:null;
 return {phase:attempt?result?'completed':'playing':'ready',puzzle,route:attempt?.route??[p.start.key],startedAt,result,
  feedback:{kind:reply?.feedback.kind??'none',text:reply?.feedback.text??'',sequence:attempt?.revision??0,...(reply?.feedback.removed?{removed:reply.feedback.removed}: {})}};
}
export interface RankedControls {
 state:GameState;day?:string;busy:boolean;error:string;resumePrompt:boolean;start:()=>void;submit:(word:string)=>void;backtrack:()=>void;resume:()=>void;practice:()=>void;results:()=>void;retry:()=>void;
}
