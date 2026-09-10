import { stepOfficialBalance } from '../../shared/balance/official.js';
import { balanceConfig } from '../../shared/balance/config.js';
import { createInitialBalanceState, type BalanceInputDirection, type BalanceState } from '../../shared/balance/simulation.js';
import { RULESET } from './definition.js';

export type InputEdge = [number, -1 | 0 | 1];
export interface Evidence { rulesetId: string; ticks: number; interruptions: number; inputs: InputEdge[]; }
export type ReplayResult = {
  disposition: 'accepted' | 'practice' | 'rejected';
  ticks: number; interruptionCount: number;
  reason: 'validated' | 'interrupted' | 'invalid_evidence' | 'unsupported_ruleset' | 'early_failure' | 'incomplete_run';
  failureDirection: BalanceState['failureDirection'] | null;
  failurePhase: BalanceState['tuningPhase'] | null;
};
const integer = (n: unknown, min: number, max: number): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;
export function parseEvidence(value: unknown): Evidence | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const e = value as Record<string, unknown>;
  if (Object.keys(e).sort().join(',') !== 'inputs,interruptions,rulesetId,ticks' || typeof e.rulesetId !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(e.rulesetId) ||
    !integer(e.ticks,1,RULESET.maxTicks) || !integer(e.interruptions,0,10000) || !Array.isArray(e.inputs) || e.inputs.length > RULESET.maxEdges) return null;
  let previousTick = -1, previousInput = 0;
  for (const edge of e.inputs) {
    if (!Array.isArray(edge) || edge.length !== 2 || !integer(edge[0],0,e.ticks-1) || ![-1,0,1].includes(edge[1]) ||
      edge[0] <= previousTick || edge[1] === previousInput) return null;
    previousTick = edge[0]; previousInput = edge[1];
  }
  const canonical: Evidence = {rulesetId:e.rulesetId,ticks:e.ticks,interruptions:e.interruptions,inputs:e.inputs.map(edge=>[edge[0],edge[1]]) as InputEdge[]};
  return Buffer.byteLength(JSON.stringify(canonical),'utf8') <= RULESET.maxEvidenceBytes ? canonical : null;
}
export function replayBalance(e: Evidence): ReplayResult {
  const rejected = (reason: ReplayResult['reason']): ReplayResult => ({disposition:'rejected',ticks:0,interruptionCount:e.interruptions,reason,failureDirection:null,failurePhase:null});
  if (!parseEvidence(e)) return rejected('invalid_evidence');
  if (e.rulesetId !== RULESET.id) return rejected('unsupported_ruleset');
  if (e.interruptions !== 0) return {...rejected('interrupted'),disposition:'practice'};
  let state = createInitialBalanceState(balanceConfig), direction: BalanceInputDirection = 'none', cursor = 0;
  for (let tick = 0; tick < e.ticks; tick++) {
    if (e.inputs[cursor]?.[0] === tick) {
      direction = e.inputs[cursor][1] === -1 ? 'left' : e.inputs[cursor][1] === 1 ? 'right' : 'none'; cursor++;
    }
    state = stepOfficialBalance(state,direction).state;
    if (state.failed && tick+1 !== e.ticks) return rejected('early_failure');
  }
  if (!state.failed && e.ticks !== RULESET.maxTicks) return rejected('incomplete_run');
  return {disposition:'accepted',ticks:e.ticks,interruptionCount:0,reason:'validated',failureDirection:state.failureDirection ?? null,failurePhase:state.tuningPhase};
}
