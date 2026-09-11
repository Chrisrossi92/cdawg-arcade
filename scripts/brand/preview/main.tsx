import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {HostContext} from '../../../src/contracts/events';
import {makeDefaultLocalContext} from '../../../src/platform/hostAdapter';
import './style.css';
import logo from '../../../assets/brand/arcade/vector/cdawg-horizontal-dark-v001.svg';
import lightLogo from '../../../assets/brand/arcade/vector/cdawg-horizontal-light-v001.svg';
import stacked from '../../../assets/brand/arcade/vector/cdawg-stacked-dark-v001.svg';
import wordmark from '../../../assets/brand/arcade/vector/cdawg-wordmark-dark-v001.svg';
import tag from '../../../assets/brand/arcade/vector/cdawg-tag-dark-v001.svg';
import smallTag from '../../../assets/brand/arcade/vector/cdawg-tag-small-v001.svg';
import mono from '../../../assets/brand/arcade/vector/cdawg-tag-mono-cream-v001.svg';
import host from '../../../assets/brand/arcade/runtime/cdawg-host-v001.png';
import avatar from '../../../assets/brand/arcade/runtime/cdawg-avatar-128-v001.png';
import tokens from '../../../assets/brand/arcade/tokens.json';
type State='practice'|'playable'|'disabled'|'loading'|'error';
const labels:Record<State,string>={practice:'Local practice',playable:'Signed-in example',disabled:'Unavailable',loading:'Loading',error:'Connection error'};
function Identity({context}:{context:HostContext}) {return <div className="identity"><span className="identity-dot"/><div><strong>{context.currentUser.displayName}</strong><small>{context.authenticated?'Signed-in example':'Practice player'}</small></div></div>}
function GameCard({state,soon=false,onFeedback}:{state:State;soon?:boolean;onFeedback:(s:string)=>void}){
 const unavailable=state==='disabled'||state==='loading';
 return <article className={`game-card ${soon?'soon':'featured'}`} aria-busy={!soon&&state==='loading'}>
  <div className="card-top"><span className="eyebrow">{soon?'UP NEXT':'THE ORIGINAL'}</span><span className="card-index">{soon?'•••':'01'}</span></div>
  <h2>{soon?'COMING SOON':'CDAWG BALANCE'}</h2>
  <div className={`game-art ${soon?'mystery':''}`} aria-hidden="true">{soon?<><span className="ticket-outline">?</span><span className="art-caption">GOOD THINGS TAKE PLAY.</span></>:<><div className="balance-orbit"/><img className="art-tag" src={tag} alt=""/><div className="balance-beam"/><div className="balance-pivot"/><span className="art-caption">A LITTLE BALANCE. A LOT OF NERVE.</span></>}</div>
  <p className="card-description">{soon?'The next good time is on its way.':state==='error'?'Couldn’t connect. Practice is still here.':state==='loading'?'Getting your place ready…':state==='disabled'?'Taking a short breather. Come back soon.':'Find your footing. Hold your nerve. Stay in the game.'}</p>
  {soon?<button className="quiet-button" onClick={()=>onFeedback('Coming soon. No release date yet—there’s plenty of Balance to play.')}>Coming soon <span aria-hidden="true">↗</span></button>:unavailable?<button className="play-button" disabled>{state==='loading'?'Getting ready…':'Unavailable'}</button>:<a className="play-button" href="balance.html">{state==='practice'||state==='error'?'Play practice':'Play local demo'}<span aria-hidden="true">→</span></a>}
  <div className="card-foot"><span>{soon?'STAY CURIOUS':state==='playable'?'PREVIEW · NO OFFICIAL SUBMISSIONS':'NO PRESSURE. JUST PLAY.'}</span><span aria-hidden="true">✦</span></div>
 </article>
}
function BrandLab(){return <section id="brand-system" className="brand-lab" aria-labelledby="brand-title"><div className="section-heading"><div><span className="eyebrow">THE IDENTITY KIT</span><h2 id="brand-title">Same spirit. Any size.</h2></div><span className="pill">Vector originals</span></div><div className="brand-grid"><div className="specimen"><img src={logo} alt="Primary CDAWG ARCADE lockup"/><p>01 / Primary · dark background</p></div><div className="specimen light"><img src={lightLogo} alt="Light-background CDAWG ARCADE lockup"/><p>02 / Light background · deeper orange</p></div><div className="specimen compact"><img src={stacked} alt="Stacked CDAWG ARCADE"/><img src={mono} alt="One-color Notched Tag"/><p>03 / Stacked & one-color</p></div><div className="specimen"><img src={wordmark} alt="CDAWG ARCADE wordmark"/><div className="size-row">{[16,24,32,48].map(n=><span key={n}><img src={smallTag} width={n} height={n} alt={`${n} pixel simplified tag`}/><small>{n}px</small></span>)}<img src={avatar} width="64" height="64" alt="Owned mascot avatar"/></div><p>04 / Wordmark · small mark · avatar</p></div></div><div className="swatches">{['background','text','action','brass'].map(key=><div key={key}><i style={{background:tokens[key as keyof typeof tokens]}}/><strong>{key}</strong><code>{tokens[key as keyof typeof tokens]}</code></div>)}</div><div className="type-specimen"><div><span className="eyebrow">FREDOKA 600 / DISPLAY</span><h2>Built for good times.</h2></div><div><span className="eyebrow">ATKINSON HYPERLEGIBLE 400 / UI</span><p>Easy to read. Easy to feel at home.<br/>0123456789 · I l 1 · O 0 · B 8</p></div></div><p className="fine-print">Locally hosted, Latin subsets · SIL Open Font License 1.1 · System fallback for other scripts.<br/>The Notched Tag identifies the Arcade. CDAWG’s original round collar tag stays part of his approved character.</p></section>}
function App(){
 const [state,setState]=useState<State>('practice');const [message,setMessage]=useState(''); const [reduced,setReduced]=useState(false);const [fonts,setFonts]=useState('loading');
 const base=makeDefaultLocalContext();
 const context:HostContext=state==='playable'?{...base,authenticated:true,currentUser:{...base.currentUser,displayName:'Arcade player'}}:base;
 useEffect(()=>{Promise.all([document.fonts.load('600 16px "CDAWG Display"'),document.fonts.load('400 16px "CDAWG UI"')]).then(faces=>setFonts(faces.every(f=>f.length>0)?'ready':'fallback')).catch(()=>setFonts('fallback'));},[]);
 useEffect(()=>{document.documentElement.style.scrollBehavior=reduced?'auto':'';},[reduced]);
 return <div className="brand-root" data-reduced={reduced} data-fonts={fonts}>
  <a className="skip-link" href="#games">Skip to games</a>
  <div className="preview-bar"><span>IDENTITY PHASE 1 <b>LOCAL PREVIEW</b></span><div><label>State <select value={state} onChange={e=>{setState(e.target.value as State);setMessage('')}}>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="motion-toggle"><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/> Less motion</label></div></div>
  <header><a className="brand-home" href="#" aria-label="CDAWG ARCADE home"><img src={logo} alt="CDAWG ARCADE"/></a><nav aria-label="Main"><a href="#games">Games</a><a href="#brand-system">Brand system</a></nav><Identity context={context}/></header>
  <main>
   <section className="welcome"><div><span className="eyebrow"><span className="dash"/> GAMES. FRIENDS. GOOD TIMES.</span><h1>A little dog.<br/><span>A lot of attitude.</span></h1><p>Your next good time starts here.<br/>Step in, find your balance, make it yours.</p></div><div className="host-stage"><div className="host-halo"/><img src={host} alt="CDAWG, your black-and-cream bulldog host"/><span className="host-note">WELCOME TO THE CLUBHOUSE</span></div><div className="welcome-ticket"><span>ADMIT EVERYONE</span><img src={smallTag} alt=""/><p>A place to play.<br/>A reason to return.</p><small>EST. GOOD TIMES</small></div></section>
   <section id="games" tabIndex={-1} aria-labelledby="games-title"><div className="section-heading"><h2 id="games-title">Pick your good time.</h2><span className="pill">1 game · more on the way</span></div><div className="games-grid"><GameCard state={state} onFeedback={setMessage}/><GameCard state={state} soon onFeedback={setMessage}/><GameCard state={state} soon onFeedback={setMessage}/></div></section>
   <div className="feedback" role="status" aria-live="polite">{message|| (state==='error'?'Connection unavailable. Your local practice game remains available.':'This is a local design preview. Scores and identity examples are not live.')}</div>
   <section className="summaries" aria-label="Player summaries"><article><span className="eyebrow">YOUR PERSONAL BEST</span><div className="summary-body"><strong className="score">—<small>seconds</small></strong><p>Your first run starts the story.<br/><span>Practice results stay in this preview.</span></p></div></article><article><span className="eyebrow">GUILD LEADERBOARD</span><div className="summary-body"><span className="summary-tag" aria-hidden="true">✦</span><p>{state==='playable'?'Your guild belongs here.':'Good times are better together.'}<br/><span>Live rankings appear when connected in Discord.</span></p></div></article></section>
   <BrandLab/>
  </main><footer><span>CDAWG ARCADE</span><span>A little dog. A lot of attitude.</span><a href="#games">Back to games ↑</a></footer>
 </div>
}
createRoot(document.getElementById('root')!).render(<App/>);
