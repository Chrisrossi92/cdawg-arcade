import {describe,it,expect} from 'vitest';
import {createReferee,RULES,type Edge} from './rules.js';
import {seedReferee} from './seed.js';
import {createAnalysis} from './analysis.js';
import {createManifest,selectDailyPuzzle,verifyManifest} from './manifest.js';
import {dayKey,createDailyClock} from './daily.js';
import {localPuzzles} from './local-puzzles.js';
const fixture=(pairs:readonly string[], inactive:readonly string[]=[])=>createReferee({version:'chainshift-graph-v99',rulesRevision:RULES.revision,
 edges:pairs.map(pair=>{const [from,to]=pair.split(' ');return {from,to,fromDisplay:from.toUpperCase(),toDisplay:to.toUpperCase(),phrase:pair,category:'compound',rating:'G',approval:'approved',enabled:!inactive.includes(pair),editorialSource:'synthetic-test'} as Edge;})});
const branches=['s a','a b','b t','s c','c d','d t'];
const graph=()=>createAnalysis(fixture(branches));
describe('deterministic directed analysis',()=>{
 it('BFS finds shortest directed route and handles no route',()=>{
  const a=graph();expect(a.shortest(' S ','T')).toEqual({shifts:3,route:['s','a','b','t']});
  expect(a.shortest('t','s')).toBeNull();expect(a.shortest('missing','t')).toBeNull();expect(a.shortest('s','s')).toEqual({shifts:0,route:['s']});
 });
 it('finds a shorter branch rather than the first DFS path',()=>expect(createAnalysis(fixture([...branches,'s e','e t'])).shortest('s','t')?.shifts).toBe(2));
 it('counts shortest paths with explicit cap overflow',()=>{
  expect(graph().shortestCount('s','t',1)).toEqual({count:1,capped:true});
  expect(graph().shortestCount('s','t',2)).toEqual({count:2,capped:false});
  expect(graph().shortestCount('t','s',2)).toEqual({count:0,capped:false});
  expect(()=>graph().shortestCount('s','t',0)).toThrow();
 });
 it('measures different openings, approaches and disjoint interiors',()=>{
  const m=graph().diversity('s','t')!;expect(m.openings).toEqual(['a','c']);expect(m.approaches).toEqual(['b','d']);
  expect(m.countsByExtraShift).toEqual({0:2,1:0,2:0,3:0});expect(m.minInternalOverlap).toBe(0);expect(m.mandatory).toEqual([]);expect(m.truncated).toBe(false);
 });
 it('excludes cycles and reports exact near-optimal lengths',()=>{
  const m=createAnalysis(fixture([...branches,'b s','a e','e b'])).diversity('s','t')!;
  expect(m.countsByExtraShift[0]).toBe(2);expect(m.countsByExtraShift[1]).toBe(1);expect(m.routeCount).toBe(3);
 });
 it('distinguishes a dominant node from a strictly mandatory node',()=>{
  const leaves='abcdefghij'.split('').map(n=>'z'+n);
  const pairs=['s x','s y','y q','q t',...leaves.flatMap(n=>[`x ${n}`,`${n} t`])];
  const a=createAnalysis(fixture(pairs)),m=a.diversity('s','t')!;
  expect(m.mandatory).toEqual([]);expect(m.boundedMandatory).toEqual([]);
  expect(m.dominant.find(n=>n.word==='x')!.fraction).toBeCloseTo(10/11);
  expect(a.evaluate('s','t').reasons).toContain('dominant_bottleneck');
 });
 it('bounded enumeration exposes route and work limits',()=>{
  expect(graph().diversity('s','t',{routeCap:1})?.truncated).toBe(true);
  expect(graph().diversity('s','t',{expansionCap:1})?.truncated).toBe(true);
  expect(()=>graph().diversity('s','t',{extraShifts:-1})).toThrow();
  expect(()=>graph().diversity('s','t',{routeCap:Infinity})).toThrow();
 });
 it('identifies global mandatory bottlenecks despite several routes',()=>{
  const a=createAnalysis(fixture(['s a','s c','a x','c x','x b','x d','b t','d t']));
  expect(a.diversity('s','t')?.mandatory).toEqual(['x']);expect(a.evaluate('s','t').reasons).toContain('mandatory_bottleneck');
 });
 it('detects bottlenecks within the bound even with a long bypass',()=>{
  const a=createAnalysis(fixture(['s a','a x','x b','b t','s c','c d','d e','e f','f g','g h','h i','i t']));
  const m=a.diversity('s','t')!;expect(m.mandatory).toEqual([]);expect(m.boundedMandatory).toEqual(['a','x','b']);
 });
 it('does not confuse similar routes with strategic diversity',()=>{
  const a=createAnalysis(fixture(['s a','a b','b x','a c','c x','x t']));
  expect(a.diversity('s','t')!.minInternalOverlap).toBe(0.5);expect(a.evaluate('s','t').accepted).toBe(false);
 });
 it('reports overlap and prevalence for every bounded route',()=>{
  const m=graph().diversity('s','t')!;expect(m.meanInternalOverlap).toBe(0);expect(m.dominant.every(n=>n.fraction===0.5)).toBe(true);
 });
 it('measures weak/strong components, sources, sinks and inactive isolates',()=>{
  const h=createAnalysis(fixture(['a b','b a','b c','x y','z q'],['z q'])).health();
  expect(h.nodeCount).toBe(7);expect(h.edgeCount).toBe(4);expect(h.weakComponents).toEqual([['a','b','c'],['x','y'],['q'],['z']]);
  expect(h.strongComponents[0]).toEqual(['a','b']);expect(h.isolated).toEqual(['q','z']);expect(h.sources).toEqual(['x']);expect(h.sinks).toEqual(['c','y']);
  expect(h.reachablePairs).toBe(5);expect(h.shortestLengths).toMatchObject({'1':4,'2':1});
 });
 it('only approved enabled edges participate in reachability',()=>{
  expect(createAnalysis(fixture(branches,['b t','d t'])).shortest('s','t')).toBeNull();
  const r=fixture(branches);const pending=createReferee({...r.snapshot,edges:r.snapshot.edges.map(e=>e.to==='t'?{...e,approval:'pending' as const}:e)});
  expect(createAnalysis(pending).evaluate('s','t').reasons).toContain('unreachable');
 });
 it('accepts useful branching and rejects bad endpoints or snapshot pins',()=>{
  const a=graph();expect(a.evaluate('s','t').accepted).toBe(true);
  expect(a.evaluate('s','s').reasons).toContain('identical_endpoints');expect(a.evaluate('s','a').reasons).toContain('direct_connection');
  expect(a.evaluate('t','s').reasons).toContain('unreachable');
  for(const change of [{graphVersion:'chainshift-graph-v100'},{checksum:'wrong'},{rulesRevision:'wrong'}])expect(a.evaluate('s','t',{...a.identity,...change}).reasons).toContain('snapshot_mismatch');
 });
 it('rejects an obvious two-shift puzzle and a single-path chain',()=>{
  expect(createAnalysis(fixture(['s a','a t','s b','b t'])).evaluate('s','t').reasons).toContain('outside_experimental_length_range');
  expect(createAnalysis(fixture(branches.slice(0,3))).evaluate('s','t').reasons).toContain('insufficient_strategic_diversity');
 });
 it('fails closed when candidate enumeration is incomplete',()=>{
  const letters='abcdefghi'.split(''),layers=['b','c','d'].map(p=>letters.map(c=>p+c)),pairs:string[]=[];
  for(const n of layers[0])pairs.push(`s ${n}`);
  for(let i=1;i<layers.length;i++)for(const x of layers[i-1])for(const y of layers[i])pairs.push(`${x} ${y}`);
  for(const n of layers[2])pairs.push(`${n} t`);
  expect(createAnalysis(fixture(pairs)).evaluate('s','t').reasons).toContain('analysis_incomplete');
 });
 it('gives identical certificates across runs and edge ordering',()=>{
  expect(graph().evaluate('s','t')).toEqual(graph().evaluate('s','t'));
  expect(createAnalysis(fixture([...branches].reverse())).diversity('s','t')).toEqual(graph().diversity('s','t'));
 });
 it('pins measured seed health without changing graph-v1',()=>{
  const h=createAnalysis(seedReferee).health();expect(h.nodeCount).toBe(293);expect(h.edgeCount).toBe(333);
  expect(h.weakComponents[0]).toHaveLength(257);expect(h.strongComponents[0]).toHaveLength(49);
  expect(h.reachablePairs).toBe(14408);expect(h.shortestLengths).toEqual({'1':333,'2':461,'3':644,'4':876,'5':1160,'6':1372,'7+':9562});
  expect(h.sinks).toHaveLength(65);expect(h.sources).toHaveLength(67);expect(h.isolated).toEqual([]);
 });
});
describe('immutable local manifest',()=>{
 const input={id:'chainshift-local-test',number:1,day:'2026-10-05',start:'s',finish:'t',generatedAt:'2026-10-04T00:00:00.000Z'};
 it('creates only accepted fixtures with frozen nested certificates',()=>{
  const r=fixture(branches),m=createManifest(r,input);expect(m.start).toEqual({key:'s',display:'S'});expect(m.publicationStatus).toBe('local-review');
  expect(Object.isFrozen(m)).toBe(true);expect(Object.isFrozen(m.diversityCertificate.representativeRoutes[0])).toBe(true);expect(verifyManifest(r,m)).toBe(true);
  expect(verifyManifest(r,Object.fromEntries(Object.entries(m).reverse()) as typeof m)).toBe(true);
  expect(()=>createManifest(r,{...input,start:'a',finish:'s'})).toThrow(/rejected/);
 });
 it('rejects stale pins and tampered certificates',()=>{
  const r=fixture(branches),m=createManifest(r,input);
  expect(verifyManifest(r,{...m,checksum:'wrong'})).toBe(false);
  expect(verifyManifest(r,{...m,shortestCertificate:{...m.shortestCertificate,shifts:999}})).toBe(false);
  expect(verifyManifest(r,{...m,graphVersion:'future'})).toBe(false);
 });
 it('rejects malformed identity/date metadata',()=>{
  for(const change of [{number:0},{id:'bad'},{day:'2026-02-30'},{generatedAt:'invalid'},{generatedAt:'2026-02-30T00:00:00.000Z'}])expect(()=>createManifest(fixture(branches),{...input,...change})).toThrow();
 });
 it('all ten local fixtures actually pass and retain snapshot identity',()=>{
  expect(localPuzzles).toHaveLength(10);for(const m of localPuzzles){expect(verifyManifest(seedReferee,m)).toBe(true);expect(m.checksum).toBe('fnv1a64:dc521a64e4cc01fb');}
 });
 it('selects by NY day, reports absent/duplicate days and preserves the starting fixture',()=>{
  const before=selectDailyPuzzle(localPuzzles,Date.parse('2026-10-06T03:59:59Z'))!;
  const after=selectDailyPuzzle(localPuzzles,Date.parse('2026-10-06T04:00:00Z'))!;
  expect(before.day).toBe('2026-10-05');expect(after.day).toBe('2026-10-06');expect(before.day).toBe('2026-10-05');
  expect(selectDailyPuzzle(localPuzzles,0)).toBeNull();expect(()=>selectDailyPuzzle([before,before],Date.parse('2026-10-05T12:00:00Z'))).toThrow(/duplicate/);
 });
});
describe('America/New_York injected daily boundary',()=>{
 it.each([
  ['2026-01-05T04:59:59Z','2026-01-04'],['2026-01-05T05:00:00Z','2026-01-05'],
  ['2026-07-05T03:59:59Z','2026-07-04'],['2026-07-05T04:00:00Z','2026-07-05'],
  ['2026-03-08T04:59:59Z','2026-03-07'],['2026-03-08T05:00:00Z','2026-03-08'],
  ['2026-03-08T06:59:59Z','2026-03-08'],['2026-03-08T07:00:00Z','2026-03-08'],
  ['2026-03-09T03:59:59Z','2026-03-08'],['2026-03-09T04:00:00Z','2026-03-09'],
  ['2026-11-01T03:59:59Z','2026-10-31'],['2026-11-01T04:00:00Z','2026-11-01'],
  ['2026-11-01T05:30:00Z','2026-11-01'],['2026-11-01T06:30:00Z','2026-11-01'],
  ['2026-11-02T04:59:59Z','2026-11-01'],['2026-11-02T05:00:00Z','2026-11-02'],
 ])('maps %s to %s',(instant,day)=>expect(dayKey(Date.parse(instant))).toBe(day));
 it('injects the clock without reading real time',()=>{
  let now=Date.parse('2026-10-05T03:59:59Z');const clock=createDailyClock(()=>now);
  expect(clock.dayKey()).toBe('2026-10-04');now+=1000;expect(clock.dayKey()).toBe('2026-10-05');
 });
 it('rejects nonfinite instants',()=>expect(()=>dayKey(NaN)).toThrow());
});
