import { CURVE_BYTES_BASE64 } from './curves.js';
import { balanceConfig } from './config.js';
import { stepBalanceSimulation, type BalanceState, type BalanceInputDirection } from './simulation.js';
const bytes=Uint8Array.from(atob(CURVE_BYTES_BASE64),c=>c.charCodeAt(0));
if (bytes.byteLength!==18000*16) throw new Error('Invalid immutable Balance curves');
const curves=new DataView(bytes.buffer);
/** Official v1 only. No native transcendental math occurs while advancing a run. */
export function stepOfficialBalance(state:BalanceState,input:BalanceInputDirection) {
  const tick=Math.round(state.survivalMs/(1000/60))+1;
  if (!Number.isSafeInteger(tick) || tick<1 || tick>18000) throw new RangeError('Official Balance tick outside ruleset');
  return stepBalanceSimulation(state,input,1000/60,balanceConfig,{
    difficultyMultiplier:curves.getFloat64((tick-1)*16,true),
    boundedDisturbance:curves.getFloat64((tick-1)*16+8,true),
  });
}
