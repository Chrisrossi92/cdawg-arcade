import {describe,it,expect} from 'vitest';
import {MascotMotion, LOSS_MS} from './motion';
import {SimulationClock} from '../simulationClock';
import {balanceConfig} from '../config';
const sample=(balance:number,finished=false,failed=false)=>Object.freeze({balance,finished,failed});
describe('cosmetic mascot motion',()=>{
 it('tracks balance continuously and reverses without resetting velocity or phase',()=>{
  const m=new MascotMotion();for(let i=0;i<30;i++)m.advance(sample(.8),1000/60);
  const before={lean:m.lean,phase:m.phase};m.advance(sample(-.8),1000/60);
  expect(m.lean).toBeGreaterThan(.65);expect(m.phase).not.toBe(before.phase);
  let last=m.lean,maxStep=0;for(let i=0;i<40;i++){m.advance(sample(-.8),1000/60);maxStep=Math.max(maxStep,Math.abs(m.lean-last));last=m.lean}
  expect(m.lean).toBeCloseTo(-.8,3);expect(maxStep).toBeLessThan(.26);
 });
 it('uses hysteresis and dwell instead of flickering at thresholds',()=>{
  const m=new MascotMotion();for(let i=0;i<20;i++)m.advance(sample(.67),16);
  expect(m.mood).toBe('wobble');for(let i=0;i<100;i++){m.advance(sample(i%2?.59:.61),16);expect(m.mood).toBe('wobble')}
  for(let i=0;i<20;i++)m.advance(sample(.4),16);expect(m.mood).toBe('lean');
  for(let i=0;i<20;i++)m.advance(sample(.95),16);expect(m.mood).toBe('panic');
  for(let i=0;i<20;i++)m.advance(sample(.1),16);expect(m.mood).toBe('lean');
  for(let i=0;i<20;i++)m.advance(sample(.03),16);expect(m.mood).toBe('idle');
 });
 it('never falls on balance alone, then latches the fixed outcome and preserves result timing',()=>{
  const m=new MascotMotion();for(let i=0;i<100;i++){const f=m.advance(sample(1),16);expect(f.every(x=>x.name.startsWith('balance'))).toBe(true)}
  m.advance(sample(-1,true,true),16);expect(m.side).toBe(-1);
  for(let i=0;i<22;i++)m.advance(sample(1,false,false),16);
  expect(m.finished).toBe(true);expect(m.failed).toBe(true);expect(m.side).toBe(-1);expect(m.elapsed).toBeLessThanOrEqual(LOSS_MS);
  const frames=m.advance(sample(0),16);expect(frames.some(f=>f.name.startsWith('recover--1'))).toBe(true);
 });
 it('emits bounded valid normalized weights, including phase wrap and terminal transitions',()=>{
  for(const direction of [-1,1]){const m=new MascotMotion();for(let i=0;i<600;i++){
   const frames=m.advance(sample(Math.sin(i/21),i>=300,true),1000/60);
   expect(frames.length).toBeLessThanOrEqual(5);expect(frames.reduce((s,f)=>s+f.weight,0)).toBeCloseTo(1,10);
   for(const f of frames){expect(f.weight).toBeGreaterThanOrEqual(0);expect(f.name).not.toMatch(/NaN|undefined/)}
  }const result=new MascotMotion({side:direction,failed:true});expect(result.advance(sample(0),0)[0].name).toBe(`recover-${direction}-00`)}
 });
 it('reduced motion freezes secondary animation but retains readable lean and result poses',()=>{
  const m=new MascotMotion();for(let i=0;i<100;i++)m.advance(sample(.75),16,true);expect(m.phase).toBe(0);expect(m.lean).toBeCloseTo(.75,3);
  const f=m.advance(sample(.75,true,true),16,true);expect(f).toEqual([{name:'recover-1-30',weight:1}]);
 });
 it('keeps terminal presentation on elapsed time after a long frame and handles a successful result',()=>{
  const loss=new MascotMotion();loss.advance(sample(1,true,true),16);
  const landed=loss.advance(sample(1,true,true),400);
  expect(landed.every(f=>f.name.startsWith('recover-1-'))).toBe(true);
  const success=new MascotMotion();success.advance(sample(.4),16);
  for(let i=0;i<60;i++){
   const frames=success.advance(sample(.4,true,false),16);
   expect(frames.some(f=>f.name.startsWith('fall'))).toBe(false);
   expect(frames.reduce((n,f)=>n+f.weight,0)).toBeCloseTo(1,10);
  }
  expect(success.advance(sample(0),16)[0].name).toBe('result-24');
 });
 it('is stable under different render cadences and non-finite presentation deltas',()=>{
  const end=[];for(const hz of [30,60,120,144]){const m=new MascotMotion();for(let i=0;i<hz;i++)m.advance(sample(.7),1000/hz);end.push(m.lean)}
  expect(Math.max(...end)-Math.min(...end)).toBeLessThan(.00001);
  const m=new MascotMotion();for(const dt of [NaN,Infinity,-2,1e9]){const f=m.advance(sample(NaN),dt);expect(Number.isFinite(m.lean)).toBe(true);expect(f.length).toBeGreaterThan(0)}
 });
 it('cannot change deterministic ticks, score state, finish, or input trace',()=>{
  const a=new SimulationClock(balanceConfig),b=new SimulationClock(balanceConfig),m=new MascotMotion();
  for(let i=0;i<600;i++){const t=i*1000/60;if(i%9===0){const dir=i%18?'left':'right';a.input(dir,t);b.input(dir,t)}
   a.frame(t,balanceConfig);b.frame(t,balanceConfig);
   m.advance(sample(b.state.tilt/balanceConfig.failureAngle,b.finished,b.state.failed),[8,16,33,50][i%4]);
   expect(b.state).toEqual(a.state);expect(b.ticks).toBe(a.ticks);expect(b.finished).toBe(a.finished);
  }
 });
});
