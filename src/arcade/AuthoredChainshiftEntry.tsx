import {useEffect,useState} from 'react';
import type {ArcadeRuntime} from './runtime';
import {verified} from './runtime';
import type {RankedIdentity} from '../games/chainshift/ranked';
import {FixedChainshift} from '../games/chainshift/authored/FixedChainshift';
import {chainshiftIdentity} from './chainshiftIdentity';

export default function AuthoredChainshiftEntry({runtime,onBack,reducedMotion}:{runtime:ArcadeRuntime;onBack:()=>void;reducedMotion?:boolean}){
 const key=verified(runtime.context)?runtime.context.currentUser.id+':'+runtime.context.guildId:'';
 const [binding,setBinding]=useState<{key:string;identity:RankedIdentity}|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;setBinding(null);setError(false);if(!key){setError(true);return;}void chainshiftIdentity(runtime).then(identity=>{if(alive)setBinding({key,identity});}).catch(()=>{if(alive)setError(true);});return()=>{alive=false;runtime.setChainshiftLocked(false);};},[runtime,key,retry]);
 if(!binding||binding.key!==key)return <section className="arcade-load"><h1>CHAINSHIFT</h1><p role="status">{error?'Your Arcade session needs reconnecting. Saved chains remain intact.':'Getting your authored chain ready…'}</p>{error&&<button onClick={()=>{runtime.retryConnection();setRetry(n=>n+1);}}>RECHECK SESSION</button>}<button onClick={onBack}>Back to Arcade</button></section>;
 return <div className="arcade-chainshift"><FixedChainshift key={key} preview={import.meta.env.DEV} identity={binding.identity} onExit={onBack} onNavigationLock={runtime.setChainshiftLocked} reducedMotion={reducedMotion}/></div>;
}
