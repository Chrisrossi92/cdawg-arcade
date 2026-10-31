import {ARCADE_APPLICATION_ID} from '../live-config.js';
/** Owned approved 128px mascot, uploaded once to the Arcade application. */
export const DOG_HEAD={id:'1566157351164059738',name:'cdawg_head',animated:false} as const;
/** Decoration is optional: missing/unavailable emoji never removes the working link. */
export async function dogHeadAvailable(token:string,transport:typeof fetch=fetch):Promise<boolean>{
 try{
  const r=await transport(`https://discord.com/api/v10/applications/${ARCADE_APPLICATION_ID}/emojis/${DOG_HEAD.id}`,{headers:{Authorization:'Bot '+token},redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!r.ok){await r.body?.cancel();return false;}
  const raw:unknown=await r.json();if(!raw||typeof raw!=='object')return false;const e=raw as Record<string,unknown>;return e.id===DOG_HEAD.id&&e.name===DOG_HEAD.name&&e.animated===false&&e.available!==false;
 }catch{return false;}
}
