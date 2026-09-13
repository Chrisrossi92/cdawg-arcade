import type {CardState} from './model';
import tag from '../../assets/brand/arcade/vector/cdawg-tag-dark-v001.svg';
export function GameCard({state,onPlay,onRetry,onAttention}:{state:CardState;onPlay?:()=>void;onRetry?:()=>void;onAttention?:()=>void}){
  const soon=state==='soon',disabled=soon||state==='unavailable'||state==='loading';
  return <article className={`arcade-card ${soon?'soon':'featured'}`} aria-busy={state==='loading'} onPointerEnter={onAttention} onFocus={onAttention}>
    <div className="card-top"><span className="eyebrow">{soon?'UP NEXT':'THE ORIGINAL'}</span><span className="card-index">{soon?'•••':'01'}</span></div>
    <h2>{soon?'COMING SOON':'CDAWG BALANCE'}</h2>
    <div className={`game-art ${soon?'mystery':''}`} aria-hidden="true">{soon?<span className="ticket-outline">?</span>:<><div className="balance-orbit"/><img className="art-tag" src={tag} alt=""/><div className="balance-beam"/><div className="balance-pivot"/></>}<span className="art-caption">{soon?'GOOD THINGS TAKE PLAY.':'A LITTLE BALANCE. A LOT OF NERVE.'}</span></div>
    <p className="card-description">{soon?'The next good time is on its way.':state==='loading'?'Getting your place ready…':state==='error'?'Couldn’t connect. Practice is still here.':state==='unavailable'?'This game is unavailable.':'Find your footing. Hold your nerve. Stay in the game.'}</p>
    <button className={soon?'quiet-button':'play-button'} disabled={disabled} onClick={onPlay}>{soon?'Coming soon':state==='loading'?'Getting ready…':state==='unavailable'?'Unavailable':state==='official'?'Play Balance':'Play practice'}<span aria-hidden="true">→</span></button>
    {state==='error'&&<button className="quiet-button" onClick={onRetry}>Retry connection</button>}
    <div className="card-foot"><span>{soon?'STAY CURIOUS':state==='official'?'VERIFIED RUNS · THIS SERVER':'BROWSER PRACTICE ONLY'}</span><span aria-hidden="true">✦</span></div>
  </article>;
}
