// Development-only entry; never imported by App or emitted by the production build.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BalanceExperience} from '../src/games/balance/BalanceExperience';
import {MemoryScoreRepository} from '../src/services/scoreRepository';
import {OfficialClient} from '../src/official/client';
import {OfficialController} from '../src/official/controller';
import {OfficialResultPanel,OfficialLeaderboard} from '../src/official/OfficialPanels';
import {makeDefaultLocalContext} from '../src/platform/hostAdapter';
import '../src/styles/global.css';
const scenario=new URLSearchParams(location.search).get('scenario')??'eligible';
const sample={attemptId:'00000000-0000-4000-8000-000000000099',disposition:'accepted',ticks:42,reason:'accepted',personalBest:true,newGuildRecord:true};
const stats={acceptedCount:'1',averageSeconds:'0.700000',best:{ticks:42,attemptId:sample.attemptId}};
const entries=Array.from({length:25},(_,i)=>({playerTag:'sample'+i,displayName:i===0?'Synthetic &lt;Player&gt;':'Player '+(i+1),ticks:600-i,rank:String(i+1),isYou:i===0}));
const board={entries:scenario==='empty'?[]:entries,ownEntry:scenario==='outside'?{...entries[0],rank:'30',inPage:false}:{...entries[0],inPage:true},record:scenario==='empty'?null:{displayName:'Synthetic Player',ticks:600,sequence:'1'}};
const fetcher:typeof fetch=async(url,options)=>{const p=String(url),body=options?.body?JSON.parse(String(options.body)):null;let value:any;
 if(p.endsWith('/me'))value={status:'verified',player:{id:'800000000000000001',displayName:'Synthetic Player'},guild:{id:'900000000000000001'},csrf:'s'.repeat(43),officialAvailability:scenario==='ineligible'?'other-server':scenario==='unavailable'?'unavailable':'eligible'};
 else if(p.endsWith('/balance/attempts')&&options?.method==='POST'){if(scenario==='preparing')await new Promise(r=>setTimeout(r,4000));value={attemptId:sample.attemptId,rulesetId:'balance-replay-v1',tickRate:60,maxTicks:18000,retryDeadline:new Date(Date.now()+600000).toISOString()};}
 else if(p.endsWith('/submit'))value={...sample,ticks:body.evidence.ticks,disposition:body.evidence.interruptions?'practice':'accepted'};
 else if(p.endsWith('/stats'))value=stats;
 else if(p.endsWith('/leaderboard'))value=board;
 else value={attempts:[{ticks:42,acceptedAt:new Date().toISOString()}]};
 return new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});
};
const controller=new OfficialController(new OfficialClient(fetcher,'https://123456789012345678.discordsays.com'));
const repository=new MemoryScoreRepository();repository.submitScore(20.7);
function Fixture(){const [local,setLocal]=useState(scenario==='practice');const context={...makeDefaultLocalContext(),environment:'discord' as const,authenticated:!local,connectionState:local?'local-practice' as const:'discord-authenticated' as const,arcadeSessionState:local?'signed-out' as const:'verified' as const,currentUser:{id:local?'local':'800000000000000001',displayName:local?'Local Player':'Synthetic Player'},guildId:'900000000000000001'};
 if(['accepted','rejected','interrupted','checking','unconfirmed','empty','populated','outside'].includes(scenario)){
  const view={phase:scenario==='accepted'?'accepted':scenario==='checking'?'checking':scenario==='unconfirmed'?'unconfirmed':'nonqualifying',interrupted:scenario==='interrupted',result:sample,stats,board,loading:false} as const;
  return <main className="app-shell"><h1>Development result fixture</h1>{['empty','populated','outside'].includes(scenario)?<OfficialLeaderboard view={view} controller={controller} onBack={()=>location.assign('/fixtures/official.html')}/>:<><OfficialResultPanel view={view} controller={controller}/><p>Historical Local Best: 20.7s · This browser</p><button className="primary-button" onClick={()=>location.assign('/fixtures/official.html')}>Play Again</button></>}</main>;
 }
 return <><button onClick={()=>setLocal(!local)}>Switch account fixture</button><button onClick={()=>window.dispatchEvent(new Event('blur'))}>Interrupt fixture</button><BalanceExperience officialController={controller} hostContext={context} scoreRepository={repository} onContinuePractice={()=>setLocal(true)}/></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
