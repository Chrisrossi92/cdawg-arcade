import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ChainshiftAudio} from './audio';
import {elapsed,formatTime,maySubmitEnter,puzzles,ready,reduceGame,type Action,type GameState} from './state';
import logo from '../../../assets/brand/arcade/vector/cdawg-horizontal-dark-v001.svg';
import host from '../../../assets/brand/arcade/runtime/cdawg-host-default-v004.webp';
import delighted from '../../../assets/brand/arcade/runtime/cdawg-host-delighted-v004.webp';
import {browserPracticeRepository,compareScores,latestRun,localRuns,restoreCompleted,type PracticeRepository,type PracticeSave} from './practice';
import {LocalBest,LocalResults} from './LocalResults';
import {ChainRoute} from './ChainRoute';
import './chainshift.css';
const motionKey='cdawg.arcade.reduced-motion.v1';
const soundKey='cdawg.arcade.sfx.v1';
const read=(key:string,fallback:boolean)=>{try{const value=localStorage.getItem(key);return value===null?fallback:value==='true';}catch{return fallback;}};
const save=(key:string,value:boolean)=>{try{localStorage.setItem(key,String(value));}catch{/* Settings are optional. */}};
export function Chainshift({practiceRepository}:{practiceRepository?:PracticeRepository}={}){
 const [repository]=useState(()=>practiceRepository??browserPracticeRepository());
 const [history,setHistory]=useState(()=>repository.snapshot());
 const [state,setState]=useState(()=>{const run=latestRun(history);return run?restoreCompleted(run,puzzles.find(p=>p.id===run.puzzleId)!):ready(puzzles[0]);});const current=useRef(state);
 const [record,setRecord]=useState<PracticeSave|null>(null);const [showResults,setShowResults]=useState(false);
 const resultsTrigger=useRef<HTMLButtonElement>(null);
 const [word,setWord]=useState('');const [now,setNow]=useState(0);
 const [sound,setSound]=useState(()=>read(soundKey,true));const [motion,setMotion]=useState(()=>read(motionKey,false));
 const [osMotion,setOsMotion]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [settings,setSettings]=useState(false);const [audioStatus,setAudioStatus]=useState('');
 const audio=useRef<ChainshiftAudio|null>(null);const input=useRef<HTMLInputElement>(null);
 const chain=useRef<HTMLOListElement>(null);const settingsTrigger=useRef<HTMLButtonElement>(null);const resultTitle=useRef<HTMLHeadingElement>(null);
 const composing=useRef(false);const ignoreSubmit=useRef(false);const root=useRef<HTMLDivElement>(null);
 const reduced=motion||osMotion;
 useEffect(()=>{
  const manager=new ChainshiftAudio();audio.current=manager;manager.setSfxEnabled(sound);
  return()=>{manager.dispose();audio.current=null;};
 // Settings changes use the same manager; lifecycle is tied to the game boundary.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setOsMotion(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{
  const viewport=window.visualViewport;
  const update=()=>{root.current?.style.setProperty('--play-height',`${viewport?.height??window.innerHeight}px`);if(chain.current)chain.current.scrollTop=chain.current.scrollHeight;};
  update();viewport?.addEventListener('resize',update);window.addEventListener('resize',update);
  return()=>{viewport?.removeEventListener('resize',update);window.removeEventListener('resize',update);};
 },[]);
 useEffect(()=>{
  if(state.phase!=='playing')return;
  const update=()=>setNow(performance.now());update();const timer=window.setInterval(update,100);
  return()=>window.clearInterval(timer);
 },[state.phase]);
 useLayoutEffect(()=>{
  if(state.phase==='playing'){
   input.current?.focus({preventScroll:true});
   if(state.feedback.kind==='rejected')input.current?.select();
   if(chain.current)chain.current.scrollTop=chain.current.scrollHeight;
  }else if(state.phase==='completed')resultTitle.current?.focus({preventScroll:true});
 },[state.phase,state.feedback.sequence]);
 function prepareAudio(){
  const manager=audio.current;if(!manager)return;
  void manager.prepare().then(value=>{if(audio.current===manager)setAudioStatus(value==='degraded'?'Sound unavailable. You can keep playing.':'');});
 }
 function dispatch(action:Action){
  const previous=current.current;const next=reduceGame(previous,action);current.current=next;setState(next);
  // Score/time are frozen by the reducer before storage, sound or decoration.
  if(previous.phase==='playing'&&next.phase==='completed'){
   try{const saved=repository.record(next.result!,next.puzzle);setRecord(saved);setHistory(saved.snapshot);}
   catch{setHistory({...repository.snapshot(),warning:'This completion could not be saved. The result remains available in this tab.'});}
  }
  if(next!==previous&&next.feedback.kind!=='none'&&action.type!=='load'&&action.type!=='start')audio.current?.feedback(next.feedback.kind,next.route.length-1);
  return next;
 }
 function submit(){
  if(composing.current||ignoreSubmit.current||current.current.phase!=='playing')return;
  const next=dispatch({type:'submit',word,now:performance.now()});
  if(next.feedback.kind==='accepted'||next.phase==='completed')setWord('');
  else input.current?.select();
 }
 function load(index:number){setRecord(null);setShowResults(false);setHistory(repository.snapshot());composing.current=false;ignoreSubmit.current=false;audio.current?.cancelPreparation();setAudioStatus('');setWord('');setNow(0);dispatch({type:'load',puzzle:puzzles[index]});}
 function closeSettings(){setSettings(false);if(current.current.phase==='playing')input.current?.focus();else settingsTrigger.current?.focus();}
 function toggleSound(){const enabled=!sound;setSound(enabled);save(soundKey,enabled);audio.current?.setSfxEnabled(enabled);if(enabled)prepareAudio();else{audio.current?.cancelPreparation();setAudioStatus('');}}
 const index=puzzles.findIndex(p=>p.id===state.puzzle.id);
 const isPlaying=state.phase==='playing';
 const best=localRuns(history,state.puzzle)[0];
 const bestLabel=record?.isNewBest?'NEW LOCAL BEST':best&&state.result&&compareScores(state.result,best)===0?'LOCAL BEST':'LOCAL PRACTICE RESULT';
 return <div ref={root} className={`chainshift-shell phase-${state.phase}`} data-reduced={reduced}>
  <a className="skip-link" href="#chainshift-main">Skip to game</a>
  <header className="cs-header"><img src={logo} alt="CDAWG Arcade"/><span className="local-label">LOCAL PRACTICE</span><button ref={settingsTrigger} className="quiet settings-button" aria-expanded={settings} aria-controls="cs-settings" onClick={()=>setSettings(!settings)}>Settings <span aria-hidden="true">⚙</span></button></header>
  {settings&&<section id="cs-settings" className="cs-settings" aria-label="Game settings" onKeyDown={event=>{if(event.key==='Escape')closeSettings();}}>
   <label><input type="checkbox" checked={sound} onChange={toggleSound}/> Sound effects</label>
   <label><input type="checkbox" checked={motion} onChange={()=>{setMotion(!motion);save(motionKey,!motion);}}/> Reduce motion</label>
   {osMotion&&<span>Reduced motion follows your device.</span>}
   <button className="quiet" onClick={closeSettings}>Done</button>
  </section>}
  <main id="chainshift-main" className="cs-main">
   <div className="game-heading"><div><p className="eyebrow">WORD NAVIGATION · LOCAL {String(state.puzzle.number).padStart(2,'0')}</p><h1>CHAINSHIFT<span className="link-mark" aria-hidden="true">↗</span></h1></div>
    {state.phase!=='ready'&&<dl className="score-strip"><div><dt>Shifts</dt><dd>{state.route.length-1}</dd></div><div><dt>Time</dt><dd className="clock">{formatTime(elapsed(state,now))}</dd></div></dl>}
   </div>
   {state.phase==='ready'?<section className="challenge-card" aria-label="Local challenge">
    <div className="challenge-body"><p className="eyebrow">MAKE YOUR OWN WAY</p><div className="challenge-endpoints"><div><span>START</span><strong>{state.puzzle.start.display}</strong></div><span className="endpoint-arrow" aria-hidden="true">→</span><div><span>FINISH</span><strong>{state.puzzle.finish.display}</strong></div></div>
     <p className="instructions">Connect each word into a familiar phrase. Reach the destination in as few shifts as you can.</p>
     <p className="scoring">Fewest shifts wins. Time breaks ties.</p>
     <LocalBest snapshot={history} puzzle={state.puzzle}/>
     <button className="primary start-button" onClick={()=>{dispatch({type:'start',now:performance.now()});prepareAudio();}}>START <span aria-hidden="true">→</span></button>
    </div><div className="host-presence"><img src={host} alt=""/><span aria-hidden="true">CDAWG ARCADE</span></div>
   </section>:<section className={`play-card ${state.phase==='completed'?'resolved':''} ${state.feedback.kind==='completed'?'just-completed':''}`} aria-label={isPlaying?'Your chain':'Completed chain'}>
    {isPlaying&&<div className="destination"><span>DESTINATION</span><strong>{state.puzzle.finish.display}</strong><span aria-hidden="true">↗</span></div>}
    {state.phase==='completed'&&<div className="complete-heading"><div><p className="eyebrow">DESTINATION REACHED</p><h2 ref={resultTitle} tabIndex={-1}>CHAIN COMPLETE</h2></div><img src={delighted} alt=""/></div>}
    <ChainRoute state={state} reduced={reduced} chainRef={chain}/>
    {isPlaying?<div className="entry-dock">
     <form onSubmit={event=>{event.preventDefault();submit();}} className="word-form">
      <label htmlFor="next-word">Where does <strong>{state.route[state.route.length-1].toUpperCase()}</strong> take you?</label>
      <div key={state.feedback.kind==='rejected'?state.feedback.sequence:'entry'} className={`entry-row ${state.feedback.kind==='rejected'?'recoil':''}`}>
       <input ref={input} id="next-word" name="word" aria-label="Next word" aria-describedby="shift-feedback" value={word} onChange={e=>setWord(e.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="go" placeholder="Type a word…" maxLength={64} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onKeyUp={()=>{ignoreSubmit.current=false;}} onKeyDown={event=>{if(event.key==='Enter'){ignoreSubmit.current=!maySubmitEnter(event.nativeEvent,composing.current);if(!ignoreSubmit.current){event.preventDefault();submit();}}}}/>
       <button className="primary shift-button" type="submit" aria-label="Submit shift">SHIFT <span aria-hidden="true">↗</span></button>
      </div>
     </form>
     <div className="entry-footer"><p id="shift-feedback" className={`feedback ${state.feedback.kind}`} key={`feedback-${state.feedback.sequence}`}>{state.feedback.kind==='none'?'Build your first connection.':state.feedback.text}</p><button className="quiet backtrack" disabled={state.route.length===1} onClick={()=>{dispatch({type:'backtrack'});setWord('');}}>← Backtrack</button></div>
    </div>:<div className={`result-panel ${record?.isNewBest?'new-local-best':''}`}><p className="result-designation">{bestLabel}</p><dl><div><dt>FINAL SHIFTS</dt><dd>{state.result!.shifts}</dd></div><div><dt>ELAPSED TIME</dt><dd>{formatTime(state.result!.elapsedMs)}</dd></div></dl><p className="minimum">Graph minimum: {state.puzzle.graphMinimum} shifts <span>· {record?record.saved?'Saved on this browser':'This tab only · not saved':state.feedback.kind==='completed'?'This tab only · not saved':'Restored local completion'}</span></p><div className="result-actions"><button className="primary" onClick={()=>load(index)}>TRY AGAIN <span aria-hidden="true">↗</span></button><button className="quiet" onClick={()=>load((index+1)%puzzles.length)}>NEXT LOCAL PUZZLE <span aria-hidden="true">→</span></button><button ref={resultsTrigger} className="quiet" aria-expanded={showResults} aria-controls="local-history" onClick={()=>{setHistory(repository.snapshot());setShowResults(!showResults);}}>VIEW LOCAL RESULTS</button></div></div>}
   </section>}
   {state.phase==='ready'&&<div className="puzzle-picker"><label htmlFor="local-puzzle">Local puzzle</label><select id="local-puzzle" value={index} onChange={event=>load(Number(event.target.value))}>{puzzles.map((p,i)=><option value={i} key={p.id}>{String(p.number).padStart(2,'0')} · {p.start.display} → {p.finish.display}</option>)}</select><span>Practice only. No ranked results.</span></div>}
   {state.phase==='completed'&&showResults&&<div id="local-history"><LocalResults snapshot={history} puzzle={state.puzzle} onClose={()=>{setShowResults(false);resultsTrigger.current?.focus();}}/></div>}
   {history.warning&&<p className="storage-status" role="note">{history.warning}</p>}
   {history.archivedCount>0&&<p className="history-status">{history.archivedCount} archived local {history.archivedCount===1?'result has':'results have'} a different puzzle/graph identity and are excluded from current comparison.</p>}
   {audioStatus&&<p className="audio-status">{audioStatus}</p>}
  </main>
  <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{state.feedback.sequence>0&&<span key={state.feedback.sequence}>{state.feedback.kind==='accepted'?`Accepted ${state.route[state.route.length-1].toUpperCase()}. ${state.feedback.text}.`:state.feedback.text}{state.feedback.kind==='completed'&&record?.isNewBest?' New local best.':''}</span>}</div>
  {state.phase==='ready'&&<footer className="cs-footer">A familiar phrase. An unexpected route.</footer>}
 </div>;
}
