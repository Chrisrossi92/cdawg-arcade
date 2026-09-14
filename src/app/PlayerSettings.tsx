import {useEffect,useId,useRef,useState} from 'react';
import type {HostContext} from '../contracts/events';
import {ConnectionStatus,connectionPresentation} from './ConnectionStatus';
import './player-settings.css';
export const readAudioPreference=(key:string,fallback:boolean)=>{try{const value=localStorage.getItem(key);return value===null?fallback:value==='true';}catch{return fallback;}};
type AudioPreferences={music:boolean;sfx:boolean;setMusic:(value:boolean)=>void;setSfx:(value:boolean)=>void};
export function PlayerSettings({context,onRetry,onPractice,official=false,audio,less,onLess,disabled=false}:{context:HostContext;onRetry?:()=>void;onPractice?:()=>void;official?:boolean;audio?:AudioPreferences;less?:boolean;onLess?:(value:boolean)=>void;disabled?:boolean}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),id=useId();
 const [open,setOpen]=useState(false),[music,setMusic]=useState(()=>readAudioPreference('cdawg.arcade.music.v1',false)),[sfx,setSfx]=useState(()=>readAudioPreference('cdawg.arcade.sfx.v1',true));
 const connection=connectionPresentation(context);
 const close=()=>dialog.current?.close();
 useEffect(()=>{if(disabled)dialog.current?.close();},[disabled]);
 const preference=(key:string,value:boolean,set:(value:boolean)=>void)=>{set(value);try{localStorage.setItem(key,String(value));}catch{/* Optional preference. */}};
 return <div className="player-settings">
  <button ref={trigger} className="identity-button" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} disabled={disabled} onClick={()=>{dialog.current?.showModal();setOpen(true);}}><span><strong>{context.environment==='discord'&&context.authenticated?context.currentUser.displayName:'Player'}</strong><small>{official?'Official play':connection.label}</small></span><span aria-hidden="true">⌄</span></button>
  <dialog ref={dialog} id={id} className="player-settings-dialog" aria-labelledby={id+'-title'} onKeyDown={event=>{if(event.key!=='Tab')return;const controls=[...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),summary,a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length>0);const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}} onClose={()=>{setOpen(false);if(!disabled)trigger.current?.focus();}}>
   <div className="settings-heading"><h2 id={id+'-title'}>Your Arcade</h2><button autoFocus onClick={close} aria-label="Close settings">Close</button></div>
   <ConnectionStatus context={context} onRetry={()=>{close();onRetry?.();}} onPractice={()=>{close();onPractice?.();}}/>
   {context.authenticated&&!connection.busy&&!connection.recover&&onPractice&&<button className="secondary-button" onClick={()=>{close();onPractice();}}>Disconnect and practice</button>}
   <fieldset disabled={disabled} className="audio-controls"><legend>Sound</legend><label><input type="checkbox" checked={audio?.music??music} onChange={e=>audio?audio.setMusic(e.target.checked):preference('cdawg.arcade.music.v1',e.target.checked,setMusic)}/> Music</label><label><input type="checkbox" checked={audio?.sfx??sfx} onChange={e=>audio?audio.setSfx(e.target.checked):preference('cdawg.arcade.sfx.v1',e.target.checked,setSfx)}/> SFX</label></fieldset>
   {onLess&&<label className="motion-preference"><input type="checkbox" checked={less} onChange={e=>onLess(e.target.checked)}/> Less motion</label>}
   <details className="balance-help"><summary>How to play Balance</summary><p>Keep Cdawg upright for as long as you can. Hold Left or Right to lean; let go to ease off. Use the on-screen buttons, ← →, or A / D.</p><p>Leaving the game or an interrupted run makes that run practice only. Practice scores stay on this device; official scores appear on this server’s leaderboard.</p></details>
  </dialog>
 </div>;
}
