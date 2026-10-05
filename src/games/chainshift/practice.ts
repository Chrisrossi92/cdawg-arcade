import {enrichedReferee} from '../../../shared/chainshift/enrichment/graph-v2';
import {puzzles,type LocalPuzzle,type LocalResult,type GameState,ready,validatePuzzle} from './state';

export const PRACTICE_STORAGE_KEY='cdawg.arcade.chainshift.practice.v1';
export const PRACTICE_SCHEMA='chainshift-local-practice-v1';
export const MAX_PRACTICE_RUNS_PER_PUZZLE=50;
const MAX_RECORDS=500;
const MAX_RAW_LENGTH=2_000_000;
export interface PracticeRun {
 readonly id:string;
 readonly designation:'local-practice';
 readonly puzzleId:string;
 readonly start:string;
 readonly finish:string;
 readonly graphVersion:string;
 readonly rulesRevision:string;
 readonly checksum:string;
 readonly route:readonly string[];
 readonly shifts:number;
 readonly elapsedMs:number;
 /** Wall-clock epoch milliseconds for local history, never used to score time. */
 readonly completedAt:number;
}
export interface PracticeSnapshot {
 readonly runs:readonly PracticeRun[];
 readonly warning:string;
 readonly archivedCount:number;
}
export interface PracticeSave {readonly run:PracticeRun;readonly saved:boolean;readonly isNewBest:boolean;readonly snapshot:PracticeSnapshot}
type StoragePort=Pick<Storage,'getItem'|'setItem'>;
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown,max=120):value is string=>typeof value==='string'&&value.length>0&&value.length<=max;
const word=(value:unknown):value is string=>typeof value==='string'&&/^[a-z]{1,64}$/.test(value);
function freezeRun(run:PracticeRun):PracticeRun {return Object.freeze({...run,route:Object.freeze([...run.route])});}
function parseRun(value:unknown):PracticeRun|null {
 if(!object(value)||value.designation!=='local-practice'||!text(value.id)||!text(value.puzzleId)||!word(value.start)||!word(value.finish)||value.start===value.finish)return null;
 if(!text(value.graphVersion)||!/^chainshift-graph-v[1-9][0-9]*$/.test(value.graphVersion)||!text(value.rulesRevision)||!/^chainshift-rules-v[1-9][0-9]*$/.test(value.rulesRevision)||!text(value.checksum)||!/^fnv1a64:[a-f0-9]{16}$/.test(value.checksum))return null;
 if(!Array.isArray(value.route)||value.route.length<2||value.route.length>2048||!value.route.every(word)||value.route[0]!==value.start||value.route[value.route.length-1]!==value.finish||value.route.slice(0,-1).includes(value.finish))return null;
 if(!Number.isSafeInteger(value.shifts)||value.shifts!==value.route.length-1||typeof value.elapsedMs!=='number'||!Number.isFinite(value.elapsedMs)||value.elapsedMs<0||value.elapsedMs>31_536_000_000||typeof value.completedAt!=='number'||!Number.isSafeInteger(value.completedAt)||value.completedAt<0||value.completedAt>8_640_000_000_000_000)return null;
 const run:PracticeRun={id:value.id,designation:'local-practice',puzzleId:value.puzzleId,start:value.start,finish:value.finish,graphVersion:value.graphVersion,rulesRevision:value.rulesRevision,checksum:value.checksum,route:value.route,shifts:value.shifts as number,elapsedMs:value.elapsedMs,completedAt:value.completedAt};
 const puzzle=puzzles.find(p=>p.id===run.puzzleId);
 if(puzzle&&compatible(run,puzzle)&&run.route.slice(1).some((to,i)=>!enrichedReferee.isValidShift(run.route[i],to)))return null;
 return freezeRun(run);
}
export function compatible(run:PracticeRun,puzzle:LocalPuzzle):boolean {
 return run.puzzleId===puzzle.id&&run.start===puzzle.start.key&&run.finish===puzzle.finish.key&&run.graphVersion===puzzle.graphVersion&&run.rulesRevision===puzzle.rulesRevision&&run.checksum===puzzle.checksum;
}
export function compareScores(a:Pick<PracticeRun,'shifts'|'elapsedMs'>,b:Pick<PracticeRun,'shifts'|'elapsedMs'>):number {
 return a.shifts-b.shifts||a.elapsedMs-b.elapsedMs;
}
export function compareRuns(a:PracticeRun,b:PracticeRun):number {
 return compareScores(a,b)||a.completedAt-b.completedAt||a.id.localeCompare(b.id,'en');
}
export function localRuns(snapshot:PracticeSnapshot,puzzle:LocalPuzzle):readonly PracticeRun[] {
 return Object.freeze(snapshot.runs.filter(run=>compatible(run,puzzle)).sort(compareRuns));
}
export function archivedRuns(snapshot:PracticeSnapshot,puzzle:LocalPuzzle):readonly PracticeRun[] {
 return Object.freeze(snapshot.runs.filter(run=>run.puzzleId===puzzle.id&&!compatible(run,puzzle)).sort((a,b)=>b.completedAt-a.completedAt));
}
export function latestRun(snapshot:PracticeSnapshot):PracticeRun|undefined {
 return [...snapshot.runs].filter(run=>puzzles.some(p=>compatible(run,p))).sort((a,b)=>b.completedAt-a.completedAt||b.id.localeCompare(a.id,'en'))[0];
}
/** Restores a completed practice result only. No unfinished timer protocol. */
export function restoreCompleted(run:PracticeRun,puzzle:LocalPuzzle):GameState {
 validatePuzzle(puzzle);
 const checked=parseRun(run);if(!checked||!compatible(checked,puzzle))throw new Error('Stored practice result is incompatible.');
 const result:LocalResult=Object.freeze({puzzleId:run.puzzleId,graphVersion:run.graphVersion,rulesRevision:run.rulesRevision,checksum:run.checksum,route:checked.route,shifts:run.shifts,elapsedMs:run.elapsedMs,startedAt:0,completedAt:run.elapsedMs});
 return Object.freeze({...ready(puzzle),phase:'completed',route:checked.route,result,feedback:Object.freeze({kind:'none',text:'',sequence:0})});
}
/** Bounded local history: keep each puzzle/identity's best plus recent runs.
 * Old identities are retained as archives and never enter current comparison.
 */
