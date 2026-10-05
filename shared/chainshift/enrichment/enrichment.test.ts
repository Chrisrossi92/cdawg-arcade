import {describe,it,expect} from 'vitest';
import {readFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {seedCorpus,seedReferee} from '../seed.js';
import {createReferee,validateCorpus,graphChecksum,type Edge} from '../rules.js';
import {createAnalysis} from '../analysis.js';
import {localPuzzles} from '../local-puzzles.js';
import {verifyManifest} from '../manifest.js';
import {enrichedCorpus,enrichedReferee,additions} from './graph-v2.js';
import {localPuzzlesV2} from './local-puzzles-v2.js';
import review from './review-data.json' with {type:'json'};
import iteration from './iteration.json' with {type:'json'};
import metrics from './METRICS_V2.json' with {type:'json'};
const a=createAnalysis(enrichedReferee);
describe('bounded independent enrichment snapshot',()=>{
 it('pins a new immutable graph and leaves v1 unchanged',()=>{
  expect(seedReferee.identity).toEqual({graphVersion:'chainshift-graph-v1',rulesRevision:'chainshift-rules-v1',checksum:'fnv1a64:dc521a64e4cc01fb'});
  expect(enrichedReferee.identity).toEqual({graphVersion:'chainshift-graph-v2',rulesRevision:'chainshift-rules-v1',checksum:'fnv1a64:029bb9393f7bbe48'});
  expect(enrichedReferee.identity.checksum).toBe(graphChecksum(enrichedCorpus));
  expect(enrichedCorpus.edges.slice(0,333)).toEqual(seedCorpus.edges);
  expect(Object.isFrozen(enrichedCorpus.edges)).toBe(true);expect(Object.isFrozen(additions[0])).toBe(true);
 });
 it('keeps the bounded batch and its review metadata consistent',()=>{
  expect(review).toHaveLength(113);expect(additions).toHaveLength(102);expect(additions.length).toBeLessThanOrEqual(250);
  const approved=review.filter(r=>r.approval==='approved');expect(approved).toHaveLength(102);expect(review.filter(r=>r.approval==='rejected')).toHaveLength(11);
  expect(validateCorpus(enrichedCorpus)).toEqual([]);
  expect(new Set(additions.map(e=>`${e.from}\0${e.to}`)).size).toBe(102);
  for(const e of additions){
   const r=approved.find(r=>r.from===e.from&&r.to===e.to)!;
   expect(r).toBeDefined();expect(r.evidence.corroborated).toBe(true);expect(r.purpose).toBeTruthy();expect(r.category).toBe(e.category);expect(r.rating).toBe('G');
   expect(r.evidence).toHaveProperty('url');expect(e.editorialSource).toContain('https://');expect(e.approval).toBe('approved');expect(e.enabled).toBe(true);
   expect(seedReferee.isValidShift(e.from,e.to)).toBe(false);
  }
  expect(new Set(additions.flatMap(e=>[e.from,e.to]).filter(w=>!new Set(seedCorpus.edges.flatMap(e=>[e.from,e.to])).has(w))).size).toBe(41);
 });
 it.each([['club','room','clubroom'],['over','time','overtime'],['out','house','outhouse'],['cheese','board','cheeseboard'],['chicken','stock','chicken stock'],['sheet','music','sheet music'],['music','box','music box'],['horse','play','horseplay'],['train','car','train car'],['show','room','showroom'],['day','time','daytime'],['power','line','powerline']])('approves %s → %s',(from,to,phrase)=>expect(enrichedReferee.lookupEdge(from,to)?.phrase).toBe(phrase));
 it.each([['piece','cake'],['kitchen','code'],['train','cheese'],['puff','ball'],['hose','pipe'],['kitchen','garden'],['station','master'],['station','break'],['iron','horse'],['burger','king'],['magic','show']])('does not license nonselected %s → %s',(from,to)=>expect(enrichedReferee.isValidShift(from,to)).toBe(false));
 it('preserves exact forms and directionality without aliases',()=>{
  expect(enrichedReferee.isValidShift(' CLUB ','ROOM')).toBe(true);
  for(const [s,t]of[['clubs','room'],['club','rooms'],['time','over'],['ice-cold','cream'],['sheet','musics']])expect(enrichedReferee.isValidShift(s,t)).toBe(false);
 });
 it('records the unpublished draft reproducibly without approving rejected edges in v2',()=>{
  const selected=review.find(e=>e.from==='station'&&e.to==='break')!;
  const restored:Edge={from:selected.from,to:selected.to,fromDisplay:'STATION',toDisplay:'BREAK',phrase:selected.phrase,category:'entertainment',rating:'G',approval:'approved',enabled:true,editorialSource:'chainshift-enrichment-editorial-v2:https://en.wiktionary.org/wiki/station_break'};
  const draft=additions.filter(e=>!['sheet music','music box','show room','day time','power line'].includes(`${e.from} ${e.to}`)).map(e=>e.from==='chicken'&&e.to==='stock'?{...e,editorialSource:iteration.draftEditorialSourceOverrides['chicken stock']}:e);
  expect(createReferee({...enrichedCorpus,edges:[...seedCorpus.edges,...draft,restored]}).identity).toEqual(iteration.identity);
  expect(enrichedReferee.isValidShift('station','break')).toBe(false);
 });
});
describe('unchanged-policy navigation and puzzle analysis',()=>{
 it('pins enriched health, degree and connectivity metrics',()=>{
  const h=a.health();expect(h).toEqual(metrics.after.health);expect(h.nodeCount).toBe(334);expect(h.edgeCount).toBe(435);
  expect(h.weakComponents).toHaveLength(4);expect(h.weakComponents[0]).toHaveLength(327);expect(h.strongComponents[0]).toHaveLength(105);
  expect(h.reachablePairs).toBe(33273);expect(h.sources).toHaveLength(68);expect(h.sinks).toHaveLength(60);
  expect(h.degree.filter(d=>d.outgoing>=2)).toHaveLength(106);expect(h.degree.filter(d=>d.incoming>=2)).toHaveLength(82);
 });
 it('makes the human route valid without claiming it is optimal',()=>{
  const words=['game','over','time','out','house'];for(let i=1;i<words.length;i++)expect(enrichedReferee.isValidShift(words[i-1],words[i])).toBe(true);
  expect(a.shortest('game','house')?.shifts).toBe(3);expect(a.evaluate('game','house').accepted).toBe(true);
 });
 it('exposes the obvious shorter BOOK route and rejects it under the unchanged length policy',()=>{
  expect(createAnalysis(seedReferee).shortest('book','room')?.shifts).toBe(4);
  expect(a.shortest('book','room')).toEqual({shifts:2,route:['book','club','room']});
  expect(a.evaluate('book','room').reasons).toContain('outside_experimental_length_range');
 });
 it('does not optimize BOARD → FOOD into acceptance',()=>{
  expect(a.shortest('board','food')?.shifts).toBe(6);expect(a.evaluate('board','food').reasons).toContain('dominant_bottleneck');
 });
 it('reconstructs old fixtures against old identity and separately verifies v2 fixtures',()=>{
  for(const m of localPuzzles){expect(verifyManifest(seedReferee,m)).toBe(true);expect(verifyManifest(enrichedReferee,m)).toBe(false);}
  expect(localPuzzlesV2).toHaveLength(10);
  for(const m of localPuzzlesV2){expect(verifyManifest(enrichedReferee,m)).toBe(true);expect(verifyManifest(seedReferee,m)).toBe(false);expect(m.publicationStatus).toBe('local-review');expect(Object.isFrozen(m.diversityCertificate.representativeRoutes[0])).toBe(true);}
 });
 it('keeps distributed additions below the previous maximum outgoing degree',()=>{
  const oldWords=new Set(createAnalysis(seedReferee).nodes);expect(a.health().degree.filter(d=>!oldWords.has(d.word)).every(d=>d.outgoing<=3)).toBe(true);
  expect(a.health().outgoingHubs[0]).toMatchObject({word:'game',outgoing:6});
 });
});
it('reproduces offline v2 reports twice without modifying historical artifacts',()=>{
 const temporary=mkdtempSync(join(tmpdir(),'chainshift-enrichment-'));
 const files=['ENRICHMENT_REVIEW.md','TOPOLOGY_COMPARISON.md','CANDIDATES_V2.md','LOCAL_PUZZLES_V2.json','METRICS_V2.json'];
 try{
  mkdirSync(join(temporary,'shared/chainshift/enrichment'),{recursive:true});
  const args=['--import',resolve('node_modules/tsx/dist/loader.mjs'),resolve('shared/chainshift/enrichment/reports-v2.ts')];
  for(let i=0;i<2;i++){
   execFileSync(process.execPath,args,{cwd:temporary,timeout:60000});
   for(const file of files)expect(readFileSync(join(temporary,'shared/chainshift/enrichment',file),'utf8')).toBe(readFileSync(resolve('shared/chainshift/enrichment',file),'utf8'));
  }
 }finally{rmSync(temporary,{recursive:true,force:true});}
},60000);
