import {it,expect} from 'vitest';
import {authoredServerEnabled} from '../../../config/chainshift-release';
import {authoredPlan,contentDigest,validAuthoredPublication} from './publication';
import {authoredCatalog} from './catalog';
it('requires explicit authored/Arcade flags and refuses legacy ranked/delivery overlap',()=>{
 for(const env of [{},{CHAINSHIFT_ARCADE_ENABLED:'true'},{CHAINSHIFT_AUTHORED_ENABLED:'true'},{CHAINSHIFT_ARCADE_ENABLED:'true',CHAINSHIFT_AUTHORED_ENABLED:'TRUE'},{CHAINSHIFT_ARCADE_ENABLED:'true',CHAINSHIFT_AUTHORED_ENABLED:'true',CHAINSHIFT_RANKED_ENABLED:'true'},{CHAINSHIFT_ARCADE_ENABLED:'true',CHAINSHIFT_AUTHORED_ENABLED:'true',CHAINSHIFT_DAILY_DELIVERY_ENABLED:'true'}])expect(authoredServerEnabled(env)).toBe(false);
 expect(authoredServerEnabled({CHAINSHIFT_ARCADE_ENABLED:'true',CHAINSHIFT_AUTHORED_ENABLED:'true',CHAINSHIFT_RANKED_ENABLED:'false',CHAINSHIFT_DAILY_DELIVERY_ENABLED:'false'})).toBe(true);
});
it('freezes seven dated daily chains and eight distinct practices without putting answers in publication metadata',()=>{
 const plan=authoredPlan('2026-10-29');expect(plan.rules).toBe('chainshift-authored-v2');expect(plan.entries.filter(p=>p.kind==='daily').map(p=>p.day)).toEqual(['2026-10-29','2026-10-30','2026-10-31','2026-11-01','2026-11-02','2026-11-03','2026-11-04']);expect(plan.entries.filter(p=>p.kind==='practice')).toHaveLength(8);expect(JSON.stringify(plan)).not.toMatch(/CLUB|HOUSE|PARTY|DANCE/);expect(()=>authoredPlan('2026-02-30')).toThrow();
 for(const p of authoredCatalog){const row={puzzle_id:p.id,rules_revision:plan.rules,kind:p.use,content_digest:contentDigest(p),answer_lengths:p.words.slice(1,-1).map(w=>w.length)};expect(validAuthoredPublication(row)).toBe(true);expect(validAuthoredPublication({...row,rules_revision:'chainshift-authored-v1'})).toBe(false);expect(validAuthoredPublication({...row,content_digest:'f'.repeat(64)})).toBe(false);}
});
