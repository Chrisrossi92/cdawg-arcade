import {it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {AuthoredService,FixedError} from './service';
import {authoredCatalog} from './catalog';
import {FIXED_RULES,fixedScore,normalizeGuess,type FixedView,type FixedAction} from '../../../shared/chainshift/authored/contract';
const base=Date.parse('2026-10-28T16:00:00Z');
function setup(){let now=base;const service=new AuthoredService(()=>now);return {service,advance:(ms:number)=>{now+=ms;},set:(ms:number)=>{now=ms;}};}
const act=(service:AuthoredService,view:FixedView,action:FixedAction,player='a')=>service.act(player,view.id,{requestId:randomUUID(),revision:view.revision,action});
it('all authored chains have exactly five missing answers and six explicitly checked expressions',()=>{
 expect(authoredCatalog).toHaveLength(15);expect(authoredCatalog.filter(p=>p.use==='daily')).toHaveLength(7);expect(authoredCatalog.filter(p=>p.use==='practice')).toHaveLength(8);
 for(const p of authoredCatalog){expect(p.words).toHaveLength(7);expect(p.phrases).toHaveLength(6);p.phrases.forEach((phrase,i)=>expect(phrase.toUpperCase().replace(/[ -]/g,'')).toBe(p.words[i]+p.words[i+1]));}
});
it('solves each final chain end to end, without historical graph validation',()=>{
 const {service,advance}=setup();
 for(const p of authoredCatalog){let view:FixedView;if(p.use==='daily'){view=service.home('a','A').daily!;}else view=service.practice('a','A',p.id,randomUUID());
  expect(view.puzzle.id).toBe(p.id);view=act(service,view,{kind:'start'});
  for(const answer of p.words.slice(1,-1)){advance(1000);view=act(service,view,{kind:'guess',word:answer});}
  expect(view.phase).toBe('completed');expect(view.current).toBe(6);expect(view.connections).toEqual(p.phrases);expect(view.hints).toBe(0);expect(view.score).toBe(995);if(p.use==='daily')advance(86_400_000-5000);
 }
});
it('hides answers and remaining connections until completion, including after a correct answer',()=>{
 const {service}=setup();let view=service.home('a','A').daily!;expect(view.rules).toBe(FIXED_RULES);expect(view.slots.map(s=>s.display)).toEqual(['BOOK','C___','H____','P____','L___','D____','FLOOR']);
 expect(JSON.stringify(view)).not.toContain('CLUB');expect(view.connections).toBeUndefined();view=act(service,view,{kind:'start'});view=act(service,view,{kind:'guess',word:'club'});
 expect(view.message).toContain('book club');expect(view.message).not.toContain('house');expect(view.slots[2].display).toBe('H____');
});
it('normalizes exact guesses, treats other plausible phrases kindly and makes repeated guesses harmless',()=>{
 const {service,advance}=setup();let view=act(service,service.home('a','A').daily!,{kind:'start'});advance(2500);view=act(service,view,{kind:'guess',word:'CASE'});expect(view.current).toBe(1);expect(view.message).toContain('another phrase may fit');expect(view.score).toBe(0);expect(view.mistakes).toBe(1);
 view=act(service,view,{kind:'guess',word:'case'});expect(view.mistakes).toBe(1);expect(view.hints).toBe(1);view=act(service,view,{kind:'guess',word:'  cLuB  '});expect(view.current).toBe(2);expect(normalizeGuess('cl-ub')).toBeNull();
});
it('reveals one extra letter per request; full reveal locks the word and cannot deadlock completion',()=>{
 const {service}=setup();let view=act(service,service.home('a','A').daily!,{kind:'start'});view=act(service,view,{kind:'hint'});expect(view.slots[1].display).toBe('CL__');expect(view.hints).toBe(1);expect(view.score).toBe(0);
 let limit=50;while(view.phase!=='completed'&&limit-->0)view=act(service,view,{kind:'hint'});
 expect(view.phase).toBe('completed');expect(view.hints).toBe(18);expect(view.score).toBe(500);expect(view.slots.every(s=>s.solved)).toBe(true);
});
it('idempotent retries cannot grant or charge a second hint, conflict payloads and revision races fail closed',()=>{
 const {service}=setup();let view=act(service,service.home('a','A').daily!,{kind:'start'});const request={requestId:randomUUID(),revision:view.revision,action:{kind:'hint'} as FixedAction};view=service.act('a',view.id,request);const retry=service.act('a',view.id,request);expect(retry).toEqual(view);expect(retry.hints).toBe(1);
 expect(()=>service.act('a',view.id,{...request,action:{kind:'guess',word:'CLUB'}})).toThrow('request_conflict');expect(()=>service.act('a',view.id,{...request,requestId:randomUUID()})).toThrow('state_conflict');
});
it('server time survives refresh, service restart and local clock rollback; completed result stays immutable',()=>{
 const {service,advance,set}=setup();let view=act(service,service.home('a','A').daily!,{kind:'start'});advance(63_456);view=act(service,view,{kind:'guess',word:'CLUB'});const restarted=new AuthoredService(()=>base+80_000,service.snapshot());expect(restarted.home('a','A').daily!.elapsedMs).toBe(80_000);expect(restarted.home('a','A').daily!.id).toBe(view.id);
 set(base+1000);expect(service.resume('a',view.id).elapsedMs).toBe(63_456);for(const word of ['HOUSE','PARTY','LINE','DANCE'])view=act(service,view,{kind:'guess',word});expect(view.elapsedMs).toBe(63_456);advance(999999);expect(service.resume('a',view.id).elapsedMs).toBe(63_456);expect(()=>act(service,view,{kind:'hint'})).toThrow('completed');
});
it('preserves active old-day attempts, picks the new day only after completion and never cycles the pack',()=>{
 const {service,advance}=setup();let view=act(service,service.home('a','A').daily!,{kind:'start'});advance(86_400_000);expect(service.home('a','A').daily!.day).toBe('2026-10-28');for(const word of ['CLUB','HOUSE','PARTY','LINE','DANCE'])view=act(service,view,{kind:'guess',word});expect(service.home('a','A').daily!.puzzle.id).toBe('authored-002');advance(8*86_400_000);expect(service.home('b','B').daily).toBeNull();expect(service.home('b','B').practice).toHaveLength(8);
});
it('practice is disjoint from daily, cannot write standings or reset the one daily result',()=>{
 const {service}=setup();const daily=service.home('a','A').daily!;const practice=service.practice('a','A','authored-p01',randomUUID());expect(practice.mode).toBe('practice');expect(service.home('a','A').daily!.id).toBe(daily.id);expect(()=>service.board('a',practice.id)).toThrow('practice_not_ranked');expect(()=>service.practice('a','A',daily.puzzle.id,randomUUID())).toThrow('invalid_request');expect(()=>service.resume('b',daily.id)).toThrow('not_found');
});
it('scores transparently, floors at zero and ranks by points then exact time, sharing exact ties',()=>{
 expect(fixedScore(2,75_999,true)).toBe(825);expect(fixedScore(100,100_000_000,true)).toBe(500);const {service,advance}=setup();
 for(const player of ['a','b']){let v=act(service,service.home(player,player).daily!,{kind:'start'},player);advance(500);for(const w of ['CLUB','HOUSE','PARTY','LINE','DANCE'])v=act(service,v,{kind:'guess',word:w},player);}
 const view=service.home('a','a').daily!;expect(service.board('a',view.id).map(r=>r.rank)).toEqual([1,1]);expect(service.board('a',view.id).every(r=>r.score===1000)).toBe(true);
});
it('a failed durable write cannot change the in-memory attempt; practice creation retry uses the same attempt',()=>{
 let blocked=false;const service=new AuthoredService(()=>base,undefined,()=>{if(blocked)throw Error('disk');});const view=service.home('a','A').daily!;blocked=true;expect(()=>act(service,view,{kind:'start'})).toThrow('disk');expect(service.resume('a',view.id).phase).toBe('ready');blocked=false;const request=randomUUID(),p=service.practice('a','A','authored-p01',request);expect(service.practice('a','A','authored-p01',request).id).toBe(p.id);expect(FixedError).toBeDefined();
});
it('does not let a preloaded yesterday puzzle claim a new start or reset an already running clock',()=>{
 const {service,advance}=setup();const ready=service.home('a','A').daily!;advance(86_400_000);expect(()=>act(service,ready,{kind:'start'})).toThrow('day_changed');let today=service.home('a','A').daily!;expect(today.puzzle.id).toBe('authored-002');today=act(service,today,{kind:'start'});advance(5000);today=act(service,today,{kind:'start'});expect(today.elapsedMs).toBe(5000);expect(today.score).toBe(0);
});
it('uses the displayed time/hint tradeoff and exact milliseconds to order tied point scores',()=>{
 const {service,advance}=setup();for(const [player,duration,hint] of [['fast',1100,false],['slow',1900,false],['help',100,true]] as const){let view=act(service,service.home(player,player).daily!,{kind:'start'},player);if(hint)view=act(service,view,{kind:'hint'},player);advance(duration);for(const word of ['CLUB','HOUSE','PARTY','LINE','DANCE'])view=act(service,view,{kind:'guess',word},player);}
 const daily=service.home('fast','fast').daily!,rows=service.board('fast',daily.id);expect(rows.map(r=>r.name)).toEqual(['fast','slow','help']);expect(rows.map(r=>r.rank)).toEqual([1,2,3]);expect(rows[0].score).toBe(rows[1].score);expect(rows[2].score).toBe(950);
});
it('rejects hints/guesses before start and malformed guesses never consume a hint or mistake',()=>{
 const {service}=setup();let view=service.home('a','A').daily!;expect(()=>act(service,view,{kind:'hint'})).toThrow('not_started');expect(()=>act(service,view,{kind:'guess',word:'CLUB'})).toThrow('not_started');view=act(service,view,{kind:'start'});for(const word of ['','  ','cl-ub','clüb','123'])view=act(service,view,{kind:'guess',word});expect(view.current).toBe(1);expect(view.mistakes).toBe(0);expect(view.hints).toBe(0);
});

it('v2 gives one automatic letter/penalty for a wrong word, no double charge or repeated-word free reveal',()=>{
 const {service}=setup();let v=act(service,service.home('a','A').daily!,{kind:'start'});v=act(service,v,{kind:'guess',word:'CASE'});expect(v.hints).toBe(1);expect(v.mistakes).toBe(1);expect(v.slots[1].display).toBe('CL__');expect(v.score).toBe(0);
 v=act(service,v,{kind:'guess',word:'CASE'});expect(v.hints).toBe(1);expect(v.slots[1].display).toBe('CL__');v=act(service,v,{kind:'hint'});v=act(service,v,{kind:'guess',word:'CORK'});expect(v.current).toBe(2);expect(v.slots[1].display).toBe('CLUB');expect(v.hints).toBe(3);expect(v.mistakes).toBe(2);
});
it('v2 score examples, incomplete floor and version isolation are explicit',()=>{
 expect(fixedScore(0,60000,true)).toBe(940);expect(fixedScore(6,180000,true)).toBe(520);expect(fixedScore(7,300000,true)).toBe(500);expect(fixedScore(0,0,false)).toBe(0);
 expect(()=>new AuthoredService(()=>base,{rules:'chainshift-authored-v1',baseDay:'2026-10-28',attempts:[]} as any)).toThrow('Invalid authored store');
 for(const hints of [0,1,7,20])for(const time of [0,1000,60000,300000])expect(fixedScore(hints,time,true)).toBeGreaterThanOrEqual(fixedScore(hints,time+1000,true));
});
