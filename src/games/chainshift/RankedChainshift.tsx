import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Chainshift} from './Chainshift';
import {formatTime} from './state';
import {RankedApi,RankedApiError,rankedState,type RankedIdentity} from './ranked';
import type {DailyView,RankedReply,RankedAttempt,RankedBoard,RankedRoutes} from '../../../shared/chainshift/competition';
interface Pending {attempt:RankedAttempt;id:string;kind:'shift'|'backtrack';word?:string}
export function RankedChainshift({identity,onReverify,onNavigationLock,onExit,reducedMotion}:{identity:RankedIdentity;onReverify:()=>void;onNavigationLock?:(locked:boolean)=>void;onExit?:()=>void;reducedMotion?:boolean}){
 const api=useMemo(()=>new RankedApi(identity),[identity]);
 const [view,setView]=useState<DailyView|null>(null),[reply,setReply]=useState<RankedReply|null>(null),[anchor,setAnchor]=useState(0);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[resumePrompt,setResumePrompt]=useState(false),[practice,setPractice]=useState(false);
 const [board,setBoard]=useState<RankedBoard|null>(null),[routes,setRoutes]=useState<RankedRoutes|null>(null),[scope,setScope]=useState<'global'|'guild'>('global');
 const dialog=useRef<HTMLDialogElement>(null),comparison=useRef<HTMLHeadingElement>(null),comparisonTrigger=useRef<HTMLElement|null>(null);
 useEffect(()=>{if(board){dialog.current?.showModal();comparison.current?.focus();}},[board]);
 const pending=useRef<Pending|null>(null),lock=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const apply=useCallback((r:RankedReply)=>{if(!alive.current)return;setReply(previous=>previous&&previous.attempt.attemptId===r.attempt.attemptId&&previous.attempt.revision>r.attempt.revision?previous:r.duplicate?{...r,feedback:{kind:'none',text:'Authoritative state confirmed.'}}:r);setAnchor(performance.now());},[]);
 function failure(e:unknown){if(!alive.current)return;
  const code=e instanceof RankedApiError?e.code:'';
  if(['account_changed','expired_session','csrf_invalid'].includes(code)){pending.current=null;setView(null);setReply(null);setBoard(null);setRoutes(null);setError('Session changed or expired. Verify your account to resume its ranked attempt.');}
  else setError(code==='state_conflict'?'The attempt changed in another tab. Recheck its current state.':code==='completed'?'This ranked attempt is complete. Recheck its official result.':code==='unavailable'||code==='chainshift_unavailable'?'Ranked daily is unavailable. Your attempt is not reset.':'The response could not be confirmed. Recheck or retry; the ranked clock keeps running.');
 }
 async function run(work:()=>Promise<void>){if(lock.current)return;lock.current=true;onNavigationLock?.(true);setBusy(true);try{await work();if(alive.current&&!pending.current)setError('');}catch(e){failure(e);}finally{lock.current=false;if(alive.current)setBusy(false);}}
 async function refresh(){await run(async()=>{const d=await api.daily();if(d.player.id!==identity.player.id)throw new RankedApiError('account_changed');if(!alive.current)return;setView(d);setReply(null);setAnchor(performance.now());setResumePrompt(d.attempt?.state==='active');pending.current=null;});}
 useEffect(()=>{void refresh();},[api]);
 useEffect(()=>{onNavigationLock?.(busy||!!error);},[busy,error,onNavigationLock]);
 useEffect(()=>()=>onNavigationLock?.(false),[onNavigationLock]);
 const attempt=reply?.attempt??view?.attempt;
 async function resume(){if(!attempt)return;await run(async()=>{apply({attempt:await api.resume(attempt.attemptId),feedback:{kind:'none',text:'Ranked attempt resumed. Time away is included.'}});setResumePrompt(false);pending.current=null;});}
 async function send(p:Pending){await run(async()=>{const r=await api.action(p.attempt,p.id,p.kind,p.word);apply(r);pending.current=null;setResumePrompt(false);});}
 function action(kind:Pending['kind'],word?:string){if(!attempt||pending.current||lock.current)return;const p={attempt,id:crypto.randomUUID(),kind,word};pending.current=p;void send(p);}
 async function retry(){if(pending.current){const p=pending.current;try{await send(p);}finally{/* A conflict requires authoritative recheck rather than a different mutation ID. */}if(pending.current)await resume();}else if(view&&attempt)await resume();else onReverify();}
 async function results(nextScope=scope){if(!view)return;if(!board)comparisonTrigger.current=document.activeElement as HTMLElement;const puzzle=attempt?.puzzle.id??view.puzzle.id;await run(async()=>{
  const b=await api.board(puzzle,nextScope);const r=attempt?.state==='completed'?await api.routes(puzzle,nextScope):null;
  if(!alive.current)return;setScope(nextScope);setBoard(b);setRoutes(r);
 });}
 const state=useMemo(()=>view?rankedState(view,reply,anchor):null,[view,reply,anchor]);
 if(practice)return <><div className="candidate-switch"><button className="quiet" onClick={()=>{setPractice(false);void refresh();}}>RETURN TO RANKED DAILY</button><span>Practice does not consume or pause your ranked attempt.</span></div><Chainshift integration={onExit?{onExit,locked:false,reducedMotion}:undefined}/></>;
 if(!view||!state)return <div className="chainshift-shell"><main className="cs-main"><h1>RANKED DAILY</h1><p role="status">{error||'Checking the authoritative daily puzzle…'}</p>{error&&<><button className="quiet" disabled={busy} onClick={()=>{void refresh();}}>RECHECK DAILY</button><button className="quiet" disabled={busy} onClick={onReverify}>VERIFY ACCOUNT</button></>}<button className="quiet" disabled={busy||!!error} onClick={()=>setPractice(true)}>LOCAL PRACTICE</button></main></div>;
 return <><Chainshift integration={onExit?{onExit,locked:busy||!!error,reducedMotion}:undefined} ranked={{state,day:attempt?.puzzle.day??view.puzzle.day,busy,error,resumePrompt,start:()=>{void run(async()=>{apply(await api.start(view.puzzle.id));setResumePrompt(false);});},submit:word=>action('shift',word),backtrack:()=>action('backtrack'),resume:()=>{void resume();},practice:()=>{if(!busy&&!error)setPractice(true);},results:()=>{void results();},retry:()=>{void retry();}}}/>
  {board&&<dialog ref={dialog} className="local-results ranked-comparison" aria-label="Official daily comparison" onCancel={()=>{setBoard(null);setRoutes(null);comparisonTrigger.current?.focus();}}><h2 ref={comparison} tabIndex={-1}>OFFICIAL DAILY RESULTS</h2><p>{board.puzzleId} · {scope==='guild'?'Verified current guild':'All verified players'} · fewest shifts, then time. Exact ties share a rank.</p><div className="result-actions"><button className="quiet" onClick={()=>{void results(scope==='global'?'guild':'global');}} disabled={busy}>{scope==='global'?'VIEW GUILD':'VIEW ALL PLAYERS'}</button><button className="quiet" onClick={()=>{setBoard(null);setRoutes(null);comparisonTrigger.current?.focus();}}>Close official results</button></div>
   {board.own&&<p>Your standing: #{board.own.rank} · {board.own.shifts} shifts · {formatTime(board.own.elapsedMs,3)}</p>}
   {!board.rows.length&&<p>No completed ranked attempts yet.</p>}
   <ol className="practice-runs">{board.rows.map(row=><li key={row.playerTag}><div className="practice-score"><strong>#{row.rank} · {row.displayName}{row.isYou?' · YOU':''}</strong><span>{row.shifts} shifts · {formatTime(row.elapsedMs,3)}</span></div>{routes?.rows.find(r=>r.playerTag===row.playerTag)&&<details><summary>Inspect completed route</summary><p className="saved-ranked-route">{routes.rows.find(r=>r.playerTag===row.playerTag)!.route.map(w=>w.toUpperCase()).join(' → ')}</p></details>}</li>)}</ol>
   {!routes&&<p>Other players’ routes unlock after your ranked completion.</p>}{board.rows.length===board.limit&&<p>Showing the first {board.limit} results; your standing is shown separately.</p>}
  </dialog>}
 </>;
}
