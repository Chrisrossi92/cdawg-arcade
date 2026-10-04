import {createAnalysis,freeze,type Referee} from './analysis.js';
import {dayKey,DAILY_TIME_ZONE} from './daily.js';
type DeepReadonly<T> = T extends readonly (infer U)[] ? readonly DeepReadonly<U>[] : T extends object ? {readonly [K in keyof T]:DeepReadonly<T[K]>} : T;
export interface ManifestInput {
  readonly id:string; readonly number:number; readonly day:string;
  readonly start:string; readonly finish:string; readonly generatedAt:string;
}
export function createManifest(referee:Referee, input:ManifestInput) {
  if(!/^chainshift-local-[a-z0-9-]+$/.test(input.id)||!Number.isSafeInteger(input.number)||input.number<1)throw new Error('invalid puzzle identity');
  const date=Date.parse(`${input.day}T12:00:00Z`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(input.day)||!Number.isFinite(date)||new Date(date).toISOString().slice(0,10)!==input.day)throw new Error('invalid day');
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.generatedAt)||!Number.isFinite(Date.parse(input.generatedAt))||new Date(input.generatedAt).toISOString()!==input.generatedAt)throw new Error('invalid generation timestamp');
  const analysis=createAnalysis(referee),validation=analysis.evaluate(input.start,input.finish);
  if(!validation.accepted||!validation.metrics)throw new Error(`candidate rejected: ${validation.reasons.join(',')}`);
  const display=(key:string)=>referee.snapshot.edges.flatMap(e=>[{key:e.from,display:e.fromDisplay},{key:e.to,display:e.toDisplay}]).find(e=>e.key===key)!.display;
  const manifest={manifestVersion:'chainshift-manifest-v1',id:input.id,number:input.number,day:input.day,timeZone:DAILY_TIME_ZONE,
    start:{key:validation.metrics.from,display:display(validation.metrics.from)},finish:{key:validation.metrics.to,display:display(validation.metrics.to)},
    ...referee.identity,generatedAt:input.generatedAt,publicationStatus:'local-review',editorialApproval:'pending',
    shortestCertificate:validation.metrics.shortest,diversityCertificate:validation.metrics,candidateValidation:validation,
    recognizability:'not-certified-by-topology',rolloverPolicy:'retain-starting-puzzle'} as const;
  return freeze(manifest) as DeepReadonly<typeof manifest>;
}
export type PuzzleManifest=ReturnType<typeof createManifest>;
/** Selection only, not scheduling. Fixtures must have at most one manifest per day. */
export function selectDailyPuzzle(manifests:readonly PuzzleManifest[],epochMs:number):PuzzleManifest|null {
  const matches=manifests.filter(m=>m.day===dayKey(epochMs));
  if(matches.length>1)throw new Error('duplicate daily manifest');return matches[0]??null;
}

export function verifyManifest(referee:Referee, manifest:PuzzleManifest):boolean {
  if(manifest.graphVersion!==referee.identity.graphVersion||manifest.checksum!==referee.identity.checksum||manifest.rulesRevision!==referee.identity.rulesRevision)return false;
  try {
    const expected=createManifest(referee,{id:manifest.id,number:manifest.number,day:manifest.day,start:manifest.start.key,finish:manifest.finish.key,generatedAt:manifest.generatedAt});
    const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,item])=>[key,canonical(item)])):value;
    return JSON.stringify(canonical(expected))===JSON.stringify(canonical(manifest));
  } catch {return false;}
}
