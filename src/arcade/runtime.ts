import type {HostAdapter} from '../platform/hostAdapter';
import type {HostContext} from '../contracts/events';
import {OfficialController} from '../official/controller';
import type {ScoreRepository} from '../services/scoreRepository';
import type {GamePhase} from '../types/game';

export type Destination = 'lobby' | 'balance';
export const verified = (h:HostContext) => h.environment === 'discord' && h.authenticated && h.arcadeSessionState === 'verified' && Boolean(h.guildId);
/** One Activity owns the host, session transport and official controller across navigation. */
export class ArcadeRuntime {
  context:HostContext;
  destination:Destination = 'lobby';
  phase:GamePhase = 'home';
  connecting = false;
  success = false;
  revision = 0;
  private listeners = new Set<()=>void>();
  private stopHost?:()=>void;
  private stopOfficial?:()=>void;
  private identity = '';
  private generation = 0;
  private refreshBusy = false;
  private celebrated = '';
  constructor(readonly host:HostAdapter, readonly scores:ScoreRepository, readonly official = new OfficialController()) {this.context=host.getContext();}
  subscribe = (f:()=>void) => {this.listeners.add(f);return ()=>{this.listeners.delete(f);};};
  snapshot = () => this.revision;
  private publish(){this.revision++;this.listeners.forEach(f=>f());}
  start(){
    if(this.stopHost)return;
    this.stopOfficial=this.official.subscribe(()=>this.publish());
    this.stopHost=this.host.subscribe(h=>{
      this.context=h;
      const identity=verified(h)?`${h.currentUser.id}:${h.guildId}`:'';
      if(identity!==this.identity){this.identity=identity;this.generation++;this.connecting=false;
        if(this.destination==='balance'){this.official.interrupt();this.destination='lobby';this.phase='home';}
        if(identity)void this.connect();else this.official.reset();
      }
      this.publish();
    });
    if(this.host.environment==='discord')void this.host.requestAuthentication();
  }
  private async connect(){
    if(!verified(this.context))return;
    const generation=++this.generation;this.connecting=true;this.publish();
    await this.official.connect(this.context.currentUser.id,this.context.guildId!);
    if(generation===this.generation){this.connecting=false;this.publish();}
  }
  retryConnection=()=>{void this.host.requestAuthentication();};
  practice=()=>{this.host.continuePractice();};
  refresh=async()=>{
    if(!verified(this.context)||this.refreshBusy||this.connecting||this.official.view.loading)return;
    this.refreshBusy=true;
    try{if(['unavailable','practice'].includes(this.official.view.phase))await this.connect();else if(this.official.view.phase!=='other-server')await this.official.refresh();}
    finally{this.refreshBusy=false;}
  };
  get locked(){return ['preparing','checking','unconfirmed'].includes(this.official.view.phase);}
  setPhase=(phase:GamePhase)=>{this.phase=phase;this.publish();};
  navigate=(destination:Destination)=>{
    if(destination===this.destination)return true;
    if(this.locked)return false; // Keep submission/retry reachable; never discard an uncertain result.
    if(destination==='balance'&&this.connecting)return false;
    if(destination==='lobby'){
      const result=this.official.view.result;
      this.success=this.official.view.phase==='accepted'&&result?.personalBest===true&&this.celebrated!==result.attemptId;
      if(this.success)this.celebrated=result!.attemptId;
      if(this.phase==='countdown'||this.phase==='playing'){this.official.interrupt();this.official.practice();}
      this.phase='home';
    }else this.success=false;
    this.destination=destination;this.publish();
    if(destination==='lobby')void this.refresh();
    return true;
  };
  dispose(){this.generation++;this.stopHost?.();this.stopOfficial?.();this.stopHost=undefined;this.stopOfficial=undefined;this.official.reset();this.host.dispose();this.listeners.clear();}
}

/** History stores navigation only. Discord launch query/context is never rewritten. */
export function bindNavigation(runtime:ArcadeRuntime, window:Window){
  const url=(route:Destination)=>window.location.pathname+window.location.search+(route==='balance'?'#arcade/balance':'#arcade');
  window.history.replaceState({arcade:'lobby'},'',url('lobby'));
  const pop=()=>{const route=window.history.state?.arcade==='balance'?'balance':'lobby';if(!runtime.navigate(route))window.history.pushState({arcade:runtime.destination},'',url(runtime.destination));};
  window.addEventListener('popstate',pop);
  return {go(route:Destination){if(route===runtime.destination)return;if(runtime.navigate(route))window.history.pushState({arcade:route},'',url(route));},dispose(){window.removeEventListener('popstate',pop);}};
}
