const pose=document.querySelector('#pose'),lean=document.querySelector('#lean'),motion=document.querySelector('#motion');
const preference=matchMedia('(prefers-reduced-motion: reduce)');
function send(){for(const f of document.querySelectorAll('iframe'))f.contentWindow.postMessage({type:'mascot-pose',pose:pose.value,lean:Number(lean.value),animate:motion.checked&&!preference.matches},location.origin)}
for(const e of [pose,lean,motion])e.addEventListener('input',send);
for(const f of document.querySelectorAll('iframe'))f.addEventListener('load',send);
document.querySelector('#reset').addEventListener('click',()=>{pose.value='idle_default';lean.value=0;motion.checked=false;send()});
preference.addEventListener('change',()=>{motion.checked=false;send()});
