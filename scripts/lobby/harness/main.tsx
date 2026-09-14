// Deliberately separate test entry. Never imported by either application build.
const nativeTimeout=window.setTimeout.bind(window),nativeInterval=window.setInterval.bind(window),nativeRAF=window.requestAnimationFrame.bind(window);
const timers=new Set<number>(),intervals=new Set<number>(),frames=new Set<number>();
const t=window.setTimeout.bind(window),ct=window.clearTimeout.bind(window),i=window.setInterval.bind(window),ci=window.clearInterval.bind(window),r=window.requestAnimationFrame.bind(window),cr=window.cancelAnimationFrame.bind(window);
window.setTimeout=((fn:TimerHandler,ms?:number,...args:any[])=>{const id=t(()=>{timers.delete(id);if(typeof fn==='function')fn(...args);},ms);timers.add(id);return id;}) as typeof window.setTimeout;
window.clearTimeout=id=>{if(typeof id==='number')timers.delete(id);ct(id);};window.setInterval=((fn:TimerHandler,ms?:number,...args:any[])=>{const id=i(fn,ms,...args);intervals.add(id);return id;}) as typeof window.setInterval;
window.clearInterval=id=>{if(typeof id==='number')intervals.delete(id);ci(id);};window.requestAnimationFrame=fn=>{const id=r(now=>{frames.delete(id);fn(now);});frames.add(id);return id;};window.cancelAnimationFrame=id=>{frames.delete(id);cr(id);};
const listeners=new Map<string,Set<EventListenerOrEventListenerObject>>();for(const [label,target] of [['window',window],['document',document]] as const){const add=target.addEventListener.bind(target),remove=target.removeEventListener.bind(target);target.addEventListener=((type:string,fn:EventListenerOrEventListenerObject,options?:any)=>{const key=label+type+Boolean(typeof options==='boolean'?options:options?.capture);if(!listeners.has(key))listeners.set(key,new Set());listeners.get(key)!.add(fn);add(type,fn,options);}) as typeof target.addEventListener;target.removeEventListener=((type:string,fn:EventListenerOrEventListenerObject,options?:any)=>{listeners.get(label+type+Boolean(typeof options==='boolean'?options:options?.capture))?.delete(fn);remove(type,fn,options);}) as typeof target.removeEventListener;}
let audioOpen=0;const Audio=window.AudioContext;window.AudioContext=class extends Audio {constructor(...args:ConstructorParameters<typeof Audio>){super(...args);audioOpen++;}async close(){if(this.state!=='closed'){await super.close();audioOpen--;}}};
const transitionEvents:{event:string;ms:number;[key:string]:unknown}[]=[];
const fault={decode:0,fail:false,timeout:false,warmup:0,active:0};
(window as any).__diag={emit:(event:string,values:Record<string,unknown>={})=>{
 transitionEvents.push({event,ms:Math.round(performance.now()*10)/10,...values});
 if(transitionEvents.length>6000)transitionEvents.shift();
 const stall=event==='SCENE_CREATE'?fault.warmup:event==='CLOCK_FIRST'?fault.active:0;
 if(stall){if(event==='CLOCK_FIRST'){fault.active=0;nativeTimeout(()=>{const end=performance.now()+stall;while(performance.now()<end){};},0);}else{fault.warmup=0;const end=performance.now()+stall;while(performance.now()<end){};}}
}};
const trace=(event:string,values:Record<string,unknown>={})=>(window as any).__diag.emit(event,values);
const {default:Phaser}=await import('phaser');
const image=Phaser.Loader.FileTypes.ImageFile.prototype,processImage=image.onProcess,loadImage=image.load;
image.onProcess=function(){trace('IMAGE_PROCESS_START');if(fault.timeout)return;const delay=fault.decode;if(delay)nativeTimeout(()=>{if(this.loader)processImage.call(this);},delay);else processImage.call(this);};
image.load=function(){if(fault.fail)this.url='/missing-reconciliation.webp';return loadImage.call(this);};
const [{createRoot},{ArcadeApp},{ArcadeRuntime},{OfficialController},{OfficialClient},{makeDefaultLocalContext},{MemoryScoreRepository}]=await Promise.all([import('react-dom/client'),import('../../../src/arcade/ArcadeApp'),import('../../../src/arcade/runtime'),import('../../../src/official/controller'),import('../../../src/official/client'),import('../../../src/platform/hostAdapter'),import('../../../src/services/scoreRepository')]);
let scenario='practice',context=makeDefaultLocalContext(),auth=0,attempts=0,submissions=0,cancels=0,reads=0,accepted=0,practiceResults=0,resumes=0,errors:string[]=[],status='ready';const hostListeners=new Set<any>();
const host={environment:'discord' as const,getContext:()=>context,subscribe:(f:any)=>{hostListeners.add(f);f(context);return()=>hostListeners.delete(f);},requestAuthentication:async()=>{auth++;return context;},continuePractice:()=>choose('practice'),dispose:()=>{},closeActivity:async()=>{},inviteOrShareActivity:async()=>{}};
const fetcher:typeof fetch=async(input,options)=>{const path=String(input),body=options?.body?JSON.parse(String(options.body)):{};let value:any={};if(options?.method==='GET')reads++;if(scenario==='expired')return Response.json({error:'expired_session'},{status:401});if(scenario==='stats-error'&&path.endsWith('/stats'))return Response.json({error:'unavailable'},{status:503});
 if(path.endsWith('/me'))value={status:'verified',player:{id:'fixture-player'},guild:{id:'fixture-guild'},csrf:'x'.repeat(43),officialAvailability:scenario==='other-server'?'other-server':scenario==='unavailable'?'unavailable':'eligible'};
 else if(path.endsWith('/stats'))value={acceptedCount:scenario==='empty'?'0':String(submissions),averageSeconds:'0',best:scenario==='empty'||!submissions?null:{ticks:60,attemptId:'fixture-accepted'}};
 else if(path.endsWith('/leaderboard')){if(scenario==='board-error')return Response.json({error:'private_internal_failure'},{status:503});value={entries:submissions&&scenario!=='empty'?[{playerTag:'fixture',displayName:'Fixture Player',ticks:60,rank:'1',isYou:true}]:[],ownEntry:null,record:null};}
 else if(path.endsWith('/submit')){submissions++;trace('SUBMIT',{ticks:body.evidence.ticks,interruptions:body.evidence.interruptions});if(body.evidence.interruptions)practiceResults++;else accepted++;value={attemptId:body.attemptId,disposition:body.evidence.interruptions?'practice':'accepted',ticks:body.evidence.ticks,reason:'fixture',personalBest:submissions===1};}
 else if(path.endsWith('/cancel'))cancels++;
 else if(path.endsWith('/attempts')&&options?.method==='POST'){trace('ATTEMPT_ISSUED');value={attemptId:`fixture-${++attempts}`,rulesetId:'balance-replay-v1',tickRate:60,maxTicks:18000,retryDeadline:new Date(Date.now()+60000).toISOString()};}
 else if(path.endsWith('/attempts'))value={attempts:[]};
 return Response.json(value);
};
const runtime=new ArcadeRuntime(host,new MemoryScoreRepository(),new OfficialController(new OfficialClient(fetcher,location.origin)));
function choose(value:string){scenario=value;context=makeDefaultLocalContext();hostListeners.forEach(f=>f(context));if(!['practice','auth-error'].includes(value))context={...context,environment:'discord',authenticated:true,arcadeSessionState:'verified',connectionState:'discord-authenticated',currentUser:{id:'fixture-player',displayName:'Fixture Player'},guildId:'fixture-guild'};if(value==='auth-error')context={...context,connectionState:'discord-error',connectionError:'timeout'};hostListeners.forEach(f=>f(context));}
createRoot(document.getElementById('root')!).render(<ArcadeApp runtime={runtime}/>);
document.getElementById('scenario')!.addEventListener('change',e=>choose((e.target as HTMLSelectElement).value));document.getElementById('back')!.addEventListener('click',()=>history.back());
window.addEventListener('error',()=>errors.push('page error'));window.addEventListener('unhandledrejection',()=>errors.push('unhandled rejection'));
const sleep=(ms:number)=>new Promise<void>(resolve=>nativeTimeout(resolve,ms));
const button=(name:string)=>Array.from(document.querySelectorAll<HTMLButtonElement>('#root button')).find(b=>b.textContent?.replace('→','').trim()===name&&!b.disabled);
async function until(test:()=>boolean,ms=20000){const end=performance.now()+ms;while(!test()){if(performance.now()>end)throw Error('bounded wait expired');await sleep(50);}}
const samples:any[]=[];let initialResources:any[]=[];let frameTimes:number[]=[];let last=0;const frame=(now:number)=>{if(last)frameTimes.push(now-last);last=now;if(frameTimes.length<600)nativeRAF(frame);};nativeRAF(frame);
const snapshot=()=>({timers:timers.size,intervals:intervals.size,frames:frames.size,listeners:Array.from(listeners.values()).reduce((n,s)=>n+s.size,0),audioOpen,canvases:document.querySelectorAll('canvas').length,hostListeners:hostListeners.size,auth,attempts,submissions,cancels,reads,accepted,practiceResults,resumes,heap:(performance as any).memory?.usedJSHeapSize??null});
nativeTimeout(()=>{initialResources=performance.getEntriesByType('resource').map((e:any)=>({name:e.name.split('/').pop(),bytes:e.encodedBodySize,duration:e.duration}));},3000);
nativeInterval(()=>{if(location.search.includes('buffered=1'))return;const sorted=[...frameTimes].sort((a,b)=>a-b);document.getElementById('metrics')!.textContent=JSON.stringify({status,scenario,route:runtime.destination,phase:runtime.phase,official:runtime.official.view.phase,current:snapshot(),samples,reconciliation,transitionEvents,errors,frame:{count:sorted.length,p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)},initialResources},null,2);},500);
document.getElementById('soak')!.addEventListener('click',async()=>{if(status==='running')return;status='running';try{choose('official');await until(()=>!!button('Play Balance'));await sleep(8500);samples.push({stage:'initial',...snapshot()});
 for(let cycle=0;cycle<20;cycle++){button('Play Balance')!.click();await until(()=>!!button('Start Game'));button('Start Game')!.click();await until(()=>runtime.phase==='countdown');await sleep(100);button('Leave run · Back to Arcade')!.click();await until(()=>!!button('Play Balance'));await sleep(80);if([0,9,19].includes(cycle))samples.push({stage:`cancel-${cycle+1}`,...snapshot()});}
 async function completeRun(){await until(()=>{const resume=button('Resume');if(resume){resumes++;resume.click();}return runtime.phase==='results';},40000);await until(()=>['accepted','nonqualifying'].includes(runtime.official.view.phase));}
 for(let cycle=0;cycle<3;cycle++){button('Play Balance')!.click();await until(()=>!!button('Start Game'));button('Start Game')!.click();await completeRun();if(cycle===0){button('Play Again')!.click();await until(()=>runtime.phase!=='results');await completeRun();}button('Back to Arcade')!.click();await until(()=>!!button('Play Balance'));await sleep(8500);samples.push({stage:`completed-${cycle+1}`,...snapshot()});}
 for(let cycle=0;cycle<30;cycle++){button('Play Balance')!.click();await until(()=>!!button('Start Game'));button('Back to Arcade')!.click();await until(()=>!!button('Play Balance'));}
 await sleep(8500);samples.push({stage:'final',...snapshot()});if(snapshot().listeners!==samples[0].listeners||timers.size||intervals.size||frames.size)throw Error('resource cleanup mismatch');if(errors.length||audioOpen||document.querySelectorAll('canvas').length||hostListeners.size!==1||auth!==1||attempts!==24||submissions!==4||cancels!==20||accepted<1)throw Error('lifecycle count mismatch');status='passed';
 }catch(e){status='failed: '+(e instanceof Error?e.message:'test error');}});

