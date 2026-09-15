import {describe,it,expect} from 'vitest';
import {HeldControls,observeInterruptions} from './interruption';
import {SimulationClock} from './simulationClock';
import {balanceConfig} from './config';
describe('mobile interruption lifecycle',()=>{
 it.each(['pagehide','freeze'])('%s clears multiple fingers and does not resume scoring',event=>{
  const win=new EventTarget(),doc=Object.assign(new EventTarget(),{hidden:false});
  const held=new HeldControls(),clock=new SimulationClock(balanceConfig);let pauses=0;
  const clear=()=>{held.clear();clock.clearInput();};
  const stop=observeInterruptions(win,doc,()=>{pauses++;clear();clock.pause();},clear);
  held.press('pointer:1','left');held.press('pointer:2','right');
  (event==='freeze'?doc:win).dispatchEvent(new Event(event));
  expect(held.direction).toBe('none');expect(clock.paused).toBe(true);
  const ticks=clock.ticks;clock.frame(60000,balanceConfig);expect(clock.ticks).toBe(ticks);
  win.dispatchEvent(new Event('pageshow'));doc.dispatchEvent(new Event('resume'));expect(clock.paused).toBe(true);
  stop();(event==='freeze'?doc:win).dispatchEvent(new Event(event));expect(pauses).toBe(1);
 });
 it('repeated mounts remove all added mobile listeners',()=>{
  const win=new EventTarget(),doc=Object.assign(new EventTarget(),{hidden:false});let count=0;
  for(let i=0;i<50;i++){const stop=observeInterruptions(win,doc,()=>count++,()=>{});win.dispatchEvent(new Event('pagehide'));doc.dispatchEvent(new Event('freeze'));stop();}
  win.dispatchEvent(new Event('pagehide'));doc.dispatchEvent(new Event('freeze'));expect(count).toBe(100);
 });
});
