import {useEffect} from 'react';
import {BalanceExperience} from '../games/balance/BalanceExperience';
import type {ArcadeRuntime} from './runtime';
import '../styles/global.css';
export default function GameEntry({runtime,onBack}:{runtime:ArcadeRuntime;onBack:()=>void}){
  useEffect(()=>{const title=document.querySelector<HTMLElement>('.arcade-game h1');if(title){title.tabIndex=-1;title.focus({preventScroll:true});}},[]);
  return <BalanceExperience hostContext={runtime.context} scoreRepository={runtime.scores} officialController={runtime.official} onExit={onBack} onRetryConnection={runtime.retryConnection} onContinuePractice={runtime.practice} integration={{onPhase:runtime.setPhase}}/>;
}
