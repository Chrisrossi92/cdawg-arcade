import type {HostContext} from '../contracts/events';
import type {OfficialView} from '../official/controller';
import {verified} from './runtime';
export type CardState='official'|'practice'|'loading'|'unavailable'|'error'|'soon';
export function lobbyModel(host:HostContext, view:OfficialView, connecting:boolean, localBest:number){
  const trusted=verified(host);
  const official=trusted&&['eligible','accepted','nonqualifying'].includes(view.phase);
  const loading=host.connectionState==='discord-connecting'||connecting;
  const error=host.connectionState==='discord-error'||(trusted&&view.phase==='unavailable');
  const state:CardState=loading?'loading':error?'error':official?'official':'practice';
  return {name:host.environment==='discord'&&host.authenticated?host.currentUser.displayName:'Local Player',state,official,
    status:loading?'Getting your place ready…':official?'Official play · This server':trusted&&view.phase==='other-server'?'Official scoring unavailable in this server':trusted?'Shared scores unavailable · Practice only':'Practice · Saved in this browser',
    best:official?(view.stats?.best?`${(view.stats.best.ticks/60).toFixed(3)}s`:view.loading?'Loading…':view.stats?'No official runs yet':'Unavailable'):`${localBest.toFixed(1)}s`,
    board:official?view.board:null,
    stats:official?view.stats:null};
}
export const displayName=(s:string)=>s.replace(/&(amp|lt|gt|quot|#39);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[key as string]??''));
