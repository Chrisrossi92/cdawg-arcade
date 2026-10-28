import {createHash} from 'node:crypto';
import type {SqlConnection} from '../../database/pool.js';
import {FIXED_RULES} from '../../../shared/chainshift/authored/contract.js';
import {authoredCatalog,authoredCatalogApproved,authoredById,type AuthoredPuzzle} from './catalog.js';
export const contentDigest=(p:AuthoredPuzzle)=>createHash('sha256').update(JSON.stringify([FIXED_RULES,p.id,p.use,p.words,p.phrases])).digest('hex');
export interface AuthoredPlan {rules:typeof FIXED_RULES;startDay:string;entries:{id:string;kind:'daily'|'practice';day:string|null;digest:string}[]}
export function authoredPlan(startDay:string):AuthoredPlan {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(startDay)||!Number.isFinite(Date.parse(startDay+'T12:00:00Z'))||new Date(startDay+'T12:00:00Z').toISOString().slice(0,10)!==startDay)throw Error('invalid day');
 let offset=0;return {rules:FIXED_RULES,startDay,entries:authoredCatalog.map(p=>({id:p.id,kind:p.use,day:p.use==='daily'?new Date(Date.parse(startDay+'T12:00:00Z')+offset++*86400000).toISOString().slice(0,10):null,digest:contentDigest(p)}))};
}
export function validAuthoredPublication(row:Record<string,any>):boolean {const p=authoredById(row.puzzle_id);return !!p&&row.rules_revision===FIXED_RULES&&row.kind===p.use&&row.content_digest===contentDigest(p)&&JSON.stringify(row.answer_lengths)===JSON.stringify(p.words.slice(1,-1).map(w=>w.length));}
/** Administrator only; exact reviewed manifest, all feature gates off. Never called on startup. */
export async function publishAuthoredPlan(c:SqlConnection,plan:AuthoredPlan,allowFixture=false){
 if(!authoredCatalogApproved&&!allowFixture)throw Error('approved private content required');
 if(JSON.stringify(plan)!==JSON.stringify(authoredPlan(plan.startDay)))throw Error('unreviewed manifest');
 const today=(await c.query("SELECT to_char(clock_timestamp() AT TIME ZONE 'America/New_York','YYYY-MM-DD') AS day")).rows[0].day;
 if(plan.startDay<today)throw Error('stale plan');
 for(const entry of plan.entries){const p=authoredById(entry.id)!;const prior=(await c.query('SELECT *,day_key::text AS day FROM arcade.chainshift_authored_puzzles WHERE puzzle_id=$1',[entry.id])).rows[0];
  if(prior){if(!validAuthoredPublication(prior)||prior.day!==entry.day)throw Error('conflicting publication');continue;}
  await c.query('INSERT INTO arcade.chainshift_authored_puzzles(puzzle_id,rules_revision,content_digest,kind,day_key,answer_lengths) VALUES($1,$2,$3,$4,$5,$6)',[p.id,FIXED_RULES,entry.digest,p.use,entry.day,p.words.slice(1,-1).map(w=>w.length)]);
 }
}