function retain(runs:readonly PracticeRun[]):PracticeRun[] {
 const groups=new Map<string,PracticeRun[]>();
 for(const run of runs){const key=JSON.stringify([run.puzzleId,run.graphVersion,run.rulesRevision,run.checksum,run.start,run.finish]);const group=groups.get(key)??[];group.push(run);groups.set(key,group);}
 const kept:PracticeRun[]=[];
 for(const group of groups.values()){
  const best=[...group].sort(compareRuns)[0];const recent=group.sort((a,b)=>b.completedAt-a.completedAt||b.id.localeCompare(a.id,'en')).filter(run=>run.id!==best.id).slice(0,MAX_PRACTICE_RUNS_PER_PUZZLE-1);kept.push(best,...recent);
 }
 return kept.sort((a,b)=>b.completedAt-a.completedAt||b.id.localeCompare(a.id,'en')).slice(0,MAX_RECORDS);
}
let fallbackId=0;
export class PracticeRepository {
 private volatile:PracticeRun[]=[];
 private writeWarning='';
 constructor(private readonly storage:StoragePort|null,private readonly now:()=>number=()=>Date.now(),private readonly id:()=>string=()=>globalThis.crypto?.randomUUID?.()??`local-${Date.now()}-${++fallbackId}`){}
 private read():{runs:PracticeRun[];warning:string;writable:boolean}{
  if(!this.storage)return {runs:[],warning:'Local storage unavailable. New results stay in this tab.',writable:false};
  let raw:string|null;try{raw=this.storage.getItem(PRACTICE_STORAGE_KEY);}catch{return {runs:[],warning:'Local storage unavailable. New results stay in this tab.',writable:false};}
  if(!raw)return {runs:[],warning:'',writable:true};
  try{
   if(raw.length>MAX_RAW_LENGTH)throw new Error('oversized');const data:unknown=JSON.parse(raw);
   if(!object(data)||data.schema!==PRACTICE_SCHEMA)return {runs:[],warning:'Stored practice history uses an unsupported format. New results stay in this tab.',writable:false};
   if(!Array.isArray(data.runs)||data.runs.length>MAX_RECORDS)throw new Error('invalid history');
   const seen=new Set<string>();let skipped=0;const runs:PracticeRun[]=[];
   for(const value of data.runs){const run=parseRun(value);if(!run||seen.has(run.id)){skipped++;continue;}seen.add(run.id);runs.push(run);}
   return {runs,warning:skipped?'Some damaged local results were skipped. New results stay in this tab.':'',writable:skipped===0};
  }catch{return {runs:[],warning:'Stored practice history could not be read. New results stay in this tab.',writable:false};}
 }
 snapshot():PracticeSnapshot {
  const stored=this.read();const merged=new Map(stored.runs.map(run=>[run.id,run]));for(const run of this.volatile)merged.set(run.id,run);
  const runs=Object.freeze(retain([...merged.values()]));return Object.freeze({runs,warning:stored.warning||this.writeWarning,archivedCount:runs.filter(run=>!puzzles.some(p=>compatible(run,p))).length});
 }
 record(result:LocalResult,puzzle:LocalPuzzle):PracticeSave {
  validatePuzzle(puzzle);
  const candidate=parseRun({...result,id:this.id(),designation:'local-practice',start:puzzle.start.key,finish:puzzle.finish.key,completedAt:this.now()});
  if(!candidate||!compatible(candidate,puzzle))throw new Error('Cannot save an invalid local completion.');
  const before=this.snapshot();const best=localRuns(before,puzzle)[0];const isNewBest=!best||compareScores(candidate,best)<0;
  const stored=this.read();this.volatile=retain([...before.runs.filter(run=>run.id!==candidate.id),candidate]);let saved=false;let warning=stored.warning;
  if(stored.writable&&this.storage){
   try{const raw=JSON.stringify({schema:PRACTICE_SCHEMA,runs:this.volatile});if(raw.length>MAX_RAW_LENGTH)throw new Error('oversized');this.storage.setItem(PRACTICE_STORAGE_KEY,raw);saved=true;this.volatile=[];}
   catch{warning='Could not save to local storage. New results stay in this tab.';}
  }
  this.writeWarning=saved?'':warning;
  const snapshot=saved?this.snapshot():Object.freeze({...this.snapshot(),warning});
  return Object.freeze({run:candidate,saved,isNewBest,snapshot});
 }
}
export function browserPracticeRepository():PracticeRepository {
 try{return new PracticeRepository(window.localStorage);}catch{return new PracticeRepository(null);}
}
