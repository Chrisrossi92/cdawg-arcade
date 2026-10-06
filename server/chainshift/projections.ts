/** Delivery-neutral facts. Callers must obtain these from authoritative completed attempts only. */
export interface DailyFacts {puzzleId:string;day:string;start:string;finish:string;completedPlayers:number;shortestShifts:number|null;fastestAtShortestMs:number|null}
export interface ResultFacts {puzzleId:string;day:string;displayName:string;shifts:number;elapsedMs:number}
export interface PlayAction {kind:'activity-launch-unresolved';game:'chainshift';destination:'#arcade/chainshift';label:"Play Today's Chain"}
export interface DailyProjection extends DailyFacts {kind:'chainshift-daily';play:PlayAction}
export interface ResultProjection extends ResultFacts {kind:'chainshift-result'}
const integer=(n:number)=>Number.isSafeInteger(n)&&n>=0;
const text=(s:string,max=128)=>typeof s==='string'&&s.length>0&&s.length<=max&&!/[\x00-\x1f]/.test(s);
function puzzle(id:string,day:string){if(!text(id)||!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new Error('Invalid projection facts');}
export function dailyProjection(f:DailyFacts):DailyProjection{
 puzzle(f.puzzleId,f.day);
 if(!text(f.start,64)||!text(f.finish,64)||!integer(f.completedPlayers)||
  (f.completedPlayers===0?(f.shortestShifts!==null||f.fastestAtShortestMs!==null):(!integer(f.shortestShifts!)||f.shortestShifts!<1||!integer(f.fastestAtShortestMs!))))throw new Error('Invalid projection facts');
 // Explicit allowlist: never spread a database row or input object into delivery data.
 return {kind:'chainshift-daily',puzzleId:f.puzzleId,day:f.day,start:f.start,finish:f.finish,completedPlayers:f.completedPlayers,shortestShifts:f.shortestShifts,fastestAtShortestMs:f.fastestAtShortestMs,
  play:{kind:'activity-launch-unresolved',game:'chainshift',destination:'#arcade/chainshift',label:"Play Today's Chain"}};
}
export function resultProjection(f:ResultFacts):ResultProjection{
 puzzle(f.puzzleId,f.day);if(!text(f.displayName,64)||!integer(f.shifts)||f.shifts<1||!integer(f.elapsedMs))throw new Error('Invalid projection facts');
 return {kind:'chainshift-result',puzzleId:f.puzzleId,day:f.day,displayName:f.displayName,shifts:f.shifts,elapsedMs:f.elapsedMs};
}
const escape=(s:string)=>s.replace(/[\\`*_~|<>@]/g,c=>'\\'+c);
const time=(ms:number)=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
export const dailyCopy=(p:DailyProjection)=>`CHAINSHIFT · ${escape(p.puzzleId)}\n${escape(p.start.toUpperCase())} → ${escape(p.finish.toUpperCase())}\n${p.completedPlayers} completed${p.shortestShifts===null?'':`\nShortest found: ${p.shortestShifts} shifts\nFastest ${p.shortestShifts}-shift completion: ${time(p.fastestAtShortestMs!)}`}\n${p.play.label}`;
export const resultCopy=(p:ResultProjection)=>`${escape(p.displayName)} completed Chainshift · ${escape(p.puzzleId)}\n${p.shifts} shifts · ${time(p.elapsedMs)}`;
