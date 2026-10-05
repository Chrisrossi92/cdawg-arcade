import {describe,it,expect} from 'vitest';
import {PRACTICE_SCHEMA,PRACTICE_STORAGE_KEY,PracticeRepository,compareScores,localRuns,archivedRuns,latestRun,restoreCompleted,type PracticeRun} from './practice';
import {puzzles,ready,reduceGame,type LocalResult} from './state';
const puzzle=puzzles[0];
function result(elapsedMs=1234):LocalResult{
 let state=reduceGame(ready(puzzle),{type:'start',now:100});
 for(const word of ['cold','war','room'])state=reduceGame(state,{type:'submit',word,now:100+elapsedMs});
 return state.result!;
}
function fixture(){
 const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};let sequence=0;let now=1_790_000_000_000;
 const repository=()=>new PracticeRepository(storage,()=>++now,()=>`run-${String(++sequence).padStart(4,'0')}`);
 return {values,storage,repository};
}
const otherRoute=(elapsedMs=2000):LocalResult=>({...result(elapsedMs),route:Object.freeze(['ice','box','car','pool','party','room']),shifts:5});
describe('local practice persistence',()=>{
 it('reconstructs completed route, score, elapsed, identity and wall-clock completion after reload',()=>{
  const f=fixture();const saved=f.repository().record(result(),puzzle);expect(saved.saved).toBe(true);expect(saved.run).toMatchObject({designation:'local-practice',puzzleId:puzzle.id,graphVersion:puzzle.graphVersion,checksum:puzzle.checksum,rulesRevision:puzzle.rulesRevision,route:['ice','cold','war','room'],shifts:3,elapsedMs:1234,completedAt:1_790_000_000_001});
  const snapshot=f.repository().snapshot();expect(snapshot.runs).toEqual([saved.run]);expect(Object.isFrozen(snapshot.runs[0].route)).toBe(true);const restored=restoreCompleted(snapshot.runs[0],puzzle);expect(restored.phase).toBe('completed');expect(restored.result?.elapsedMs).toBe(1234);expect(restored.route).toEqual(saved.run.route);expect(reduceGame(restored,{type:'submit',word:'food',now:99999})).toBe(restored);
 });
 it('retains repeated attempts and preserves the first immutable run',()=>{const f=fixture(),repo=f.repository();const first=repo.record(result(2000),puzzle);repo.record(result(1500),puzzle);expect(f.repository().snapshot().runs).toHaveLength(2);expect(first.run.elapsedMs).toBe(2000);expect(first.run.id).not.toBe(repo.snapshot().runs[0].id);});
 it('writes only completed practice records, never in-progress timer state',()=>{const f=fixture();f.repository().record(result(),puzzle);const data=JSON.parse(f.values.get(PRACTICE_STORAGE_KEY)!);expect(data.schema).toBe(PRACTICE_SCHEMA);expect(data.runs[0]).not.toHaveProperty('startedAt');expect(data.runs[0]).not.toHaveProperty('phase');expect(Object.keys(data)).toEqual(['schema','runs']);});
 it.each(['graphVersion','rulesRevision','checksum'] as const)('archives a different %s identity and excludes it from current best',key=>{
  const f=fixture();const run=f.repository().record(result(),puzzle).run;const stale={...run,[key]:key==='checksum'?'fnv1a64:0000000000000000':key==='graphVersion'?'chainshift-graph-v1':'chainshift-rules-v2'};
  f.values.set(PRACTICE_STORAGE_KEY,JSON.stringify({schema:PRACTICE_SCHEMA,runs:[stale]}));const snapshot=f.repository().snapshot();expect(snapshot.runs[0][key]).toBe(stale[key]);expect(snapshot.archivedCount).toBe(1);expect(localRuns(snapshot,puzzle)).toHaveLength(0);expect(archivedRuns(snapshot,puzzle)).toHaveLength(1);expect(latestRun(snapshot)).toBeUndefined();expect(()=>restoreCompleted(snapshot.runs[0],puzzle)).toThrow('incompatible');
  const saved=f.repository().record(result(3000),puzzle);expect(saved.isNewBest).toBe(true);expect(saved.snapshot.runs).toHaveLength(2);expect(saved.snapshot.archivedCount).toBe(1);
 });
 it('does not silently relabel changed endpoints or an unknown puzzle',()=>{const f=fixture();const run=f.repository().record(result(),puzzle).run;const old={...run,puzzleId:'old-local-puzzle'};f.values.set(PRACTICE_STORAGE_KEY,JSON.stringify({schema:PRACTICE_SCHEMA,runs:[old]}));expect(f.repository().snapshot().archivedCount).toBe(1);expect(localRuns(f.repository().snapshot(),puzzle)).toHaveLength(0);});
 it.each(['not-json','null','{"schema":"future"}','{"schema":"chainshift-local-practice-v1","runs":null}'])('fails safely and preserves unreadable/unsupported bytes: %s',raw=>{
  const f=fixture();f.values.set(PRACTICE_STORAGE_KEY,raw);const repo=f.repository();expect(repo.snapshot().runs).toHaveLength(0);expect(repo.snapshot().warning).not.toBe('');const saved=repo.record(result(),puzzle);expect(saved.saved).toBe(false);expect(saved.snapshot.runs).toHaveLength(1);expect(f.values.get(PRACTICE_STORAGE_KEY)).toBe(raw);
 });
 it.each([
  {shifts:99},{elapsedMs:-1},{elapsedMs:'fast'},{completedAt:'yesterday'}, {designation:'official'}, {route:['ice','magic','room'],shifts:2}, {route:['ice','cold','room','war','room'],shifts:4}, {route:['ice','cold','war','ROOM']}, {checksum:'wrong'}, {id:''},
 ])('skips malformed or invalid compatible records: %j',patch=>{const f=fixture();const run=f.repository().record(result(),puzzle).run;const raw=JSON.stringify({schema:PRACTICE_SCHEMA,runs:[run,{...run,id:'invalid-run',...patch}]});f.values.set(PRACTICE_STORAGE_KEY,raw);const repo=f.repository();expect(repo.snapshot().runs).toHaveLength(1);expect(repo.snapshot().warning).toContain('damaged');const saved=repo.record(result(),puzzle);expect(saved.saved).toBe(false);expect(f.values.get(PRACTICE_STORAGE_KEY)).toBe(raw);});
 it('handles storage getter and quota failures without losing the in-tab completion',()=>{
  for(const failure of ['read','write']){let n=0;const repo=new PracticeRepository({getItem:()=>{if(failure==='read')throw Error('blocked');return null;},setItem:()=>{throw Error('quota');}},()=>1000,()=>`id-${++n}`);const saved=repo.record(result(),puzzle);expect(saved.saved).toBe(false);expect(repo.snapshot().runs).toHaveLength(1);expect(repo.snapshot().warning).toContain('tab');repo.record(result(1100),puzzle);expect(repo.snapshot().runs).toHaveLength(2);}
 });
 it('works with no storage, preserving practice data only for this repository instance',()=>{const repo=new PracticeRepository(null,()=>1000,()=> 'memory-id');expect(repo.record(result(),puzzle).saved).toBe(false);expect(localRuns(repo.snapshot(),puzzle)).toHaveLength(1);expect(new PracticeRepository(null).snapshot().runs).toHaveLength(0);});
 it('bounds history while preserving the local best even when it is oldest',()=>{const f=fixture(),repo=f.repository();const best=repo.record(result(500),puzzle).run;for(let i=0;i<70;i++)repo.record(result(1000+i),puzzle);const restored=f.repository().snapshot();expect(restored.runs).toHaveLength(50);expect(localRuns(restored,puzzle)[0]).toEqual(best);});
 it('rejects non-completions and invalid routes supplied by the caller',()=>{const f=fixture();expect(()=>f.repository().record({...result(),route:['ice','room'],shifts:1},puzzle)).toThrow('invalid');});
});
describe('honest local comparison',()=>{
 it('orders fewer shifts first even when the longer route is faster',()=>{const f=fixture(),repo=f.repository();repo.record(result(60000),puzzle);repo.record(otherRoute(1000),puzzle);expect(localRuns(repo.snapshot(),puzzle).map(r=>[r.shifts,r.elapsedMs])).toEqual([[3,60000],[5,1000]]);});
 it('uses elapsed time only among equal-shift routes',()=>{const f=fixture(),repo=f.repository();repo.record(result(4000),puzzle);repo.record(result(2000),puzzle);repo.record(result(3000),puzzle);expect(localRuns(repo.snapshot(),puzzle).map(r=>r.elapsedMs)).toEqual([2000,3000,4000]);});
 it('detects first best, faster equal-shift best, and fewer-shift best',()=>{const f=fixture(),repo=f.repository();expect(repo.record(otherRoute(3000),puzzle).isNewBest).toBe(true);expect(repo.record(otherRoute(2000),puzzle).isNewBest).toBe(true);expect(repo.record(result(60000),puzzle).isNewBest).toBe(true);expect(repo.record(otherRoute(1000),puzzle).isNewBest).toBe(false);expect(repo.record(result(65000),puzzle).isNewBest).toBe(false);});
 it('does not award a new best for an exact tie; preserves deterministic older-first display',()=>{const f=fixture(),repo=f.repository();const first=repo.record(result(2000),puzzle);const tied=repo.record(result(2000),puzzle);expect(tied.isNewBest).toBe(false);expect(compareScores(first.run,tied.run)).toBe(0);expect(localRuns(repo.snapshot(),puzzle).map(r=>r.id)).toEqual([first.run.id,tied.run.id]);});
 it('keeps previous route data available without mixing in incompatible records',()=>{const f=fixture(),repo=f.repository();repo.record(otherRoute(),puzzle);repo.record(result(),puzzle);const routes=localRuns(f.repository().snapshot(),puzzle).map(r=>r.route);expect(routes).toContainEqual(['ice','box','car','pool','party','room']);expect(routes).toContainEqual(['ice','cold','war','room']);});
});
