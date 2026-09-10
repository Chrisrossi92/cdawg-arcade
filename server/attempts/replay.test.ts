import { describe,it,expect,vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { balanceConfig } from '../../shared/balance/config.js';
import { createInitialBalanceState, stepBalanceSimulation } from '../../shared/balance/simulation.js';
import { SimulationClock } from '../../src/games/balance/simulationClock.js';
import { parseEvidence,replayBalance,type Evidence,type InputEdge } from './replay.js';
import { stepOfficialBalance } from '../../shared/balance/official.js';
import { RULESET } from './definition.js';
const idle:Evidence={rulesetId:RULESET.id,ticks:42,interruptions:0,inputs:[]};
describe('immutable replay ruleset',()=>{
  it('matches the reviewed source digest and cannot use the nonissuable seed',()=>{
    const hash=createHash('sha256');
    for (const path of ['shared/balance/simulation.ts','shared/balance/config.ts','shared/balance/official.ts','shared/balance/curves.ts','server/attempts/replay.ts','server/attempts/definition.ts']) hash.update(JSON.stringify([path,readFileSync(path,'utf8').replace(/simulationDigest: '[a-f0-9]{64}'/,"simulationDigest: 'TO_GENERATE'")]));
    expect(hash.digest('hex')).toBe(RULESET.simulationDigest);expect(RULESET.id).not.toBe('balance-official-v1');
  });
  it('replays the unchanged 42-tick reference failure',()=>{
    expect(replayBalance(idle)).toEqual({disposition:'accepted',ticks:42,interruptionCount:0,reason:'validated',failureDirection:'right',failurePhase:'Warmup'});
  });
  it.each([30,60,90,120,144])('matches the browser clock at %i Hz with tick-indexed edges',hz=>{
    const script=[{at:80,direction:'left' as const},{at:170,direction:'right' as const},{at:260,direction:'none' as const},{at:380,direction:'left' as const},{at:490,direction:'right' as const},{at:650,direction:'none' as const}];
    const clock=new SimulationClock(balanceConfig);clock.frame(0,balanceConfig);script.forEach(e=>clock.input(e.direction,e.at));
    for(let frame=1;!clock.state.failed&&frame<hz*10;frame++)clock.frame(frame*1000/hz,balanceConfig);
    const inputs:InputEdge[]=script.map(e=>[Math.ceil(e.at/(1000/60))-1,e.direction==='left'?-1:e.direction==='right'?1:0]);
    const result=replayBalance({...idle,ticks:Math.round(clock.state.survivalMs/(1000/60)),inputs});
    expect(result).toMatchObject({disposition:'accepted',ticks:63,failureDirection:clock.state.failureDirection,failurePhase:clock.state.tuningPhase});
  });
  it.each([0,41,43,18001,NaN,Infinity,3.5,-1])('never accepts a forged tick count %s',ticks=>{
    const e={...idle,ticks};expect(parseEvidence(e) && replayBalance(e).disposition==='accepted').toBeFalsy();
  });
  it('rejects another ruleset and marks interruptions practice only',()=>{
    expect(replayBalance({...idle,rulesetId:'unknown'}).reason).toBe('unsupported_ruleset');
    expect(replayBalance({...idle,interruptions:1})).toMatchObject({disposition:'practice',ticks:0,reason:'interrupted'});
  });
  it.each([null,[],{}, {...idle,rulesetId:'https://private.example'}, {...idle,playerId:'forged'}, {...idle,score:9000}, {...idle,inputs:[[0,0]]}, {...idle,inputs:[[1,-1],[1,1]]}, {...idle,inputs:[[2,-1],[1,1]]}, {...idle,inputs:[[0,-1],[1,-1]]}, {...idle,inputs:[[42,-1]]}, {...idle,inputs:[[-1,-1]]}, {...idle,inputs:[[0,2]]}, {...idle,inputs:[[0,'left']]}, {...idle,inputs:[[0,-1,1]]}, {...idle,interruptions:-1}, {...idle,interruptions:0.5}, {...idle,interruptions:10001}, {...idle,inputs:Array.from({length:4097},(_,i)=>[i,i%2?-1:1]),ticks:18000}])('rejects malformed, noncanonical or oversized evidence %#',value=>expect(parseEvidence(value)).toBeNull());
  it('validates a full 18,000-tick deterministic fixture within a bounded CPU budget',()=>{
    let state=createInitialBalanceState(balanceConfig),input:-1|1=1,previous=0;
    const inputs:InputEdge[]=[];
    for(let tick=0;tick<RULESET.maxTicks;tick++) {
      const projected=state.tilt+state.angularVelocity*1.5;
      input=projected>1.8?-1:projected< -1.8?1:input;
      if(input!==previous){inputs.push([tick,input]);previous=input;}
      state=stepBalanceSimulation(state,input===-1?'left':'right',1000/60,balanceConfig).state;
    }
    expect(state.failed).toBe(false);expect(inputs.length).toBeLessThan(RULESET.maxEdges);
    const e=JSON.parse(readFileSync('scripts/fixtures/balance-cap-v1.json','utf8'));const start=performance.now();
    expect(replayBalance(e)).toMatchObject({disposition:'accepted',ticks:18000,failureDirection:null,failurePhase:'Critical'});
    expect(performance.now()-start).toBeLessThan(1000);
    expect(replayBalance({...e,ticks:17999})).toMatchObject({disposition:'rejected',reason:'incomplete_run'});
  });
  it('uses no native transcendental math in official replay',()=>{
    const sin=vi.spyOn(Math,'sin').mockImplementation(()=>{throw Error('native sin');});
    const pow=vi.spyOn(Math,'pow').mockImplementation(()=>{throw Error('native pow');});
    try {expect(replayBalance(JSON.parse(readFileSync('scripts/fixtures/balance-cap-v1.json','utf8'))).ticks).toBe(18000);}
    finally {sin.mockRestore();pow.mockRestore();}
  });
  it('matches the checked-in full-state browser compatibility digests',()=>{
    const fixtures=[idle,{...idle,ticks:63,inputs:[[4,-1],[10,1],[15,0],[22,-1],[29,1],[38,0]]},JSON.parse(readFileSync('scripts/fixtures/balance-cap-v1.json','utf8'))];
    const expected=JSON.parse(readFileSync('scripts/fixtures/balance-state-digests-v1.json','utf8'));
    for(const [index,e] of fixtures.entries()){
      let state=createInitialBalanceState(balanceConfig),cursor=0,input:'left'|'right'|'none'='none';
      for(let tick=0;tick<e.ticks;tick++){if(e.inputs[cursor]?.[0]===tick){const v=e.inputs[cursor++][1];input=v===-1?'left':v===1?'right':'none';}state=stepOfficialBalance(state,input).state;}
      expect(createHash('sha256').update(JSON.stringify(state)).digest('hex')).toBe(expected[index]);
    }
  });
  it('agrees with 100 seeded input fixtures and rejects a later invented death',()=>{
    let random=123456;
    for(let fixture=0;fixture<100;fixture++){
      let state=createInitialBalanceState(balanceConfig),input:-1|0|1=0,ticks=0;
      const inputs:InputEdge[]=[];
      while(!state.failed&&ticks<18000){
        random=(Math.imul(random,1664525)+1013904223)>>>0;
        if(random%7===0){const next=([-1,0,1] as const)[random%3];if(next!==input){input=next;inputs.push([ticks,input]);}}
        state=stepBalanceSimulation(state,input===-1?'left':input===1?'right':'none',1000/60,balanceConfig).state;ticks++;
      }
      const e={...idle,ticks,inputs};expect(replayBalance(e)).toMatchObject({disposition:'accepted',ticks,failureDirection:state.failureDirection});
      expect(replayBalance({...e,ticks:ticks+1}).disposition).toBe('rejected');
    }
  });
});
