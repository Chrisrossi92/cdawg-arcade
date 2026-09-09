// Local-only synthetic UI harness. Never part of the production entry/build.
import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BalanceExperience} from '../src/games/balance/BalanceExperience';
import {MemoryScoreRepository} from '../src/services/scoreRepository';
import {DiscordHostAdapter} from '../src/platform/discord/DiscordHostAdapter';
import {ArcadeSessionClient,SessionClientError,type ArcadeSession} from '../src/api/sessionClient';
import '../src/styles/global.css';
let mode='success';let accountListener:((event:unknown)=>void)|undefined;
const profile=():ArcadeSession=>({status:'verified',player:{id:'234567890123456789',displayName:'Synthetic Verified Player'},guild:{id:'345678901234567890'},csrf:'x'.repeat(43),expiresAt:new Date(Date.now()+28800000).toISOString(),idleExpiresAt:new Date(Date.now()+1800000).toISOString()});
class MockSessions extends ArcadeSessionClient {
  async challenge(){if(mode==='disabled')return null;if(mode==='failure')throw new SessionClientError('verification_unavailable');return {challengeId:'synthetic',codeChallenge:'x'.repeat(43),codeChallengeMethod:'S256' as const};}
  async establish(){if(mode==='failure')throw new SessionClientError('verification_unavailable');return {session:profile(),access_token:'synthetic-transient'};}
  async me(){if(mode==='expired')throw new SessionClientError('expired');return profile();}
  async logout(){} async discrepancy(){}
}
const adapter=new DiscordHostAdapter({exchangeCode:async()=>({access_token:'synthetic-transient'})},{search:'?frame_id=synthetic&instance_id=i-synthetic&platform=desktop',clientId:'123456789012345678',sessions:new MockSessions(),loadSdk:async()=>()=>({ready:async()=>{},instanceId:'i-synthetic',commands:{authorize:async()=>({code:'synthetic-code'}),authenticate:async()=>({user:{id:profile().player.id,username:'Synthetic SDK Player'}})},subscribe:async(event,listener)=>{if(event==='CURRENT_USER_UPDATE')accountListener=listener;},unsubscribe:async()=>{}})});
const scores=new MemoryScoreRepository();
const narrow=new URLSearchParams(location.search).has('narrow');
function Harness(){const [context,setContext]=useState(adapter.getContext());useEffect(()=>{const off=adapter.subscribe(setContext);if(narrow)void adapter.requestAuthentication();return()=>{off();adapter.dispose();};},[]);return <><aside aria-label="Synthetic test controls" hidden={narrow}><strong>Local test fixture · no Discord credentials</strong>{['success','failure','disabled'].map(x=><button key={x} onClick={()=>{mode=x;void adapter.requestAuthentication();}}>{x}</button>)}<button onClick={()=>{mode='expired';}}>Expire session on next check</button><button onClick={()=>accountListener?.({id:'456789012345678901'})}>Switch synthetic account</button></aside><BalanceExperience hostContext={context} scoreRepository={scores} onRetryConnection={()=>{mode='success';void adapter.requestAuthentication();}} onContinuePractice={()=>adapter.continuePractice()}/></>;}
createRoot(document.getElementById('root')!).render(<Harness/>);
