import type Phaser from 'phaser';
/** Phaser 3's start installs a visibility closure that destroy does not remove.
 * Capture only that synchronous installation, then own its lifetime. Restore
 * property handlers immediately so overlapping destroy/start cannot retain an
 * older Game. The upstream loop, visibility events and timing run unchanged.
 * Used only by the compile-time-enabled Arcade integration.
 */
export function ownVisibility(start:()=>void,onDestroy:(cleanup:()=>void)=>void){
  const add=document.addEventListener;
  const captured:{type:string;listener:EventListenerOrEventListenerObject;options?:boolean|AddEventListenerOptions}[]=[];
  const blur=window.onblur,focus=window.onfocus;
  document.addEventListener=((type:string,listener:EventListenerOrEventListenerObject,options?:boolean|AddEventListenerOptions)=>{
    if(/^(?:webkit|moz|ms)?visibilitychange$/.test(type))captured.push({type,listener,options});
    add.call(document,type,listener,options);
  }) as typeof document.addEventListener;
  let installedBlur:typeof window.onblur=null,installedFocus:typeof window.onfocus=null;
  try{start();installedBlur=window.onblur;installedFocus=window.onfocus;}
  catch(error){captured.forEach(({type,listener,options})=>document.removeEventListener(type,listener,options));throw error;}
  finally{document.addEventListener=add;window.onblur=blur;window.onfocus=focus;}
  const onBlur=(event:FocusEvent)=>installedBlur?.call(window,event);
  const onFocus=(event:FocusEvent)=>installedFocus?.call(window,event);
  window.addEventListener('blur',onBlur);window.addEventListener('focus',onFocus);
  onDestroy(()=>{captured.forEach(({type,listener,options})=>document.removeEventListener(type,listener,options));window.removeEventListener('blur',onBlur);window.removeEventListener('focus',onFocus);});
}
export function createManagedGame(phaser:typeof Phaser,config:Phaser.Types.Core.GameConfig){
  class ManagedGame extends phaser.Game {
    protected start(){ownVisibility(()=>super.start(),cleanup=>this.events.once(phaser.Core.Events.DESTROY,cleanup));}
  }
  return new ManagedGame({...config,audio:{noAudio:true}});
}
