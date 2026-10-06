import {it,expect,vi} from 'vitest';
import {ArcadeRuntime,bindNavigation} from './runtime';
import {makeDefaultLocalContext,type HostAdapter} from '../platform/hostAdapter';
import type {HostContext} from '../contracts/events';
import {LocalScoreRepository} from '../services/scoreRepository';
function fixture(enabled=true,hash=''){
 let listener:(h:HostContext)=>void=()=>{};let context=makeDefaultLocalContext();
 const host={environment:'discord',getContext:()=>context,subscribe:(f:(h:HostContext)=>void)=>{listener=f;f(context);return()=>{listener=()=>{};};},requestAuthentication:async()=>context,continuePractice:()=>{},dispose:()=>{}} as unknown as HostAdapter;
 const runtime=new ArcadeRuntime(host,new LocalScoreRepository({getItem:()=>null,setItem:()=>{}} as unknown as Storage),undefined,enabled);
 vi.spyOn(runtime.official,'connect').mockResolvedValue(undefined);
 const events=new EventTarget();let state:unknown;let url='/?frame_id=frame&instance_id=instance&custom_id=chainshift-today-v1';
 const window={location:{pathname:'/',search:url.slice(1),hash},history:{get state(){return state;},replaceState:(s:unknown,_:string,u:string)=>{state=s;url=u;},pushState:(s:unknown,_:string,u:string)=>{state=s;url=u;}},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)} as unknown as Window;
 runtime.start();const navigation=bindNavigation(runtime,window);
 const update=(patch:Partial<HostContext>)=>{context={...context,...patch};listener(context);};
 const verified={environment:'discord' as const,authenticated:true,arcadeSessionState:'verified' as const,currentUser:{id:'234567890123456789',displayName:'Verified'},guildId:'345678901234567890',activityLaunch:'chainshift-today' as const};
 return {runtime,navigation,events,update,verified,url:()=>url,close:()=>{navigation.dispose();runtime.dispose();}};
}
it('routes once after verified SDK handoff and preserves all Discord launch parameters',()=>{
 const f=fixture();expect(f.runtime.destination).toBe('lobby');f.update({...f.verified,arcadeSessionState:'verifying'});expect(f.runtime.destination).toBe('lobby');
 f.update(f.verified);expect(f.runtime.destination).toBe('chainshift');expect(f.url()).toBe('/?frame_id=frame&instance_id=instance&custom_id=chainshift-today-v1#arcade/chainshift');
 f.navigation.go('lobby');f.update(f.verified);expect(f.runtime.destination).toBe('lobby');f.close();
});
it.each(['expired','account-changed','unavailable','verifying'] as const)('cannot route from %s identity state',state=>{const f=fixture();f.update({...f.verified,arcadeSessionState:state});expect(f.runtime.destination).toBe('lobby');f.close();});
it('normal launch, disabled candidate and forged raw query marker stay in lobby',()=>{
 const normal=fixture();normal.update({...normal.verified,activityLaunch:undefined});expect(normal.runtime.destination).toBe('lobby');normal.close();
 const off=fixture(false);off.update(off.verified);expect(off.runtime.destination).toBe('lobby');expect(off.url()).toMatch(/#arcade$/);off.close();
 const browser=fixture();browser.update({...browser.verified,environment:'local'});expect(browser.runtime.destination).toBe('lobby');browser.close();
});
it('does not override explicit Balance navigation with a late launch hint',()=>{const f=fixture();f.navigation.go('balance');f.update(f.verified);expect(f.runtime.destination).not.toBe('chainshift');expect(f.url()).toMatch(/#arcade\/balance$/);f.close();});
it('history navigation and explicit deep destinations take precedence over automatic launch',()=>{
 const history=fixture();history.events.dispatchEvent(new Event('popstate'));history.update(history.verified);expect(history.runtime.destination).toBe('lobby');history.close();
 const direct=fixture(true,'#arcade/chainshift');direct.navigation.go('lobby');direct.update(direct.verified);expect(direct.runtime.destination).toBe('lobby');direct.close();
});
it('does not route after the navigation binding is disposed',()=>{const f=fixture();f.navigation.dispose();f.update(f.verified);expect(f.runtime.destination).toBe('lobby');f.runtime.dispose();});
