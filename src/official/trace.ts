import type {BalanceInputDirection} from '../../shared/balance/simulation';
export type Edge=[number,-1|0|1];
export interface RunEvidence {rulesetId:string;ticks:number;interruptions:number;inputs:Edge[];}
/** In-memory effective simulation directions only; no DOM events or wall-clock history. */
export class TraceRecorder {
 private enabled=true;private edges:Edge[]=[];private direction=0;private interrupted=0;private lastTick=-1;
 step(tick:number,direction:BalanceInputDirection){
  if(!this.enabled||tick<=this.lastTick||tick<0||tick>=18000)return;
  this.lastTick=tick;const value=direction==='left'?-1:direction==='right'?1:0;
  if(value!==this.direction){if(this.edges.length>=4096){this.interrupt();return;}this.edges.push([tick,value]);this.direction=value;}
 }
 interrupt(){this.interrupted=1;}
 freeze(rulesetId:string,ticks:number):RunEvidence{return {rulesetId,ticks:Math.max(1,Math.min(18000,ticks)),interruptions:this.interrupted,inputs:this.edges.map(e=>[...e] as Edge).filter(e=>e[0]<ticks)};}
 begin(){this.clear();this.enabled=true;}
 clear(){this.enabled=false;this.edges=[];this.direction=0;this.interrupted=0;this.lastTick=-1;}
}
