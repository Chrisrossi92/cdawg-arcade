import {useEffect,useState} from 'react';
const key='cdawg.balance.help-seen.v1';
export function BalanceHelp(){
 const [open,setOpen]=useState(()=>{try{return localStorage.getItem(key)!=='yes';}catch{return true;}});
 useEffect(()=>{try{localStorage.setItem(key,'yes');}catch{/* Help stays accessible without storage. */}},[]);
 return <details className="balance-help" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>How to play</summary><p>Keep Cdawg upright. Hold Left or Right to lean, then let go to ease off. Use the buttons, ← →, or A / D. The longer you balance, the higher your score.</p></details>;
}
