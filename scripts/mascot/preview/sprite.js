import {state,status,clock,timing} from './common.js';
async function startPreview(){
const start=performance.now(),canvas=document.querySelector('canvas'),context=canvas.getContext('2d');
const atlas=new Image();atlas.src='/cdawg-mascot-atlas-v001.png';await atlas.decode();
const loaded=performance.now()-start;const clips=['idle_default','lean_left','lean_right','panic','fall'];
function resize(){canvas.width=canvas.clientWidth*devicePixelRatio;canvas.height=320*devicePixelRatio;context.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}
new ResizeObserver(resize).observe(canvas);resize();const measure=timing();let counter=0;
function draw(t){requestAnimationFrame(draw);if(document.hidden)return;const sample=measure(t);const clip=state.pose==='lean'?(state.lean<0?'lean_left':'lean_right'):state.pose;const phase=state.pose==='lean'?Math.abs(state.lean):clock(t);const frame=Math.round(phase*7);context.clearRect(0,0,canvas.clientWidth,320);context.drawImage(atlas,frame*256,clips.indexOf(clip)*256,256,256,(canvas.clientWidth-320)/2,0,320,320);
 if(counter++%20===0)status.textContent=`Ready · ${loaded.toFixed(1)} ms load/decode\n${atlas.width} × ${atlas.height} · ${(atlas.width*atlas.height*4/1048576).toFixed(1)} MiB decoded RGBA\nrAF p50 ${sample.p50.toFixed(1)} / p95 ${sample.p95.toFixed(1)} ms · n=${sample.n}`;
}
requestAnimationFrame(draw);

}
startPreview().catch(error=>{status.textContent='Preview unavailable: '+error.message});
