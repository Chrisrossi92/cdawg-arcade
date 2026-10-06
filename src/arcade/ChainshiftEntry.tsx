import {useEffect,useState,useRef} from 'react';
import type {ArcadeRuntime} from './runtime';
import {verified} from './runtime';
import {ArcadeSessionClient} from '../api/sessionClient';
import {RankedChainshift} from '../games/chainshift/RankedChainshift';
import {Chainshift} from '../games/chainshift/Chainshift';
import type {RankedIdentity} from '../games/chainshift/ranked';

/** Recheck the application's existing cookie session; host display state never grants ranked identity. */
export async function chainshiftIdentity(runtime:ArcadeRuntime,client=new ArcadeSessionClient()):Promise<RankedIdentity>{
 const expected=runtime.context;
 if(!verified(expected))throw new Error('unverified');
 const session=await client.me();
 if(!verified(runtime.context)||runtime.context.currentUser.id!==expected.currentUser.id||runtime.context.guildId!==expected.guildId||session.player.id!==expected.currentUser.id||session.guild.id!==expected.guildId)throw new Error('account_changed');
 return {player:session.player,csrf:session.csrf};
}
export default function ChainshiftEntry({runtime,onBack,reducedMotion}:{runtime:ArcadeRuntime;onBack:()=>void;reducedMotion?:boolean}){
 const hadRanked=useRef(false);
 const [boundKey,setBoundKey]=useState('');
 const [identity,setIdentity]=useState<RankedIdentity|null>(null),[error,setError]=useState(''),[checking,setChecking]=useState(true),[practice,setPractice]=useState(false),[retry,setRetry]=useState(0);
 const key=verified(runtime.context)?runtime.context.currentUser.id+':'+runtime.context.guildId:'';
 useEffect(()=>{let alive=true;setIdentity(null);setError('');setChecking(true);setPractice(false);
  if(!key){setChecking(false);if(hadRanked.current)setError('Ranked session changed. Reconnect to resume its server-timed attempt, or deliberately choose practice.');return;}
  void chainshiftIdentity(runtime).then(value=>{if(alive){hadRanked.current=true;setIdentity(value);setBoundKey(key);setChecking(false);}}).catch(()=>{if(alive){setChecking(false);setError('Ranked session could not be verified. Recheck your account, or choose practice.');}});
  return()=>{alive=false;runtime.setChainshiftLocked(false);};
 },[key,retry,runtime]);
 // Account updates invalidate the old tree immediately, before effect cleanup or a network reply.
 if(practice||(!key&&!hadRanked.current))return <div className="arcade-chainshift"><Chainshift integration={{onExit:onBack,locked:false,reducedMotion}}/></div>;
 if(checking||!identity||boundKey!==key)return <section className="arcade-load" aria-live="polite"><h1>CHAINSHIFT</h1><p>{error||'Checking your verified Arcade session…'}</p>{error&&<><button onClick={()=>setRetry(n=>n+1)}>Recheck session</button><button onClick={runtime.retryConnection}>Reconnect Discord</button><button onClick={()=>setPractice(true)}>Play practice</button></>}</section>;
 if(identity.player.id!==runtime.context.currentUser.id)return <section className="arcade-load" role="status">Account changed. Checking your session…</section>;
 return <div className="arcade-chainshift"><RankedChainshift key={key+':'+retry} identity={identity} onReverify={()=>setRetry(n=>n+1)} onNavigationLock={runtime.setChainshiftLocked} onExit={onBack} reducedMotion={reducedMotion}/></div>;
}
