import {gameRegistry} from '../games/registry';
const game=gameRegistry.find(g=>g.id==='chainshift')!;
export function ChainshiftCard({onPlay}:{onPlay:()=>void}){
 return <article className="arcade-card featured chainshift-card"><div className="card-top"><span className="eyebrow">DAILY WORD CHALLENGE</span><span className="card-index">02</span></div><h2>{game.title.toUpperCase()}</h2><div className="game-art" aria-hidden="true"><span className="chainshift-card-words">WORD <i>↗</i> WORD</span><span className="art-caption">ONE CONNECTION AT A TIME.</span></div><p className="card-description">{game.tagline}</p><button className="play-button" onClick={onPlay}>Play Chainshift <span aria-hidden="true">→</span></button><div className="card-foot"><span>{import.meta.env.MODE==='chainshift-authored-integration'?'FIVE WORDS · DAILY + PRACTICE':'RANKED DAILY · PRACTICE'}</span><span aria-hidden="true">✦</span></div></article>;
}
