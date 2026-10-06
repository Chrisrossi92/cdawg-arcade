// Explicit disposable candidate entry. Never imported by the ordinary Arcade entry.
import {createRoot} from 'react-dom/client';
import {useEffect,useState,useRef} from 'react';
import {RankedChainshift} from './RankedChainshift';
import type {RankedIdentity} from './ranked';
function Candidate(){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{const viewport=window.visualViewport;const update=()=>root.current?.style.setProperty('--candidate-height',`${viewport?.height??innerHeight}px`);update();viewport?.addEventListener('resize',update);window.addEventListener('resize',update);return()=>{viewport?.removeEventListener('resize',update);window.removeEventListener('resize',update);};},[]);
 const [identity,setIdentity]=useState<RankedIdentity|null>(null),[account,setAccount]=useState('A'),[error,setError]=useState(''),[generation,setGeneration]=useState(0);
 async function verify(next?:string){setIdentity(null);try{
  const r=await fetch('/api/local/identity',{method:next?'POST':'GET',credentials:'include',headers:{'Content-Type':'application/json','X-Arcade-Request':'1',...(next?{}:{'X-Arcade-Origin':location.origin})},...(next?{body:JSON.stringify({account:next})}: {})});
  if(!r.ok)throw new Error();const value=await r.json();setIdentity(value.identity);setAccount(value.account);setGeneration(n=>n+1);setError('');
 }catch{setError('Disposable candidate unavailable. Restart its local server.');}}
 useEffect(()=>{void verify();},[]);
 return <div ref={root} className="candidate-only"><div className="candidate-switch"><span>LOCAL FIXTURES · DISPOSABLE DATABASE</span><label>Mock verified identity <select value={account} onChange={e=>{void verify(e.target.value);}}><option value="A">Player A · Guild 1</option><option value="B">Player B · Guild 1</option><option value="A2">Player A · Guild 2</option><option value="C">Player C · Guild 1</option></select></label></div>{identity?<RankedChainshift key={generation} identity={identity} onReverify={()=>{void verify();}}/>:<p role="status">{error||'Preparing mock verified session…'}</p>}</div>;
}
const applicationRoot=createRoot(document.getElementById('root')!);applicationRoot.render(<Candidate/>);
if(import.meta.hot)import.meta.hot.dispose(()=>applicationRoot.unmount());
