import {describe,expect,it,vi} from 'vitest';
import {RendererReadiness,RenderWarmup,PREPARATION_TIMEOUT_MS} from './rendererReadiness';
import {RendererLease} from './rendererLease';
import {SimulationClock,CountdownClock} from './simulationClock';
import {balanceConfig} from './config';

describe('V004 preparation before official authorization/countdown',()=>{
 it.each([100,250,1000,5000])('keeps %i ms load/decode/GPU preparation outside the clock',delay=>{
  const gate=new RendererReadiness(),warmup=new RenderWarmup(),clock=new SimulationClock(balanceConfig),countdown=new CountdownClock();
  const issue=vi.fn(),id=gate.begin(0)!;
  expect(warmup.frame(delay,false)).toBe(false);expect(gate.status).toBe('preparing');
  expect(warmup.frame(delay,true)).toBe(false);expect(warmup.frame(delay+5000,true)).toBe(false);
  expect(warmup.frame(delay+5017,true)).toBe(false);expect(warmup.frame(delay+5034,true)).toBe(true);
  expect(gate.ready(id,delay+5034)).toBe(true);issue();expect(issue).toHaveBeenCalledTimes(1);
  expect(clock.ticks).toBe(0);expect(clock.state.survivalMs).toBe(0);expect(clock.paused).toBe(false);expect(countdown.elapsed).toBe(0);
  for(let t=0;t<=2400;t+=20)countdown.frame(delay+5034+t);
  expect(countdown.elapsed).toBe(2400);expect(clock.state.survivalMs).toBe(0);
  expect(clock.frame(delay+7434,balanceConfig).steps).toBe(0);
  expect(clock.frame(delay+7550,balanceConfig).interrupted).toBe(true);
 });
 it('deduplicates Start/readiness and rejects obsolete completions',()=>{
  const gate=new RendererReadiness();const first=gate.begin(0)!;expect(gate.begin(1)).toBeNull();gate.cancel();
  const next=gate.begin(2)!;expect(gate.ready(first,3)).toBe(false);expect(gate.fail(first)).toBe(false);
  expect(gate.ready(next,4)).toBe(true);expect(gate.ready(next,5)).toBe(false);expect(gate.begin(6)).toBeNull();
 });
 it('bounds retries and treats late success as timeout, even if the timeout callback was delayed',()=>{
  const gate=new RendererReadiness();for(let n=0;n<3;n++){const id=gate.begin(0)!;expect(id).not.toBeNull();expect(gate.ready(id,PREPARATION_TIMEOUT_MS)).toBe(false);expect(gate.status).toBe('error');}
  expect(gate.begin(0)).toBeNull();gate.cancel();expect(gate.begin(0)).not.toBeNull();
 });
 it('requires completed stable renders even on warm-cache Play Again',()=>{
  for(let cycle=0;cycle<10;cycle++){const warmup=new RenderWarmup();expect(warmup.frame(0,true)).toBe(false);expect(warmup.frame(17,true)).toBe(false);expect(warmup.frame(34,true)).toBe(true);}
 });
 it('resets warm-up for unavailable frames without weakening the active clock policy',()=>{
  const warmup=new RenderWarmup();warmup.frame(0,true);warmup.frame(17,true);expect(warmup.frame(34,false)).toBe(false);expect(warmup.frame(51,true)).toBe(false);
 });
});

describe('renderer lifetime serialization',()=>{
 it('waits for destruction before Retry can create another scene',async()=>{
  const leases=new RendererLease();let release!:()=>void;const destroy=vi.fn(),start=vi.fn(done=>{release=done;return {destroy};}),next=vi.fn(()=>({destroy:vi.fn()}));
  const cancel=leases.mount(start,vi.fn());await Promise.resolve();expect(start).toHaveBeenCalledTimes(1);cancel();cancel();expect(destroy).toHaveBeenCalledTimes(1);
  leases.mount(next,vi.fn());await Promise.resolve();expect(next).not.toHaveBeenCalled();release();await Promise.resolve();expect(next).toHaveBeenCalledTimes(1);
 });
 it('canceled queued mounts never create a loader, including Strict Mode cleanup',async()=>{
  const leases=new RendererLease(),start=vi.fn(()=>({destroy:vi.fn()}));leases.mount(start,vi.fn())();await Promise.resolve();expect(start).not.toHaveBeenCalled();
 });
 it('releases a failed construction without exposing its error',async()=>{
  const leases=new RendererLease(),failed=vi.fn(),next=vi.fn(()=>({destroy:vi.fn()}));leases.mount(()=>{throw Error('private renderer detail');},failed);leases.mount(next,vi.fn());await Promise.resolve();await Promise.resolve();expect(failed).toHaveBeenCalledWith();expect(next).toHaveBeenCalledTimes(1);
 });
});
