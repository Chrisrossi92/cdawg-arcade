import {enrichedReferee} from '../../../shared/chainshift/enrichment/graph-v2';
import data from './puzzles.json';
export interface LocalPuzzle {
 readonly id:string; readonly number:number; readonly start:Readonly<{key:string;display:string}>;
 readonly finish:Readonly<{key:string;display:string}>; readonly graphVersion:string;
 readonly rulesRevision:string; readonly checksum:string; readonly graphMinimum:number;
}
function immutable<T>(value:T):T {
 if(value && typeof value==='object'){ Object.values(value).forEach(immutable); Object.freeze(value); } return value;
}
export const puzzles:readonly LocalPuzzle[]=immutable(data);
export function validatePuzzle(p:LocalPuzzle):void {
 const identity=enrichedReferee.identity;
 if(p.graphVersion!==identity.graphVersion || p.rulesRevision!==identity.rulesRevision || p.checksum!==identity.checksum)
  throw new Error('Puzzle and graph do not match.');
 if(!enrichedReferee.outgoing(p.start.key).length || !enrichedReferee.incoming(p.finish.key).length || p.start.key===p.finish.key)
  throw new Error('Puzzle endpoints do not match the graph.');
}
export interface LocalResult {readonly puzzleId:string;readonly graphVersion:string;readonly checksum:string;readonly rulesRevision:string;readonly route:readonly string[];readonly shifts:number;readonly startedAt:number;readonly completedAt:number;readonly elapsedMs:number}
export interface GameState {
 readonly phase:'ready'|'playing'|'completed'; readonly puzzle:LocalPuzzle;readonly route:readonly string[];
 readonly startedAt:number|null;readonly result:LocalResult|null;
 readonly feedback:Readonly<{kind:'none'|'accepted'|'rejected'|'backtracked'|'completed';text:string;sequence:number;removed?:string}>;
}
export type Action={type:'start';now:number}|{type:'submit';word:string;now:number}|{type:'backtrack'}|{type:'load';puzzle:LocalPuzzle};
export function ready(puzzle:LocalPuzzle):GameState {
 validatePuzzle(puzzle); return immutable({phase:'ready',puzzle:immutable({...puzzle,start:{...puzzle.start},finish:{...puzzle.finish}}),route:[puzzle.start.key],startedAt:null,result:null,feedback:{kind:'none',text:'',sequence:0}});
}
export function elapsed(state:GameState,now:number):number {
 return state.result?.elapsedMs ?? (state.startedAt===null?0:Math.max(0,now-state.startedAt));
}
export function reduceGame(state:GameState,action:Action):GameState {
 if(action.type==='load')return ready(action.puzzle);
 if(action.type==='start')return state.phase==='ready'&&Number.isFinite(action.now)?immutable({...state,phase:'playing',startedAt:action.now}):state;
 if(state.phase!=='playing')return state;
 const sequence=state.feedback.sequence+1;
 if(action.type==='backtrack') {
  if(state.route.length===1)return state;
  return immutable({...state,route:state.route.slice(0,-1),feedback:{kind:'backtracked',text:`Back to ${state.route[state.route.length-2]?.toUpperCase()}.`,sequence,removed:state.route[state.route.length-1]}});
 }
 if(!Number.isFinite(action.now))return state;
 const edge=enrichedReferee.lookupEdge(state.route[state.route.length-1],action.word);
 if(!edge)return immutable({...state,feedback:{kind:'rejected',text:'Not a recognized shift.',sequence}});
 const route=[...state.route,edge.to];
 if(edge.to===state.puzzle.finish.key){
  const result=immutable({puzzleId:state.puzzle.id,graphVersion:state.puzzle.graphVersion,checksum:state.puzzle.checksum,rulesRevision:state.puzzle.rulesRevision,route,shifts:route.length-1,startedAt:state.startedAt!,completedAt:Math.max(state.startedAt!,action.now),elapsedMs:elapsed(state,action.now)});
  return immutable({...state,phase:'completed',route,result,feedback:{kind:'completed',text:`Chain complete. ${result.shifts} shifts.`,sequence}});
 }
 return immutable({...state,route,feedback:{kind:'accepted',text:edge.phrase,sequence}});
}
export function formatTime(ms:number):string {
 const tenths=Math.floor(ms/100);return `${Math.floor(tenths/600)}:${String(Math.floor(tenths/10)%60).padStart(2,'0')}.${tenths%10}`;
}
/** Some IMEs send Enter with isComposing=false and legacy keyCode=229. */
export function maySubmitEnter(event:{key:string;isComposing:boolean;keyCode:number},composing:boolean):boolean {
 return event.key==='Enter'&&!event.isComposing&&!composing&&event.keyCode!==229;
}