const reconciliation:any[]=[];
const profileOnly=location.search.includes('profile=1');
const isolatedCase=new URLSearchParams(location.search).get('case');
document.getElementById('reconcile')!.addEventListener('click',async()=>{
 if(status==='running')return;status='running';
 const check=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
 const hidden=()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));};
 const resetFault=()=>Object.assign(fault,{decode:0,fail:false,timeout:false,warmup:0,active:0});
 const leave=async()=>{if(runtime.destination==='balance'){await until(()=>!!button('Back to Arcade')||!!button('Leave run · Back to Arcade'));(button('Back to Arcade')||button('Leave run · Back to Arcade'))!.click();}await until(()=>runtime.destination==='lobby');await sleep(150);};
 const enter=async()=>{await until(()=>!!button('Play Balance')||!!button('Play practice'));(button('Play Balance')||button('Play practice'))!.click();await until(()=>!!button('Start Game'));};
 try{
 choose('official');await until(()=>runtime.official.view.phase==='eligible');await sleep(8500);
 const baseline=snapshot();hidden();check(runtime.destination==='lobby','hidden lobby navigation');
 for(const spec of [{name:'cold'},{name:'warm'},{name:'decode-5000',decode:5000},...[100,250,1000,5000].map(warmup=>({name:'warmup-'+warmup,warmup})),{name:'preparation-blur',decode:500},{name:'preparation-hidden',decode:500},{name:'countdown-hidden'},{name:'active-hidden'},{name:'countdown-blur'},{name:'active-stall',active:250},{name:'active-blur'},{name:'reduced-motion'},{name:'play-again'}].filter(s=>isolatedCase?s.name===isolatedCase:!profileOnly||['cold','warm'].includes(s.name))){
 resetFault();Object.assign(fault,spec);transitionEvents.length=0;const issued=attempts,sent=submissions;
 if(spec.name==='reduced-motion')(document.querySelector('.arcade-settings input') as HTMLInputElement).click();
 await enter();button('Start Game')!.click();
 if(spec.name==='preparation-hidden')hidden();
 if(spec.name==='preparation-blur'){window.dispatchEvent(new Event('blur'));document.dispatchEvent(new Event('visibilitychange'));}
 await until(()=>runtime.phase==='countdown'||!!button('Play without sound'));
 if(button('Play without sound')){
  check(spec.name==='warmup-5000'||spec.name==='decode-5000','unexpected audio degradation');
  check(attempts===issued&&submissions===sent,'issuance before degraded-audio choice');
  trace('DEGRADED_AUDIO_CONFIRMED');button('Play without sound')!.click();
  await until(()=>runtime.phase==='countdown');
 }
 if(spec.name==='countdown-hidden'){hidden();await until(()=>!!button('Resume'));button('Resume')!.click();}
 if(spec.name==='countdown-blur'){window.dispatchEvent(new Event('blur'));await until(()=>!!button('Resume'));button('Resume')!.click();}
 await until(()=>runtime.phase==='playing'||runtime.phase==='results');
 if(spec.name==='active-hidden'&&runtime.phase==='playing')hidden();
 if(spec.name==='active-blur'&&runtime.phase==='playing')window.dispatchEvent(new Event('blur'));
 await until(()=>!!button('Resume')||runtime.phase==='results');
 const interrupted=spec.name==='active-stall'||spec.name==='active-blur'||spec.name==='countdown-blur'||spec.name==='countdown-hidden'||spec.name==='active-hidden';
 check(!!button('Resume')===(interrupted&&!spec.name.startsWith('countdown')),'unexpected interruption '+spec.name);
 if(button('Resume'))button('Resume')!.click();
 await until(()=>runtime.phase==='results');await until(()=>['accepted','nonqualifying'].includes(runtime.official.view.phase));
 if(spec.name==='play-again'){button('Play Again')!.click();await until(()=>runtime.phase!=='results');await until(()=>runtime.phase==='results');await until(()=>runtime.official.view.phase==='accepted');}
 const e=[...transitionEvents],ready=e.findIndex(x=>x.event==='RENDERER_READY'),issue=e.findIndex(x=>x.event==='ATTEMPT_ISSUED'),countdown=e.findIndex(x=>x.event==='COUNTDOWN_START');
 const composite=e.findIndex(x=>x.event==='COMPOSITE_READY');
 check(ready>=0&&composite>ready&&issue>composite&&countdown>issue,'composite readiness ordering');
 check(e.filter(x=>x.event==='FRAME_RENDERED').every(x=>x.v004&&!x.legacy),'non-V004 frame');
 // Initial gameplay excludes preparation/countdown; Resume preserves accepted ticks.
 let expectedTicks:unknown=0;
 for(const event of e){
  if(event.event==='PREPARATION_START')expectedTicks=0;
  if(event.event==='PAUSE_POLICY')expectedTicks=event.ticks;
  if(event.event==='CLOCK_FIRST'){
   check(typeof expectedTicks==='number'&&event.ticks===expectedTicks&&event.accumulator===0,'clock baseline/resume preservation');
   expectedTicks=null;
  }
 }
 check(e.filter(x=>x.event==='SUBMIT').every(x=>x.ticks===42&&x.interruptions===(interrupted?1:0)),'replay fixture');
 check(attempts-issued===(spec.name==='play-again'?2:1)&&submissions-sent===attempts-issued,'duplicate action');
 await leave();const deltas=e.filter(x=>x.event==='CLOCK_FRAME').map(x=>Number(x.delta)).sort((a,b)=>a-b);reconciliation.push({name:spec.name,frameTiming:{count:deltas.length,p50:deltas[Math.floor(deltas.length*.5)],p95:deltas[Math.floor(deltas.length*.95)],max:deltas.at(-1)},events:e.filter(x=>x.event!=='CLOCK_FRAME'),resources:snapshot()});
 }
 for(const mode of ['failure','timeout','cancel','rapid-back','identity-loss'].filter(()=>!profileOnly&&!isolatedCase)){
 resetFault();choose('official');await until(()=>runtime.official.view.phase==='eligible');const issued=attempts;
 Object.assign(fault,mode==='failure'?{fail:true}:mode==='timeout'?{timeout:true}:{decode:1500});
 await enter();transitionEvents.length=0;button('Start Game')!.click();
 if(mode==='failure'||mode==='timeout'){
 await until(()=>!!button('Retry'),18000);check(attempts===issued,'attempt before failure');
 if(mode==='failure'){button('Retry')!.click();await sleep(150);await until(()=>!!button('Retry'));button('Retry')!.click();await sleep(150);await until(()=>!button('Retry')&&!!button('Back'));}
 button('Back')!.click();await leave();
 }else if(mode==='identity-loss'){choose('practice');await until(()=>runtime.destination==='lobby');await sleep(1800);check(attempts===issued,'stale identity issuance');}
 else{await leave();await sleep(1800);check(attempts===issued,'stale canceled issuance');if(mode==='rapid-back'){resetFault();await enter();await leave();}}
 resetFault();reconciliation.push({name:mode,events:[...transitionEvents].filter(x=>x.event!=='CLOCK_FRAME'),resources:snapshot()});
 }
 for(const mode of ['stats-error','board-error','expired','practice'].filter(()=>!profileOnly&&!isolatedCase)){choose(mode);await sleep(200);await runtime.refresh();if(mode==='practice')check(!runtime.official.view.stats&&!runtime.official.view.board,'private practice data');reconciliation.push({name:mode,phase:runtime.official.view.phase,resources:snapshot()});}
 choose('official');await sleep(8500);const final=snapshot();
 check(final.listeners===baseline.listeners&&!final.timers&&!final.intervals&&!final.frames&&!final.audioOpen&&!final.canvases&&final.hostListeners===1&&final.auth===1,'final resource growth');
 check(!errors.length,'page errors');reconciliation.push({name:'settled',baseline,final});status='reconciliation passed';
 }catch(e){status='failed: '+(e instanceof Error?e.message:'test error');}
});

document.getElementById('rapid')!.addEventListener('click',async()=>{
 if(status==='running')return;status='running';try{
 choose('official');await until(()=>!!button('Play Balance'));await sleep(8500);const baseline=snapshot();Object.assign(fault,{decode:1500});
 for(let cycle=0;cycle<10;cycle++){
 button('Play Balance')!.click();await until(()=>!!button('Start Game'));button('Start Game')!.click();await sleep(30);button('Back to Arcade')!.click();await until(()=>!!button('Play Balance'));
 }
 await sleep(8500);fault.decode=0;const final=snapshot();samples.push({stage:'rapid-baseline',...baseline},{stage:'rapid-final',...final});
 if(final.attempts!==baseline.attempts||final.submissions!==baseline.submissions||final.listeners!==baseline.listeners||final.timers||final.intervals||final.frames||final.canvases||final.audioOpen||errors.length)throw Error('rapid cancellation leak');status='rapid cancellation passed';
 }catch(e){status='failed: '+(e instanceof Error?e.message:'test error');}
});
