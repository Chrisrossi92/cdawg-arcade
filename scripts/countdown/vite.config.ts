import base from '../readiness/vite.config';
const diag={name:'countdown-cause-trace',enforce:'pre' as const,transform(code:string,id:string){
 const replace=(a:string,b:string)=>{if(!code.includes(a))throw Error('Missing countdown diagnostic anchor: '+id);code=code.replace(a,b);};
 if(id.endsWith('/simulationClock.ts')){
 replace("frame(now: number): 'counting' | 'ready' | 'interrupted' {","frame(now: number): 'counting' | 'ready' | 'interrupted' {const probe=(window as any).__countdownProbe;if(probe){if(probe.next!==null&&this.last!==null){probe.offset=this.last+probe.next-now;probe.next=null;}now+=probe.offset;}");
 replace('this.state = createInitialBalanceState(config);',"(window as any).__diag?.emit('CLOCK_CREATED',{ticks:this.ticks,accumulator:this.accumulator});this.state = createInitialBalanceState(config);");
 replace("if (this.last === null) { this.last = now; return 'counting'; }", "if (this.last === null) {trace('COUNTDOWN_BASELINE',{now,elapsed:this.elapsed}); this.last = now; return 'counting'; }");
 replace('const delta = now - this.last; this.last = now;',"const delta = now - this.last;trace('COUNTDOWN_FRAME',{now,previous:this.last,delta,elapsed:this.elapsed}); this.last = now;");
 }else if(id.endsWith('/BalanceExperience.tsx')){
 replace("const result = countdownClock.frame(now);", "const result = countdownClock.frame(now);trace('COUNTDOWN_RESULT',{now,result,digit:countdownClock.digit,elapsed:countdownClock.elapsed});");
 replace("if (document.hidden || result === 'interrupted') { pauseRun(); return; }", "if (document.hidden || result === 'interrupted') {trace('PAUSE_TRIGGER',{reason:document.hidden?'countdown-hidden':'countdown-frame-gap'}); pauseRun(); return; }");
 replace('    clearInput();\n    if (!isGameplayInputActive', "    trace('PAUSE_ENTRY',{phase:phaseRef.current,ticks:clockRef.current.ticks,accumulator:clockRef.current.accumulator,hidden:document.hidden,focus:document.hasFocus(),stack:new Error().stack??''});clearInput();\n    if (!isGameplayInputActive");
 replace("setRunResult(null); setPhase('playing'); return;", "setRunResult(null);trace('ACTIVE_TRANSITION',{ticks:clockRef.current.ticks,accumulator:clockRef.current.accumulator}); setPhase('playing'); return;");
 }else if(id.endsWith('/src/official/controller.ts')){
 code="const trace=(event:string,values:Record<string,unknown>={})=>(window as any).__diag?.emit(event,values);\n"+code;
 replace('interrupt(){if(this.a){',"interrupt(){trace('OFFICIAL_INTERRUPT');if(this.a){");
 }else if(id.endsWith('/interruption.ts')){
 code="const trace=(event:string,values:Record<string,unknown>={})=>(window as any).__diag?.emit(event,values);\n"+code;
 replace("const visibility = () => { if (documentTarget.hidden) pause(); };", "const visibility = () => {trace('VISIBILITY_HANDLER',{hidden:documentTarget.hidden}); if (documentTarget.hidden) pause(); };");
 replace("const blur = () => pause();", "const blur = () => {trace('BLUR_HANDLER');pause();};");
 replace("const cancel = () => clear();", "const cancel = () => {trace('POINTER_CANCEL_HANDLER');clear();};");

 }else return;
 return {code,map:null};
}};
export default {...base,root:'scripts/readiness',plugins:[...(base.plugins??[]),diag]};
