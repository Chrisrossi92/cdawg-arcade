import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';
const trace="const trace=(event:string,values:Record<string,number|boolean|string|null>={})=>(window as any).__diag?.emit(event,values);\n";
export default defineConfig({root:'scripts/readiness',envDir:false,publicDir:false,plugins:[react(),{name:'local-readiness-trace',enforce:'pre',transform(code,id){
 if(!id.includes('/src/games/balance/'))return;
 const replace=(a:string,b:string)=>{if(!code.includes(a))throw Error('Diagnostic trace anchor missing');code=code.replace(a,b);};
 if(id.endsWith('/BalanceScene.ts')){
 replace('  create(): void {',"  create(): void {trace('SCENE_CREATE');let frames=0;this.game.events.on('postrender',()=>{if(frames++<6)trace('FRAME_RENDERED',{frame:frames,width:this.scale.width,height:this.scale.height,v004:this.cdawg?.ready??false,legacy:false,ticks:this.options.clock().ticks});});");
 replace('this.options.onReady();',"trace('RENDERER_READY');this.options.onReady();");
 replace('  preload(): void {',"  preload(): void {trace('PHASER_PRELOAD');this.textures.on('addtexture',()=>trace('TEXTURE_REGISTERED'));this.load.on('complete',()=>trace('PHASER_LOAD_COMPLETE'));");
 }else if(id.endsWith('/simulationClock.ts')){
 replace('this.lastTime = now; this.cursor = now;',"trace('CLOCK_FIRST',{ticks:this.ticks,accumulator:this.accumulator});this.lastTime = now; this.cursor = now;");
 replace('const delta = now - this.lastTime;',"const delta = now - this.lastTime;trace('CLOCK_FRAME',{delta,ticks:this.ticks,accumulator:this.accumulator});");
 replace('if (delta < 0 || delta > MAX_FRAME_MS + EPSILON) {',"if (delta < 0 || delta > MAX_FRAME_MS + EPSILON) {trace('CLOCK_INTERRUPTED');");
 }else if(id.endsWith('/BalanceExperience.tsx')){
 replace('const startRun = (practice = false) => {',"const startRun = (practice = false) => {trace('START_ACTIVATE');");
 replace('const countdownClock = new CountdownClock();',"trace('COUNTDOWN_START');const countdownClock = new CountdownClock();");
 replace("if (result === 'ready') {","if (result === 'ready') {trace('COUNTDOWN_COMPLETE');");
 replace('const pauseRun = () => {',"const pauseRun = () => {trace('PAUSE_POLICY');");
 replace('const cancelPreparation = () => {',"const cancelPreparation = () => {trace('PREPARATION_CANCEL');");
 replace("setRendererId(id); setPreparation('preparing');", "trace('PREPARATION_START');setRendererId(id); setPreparation('preparing');");
 }else return;
 return {code:trace+code,map:null};
}}],build:{outDir:'../../tmp/readiness/harness',emptyOutDir:true,rollupOptions:{input:'scripts/readiness/candidate.html'}}});
