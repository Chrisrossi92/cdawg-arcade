import {describe,it,expect,vi} from 'vitest';
import {CountdownClock,SimulationClock} from './simulationClock';
import {balanceConfig} from './config';
import {OfficialController} from '../../official/controller';
import {OfficialClient} from '../../official/client';
import {RULESET} from '../../../server/attempts/definition';

function fixture() {
  const issued={attemptId:'fixture',rulesetId:RULESET.id,tickRate:60,maxTicks:18000,retryDeadline:new Date(Date.now()+RULESET.retryWindowMs).toISOString()};
  const client={connect:vi.fn().mockResolvedValue('eligible'),begin:vi.fn().mockResolvedValue(issued),cancel:vi.fn().mockResolvedValue({}),submit:vi.fn(),clear:vi.fn(),stats:vi.fn().mockResolvedValue(null),board:vi.fn().mockResolvedValue(null)};
  return {client,controller:new OfficialController(client as unknown as OfficialClient)};
}
describe('official countdown integrity',()=>{
 it('discarded time cannot extend the existing attempt deadline or submit expired evidence',async()=>{
  vi.useFakeTimers();const {client,controller}=fixture();
  try {
   await controller.connect('player','guild');await controller.start();
   const countdown=new CountdownClock(),clock=new SimulationClock(balanceConfig,controller.trace);countdown.frame(0);
   await vi.advanceTimersByTimeAsync(RULESET.retryWindowMs-1);
   expect(countdown.frame(RULESET.retryWindowMs-1)).toBe('counting');
   expect(countdown.elapsed).toBe(0);expect(clock.ticks).toBe(0);
   expect(controller.view.phase).toBe('running');expect(controller.view.interrupted).toBe(false);
   await vi.advanceTimersByTimeAsync(1);
   expect(controller.view.phase).toBe('nonqualifying');expect(controller.view.interrupted).toBe(true);
   await controller.finish(42);await controller.retry();
   expect(client.submit).not.toHaveBeenCalled();expect(client.begin).toHaveBeenCalledTimes(1);
  }finally{controller.reset();vi.useRealTimers();}
 });
 it('cancellation after a discarded gap rejects stale refresh results and does not reissue',async()=>{
  const {client,controller}=fixture();
  try {
   await controller.connect('player','guild');await controller.start();
   const countdown=new CountdownClock();countdown.frame(0);expect(countdown.frame(5000)).toBe('counting');
   let resolve!:(value:unknown)=>void;client.stats.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
   const refresh=controller.refresh();controller.practice();resolve({acceptedCount:'999'});await refresh;
   expect(controller.view.phase).toBe('practice');expect(controller.view.stats).toBeNull();
   expect(client.cancel).toHaveBeenCalledTimes(1);expect(client.begin).toHaveBeenCalledTimes(1);
   await controller.finish(42);expect(client.submit).not.toHaveBeenCalled();
  }finally{controller.reset();}
 });
});
