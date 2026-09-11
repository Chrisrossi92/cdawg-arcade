// A real iframe viewport gives deterministic media-query dimensions independent
// of the desktop app panel size. This page is exclusively test tooling.
const frame=document.getElementById('candidate') as HTMLIFrameElement;
let transitions:number[]=[],pending=0;const phaseSamples:any[]=[];let previousPhase='';let run=false;
const child=()=>frame.contentDocument!;
const buttons=()=>Array.from(child().querySelectorAll<HTMLButtonElement>('button'));
document.getElementById('size')!.addEventListener('change',event=>{const [w,h]=(event.target as HTMLSelectElement).value.split(',');frame.style.width=w+'px';frame.style.height=h+'px';});
document.getElementById('enter')!.addEventListener('click',()=>{pending=performance.now();buttons().find(b=>b.textContent?.startsWith('Play practice'))?.click();});
document.getElementById('run')!.addEventListener('click',()=>{run=true;buttons().find(b=>b.textContent==='Start Game')?.click();});
document.getElementById('return')!.addEventListener('click',()=>buttons().find(b=>b.textContent==='Back to Arcade')?.click());
document.getElementById('motion')!.addEventListener('click',()=>child().querySelector<HTMLInputElement>('.arcade-settings input')?.click());
let focusOrder:string[]=[];document.getElementById('keyboard')!.addEventListener('click',()=>{focusOrder=[];child().querySelectorAll<HTMLElement>('a,button:not(:disabled),input').forEach(e=>{if(e.getBoundingClientRect().height){e.focus({preventScroll:true});focusOrder.push(e.getAttribute('aria-label')||e.textContent?.trim()||e.closest('label')?.textContent?.trim()||e.tagName);}});});
setInterval(()=>{
 const d=child();if(!d?.querySelector('h1'))return;
 if(pending&&buttons().some(b=>b.textContent==='Start Game')){transitions.push(performance.now()-pending);pending=0;}
 if(run)buttons().find(b=>b.textContent==='Resume')?.click();
 const phase=d.querySelector('.balance-v1-shell')?.className??'lobby';
 if(phase!==previousPhase){previousPhase=phase;phaseSamples.push({phase,windowHeight:d.documentElement.clientHeight,main:d.querySelector('main')?.getBoundingClientRect().toJSON(),controls:d.querySelector('.control-deck')?.getBoundingClientRect().toJSON()});}
 const rect=(e:Element)=>({width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)});
 const data={width:d.documentElement.clientWidth,height:d.documentElement.clientHeight,scrollWidth:d.documentElement.scrollWidth,route:d.querySelector('.arcade-game')?'balance':'lobby',images:Array.from(d.images).map(i=>({loaded:i.complete&&i.naturalWidth>0,...rect(i)})),targets:Array.from(d.querySelectorAll<HTMLElement>('button,a,label')).filter(e=>e.getBoundingClientRect().height&&e.getBoundingClientRect().width).map(e=>({text:e.textContent?.trim()||e.getAttribute('aria-label'),...rect(e)})),reduced:d.documentElement.dataset.arcadeReducedMotion,hostTransition:d.querySelector('.host-alternate')?frame.contentWindow!.getComputedStyle(d.querySelector('.host-alternate')!).transitionDuration:null,focus:d.activeElement?.textContent?.trim(),focusOrder,transitions,phaseSamples};
 document.getElementById('report')!.textContent=JSON.stringify(data,null,2);
},100);
