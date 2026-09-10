import {useState} from 'react';
import type {OfficialController,OfficialView} from './controller';
export const scoreText=(ticks:number)=>`${(ticks/60).toFixed(3)}s`;
// Server escapes names; decode only those five entities, then let React escape as text.
const name=(s:string)=>s.replace(/&(amp|lt|gt|quot|#39);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[key as string]??''));
export function OfficialResultPanel({view,controller}:{view:OfficialView;controller:OfficialController}){
 const label=view.phase==='checking'?'Checking your run…':view.phase==='accepted'?'Official score saved':view.phase==='unconfirmed'?'Submission not confirmed · Retry':view.interrupted?'Practice result · This run was paused':view.phase==='nonqualifying'?'Practice result · This run did not qualify':'Practice · Saved in this browser';
 return <div className="official-result" aria-live="polite"><p>{label}</p>
  {view.phase==='unconfirmed'&&<button className="secondary-button" onClick={()=>void controller.retry()}>Retry submission</button>}
  {view.phase==='accepted'&&<>
   <strong>{scoreText(view.result!.ticks)}</strong>
   {view.result?.personalBest===true&&<span>New personal official best</span>}
   {view.result?.newGuildRecord===true&&<span>New server record</span>}
   <p>Personal Official Best: {view.stats?.best?scoreText(view.stats.best.ticks):'Refreshing…'}</p>
   <p>Server rank: {view.board?.ownEntry?'#'+view.board.ownEntry.rank:'Unavailable'} · Server Record: {view.board?.record?scoreText(view.board.record.ticks):'Unavailable'}</p>
   {(!view.stats||!view.board)&&!view.loading&&<button className="secondary-button" onClick={()=>void controller.refresh()}>Refresh shared scores</button>}
  </>}
 </div>;
}
export function OfficialLeaderboard({view,controller,onBack}:{view:OfficialView;controller:OfficialController;onBack:()=>void}){
 const [recent,setRecent]=useState<{ticks:number;acceptedAt:string}[]|null>(null),[recentError,setRecentError]=useState(false);
 const own=view.board?.ownEntry;
 return <div className="leaderboard-panel official-board"><h2>Server leaderboard</h2><p>New verified runs only. Official scores belong to your verified Discord account.</p>
 <button className="secondary-button" disabled={view.loading} onClick={()=>void controller.refresh()}>Refresh</button>
 {view.loading&&<p role="status">Loading shared scores…</p>}
 {!view.loading&&!view.board&&<p role="status">Shared scores unavailable · Practice only</p>}
 {view.board&&<><p>Server Record: {view.board.record?scoreText(view.board.record.ticks):'No official runs yet'}</p>
 {own&&!own.inPage&&<p className="own-rank">Your rank: #{own.rank} · {scoreText(own.ticks)}</p>}
 {view.board.entries.length===0?<p>No official scores yet. Your next verified run can set the first record.</p>:<ol aria-label="Top 25 official scores">{view.board.entries.map(e=><li className={e.isYou?'local-player':''} key={e.playerTag}><span>#{e.rank}</span><strong>{name(e.displayName)}{e.isYou?' · You':''}{view.board!.entries.filter(other=>other.displayName===e.displayName).length>1&&<small> · {e.playerTag}</small>}</strong><em>{scoreText(e.ticks)}</em></li>)}</ol>}
 <p>Scores use full tick precision. Equal scores keep the earlier accepted best.</p></>}
 {view.stats&&<details><summary>Your official statistics</summary><p>Personal Official Best: {view.stats.best?scoreText(view.stats.best.ticks):'No official runs yet'}</p><p>{view.stats.acceptedCount} official attempts · Average {Number(view.stats.averageSeconds||0).toFixed(3)}s</p><button className="secondary-button" onClick={()=>{void controller.recent().then(r=>{setRecent(r.attempts);setRecentError(false);}).catch(()=>setRecentError(true));}}>Recent official runs</button>{recentError&&<p>Recent runs unavailable.</p>}{recent&&<ol>{recent.map((r,i)=><li key={i}>{scoreText(r.ticks)}</li>)}</ol>}</details>}
 <button className="primary-button" onClick={onBack}>Back to game</button></div>;
}
