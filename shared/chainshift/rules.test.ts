import {describe, it, expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {seedCorpus,seedReferee as referee} from './seed.js';
import {normalizeWord,validateCorpus,createReferee,graphChecksum,RULES,CATEGORIES,type Edge,type Corpus} from './rules.js';
const edge=seedCorpus.edges.find(e=>e.from==='house'&&e.to==='party')!;
const corpus=(edges: readonly Edge[]):Corpus=>({...seedCorpus,edges});
describe('Chainshift narrow normalization',()=>{
 it.each(['HOUSE',' house ','\tHouse\n'])('normalizes %j',input=>expect(normalizeWord(input)).toBe('house'));
 it.each(['', ' ', 'two words', 'ice-cream', "don't", 'café','123','a\0b','ＡＢＣ','K',null,undefined,42,{},['house']])('rejects %j',input=>expect(normalizeWord(input)).toBeNull());
 it('does not alter exact inflections',()=>{
  expect(normalizeWord('HOUSES')).toBe('houses');
  for(const [a,b] of [['houses','party'],['house','parties'],['charged','card'],['charge','cards'],['charging','card']])expect(referee.isValidShift(a,b)).toBe(false);
 });
});
describe('approved directed referee',()=>{
 it.each([['house','party'],['heavy','metal'],['charge','card'],['blue','fish'],['super','mario'],['skill','issue']])('accepts %s → %s',(a,b)=>expect(referee.lookupEdge(a,b)).not.toBeNull());
 it.each([['party','house'],['metal','heavy'],['piece','cake'],['level','playing'],['random','table']])('rejects %s → %s',(a,b)=>expect(referee.isValidShift(a,b)).toBe(false));
 it('returns canonical metadata',()=>expect(referee.lookupEdge(' BLUE ','FISH')).toMatchObject({phrase:'bluefish',rating:'G',approval:'approved',enabled:true}));
 it('only referees approved enabled edges',()=>{
  for(const altered of [{...edge,enabled:false},{...edge,approval:'pending' as const},{...edge,approval:'rejected' as const}]) {
   const r=createReferee(corpus([altered]));expect(r.isValidShift('house','party')).toBe(false);expect(r.outgoing('house')).toEqual([]);expect(r.incoming('party')).toEqual([]);
  }
 });
 it('enumerates incoming and outgoing branches',()=>{
  expect(referee.outgoing(' ROOM ').map(e=>e.to)).toEqual(['charge','mate','service','temperature']);
  expect(referee.incoming('room').map(e=>e.from)).toContain('band');
  expect(referee.incoming('room').length).toBeGreaterThan(5);
  expect(referee.outgoing(null)).toEqual([]);
 });
 it.each(['cold open fire','blue fish dinner table','heavy metal band room charge card'])('validates design chain %s',chain=>{
  const words=chain.split(' ');for(let i=1;i<words.length;i++)expect(referee.isValidShift(words[i-1],words[i])).toBe(true);
 });
 it('remains deterministic on repeated lookup',()=>{for(let i=0;i<100;i++)expect(referee.lookupEdge('house','party')).toBe(referee.lookupEdge('HOUSE','PARTY'));});
 it('copies and deeply freezes published data',()=>{
  const mutable={...edge}, input=corpus([mutable]), r=createReferee(input);mutable.enabled=false;
  expect(r.isValidShift('house','party')).toBe(true);
  expect(Object.isFrozen(r.snapshot.edges[0])).toBe(true);expect(Object.isFrozen(r.snapshot.edges)).toBe(true);expect(Object.isFrozen(r.outgoing('house'))).toBe(true);
 });
});
describe('corpus checks and identity',()=>{
 it('validates seed size, categories and classifications',()=>{
  expect(validateCorpus(seedCorpus)).toEqual([]);expect(seedCorpus.edges).toHaveLength(333);
  expect(new Set(seedCorpus.edges.flatMap(e=>[e.from,e.to])).size).toBe(293);
  expect(new Set(seedCorpus.edges.map(e=>e.category))).toEqual(new Set(CATEGORIES));
  expect(seedCorpus.edges.every(e=>e.rating==='G'&&e.approval==='approved'&&e.enabled&&e.editorialSource)).toBe(true);
 });
 it.each([
  {...edge,from:'HOUSE'}, {...edge,to:''}, {...edge,fromDisplay:'HOUSES'}, {...edge,to:'house',toDisplay:'HOUSE',phrase:'house house'},
  {...edge,rating:'R'}, {...edge,approval:undefined}, {...edge,enabled:undefined}, {...edge,editorialSource:''}, {...edge,category:'unknown'}, {...edge,phrase:'house of party'},
 ])('rejects malformed corpus edge %#',altered=>expect(()=>createReferee(corpus([altered as Edge]))).toThrow());
 it('rejects duplicate edges, empty corpus and unsupported identities',()=>{
  expect(()=>createReferee(corpus([edge,edge]))).toThrow(/duplicate/);
  expect(()=>createReferee(corpus([]))).toThrow(/empty/);
  expect(()=>createReferee({...seedCorpus,version:''})).toThrow(/version/);
  expect(()=>createReferee({...seedCorpus,rulesRevision:'future'})).toThrow(/revision/);
 });
 it('pins deterministic checksum and order independence',()=>{
  expect(graphChecksum(seedCorpus)).toBe('fnv1a64:dc521a64e4cc01fb');
  expect(graphChecksum({...seedCorpus,edges:[...seedCorpus.edges].reverse()})).toBe(referee.identity.checksum);
  expect(graphChecksum(corpus([{...edge,enabled:false}]))).not.toBe(graphChecksum(corpus([edge])));
  expect(graphChecksum({...seedCorpus,version:'chainshift-graph-v2'})).not.toBe(referee.identity.checksum);
 });
 it('future additions cannot mutate an existing referee',()=>{
  const next=createReferee({...seedCorpus,version:'chainshift-graph-v2',edges:[...seedCorpus.edges,{...edge,from:'party',to:'house',fromDisplay:'PARTY',toDisplay:'HOUSE',phrase:'party house'}]});
  expect(next.isValidShift('party','house')).toBe(true);expect(referee.isValidShift('party','house')).toBe(false);
 });
 it('records final-route scoring without implementing time',()=>expect(RULES).toMatchObject({score:'completed-final-route-edges',backtrackedEdgesCount:false,explorationCost:'elapsed-time',language:'en-US',contentCeiling:'PG-13'}));
 it('keeps the human review report reproducible',()=>{
  const output=execFileSync(process.execPath,['--import','tsx','shared/chainshift/review.ts'],{encoding:'utf8'});
  expect(output).toBe(readFileSync('shared/chainshift/SEED_REVIEW.md','utf8'));
 });
});
