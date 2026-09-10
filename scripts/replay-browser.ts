import {stepOfficialBalance} from '../shared/balance/official';
import expectedDigests from './fixtures/balance-state-digests-v1.json';
import cap from './fixtures/balance-cap-v1.json';
import {balanceConfig} from '../shared/balance/config';
import {createInitialBalanceState,type BalanceInputDirection} from '../shared/balance/simulation';
const fixtures=[{ticks:42,inputs:[]},{ticks:63,inputs:[[4,-1],[10,1],[15,0],[22,-1],[29,1],[38,0]]},cap];
const results=await Promise.all(fixtures.map(async(fixture,index)=>{
  let state=createInitialBalanceState(balanceConfig),cursor=0,input:BalanceInputDirection='none',ticks=0;
  for(;ticks<fixture.ticks&&!state.failed;ticks++){
    if(fixture.inputs[cursor]?.[0]===ticks){const value=fixture.inputs[cursor++][1];input=value===-1?'left':value===1?'right':'none';}
    state=stepOfficialBalance(state,input).state;
  }
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(state))))).map(n=>n.toString(16).padStart(2,'0')).join('');
  return {expected:fixture.ticks,ticks,failed:state.failed,phase:state.tuningPhase,fullStateMatches:digest===expectedDigests[index],pass:ticks===fixture.ticks&&(state.failed||ticks===18000)&&digest===expectedDigests[index]};
}));
document.getElementById('result')!.textContent=JSON.stringify({pass:results.every(r=>r.pass),results},null,2);
