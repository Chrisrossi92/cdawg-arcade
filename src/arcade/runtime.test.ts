import {afterEach,describe,it,expect,vi} from 'vitest';
import {ArcadeRuntime,bindNavigation} from './runtime';
import {lobbyModel,displayName} from './model';
import {makeDefaultLocalContext,type HostAdapter} from '../platform/hostAdapter';
import type {HostContext} from '../contracts/events';
import {OfficialClient} from '../official/client';
import {OfficialController} from '../official/controller';
import {LocalScoreRepository} from '../services/scoreRepository';
import {lobbyEnabled,lobbyReleased} from '../../config/lobby-release';
const local=makeDefaultLocalContext();
const trusted:HostContext={...local,environment:'discord',authenticated:true,arcadeSessionState:'verified',connectionState:'discord-authenticated',currentUser:{id:'test-player',displayName:'Verified Test Player'},guildId:'test-guild'};
const settle=async()=>{for(let n=0;n<30;n++)await Promise.resolve();};
function setup(context=local,availability='eligible'){
 let h=context;const listeners=new Set<(h:HostContext)=>void>();
 const host:HostAdapter={environment:context.environment,getContext:()=>h,subscribe:f=>{listeners.add(f);f(h);return()=>{listeners.delete(f);};},requestAuthentication:vi.fn(async()=>h),continuePractice:()=>emit(local),dispose:vi.fn(),closeActivity:async()=>{},inviteOrShareActivity:async()=>{}};
 function emit(next:HostContext){h=next;listeners.forEach(f=>f(h));}
 let resolveSubmit:((r:Response)=>void)|undefined;let delay=false;let count=0;
 const fetcher=vi.fn(async(input:RequestInfo|URL,options?:RequestInit)=>{
  const path=String(input),body=options?.body?JSON.parse(String(options.body)):null;
  let value:unknown={};
  if(path.endsWith('/me'))value={status:'verified',player:{id:'test-player'},guild:{id:'test-guild'},csrf:'c'.repeat(43),officialAvailability:availability};
  else if(path.endsWith('/stats'))value={acceptedCount:'1',averageSeconds:'1',best:{ticks:60,attemptId:'old'}};
  else if(path.endsWith('/leaderboard'))value={entries:[],ownEntry:null,record:null};
  else if(path.endsWith('/submit')){if(delay)return new Promise<Response>(r=>{resolveSubmit=r;});value={attemptId:body.attemptId,disposition:'accepted',ticks:body.evidence.ticks,personalBest:true};}
  else if(path.endsWith('/attempts'))value={attemptId:`attempt-${++count}`,rulesetId:'balance-replay-v1',tickRate:60,maxTicks:18000,retryDeadline:new Date(Date.now()+60000).toISOString()};
  return Response.json(value);
 });
 const official=new OfficialController(new OfficialClient(fetcher,'https://example.test'));
 const scores=new LocalScoreRepository({getItem:()=>null,setItem:()=>{}} as unknown as Storage);
 const runtime=new ArcadeRuntime(host,scores,official);runtime.start();
 return {runtime,host,official,fetcher,emit,listeners,delaySubmit:()=>{delay=true;},complete:()=>resolveSubmit?.(Response.json({attemptId:'attempt-1',disposition:'accepted',ticks:60,personalBest:true}))};
}
const cleanups:(()=>void)[]=[];
function fixture(...args:Parameters<typeof setup>){const f=setup(...args);cleanups.push(()=>f.runtime.dispose());return f;}
afterEach(()=>{cleanups.splice(0).forEach(f=>f());vi.useRealTimers();});
describe('lobby gate and data boundary',()=>{
 it.each(['production','development','test','preview','lobby','false','true'])('keeps %s disabled',mode=>{expect(lobbyReleased).toBe(false);expect(lobbyEnabled(mode)).toBe(false);});
 it('enables only explicit integration mode',()=>expect(lobbyEnabled('lobby-integration')).toBe(true));
 it('makes no official request and no SDK auth in local practice',async()=>{const f=fixture();await f.runtime.refresh();expect(f.fetcher).not.toHaveBeenCalled();expect(f.host.requestAuthentication).not.toHaveBeenCalled();});
 it('connects once, requests existing read-only endpoints with no-store credentials',async()=>{const f=fixture(trusted);await settle();f.runtime.start();expect(f.host.requestAuthentication).toHaveBeenCalledTimes(1);expect(f.fetcher.mock.calls.map(c=>c[0])).toEqual(['/api/me','/api/me/balance/stats','/api/guild/balance/leaderboard']);for(const [,o] of f.fetcher.mock.calls){expect(o?.method).toBe('GET');expect(o?.cache).toBe('no-store');expect(o?.credentials).toBe('same-origin');}});
 it('honors other-server availability without fetching private summaries',async()=>{const f=fixture(trusted,'other-server');await settle();await f.runtime.refresh();expect(f.fetcher).toHaveBeenCalledTimes(1);expect(lobbyModel(trusted,f.official.view,false,12).official).toBe(false);});
 it('rejects mismatched server identity',async()=>{const f=fixture({...trusted,currentUser:{id:'forged',displayName:'Forged'}});await settle();expect(f.official.view.phase).toBe('unavailable');expect(f.fetcher).toHaveBeenCalledTimes(1);});
 it.each(['practice','unavailable'])('does not fetch official summaries for %s',async availability=>{const f=fixture(trusted,availability);await settle();expect(f.fetcher).toHaveBeenCalledTimes(1);expect(lobbyModel(trusted,f.official.view,false,2).board).toBeNull();});
 it('clears private data after switching to practice',async()=>{const f=fixture(trusted);await settle();f.emit(local);expect(f.official.view.stats).toBeNull();expect(f.official.view.board).toBeNull();expect(f.runtime.connecting).toBe(false);});
 it('cannot reveal stale official data through local display state',async()=>{const f=fixture(trusted);await settle();const model=lobbyModel(local,f.official.view,false,7.5);expect(model.name).toBe('Local Player');expect(model.best).toBe('7.5s');expect(model.board).toBeNull();expect(model.stats).toBeNull();});
 it('uses authenticated name and exact official ticks',async()=>{const f=fixture(trusted);await settle();const model=lobbyModel(trusted,f.official.view,false,999);expect(model.name).toBe('Verified Test Player');expect(model.best).toBe('1.000s');expect(model.state).toBe('official');});
 it.each([null,{acceptedCount:'0',averageSeconds:'0',best:null}])('handles unavailable/empty stats',stats=>{const f=fixture();f.official.view={...f.official.view,phase:'eligible',stats};expect(lobbyModel(trusted,f.official.view,false,0).best).toBe(stats?'No official runs yet':'Unavailable');});
 it('has explicit bounded-operation loading presentation',()=>{const f=fixture();expect(lobbyModel(trusted,f.official.view,true,0).state).toBe('loading');});
 it('decodes display entities as text, never HTML',()=>expect(displayName('&lt;script&gt;&amp;&quot;&#39;')).toBe('<script>&"\''));
});
describe('single Activity navigation lifecycle',()=>{
 it('300 navigation cycles retain one host subscription and no attempts',async()=>{const f=fixture(trusted);await settle();for(let i=0;i<300;i++){f.runtime.navigate('balance');f.runtime.navigate('balance');f.runtime.navigate('lobby');await settle();}expect(f.listeners.size).toBe(1);expect(f.host.requestAuthentication).toHaveBeenCalledTimes(1);expect(f.fetcher.mock.calls.filter(c=>c[1]?.method==='POST')).toHaveLength(0);});
 it('blocks game entry while checking session',()=>{const f=fixture(trusted);expect(f.runtime.navigate('balance')).toBe(false);});
 it('active departure interrupts and cancels once, clears expiry',async()=>{vi.useFakeTimers();const f=fixture(trusted);await settle();f.runtime.navigate('balance');await f.official.start();f.runtime.setPhase('playing');f.runtime.navigate('lobby');f.runtime.navigate('lobby');await settle();expect(f.fetcher.mock.calls.filter(c=>String(c[0]).endsWith('/cancel'))).toHaveLength(1);expect(f.fetcher.mock.calls.filter(c=>String(c[0]).endsWith('/submit'))).toHaveLength(0);expect(vi.getTimerCount()).toBe(0);});
 it('rapid starts issue one attempt and uncertain submission locks navigation',async()=>{const f=fixture(trusted);await settle();f.runtime.navigate('balance');const a=f.official.start(),b=f.official.start();expect(await a).toBe('official');expect(await b).toBe('busy');f.delaySubmit();const done=f.official.finish(60);await settle();expect(f.runtime.navigate('lobby')).toBe(false);f.complete();await done;await settle();expect(f.runtime.navigate('lobby')).toBe(true);expect(f.runtime.success).toBe(true);f.runtime.navigate('balance');f.runtime.navigate('lobby');expect(f.runtime.success).toBe(false);expect(f.fetcher.mock.calls.filter(c=>String(c[0]).endsWith('/submit'))).toHaveLength(1);});
 it.each(['preparing','checking','unconfirmed'] as const)('keeps %s operation reachable',async phase=>{const f=fixture();f.runtime.navigate('balance');f.official.view.phase=phase;expect(f.runtime.navigate('lobby')).toBe(false);expect(f.runtime.destination).toBe('balance');});
 it('identity loss returns to lobby and suppresses stale data',async()=>{const f=fixture(trusted);await settle();f.runtime.navigate('balance');f.runtime.setPhase('playing');f.emit(local);expect(f.runtime.destination).toBe('lobby');expect(f.official.view.phase).toBe('practice');});
 it('disposes subscriptions and pending operation state',async()=>{const f=fixture(trusted);await settle();f.runtime.dispose();expect(f.listeners.size).toBe(0);expect(f.host.dispose).toHaveBeenCalled();expect(f.official.view.stats).toBeNull();});
 it('history preserves launch query, ignores forged query identity, handles rejected Back',()=>{
  const f=fixture(),events=new EventTarget();let state:any;const urls:string[]=[];
  const w={location:{pathname:'/',search:'?frame_id=safe&user=forged'},history:{get state(){return state;},replaceState:(s:any,_:string,u:string)=>{state=s;urls.push(u);},pushState:(s:any,_:string,u:string)=>{state=s;urls.push(u);}},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)} as unknown as Window;
  const nav=bindNavigation(f.runtime,w);nav.go('balance');nav.go('balance');expect(urls).toHaveLength(2);expect(urls.every(u=>u.startsWith('/?frame_id=safe&user=forged#arcade'))).toBe(true);expect(f.runtime.context.currentUser.id).toBe('local-player');f.official.view.phase='checking';state={arcade:'lobby'};events.dispatchEvent(new Event('popstate'));expect(state.arcade).toBe('balance');f.official.view.phase='practice';state={arcade:'lobby'};events.dispatchEvent(new Event('popstate'));expect(f.runtime.destination).toBe('lobby');nav.dispose();
 });
});
