// Explicit local fixture harness. Ordinary production entry never imports this module.
import {createRoot} from 'react-dom/client';
import {useEffect,useMemo,useState} from 'react';
import {ArcadeApp} from './ArcadeApp';
import {ArcadeRuntime} from './runtime';
import {LocalScoreRepository} from '../services/scoreRepository';
import {makeDefaultLocalContext,type HostAdapter} from '../platform/hostAdapter';
import type {HostContext} from '../contracts/events';
class FixtureHost implements HostAdapter {
 readonly environment='discord' as const;
 private context=makeDefaultLocalContext();private listeners=new Set<(h:HostContext)=>void>();
 getContext=()=>this.context;
 subscribe=(f:(h:HostContext)=>void)=>{this.listeners.add(f);f(this.context);return()=>{this.listeners.delete(f);};};
 update(h:HostContext){this.context=h;this.listeners.forEach(f=>f(h));}
 async requestAuthentication(){return this.context;}
 continuePractice(){this.update(makeDefaultLocalContext());}
 dispose(){this.listeners.clear();}
 async closeActivity(){}async inviteOrShareActivity(){}
}
function Candidate(){
 const host=useMemo(()=>new FixtureHost(),[]),runtime=useMemo(()=>new ArcadeRuntime(host,new LocalScoreRepository(),undefined,true),[host]);
 const [account,setAccount]=useState('A'),[error,setError]=useState('');
 async function verify(next?:string){host.update(makeDefaultLocalContext());try{
  const response=await fetch('/api/local/identity',{method:next?'POST':'GET',credentials:'include',headers:{'Content-Type':'application/json','X-Arcade-Request':'1',...(next?{}:{'X-Arcade-Origin':location.origin})},...(next?{body:JSON.stringify({account:next})}: {})});
  if(!response.ok)throw new Error();const value=await response.json();setAccount(value.account);host.update({...makeDefaultLocalContext(),environment:'discord',connectionState:'discord-authenticated',authenticated:true,arcadeSessionState:'verified',currentUser:value.identity.player,guildId:value.guildId});setError('');
 }catch{setError('Disposable service unavailable. Practice remains available.');}}
 useEffect(()=>{void verify();},[]);
 return <><div className="integrated-fixture"><span>LOCAL CANDIDATE · MOCK SESSIONS</span><label>Mock verified identity <select disabled={runtime.locked} value={account} onChange={e=>{void verify(e.target.value);}}><option value="A">Player A · Guild 1</option><option value="B">Player B · Guild 1</option><option value="A2">Player A · Guild 2</option><option value="C">Player C · Guild 1</option></select></label><button disabled={runtime.locked} onClick={()=>{void verify();}}>Verify fixture</button><button disabled={runtime.locked} onClick={()=>{void fetch('/api/local/fault',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-Arcade-Request':'1'},body:JSON.stringify({kind:'lost-action-response'})});}}>Simulate lost action response</button>{error&&<span role="alert">{error}</span>}</div><ArcadeApp runtime={runtime}/></>;
}
const root=createRoot(document.getElementById('root')!);root.render(<Candidate/>);if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount());
