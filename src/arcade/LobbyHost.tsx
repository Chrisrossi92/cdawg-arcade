import {useEffect,useRef,useState} from 'react';
import host from '../../assets/brand/arcade/runtime/cdawg-host-default-v004.webp';
import mischief from '../../assets/brand/arcade/runtime/cdawg-host-mischief-v004.webp';
import delighted from '../../assets/brand/arcade/runtime/cdawg-host-delighted-v004.webp';
/** One brief alternate, one attention cue, or an accepted-best celebration. No render loop. */
export function LobbyHost({reduced,attention,success}:{reduced:boolean;attention:number;success:boolean}){
  const [mood,setMood]=useState('default');const lastAttention=useRef(0);const attentionTimer=useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(()=>()=>clearTimeout(attentionTimer.current),[]);
  useEffect(()=>{if(reduced){setMood('default');return;}const a=setTimeout(()=>setMood(success?'success':'mischief'),success?0:6000);const b=setTimeout(()=>setMood('default'),success?1600:8200);return()=>{clearTimeout(a);clearTimeout(b);};},[reduced,success]);
  useEffect(()=>{if(!attention||reduced||Date.now()-lastAttention.current<10000)return;lastAttention.current=Date.now();setMood('attention');attentionTimer.current=setTimeout(()=>setMood('default'),1000);},[attention,reduced]);
  const special=mood==='success'?delighted:mischief;
  return <div className={`host-stage host-${mood}`}><div className="host-halo"/><div className="host-portrait" aria-hidden="true"><img src={host} alt=""/><img className="host-alternate" src={special} alt="" style={{opacity:mood==='mischief'||mood==='success'?1:0}}/></div><span className="host-note" role={success?'status':undefined}>{success?'NEW OFFICIAL BEST. NICELY DONE.':mood==='attention'?'READY FOR BALANCE?':'WELCOME TO THE CLUBHOUSE'}</span></div>;
}
