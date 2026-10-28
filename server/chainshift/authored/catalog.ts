/** Server-only private content loader; public fixtures contain only the exposed demo. */
import {createHash} from 'node:crypto';
import {APPROVED_CONTENT_SHA256,RESERVE_CONTENT_SHA256} from './content-policy.js';
export interface AuthoredPuzzle {id:string;title:string;use:'daily'|'practice';words:readonly string[];phrases:readonly string[]}
function checked(v:any):AuthoredPuzzle {
 if(!v||typeof v.id!=='string'||!/^authored-[a-z0-9-]{1,30}$/.test(v.id)||typeof v.title!=='string'||v.title.length>80||!['daily','practice'].includes(v.use)||!Array.isArray(v.words)||v.words.length!==7||v.words.some((w:any)=>typeof w!=='string'||!(/^[A-Z]{2,12}$/).test(w))||!Array.isArray(v.phrases)||v.phrases.length!==6)throw Error('invalid authored content');
 v.phrases.forEach((p:any,i:number)=>{if(typeof p!=='string'||p.toUpperCase().replace(/[ -]/g,'')!==v.words[i]+v.words[i+1])throw Error('invalid authored adjacency');});
 return Object.freeze({id:v.id,title:v.title,use:v.use,words:Object.freeze(v.words),phrases:Object.freeze(v.phrases)});
}
export function verifyPrivatePack(value:any):readonly AuthoredPuzzle[]{
 if(value?.rules!=='chainshift-authored-v2'||!Array.isArray(value.puzzles))throw Error('invalid authored pack');
 const entries=value.puzzles.map(checked) as AuthoredPuzzle[];
 if(![15,45].includes(entries.length)||new Set(entries.map(p=>p.id)).size!==entries.length||new Set(entries.map(p=>p.words.join(' '))).size!==entries.length||entries.filter(p=>p.use==='daily').length!==entries.length-8||entries.filter(p=>p.use==='practice').length!==8)throw Error('invalid authored pack');
 const digest=createHash('sha256').update(JSON.stringify(entries.map(p=>[p.id,p.title,p.use,p.words,p.phrases]))).digest('hex');
 if(digest!==(entries.length===15?APPROVED_CONTENT_SHA256:RESERVE_CONTENT_SHA256))throw Error('unreviewed authored pack');
 return Object.freeze(entries);
}
const testing=process.env.VITEST==='true';
const encoded=testing?undefined:process.env.CHAINSHIFT_AUTHORED_PACK_B64;
if(encoded&&encoded.length>100000)throw Error('invalid authored pack');
const loaded=encoded?verifyPrivatePack(JSON.parse(Buffer.from(encoded,'base64').toString('utf8'))):null;
export const authoredCatalogApproved=loaded!==null;
// Local tests use one deliberately public demo under distinct fixture identities.
const demo={words:['BOOK','CLUB','HOUSE','PARTY','LINE','DANCE','FLOOR'],phrases:['book club','clubhouse','house party','party line','line dance','dance floor']};
export const authoredCatalog:readonly AuthoredPuzzle[]=loaded??(process.env.NODE_ENV==='production'&&!testing?Object.freeze([]):Object.freeze(Array.from({length:15},(_,i)=>checked({...demo,id:i<7?'authored-'+String(i+1).padStart(3,'0'):'authored-p'+String(i-6).padStart(2,'0'),title:'Public test fixture',use:i<7?'daily':'practice'}))));
export const authoredById=(id:string)=>authoredCatalog.find(p=>p.id===id);
