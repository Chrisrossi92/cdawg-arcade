import type {CSSProperties,Ref} from 'react';
import type {GameState} from './state';
export function ChainRoute({state,reduced,chainRef}:{state:GameState;reduced:boolean;chainRef?:Ref<HTMLOListElement>}){
 const playing=state.phase==='playing';
 const route=<ol role="list" ref={chainRef} className="word-chain" aria-label={playing?'Current route':'Final route'}>
  {state.route.map((word,index)=><li role="listitem" key={`${index}-${word}`} className={`word-node ${index===0?'origin':'locked'} ${index===state.route.length-1?'current':''}`} aria-current={playing&&index===state.route.length-1?'step':undefined} data-lock={index===0?'origin':'locked'} style={{'--node-index':index*280/Math.max(1,state.route.length-1)} as CSSProperties}>
   <span className="node-number" aria-hidden="true">{String(index).padStart(2,'0')}</span><strong>{word.toUpperCase()}</strong>
   {index>0&&<span className="lock-joint" aria-hidden="true">◆</span>}
   <span className="node-label">{index===0?'START':word===state.puzzle.finish.key?'FINISH':index===state.route.length-1&&playing?'CURRENT':''}</span>
  </li>)}
  {playing&&state.feedback.kind==='backtracked'&&!reduced&&<li aria-hidden="true" className="removed-node" key={`removed-${state.feedback.sequence}`}><span className="unlock-connector"/><strong>{state.feedback.removed?.toUpperCase()}</strong></li>}
 </ol>;
 return playing?<section className="chain-field" aria-label="Chain journey">{route}<div className="unresolved-gap" aria-hidden="true"><span/></div><div className="destination waiting" role="group" aria-label={`Destination: ${state.puzzle.finish.display}. Not yet reached.`}><span aria-hidden="true">◇</span><strong>{state.puzzle.finish.display}</strong><span>DESTINATION</span></div></section>:route;
}
