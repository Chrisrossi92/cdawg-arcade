import {Component,Suspense,lazy,useEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {ConnectionStatus} from '../app/ConnectionStatus';
import {ArcadeRuntime,bindNavigation} from './runtime';
import {lobbyModel,displayName} from './model';
import {GameCard} from './GameCard';
import {LobbyHost} from './LobbyHost';
import logo from '../../assets/brand/arcade/vector/cdawg-horizontal-dark-v001.svg';
import tag from '../../assets/brand/arcade/vector/cdawg-tag-small-v001.svg';
import './lobby.css';
const Game=lazy(async()=>{let timer:ReturnType<typeof setTimeout> | undefined;try{return await Promise.race([import('./GameEntry'),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Game load timeout')),10000);})]);}finally{clearTimeout(timer);}});
const preferenceKey='cdawg.arcade.reduced-motion.v1';
const readPreference=()=>{try{return localStorage.getItem(preferenceKey)==='true';}catch{return false;}};
class GameBoundary extends Component<{children:ReactNode;onBack:()=>void},{failed:boolean}>{
  state={failed:false};static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<section className="arcade-load" role="alert"><h1>Balance couldn’t load</h1><p>Return to the Arcade, or reload when your connection is ready.</p><button onClick={this.props.onBack}>Back to Arcade</button><button onClick={()=>location.reload()}>Reload Arcade</button></section>:this.props.children;}
}
export function ArcadeApp({runtime}:{runtime:ArcadeRuntime}){
  useSyncExternalStore(runtime.subscribe,runtime.snapshot,runtime.snapshot);
  const nav=useRef<ReturnType<typeof bindNavigation> | undefined>(undefined);
  const [less,setLess]=useState(readPreference),[systemLess,setSystemLess]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [attention,setAttention]=useState(0);
  const reduced=less||systemLess;
  useEffect(()=>{runtime.start();nav.current=bindNavigation(runtime,window);return()=>{nav.current?.dispose();runtime.dispose();};},[runtime]);
  useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setSystemLess(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  useEffect(()=>{document.documentElement.dataset.arcadeReducedMotion=String(reduced);try{localStorage.setItem(preferenceKey,String(less));}catch{/* Optional preference. */}return()=>{delete document.documentElement.dataset.arcadeReducedMotion;};},[less,reduced]);
  useEffect(()=>{const title=document.querySelector<HTMLElement>('h1');if(title){title.tabIndex=-1;title.focus({preventScroll:true});}},[runtime.destination]);
  const go=(route:'lobby'|'balance')=>nav.current?.go(route);
  const view=runtime.official.view,model=lobbyModel(runtime.context,view,runtime.connecting,runtime.scores.getPersonalBest());
  return <div className={runtime.destination==='lobby'?'arcade-lobby':`arcade-game arcade-${runtime.phase}`} data-reduced={reduced}>
    <div className="arcade-settings"><label><input type="checkbox" checked={less} onChange={e=>setLess(e.target.checked)}/> Less motion</label>{runtime.destination==='balance'&&<button disabled={runtime.locked} onClick={()=>go('lobby')}>{runtime.phase==='playing'||runtime.phase==='countdown'?'Leave run · Back to Arcade':'Back to Arcade'}</button>}{runtime.locked&&<span role="status">Finish confirming your result before returning.</span>}</div>
    {runtime.destination==='balance'?<GameBoundary onBack={()=>go('lobby')}><Suspense fallback={<section className="arcade-load" role="status"><h1 tabIndex={-1}>Getting Balance ready…</h1><p>You can return to the Arcade while the game loads.</p></section>}><Game runtime={runtime} onBack={()=>go('lobby')}/></Suspense></GameBoundary>:<>
      <a className="skip-link" href="#games">Skip to games</a>
      <header><a className="brand-home" href="#arcade" aria-label="CDAWG ARCADE home"><img src={logo} alt="CDAWG ARCADE"/></a><nav aria-label="Main"><a href="#games">Games</a><a href="#player-summaries">Your results</a></nav><div className="identity"><span className="identity-dot"/><div><strong>{model.name}</strong><small>{model.official?'Verified player':'Practice available'}</small></div></div></header>
      <main><section className="welcome"><div><span className="eyebrow"><i className="dash"/>GAMES. FRIENDS. GOOD TIMES.</span><h1 tabIndex={-1}>A little dog.<br/><span>A lot of attitude.</span></h1><p>Your next good time starts here.<br/>Step in, find your balance, make it yours.</p></div><LobbyHost reduced={reduced} attention={attention} success={runtime.success}/><aside className="welcome-ticket"><span>ADMIT EVERYONE</span><img src={tag} alt=""/><p>A place to play.<br/>A reason to return.</p><small>EST. GOOD TIMES</small></aside></section>
      <section className="arcade-connection"><ConnectionStatus context={runtime.context} onRetry={runtime.retryConnection} onPractice={runtime.practice}/>{model.state==='loading'&&<button className="quiet-button" onClick={runtime.practice}>Continue in practice</button>}<p role="status">{model.status}</p></section>
      <section id="games" aria-labelledby="games-title"><div className="section-heading"><h2 id="games-title">Pick your good time.</h2><span className="pill">1 game · more on the way</span></div><div className="games-grid"><GameCard state={model.state} onPlay={()=>go('balance')} onRetry={()=>{if(runtime.context.connectionState==='discord-error')runtime.retryConnection();else void runtime.refresh();}} onAttention={()=>setAttention(n=>n+1)}/><GameCard state="soon"/><GameCard state="soon"/></div></section>
      <p className="feedback">{model.official?'Official scores belong to your verified Discord account.':'Practice results stay in this browser and never enter official rankings.'}</p>
      <section id="player-summaries" className="summaries" aria-label="Player summaries"><article><span className="eyebrow">{model.official?'YOUR OFFICIAL BEST':'YOUR BROWSER BEST'}</span><div className="summary-body"><strong className="score">{model.best}</strong><p>{model.official?model.stats?`${model.stats.acceptedCount} accepted runs`:'Shared results unavailable':'Local practice only'}</p></div>{model.official&&<button className="quiet-button" disabled={view.loading} onClick={()=>void runtime.refresh()}>Refresh official results</button>}</article><article><span className="eyebrow">GUILD LEADERBOARD</span>{model.board?<><ol aria-label="Guild leaderboard summary">{model.board.entries.slice(0,3).map(e=><li key={e.playerTag}><span>#{e.rank} </span>{displayName(e.displayName)}{e.isYou?' · You':''}<strong> {(e.ticks/60).toFixed(3)}s</strong></li>)}</ol>{!model.board.entries.length&&<p>No official runs yet.</p>}{model.board.ownEntry&&<p>Your rank: #{model.board.ownEntry.rank}</p>}</>:<p>{model.official?view.loading?'Loading shared scores…':'Leaderboard temporarily unavailable.':'Official rankings are available in an eligible Discord server.'}</p>}{model.official&&<button className="quiet-button" disabled={view.loading} onClick={()=>void runtime.refresh()}>Refresh leaderboard</button>}</article></section>
      </main><footer><span>CDAWG ARCADE</span><span>A little dog. A lot of attitude.</span><a href="#games">Back to games ↑</a></footer>
    </>}
  </div>;
}
