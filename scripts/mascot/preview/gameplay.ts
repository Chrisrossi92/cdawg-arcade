import Phaser from 'phaser';
import {CdawgRig,getCdawgPoseForBalance} from '../../../src/games/balance/CdawgRig';
import {BalanceScene} from '../../../src/games/balance/BalanceScene';
import {SimulationClock} from '../../../src/games/balance/simulationClock';
import {balanceConfig} from '../../../src/games/balance/config';
import {SpriteMascot,preloadMascot} from '../../../src/games/balance/mascot/SpriteMascot';
const status=document.querySelector('#status')!,metrics=document.querySelector('#metrics')!;
const reduced=document.querySelector<HTMLInputElement>('#reduced')!;
let game:Phaser.Game|undefined,clock:SimulationClock|undefined,active='none';
const deltas:number[]=[],cpu:number[]=[];
function percentile(a:number[],q:number){const s=[...a].sort((a,b)=>a-b);return s[Math.floor((s.length-1)*q)]??0}
function publish(extra:object){metrics.textContent=JSON.stringify({mode:active,samples:deltas.length,frameIntervalMs:{p50:percentile(deltas,.5),p95:percentile(deltas,.95)},cpuUpdateMs:{p50:percentile(cpu,.5),p95:percentile(cpu,.95)},canvas:[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height})),...extra},null,2)}
function start(mode:string){game?.destroy(true);active=mode;deltas.length=0;cpu.length=0;clock=new SimulationClock(balanceConfig);const runClock=clock;const activeDeltas:number[]=[],activeCpu:number[]=[];let firstSpriteTick:number|null=null;let fixedAt:number|null=null,callbackAt:number|null=null,finalTicks=0,finalScore=0,stopped=false,startTime=0;
class Gameplay extends BalanceScene {
 create(){
  if(mode==='slow'){const begin=this.load.start.bind(this.load);this.load.start=()=>this.load;super.create();this.time.delayedCall(5000,()=>{this.load.start=begin;begin()})}
  else super.create();
 }
 constructor(){super({clock:runClock,configRef:{current:balanceConfig},onPause:()=>{runClock.resume()},onTick:()=>{},onGameOver:(score)=>{callbackAt=performance.now();finalScore=score;status.textContent=`Result fixed · ${score.toFixed(1)}s · recovery continues without changing the score.`}})}
 update(t:number,d:number){const before=performance.now();if(!startTime)startTime=before;
  if((mode==='auto'||mode==='slow')&&!runClock.finished){const prediction=runClock.state.tilt+runClock.state.angularVelocity*.30;runClock.input(before-startTime<6000?(prediction>0?'left':'right'):'left',before)}
  this.cdawg.reducedOverride=reduced.checked;super.update(t,d);
  if(this.cdawg.ready&&firstSpriteTick===null)firstSpriteTick=runClock.ticks;
  if(!runClock.finished){activeDeltas.push(d);activeCpu.push(performance.now()-before)}
  if(runClock.finished&&fixedAt===null){fixedAt=performance.now();finalTicks=runClock.ticks}
  deltas.push(d);cpu.push(performance.now()-before);if(deltas.length>600){deltas.shift();cpu.shift()}
  if(!runClock.finished)status.textContent=`${mode==='auto'?'Automated practice':'Practice'} · ${(runClock.state.survivalMs/1000).toFixed(1)}s · ${this.cdawg.motion.mood}`;
  if(runClock.finished&&runClock.ticks!==finalTicks)throw Error('Finished clock advanced');
  if(Math.floor(t/100)%2===0)publish({activeSamples:activeDeltas.length,activeFrameIntervalMs:{p50:percentile(activeDeltas,.5),p95:percentile(activeDeltas,.95)},activeCpuUpdateMs:{p50:percentile(activeCpu,.5),p95:percentile(activeCpu,.95)},firstSpriteTick,atlasReady:this.cdawg.ready,ticks:runClock.ticks,finished:runClock.finished,failed:runClock.state.failed,score:finalScore,resultCallbackDelayMs:callbackAt!==null&&fixedAt!==null?callbackAt-fixedAt:null,lean:this.cdawg.motion.lean,phase:this.cdawg.motion.phase,mood:this.cdawg.motion.mood,lossBeforeFixed:this.cdawg.motion.finished&&!runClock.finished});
 }
}
class Sweep extends Phaser.Scene {
 mascot!:SpriteMascot;old!:CdawgRig;elapsed=0;preload(){if(mode!=='legacy')preloadMascot(this)}create(){if(mode==='legacy')this.old=new CdawgRig(this,this.scale.width/2,this.scale.height*.67-93);else this.mascot=new SpriteMascot(this);this.add.rectangle(this.scale.width/2,this.scale.height*.67,Math.min(this.scale.width*.72,460),12,0xb87940)}
 update(_t:number,d:number){const before=performance.now();this.elapsed+=Math.min(d,50);const t=this.elapsed/1000;
  const balance=t<8?Math.sin(t*Math.PI/2)*.97:t<12?(Math.sin(t*18)>.0?.61:.59):t<16?Math.sin(t*4)*.97:.98;
  if(mode==='legacy'){const scale=Math.min(1,(this.scale.height*.67-14)/190);this.old.setPosition(this.scale.width/2,this.scale.height*.67-6-93*scale).setScale(scale).setAngle(balance*34*.74);this.old.applyPose(getCdawgPoseForBalance(balance*34,Math.abs(balance),t>=18),Math.abs(balance))}
  else {this.mascot.reducedOverride=reduced.checked;this.mascot.draw({balance,finished:t>=18,failed:true},d,this.scale.width/2,this.scale.height*.67-6,Math.min(1,(this.scale.height*.67-14)/190),balance*34);}
  deltas.push(d);cpu.push(performance.now()-before);if(deltas.length>600){deltas.shift();cpu.shift()}
  status.textContent=t<18?'Motion review · reversal, threshold noise and shared secondary phase':'Motion review · fixed loss, recovery and result';publish({elapsedMs:this.elapsed,balance,lean:this.mascot?.motion.lean,phase:this.mascot?.motion.phase,mood:this.mascot?.motion.mood,finished:this.mascot?.motion.finished,reduced:reduced.checked});
 }
}
const host=document.querySelector<HTMLElement>('#stage')!;game=new Phaser.Game({type:Phaser.AUTO,parent:host,width:host.clientWidth,height:host.clientHeight,scale:{mode:Phaser.Scale.RESIZE},backgroundColor:'#090a12',audio:{noAudio:true},banner:false,scene:(mode==='sweep'||mode==='legacy')?Sweep:new Gameplay()});
}
for(const id of ['play','auto','sweep','legacy','slow'])document.querySelector('#'+id)!.addEventListener('click',()=>start(id));
for(const dir of ['left','right'] as const){const button=document.querySelector('#'+dir)!;button.addEventListener('pointerdown',()=>clock?.input(dir,performance.now()));for(const type of ['pointerup','pointercancel','pointerleave'])button.addEventListener(type,()=>clock?.input('none',performance.now()))}
window.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();clock?.input(e.key==='ArrowLeft'?'left':'right',performance.now())}});window.addEventListener('keyup',()=>clock?.input('none',performance.now()));
