import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';
const trace="const trace=(event:string,values:Record<string,number|boolean|string|null>={})=>(window as any).__diag?.emit(event,values);\n";
export default defineConfig({root:'scripts/readiness',envDir:false,publicDir:false,plugins:[react(),{name:'local-readiness-trace',enforce:'pre',transform(code,id){
 if(!id.includes('/src/games/balance/')&&!id.endsWith('/src/services/audioManager.ts'))return;
 const replace=(a:string,b:string)=>{if(!code.includes(a))throw Error('Diagnostic trace anchor missing');code=code.replace(a,b);};
 if(id.endsWith('/audioManager.ts')){
 replace('  prepare(): Promise<AudioReadiness> {', "  prepare(): Promise<AudioReadiness> {trace('AUDIO_PREPARE');");
 replace('const oscillator = context.createOscillator();', "trace('AUDIO_NODE_CREATED');const oscillator = context.createOscillator();");
 replace('const resumed = context.resume();', "trace('AUDIO_RESUME_START');const resumed = context.resume();");
 replace('if (context.state !== \'running\') throw', "trace('AUDIO_RESUMED');if (context.state !== 'running') throw");
 replace('this.playable = result === \'ready\';', "trace('AUDIO_SETTLED',{result});this.playable = result === 'ready';");
 replace('if (settled) return;\n        settle(performance.now()', "if (settled) return;trace('AUDIO_WARMED');\n        settle(performance.now()");
 replace('    if (this.disposed || !this.playable) return;', "trace('AUDIO_CUE',{playable:this.playable});if (this.disposed || !this.playable) return;");
 }else if(id.endsWith('/BalanceScene.ts')){
 replace('  create(): void {',"  create(): void {trace('SCENE_CREATE');let frames=0;this.game.events.on('postrender',()=>{if(frames++<6)trace('FRAME_RENDERED',{frame:frames,width:this.scale.width,height:this.scale.height,v004:this.cdawg?.ready??false,legacy:false,ticks:this.options.clock().ticks,accumulator:this.options.clock().accumulator});});");
 replace('this.options.onReady();',"trace('RENDERER_READY');this.options.onReady();");
 replace('  preload(): void {',"  preload(): void {trace('PHASER_PRELOAD');this.textures.on('addtexture',()=>trace('TEXTURE_REGISTERED'));this.load.on('complete',()=>trace('PHASER_LOAD_COMPLETE'));");
 }else if(id.endsWith('/simulationClock.ts')){
 replace('this.lastTime = now; this.cursor = now;',"trace('CLOCK_FIRST',{ticks:this.ticks,accumulator:this.accumulator});this.lastTime = now; this.cursor = now;");
 replace('const delta = now - this.lastTime;',"const delta = now - this.lastTime;trace('CLOCK_FRAME',{delta,ticks:this.ticks,accumulator:this.accumulator});");
 replace('if (delta < 0 || delta > MAX_FRAME_MS + EPSILON) {',"if (delta < 0 || delta > MAX_FRAME_MS + EPSILON) {trace('CLOCK_INTERRUPTED');");
 }else if(id.endsWith('/BalanceExperience.tsx')){
 replace('  const previousScoreRef = useRef(0);', "(window as any).__diag.clockSnapshot=()=>({ticks:rendererClockRef.current.ticks,accumulator:rendererClockRef.current.accumulator,phase:phaseRef.current});const previousScoreRef = useRef(0);");
 replace("    clearPreparationTimer();\n    if (audioResult", "    trace('COMPOSITE_READY',{audio:audioResult});clearPreparationTimer();\n    if (audioResult");
 replace('const startRun = (practice = false) => {',"const startRun = (practice = false) => {trace('START_ACTIVATE');");
 replace('const countdownClock = new CountdownClock();',"trace('COUNTDOWN_START');const countdownClock = new CountdownClock();");
 replace("if (result === 'ready') {","if (result === 'ready') {trace('COUNTDOWN_COMPLETE');");
 replace('const pauseRun = () => {',"const pauseRun = () => {trace('PAUSE_POLICY',{ticks:clockRef.current.ticks});");
 replace('const cancelPreparation = () => {',"const cancelPreparation = () => {trace('PREPARATION_CANCEL');");
 replace("setRendererId(id); setPreparation('preparing');", "trace('PREPARATION_START');setRendererId(id); setPreparation('preparing');");
 }else return;
 return {code:trace+code,map:null};
}}],build:{outDir:'../../tmp/readiness/harness',emptyOutDir:true,rollupOptions:{input:'scripts/readiness/candidate.html'}}});
