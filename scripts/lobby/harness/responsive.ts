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

const matrix:any[]=[];let matrixStatus='ready';
document.getElementById('matrix')!.addEventListener('click',async()=>{
 if(matrixStatus==='running')return;matrixStatus='running';
 const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
 const until=async(f:()=>boolean)=>{const end=performance.now()+22000;while(!f()){if(performance.now()>end)throw Error('viewport timeout');await delay(50);}};
 try{for(const [width,height]of [[1280,900],[800,600],[390,844],[375,667]]){
 frame.style.width=width+'px';frame.style.height=height+'px';await delay(300);
 const lobby={width:child().documentElement.clientWidth,scroll:child().documentElement.scrollWidth};
 document.getElementById('keyboard')!.click();document.getElementById('enter')!.click();await until(()=>buttons().some(b=>b.textContent==='Start Game'));
 buttons().find(b=>b.textContent==='Start Game')!.click();await until(()=>child().querySelector('.balance-v1-shell')?.className.includes('playing')??false);
 const controls=child().querySelector('.control-deck')!.getBoundingClientRect();const targets=buttons().filter(b=>['Left','Right'].includes(b.textContent||'')).map(b=>({height:b.getBoundingClientRect().height,width:b.getBoundingClientRect().width}));
 if(lobby.scroll>width||child().documentElement.scrollWidth>width||controls.bottom>height+1||targets.some(b=>b.height<44))throw Error('viewport bounds');
 frame.contentWindow!.dispatchEvent(new KeyboardEvent('keydown',{key:'a',code:'KeyA'}));frame.contentWindow!.dispatchEvent(new KeyboardEvent('keyup',{key:'a',code:'KeyA'}));
 const left=buttons().find(b=>b.textContent==='Left')!;const capture=left.setPointerCapture;left.setPointerCapture=()=>{};left.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,pointerType:'touch'}));left.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,pointerType:'touch'}));left.setPointerCapture=capture;
 await until(()=>buttons().some(b=>b.textContent==='Play Again'));document.getElementById('return')!.click();await until(()=>!!child().querySelector('.arcade-lobby'));
 document.getElementById('motion')!.click();await delay(100);matrix.push({width,height,lobby,controls:controls.toJSON(),targets,focusOrder:[...focusOrder],reduced:child().documentElement.dataset.arcadeReducedMotion,keyboard:true,syntheticTouch:true});}
 matrixStatus='passed';}catch(e){matrixStatus='failed: '+(e instanceof Error?e.message:'error');}
 const report=document.createElement('pre');report.id='matrix-report';report.textContent=JSON.stringify({status:matrixStatus,matrix},null,2);document.body.append(report);
});
