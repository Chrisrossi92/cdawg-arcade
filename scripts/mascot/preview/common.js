export const state={pose:'idle_default',lean:0,animate:false};
export const status=document.querySelector('.metrics');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='mascot-pose')return; if(['idle_default','lean','panic','fall'].includes(e.data.pose))state.pose=e.data.pose;state.lean=Math.max(-1,Math.min(1,Number(e.data.lean)||0));state.animate=e.data.animate===true&&!reduced.matches});
reduced.addEventListener('change',()=>state.animate=false);
export function clock(t){return state.animate?(t/1000)%1:state.pose==='idle_default'?0:1}
export function timing(){const samples=[];let prev=0;return t=>{if(prev&&document.visibilityState==='visible')samples.push(t-prev);prev=t;if(samples.length>300)samples.shift();const s=[...samples].sort((a,b)=>a-b);return {n:s.length,p50:s[Math.floor(s.length*.5)]??0,p95:s[Math.floor(s.length*.95)]??0}}}
