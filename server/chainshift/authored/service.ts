import {randomUUID} from 'node:crypto';
import {dayKey} from '../../../shared/chainshift/daily.js';
import {FIXED_RULES,fixedScore,normalizeGuess,type FixedView,type FixedHome,type FixedRequest,type FixedRow,type Mode,type PuzzleCard} from '../../../shared/chainshift/authored/contract.js';
import {authoredCatalog,authoredById,type AuthoredPuzzle} from './catalog.js';
export interface AuthoredAttempt {id:string;player:string;name:string;puzzleId:string;day:string|null;mode:Mode;revision:number;current:number;revealed:number;hints:number;mistakes:number;startedAt:number|null;completedAt:number|null;elapsedMs:number;guesses:string[];receipts:Record<string,string>;message:string;outcome:FixedView['outcome']}
type Attempt=AuthoredAttempt;
export interface FixedState {rules:typeof FIXED_RULES;baseDay:string;attempts:Attempt[]}
export class FixedError extends Error {constructor(readonly code:string){super(code);}}
const fail=(code:string):never=>{throw new FixedError(code);};
const card=(p:AuthoredPuzzle):PuzzleCard=>({id:p.id,title:p.title,start:p.words[0],finish:p.words.at(-1)!,words:p.words.length});
const distance=(from:string,to:string)=>Math.round((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86_400_000);
/** Local candidate repository. Synchronous commit occurs before replacing in-memory state.
 * A production adapter needs database transactions/verified identity; this is never wired into production. */
export class AuthoredService {
 private state:FixedState;
 constructor(private now:()=>number=Date.now,initial?:FixedState,private commit:(s:FixedState)=>void=()=>{}){
  if(initial&&(initial.rules!==FIXED_RULES||!/^\d{4}-\d{2}-\d{2}$/.test(initial.baseDay)||!Array.isArray(initial.attempts)))throw Error('Invalid authored store');
  this.state=initial?structuredClone(initial):{rules:FIXED_RULES,baseDay:dayKey(now()),attempts:[]};
 }
 snapshot(){return structuredClone(this.state);}
 private save(a:Attempt){const next={...this.state,attempts:[...this.state.attempts.filter(x=>x.id!==a.id),structuredClone(a)]};this.commit(structuredClone(next));this.state=next;}
 private find(player:string,id:string){return this.state.attempts.find(a=>a.id===id&&a.player===player)??fail('not_found');}
 private projection(a:Attempt):FixedView {
  const p=authoredById(a.puzzleId)??fail('not_found'),complete=a.completedAt!==null;
  return {rules:FIXED_RULES,id:a.id,puzzle:card(p),mode:a.mode,day:a.day,revision:a.revision,phase:complete?'completed':a.startedAt===null?'ready':'playing',current:a.current,
   slots:p.words.map((word,i)=>{const endpoint=i===0||i===p.words.length-1,solved=endpoint||complete||i<a.current;return {length:word.length,endpoint,solved,display:solved?word:word.slice(0,i===a.current?a.revealed:1)+'_'.repeat(word.length-(i===a.current?a.revealed:1))};}),
   hints:a.hints,mistakes:a.mistakes,score:fixedScore(a.hints,complete?a.elapsedMs:a.startedAt===null?0:Math.max(a.elapsedMs,this.now()-a.startedAt),complete),elapsedMs:complete?a.elapsedMs:a.startedAt===null?0:Math.max(a.elapsedMs,this.now()-a.startedAt),message:a.message,outcome:a.outcome,...(complete?{connections:[...p.phrases]}:{})};
 }
 private create(player:string,name:string,p:AuthoredPuzzle,mode:Mode,day:string|null,creationReceipt?:string){
  const a:Attempt={id:randomUUID(),player,name,puzzleId:p.id,day,mode,revision:0,current:1,revealed:1,hints:0,mistakes:0,startedAt:null,completedAt:null,elapsedMs:0,guesses:[],receipts:creationReceipt?{[creationReceipt]:'practice'}:{},message:'',outcome:'none'};this.save(a);return a;
 }
 home(player:string,name:string):FixedHome {
  const today=dayKey(this.now());
  let a=this.state.attempts.find(a=>a.player===player&&a.mode==='daily'&&a.startedAt!==null&&a.completedAt===null);
  if(!a)a=this.state.attempts.find(a=>a.player===player&&a.mode==='daily'&&a.day===today);
  const daily=authoredCatalog.filter(p=>p.use==='daily')[distance(this.state.baseDay,today)];
  if(!a&&daily)a=this.create(player,name,daily,'daily',today);
  const practice=this.state.attempts.filter(a=>a.player===player&&a.mode==='practice').at(-1);
  return {player:{id:player,displayName:name},daily:a?this.projection(a):null,dailyMessage:a?'':'No authored daily is scheduled for today. Practice chains remain available.',practice:authoredCatalog.filter(p=>p.use==='practice').map(card),practiceAttempt:practice?this.projection(practice):null};
 }
 resume(player:string,id:string){return this.projection(this.find(player,id));}
 practice(player:string,name:string,puzzleId:string,requestId:string){
  if(!/^[a-f0-9-]{36}$/.test(requestId))return fail('invalid_request');
  const p=authoredById(puzzleId);if(!p||p.use!=='practice')return fail('invalid_request');
  const existing=this.state.attempts.find(a=>a.player===player&&a.mode==='practice'&&Object.hasOwn(a.receipts,requestId));
  if(existing){if(existing.puzzleId!==puzzleId)return fail('request_conflict');return this.projection(existing);}
  if(this.state.attempts.filter(a=>a.player===player&&a.mode==='practice').length>=200)return fail('limit_reached');
  return this.projection(this.create(player,name,p,'practice',null,requestId));
 }
 act(player:string,id:string,request:FixedRequest):FixedView {
  if(!request||!/^[a-f0-9-]{36}$/.test(request.requestId)||!Number.isSafeInteger(request.revision)||!request.action||!['start','guess','hint'].includes(request.action.kind))return fail('invalid_request');
  const prior=this.find(player,id),digest=JSON.stringify({revision:request.revision,action:request.action});
  if(Object.hasOwn(prior.receipts,request.requestId)){if(prior.receipts[request.requestId]!==digest)return fail('request_conflict');return this.projection(prior);}
  if(prior.revision!==request.revision)return fail('state_conflict');
  if(prior.completedAt!==null)return fail('completed');
  if(prior.mode==='daily'&&prior.startedAt===null&&prior.day!==dayKey(this.now()))return fail('day_changed');
  if(prior.revision>=5000)return fail('limit_reached');
  const a=structuredClone(prior),p=authoredById(a.puzzleId)!;
  a.outcome='none';a.message='';
  if(request.action.kind==='start'){
   if(a.startedAt===null){a.startedAt=this.now();a.message='Find the first missing word. Its first letter is on us.';}
  }else{
   if(a.startedAt===null)return fail('not_started');
   const expected=p.words[a.current];let solved=false;
   if(request.action.kind==='hint'){
    a.revealed++;a.hints++;a.outcome='hint';solved=a.revealed>=expected.length;
    a.message=solved?`Word revealed: ${expected}. One letter hint used (−50 performance points).`:'One letter assist (−50 performance points).';
   }else{
    const guess=normalizeGuess(request.action.word);
    if(!guess)a.message='Enter one word using letters A–Z. The clock keeps running.';
    else if(guess===expected){solved=true;a.outcome='correct';a.message=`${expected} fits: ${p.phrases[a.current-1]}.`;}
    else if(a.guesses.includes(guess)){a.outcome='miss';a.message='You already tried that word here. The clock keeps running.';}
    else {a.guesses.push(guess);a.mistakes++;a.hints++;a.revealed++;solved=a.revealed>=expected.length;a.outcome='miss';a.message=solved?`Not the intended word. Letter assist completed ${expected} (one −50 penalty).`:'Not the intended word; another phrase may fit. One letter revealed automatically (one −50 penalty).';}
   }
   if(solved){a.current++;a.revealed=1;a.guesses=[];if(a.current===p.words.length-1){a.completedAt=Math.max(a.startedAt,this.now());a.elapsedMs=Math.max(a.elapsedMs,a.completedAt-a.startedAt);a.outcome='complete';a.message='Chain complete. Every connection clicks into place.';}}
  }
  if(a.startedAt!==null&&a.completedAt===null)a.elapsedMs=Math.max(a.elapsedMs,this.now()-a.startedAt);
  a.revision++;a.receipts[request.requestId]=digest;this.save(a);return this.projection(a);
 }
 board(player:string,id:string):FixedRow[]{
  const a=this.find(player,id);if(a.mode!=='daily')return fail('practice_not_ranked');
  const rows=this.state.attempts.filter(x=>x.mode==='daily'&&x.day===a.day&&x.puzzleId===a.puzzleId&&x.completedAt!==null).sort((a,b)=>fixedScore(b.hints,b.elapsedMs,true)-fixedScore(a.hints,a.elapsedMs,true)||a.elapsedMs-b.elapsedMs||a.player.localeCompare(b.player));
  let rank=0;return rows.map((row,i)=>{if(!i||fixedScore(row.hints,row.elapsedMs,true)!==fixedScore(rows[i-1].hints,rows[i-1].elapsedMs,true)||row.elapsedMs!==rows[i-1].elapsedMs)rank=i+1;return {rank,name:row.name,isYou:row.player===player,score:fixedScore(row.hints,row.elapsedMs,true),hints:row.hints,mistakes:row.mistakes,elapsedMs:row.elapsedMs};});
 }
}
