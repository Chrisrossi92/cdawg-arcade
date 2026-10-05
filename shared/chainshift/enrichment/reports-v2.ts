/** Offline deterministic generator. Evidence is checked-in review metadata; no network. */
import {writeFileSync} from 'node:fs';
import review from './review-data.json' with {type:'json'};
import iteration from './iteration.json' with {type:'json'};
import {seedReferee} from '../seed.js';
import {enrichedReferee,additions} from './graph-v2.js';
import {summarize} from './compare.js';
import {createAnalysis} from '../analysis.js';
import {createManifest} from '../manifest.js';
const baseline=summarize(seedReferee),after=summarize(enrichedReferee),b=baseline.health,a=after.health;
const save=(name:string,lines:string[])=>writeFileSync(`shared/chainshift/enrichment/${name}`,lines.join('\n')+'\n');
const percent=(n:number,d:number)=>(n/d*100).toFixed(2)+'%';
const priorWords=new Set(b.degree.map(d=>d.word)),newWords=a.degree.map(d=>d.word).filter(w=>!priorWords.has(w));
const heading=`Prior: ${b.identity.graphVersion} / ${b.identity.checksum}.\nNew: ${a.identity.graphVersion} / ${a.identity.checksum}.\nRules unchanged: ${a.identity.rulesRevision}. No removals from v1.\n`;
const approvals=review.filter(e=>e.approval==='approved'),rejections=review.filter(e=>e.approval==='rejected');
const editorial=['# Chainshift Slice 2B enrichment review\n',heading,
 `Reviewed ${review.length}; approved ${approvals.length}; rejected/not selected ${rejections.length}; new words ${newWords.length}: ${newWords.join(', ')}.\n`,
 'Decisions combine independent lexical corroboration and bounded editorial familiarity/content review. A dictionary entry alone does not establish familiarity. Nonselection does not always mean an expression is invalid English. All additions use G-rated ordinary senses; kitchen table means household furniture, chickenfeed means poultry feed/small sums, not specialized adult or offensive senses.\n',
 'No dictionary definitions or example sentences were copied into the corpus. The facts/phrase labels were curated independently. Wiktionary URLs/revision permalinks identify corroborating entries (Wiktionary text is CC BY-SA); Collins and WordReference entries provide supplemental corroboration where a Wiktionary entry was absent. HTML hashes describe temporary retrieved evidence; report regeneration is offline and never rereads sources.\n',
 'Hyphenated source headwords ice-cold and off-road corroborate direct two-word expressions. Canonical labels are ice cold and off road, compatible with the existing phrase schema. This does not add hyphens, aliases or automatic spelling transformations to input normalization.\n',
 '| Edge | Canonical phrase | Category | Rating | Purpose | Evidence / editorial source |\n|---|---|---|---|---|---|'];
for(const e of approvals){const proof=e.evidence as {url?:string;permalink?:string;revision?:string;kind:string;checkedOn?:string};editorial.push(`| ${e.from.toUpperCase()} → ${e.to.toUpperCase()} | ${e.phrase} | ${e.category} | ${e.rating} | ${e.purpose} | [${proof.kind}](${proof.permalink??proof.url}); checked ${proof.checkedOn}; editorial-source prefix chainshift-enrichment-editorial-v2 |`);}
editorial.push('\n## Rejected / deferred / nonselected candidates\n','| Pair | Decision | Corroboration |\n|---|---|---|');
for(const e of rejections){const proof=e.evidence as {url?:string};editorial.push(`| ${e.from} → ${e.to} | ${e.decisionReason} | ${proof.url?`[Source reviewed](${proof.url})`:'Policy review; no claimed lexical corroboration'} |`);}
save('ENRICHMENT_REVIEW.md',editorial);
const comparison=['# Chainshift Slice 2B before / after topology\n',heading,
 '| Metric | Graph v1 | Graph v2 |\n|---|---:|---:|',
 `| Words | ${b.nodeCount} | ${a.nodeCount} |`,`| Active edges | ${b.edgeCount} | ${a.edgeCount} |`,
 `| Weak components | ${b.weakComponents.length} | ${a.weakComponents.length} |`,
 `| Largest weak | ${b.weakComponents[0].length} (${b.largestWeakPercent.toFixed(2)}%) | ${a.weakComponents[0].length} (${a.largestWeakPercent.toFixed(2)}%) |`,
 `| Strong components | ${b.strongComponents.length} | ${a.strongComponents.length} |`,
 `| Largest strong | ${b.strongComponents[0].length} (${b.largestStrongPercent.toFixed(2)}%) | ${a.strongComponents[0].length} (${a.largestStrongPercent.toFixed(2)}%) |`,
 `| Reachable ordered pairs | ${b.reachablePairs}/${b.possiblePairs} (${percent(b.reachablePairs,b.possiblePairs)}) | ${a.reachablePairs}/${a.possiblePairs} (${percent(a.reachablePairs,a.possiblePairs)}) |`,
 `| Source-only words | ${b.sources.length} | ${a.sources.length} |`,`| Sink-only words | ${b.sinks.length} | ${a.sinks.length} |`,
 `| Evaluated 3–6-shift pairs | ${baseline.considered} | ${after.considered} |`,
 `| Passing pairs | ${baseline.passingCount} (${percent(baseline.passingCount,baseline.considered)}) | ${after.passingCount} (${percent(after.passingCount,after.considered)}) |`,
 '\n## Degree-group comparison\n','| Group | Out v1 | Out v2 | In v1 | In v2 |\n|---|---:|---:|---:|---:|'];
for(const [label,test]of [['0',(n:number)=>n===0],['1',(n:number)=>n===1],['2+',(n:number)=>n>=2],['4+',(n:number)=>n>=4]]as const){const count=(h:typeof a,key:'incoming'|'outgoing')=>{const n=h.degree.filter(d=>test(d[key])).length;return `${n} (${percent(n,h.nodeCount)})`;};comparison.push(`| ${label} | ${count(b,'outgoing')} | ${count(a,'outgoing')} | ${count(b,'incoming')} | ${count(a,'incoming')} |`);}
comparison.push('\n## Filter failure reasons (overlapping)\n','| Reason | v1 | v2 |\n|---|---:|---:|');
for(const r of [...new Set([...Object.keys(baseline.failures),...Object.keys(after.failures)])].sort())comparison.push(`| ${r} | ${baseline.failures[r]??0} | ${after.failures[r]??0} |`);
comparison.push('\n## Mandatory / within-bound hub dependence\n','Fractions use all analyzed 3–6-shift pairs, including rejected pairs. Raw counts alone are misleading when the reachable catalog grows.\n','| Word | v1 pairs / fraction | v2 pairs / fraction |\n|---|---:|---:|');
for(const word of [...new Set([...baseline.mandatoryHubs.slice(0,10),...after.mandatoryHubs.slice(0,10)].map(x=>x.word))]){const old=baseline.mandatoryHubs.find(h=>h.word===word),next=after.mandatoryHubs.find(h=>h.word===word);comparison.push(`| ${word} | ${old?.pairs??0} / ${(old?.percent??0).toFixed(2)}% | ${next?.pairs??0} / ${(next?.percent??0).toFixed(2)}% |`);}
comparison.push('\n## New-word hub inspection\n',...a.degree.filter(d=>newWords.includes(d.word)).sort((x,y)=>y.outgoing-x.outgoing||y.incoming-x.incoming||(x.word<y.word?-1:1)).map(d=>`- ${d.word}: ${d.outgoing} outgoing, ${d.incoming} incoming; ${after.mandatoryHubs.find(x=>x.word===d.word)?.pairs??0} mandatory-pair appearances.`),
 '\n## Source / sink changes\n',`Old sources gaining incoming edges: ${b.sources.filter(w=>!a.sources.includes(w)).join(', ')||'none'}.`,
 `Old sinks gaining outgoing edges: ${b.sinks.filter(w=>!a.sinks.includes(w)).join(', ')||'none'}.`,
 `New source-only words: ${a.sources.filter(w=>!priorWords.has(w)).join(', ')||'none'}.`,
 `New sink-only words: ${a.sinks.filter(w=>!priorWords.has(w)).join(', ')||'none'}.`,
 '\n## Remaining weak islands\n',...a.weakComponents.slice(1).map(c=>`- ${c.join(', ')}`),
 '\n## Recorded bounded iteration\n',`Unpublished draft: ${iteration.edges} edges / ${iteration.nodes} words; ${iteration.identity.checksum}; ${iteration.passing} passing pairs; strong core ${iteration.strongCore}.`,
 `Final review removed ${iteration.finalReviewRemoved.join(', ')} and added ${iteration.finalReviewAdded.join(', ')}. ${iteration.reason} ${iteration.finalEvidenceCorrection} ${iteration.shortlistCorrection}`,
 'Neither draft identity nor old manifests were published or rewritten. Graph v1 and all historical reports/manifests remain byte-for-byte unchanged.\n',
 'READY_FOR_SLICE_3: navigation improved with unchanged experimental filters. This is readiness for local gameplay development and human playtesting, not certification of a complete, fun or publishable daily catalog. Sources/sinks and hub dependence remain; no further corpus expansion is included here.');
save('TOPOLOGY_COMPARISON.md',comparison);
const analyzer=createAnalysis(enrichedReferee),original=createAnalysis(seedReferee);
const candidates=['# Graph v2 local candidate review (spoilers below)\n',heading,
 'The graph optimum is the approved-corpus optimum, never a claim of natural-language optimum. BOOK → CLUB → ROOM is the concrete missing-edge counterexample.\n',
 '## Previous human playtest pairs\n','| Pair | v1 optimum | v2 optimum | v2 filter |\n|---|---:|---:|---|'];
for(const[from,to]of [['game','house'],['book','room'],['board','food']]){const e=analyzer.evaluate(from,to);candidates.push(`| ${from} → ${to} | ${original.shortest(from,to)?.shifts} | ${analyzer.shortest(from,to)?.shifts} | ${e.accepted?'passes':e.reasons.join(', ')} |`);}
candidates.push('\nGAME → OVER → TIME → OUT → HOUSE is now fully valid (4 shifts); its graph optimum remains 3. BOOK → CLUB → ROOM is valid (2 shifts), so the unchanged experimental 3–6 policy excludes it as a daily candidate. BOARD → FOOD is not specially optimized: its optimum remains 6; see its final filter result above. The old v1 manifest stays valid against v1 only.\n',
 `Passing pairs: ${baseline.passingCount} → ${after.passingCount}. The ranking rule remains Slice 2: openings + approaches descending, minimum overlap ascending, route count descending, lexical endpoints. That ordering favors destinations such as room with many approaches; the varied shortlist separately uses unique starts and finishes rather than pretending all top-ranked pairs are varied.\n`,
 '## Strongest ranked pairs\n','| START | FINISH | Optimum | Shortest routes | Openings | Approaches | Exact +0/+1/+2/+3 counts |\n|---|---|---:|---:|---:|---:|---|');
for(const m of after.strongest)candidates.push(`| ${m.from} | ${m.to} | ${m.shortest.shifts} | ${m.shortestRoutes.count} | ${m.openings.length} | ${m.approaches.length} | ${Object.values(m.countsByExtraShift).join('/')} |`);
candidates.push('\n## Varied local playtest shortlist\n');
for(const m of after.diverse)candidates.push(`### ${m.from.toUpperCase()} → ${m.to.toUpperCase()}\n`,`Optimal ${m.shortest.shifts}; shortest routes ${m.shortestRoutes.count}; openings ${m.openings.join(', ')}; approaches ${m.approaches.join(', ')}; exact +0/+1/+2/+3 ${Object.values(m.countsByExtraShift).join('/')}; best/mean interior overlap ${m.minInternalOverlap.toFixed(3)}/${m.meanInternalOverlap.toFixed(3)}; mandatory nodes ${m.mandatory.join(', ')||'none'}; within-bound mandatory ${m.boundedMandatory.join(', ')||'none'}.`,...m.representativeRoutes.map(r=>`- ${r.join(' → ')}`),'');
candidates.push(`Promotion cautions (not licensed or ruled invalid by this pass): ${after.promotionCautions.join(', ')}. These pairs have plausible direct or specialist readings and are withheld from manual fixtures until lexical/familiarity review; their topology results remain in the total and strongest ranking. This is an explicit remaining completeness concern, not a changed diversity policy.`, 'All shortlisted candidates pass the unchanged filter, with complete bounded analysis. Try a range of 3–6-shift puzzles and stop reading solution routes before solving. This is a language playtest set, not a gameplay request or proof of fun.');
save('CANDIDATES_V2.md',candidates);
const manifests=after.diverse.map((m,i)=>createManifest(enrichedReferee,{id:`chainshift-local-v2-${String(i+1).padStart(3,'0')}`,number:i+1,day:`2026-10-${String(i+15).padStart(2,'0')}`,start:m.from,finish:m.to,generatedAt:'2026-10-04T00:00:00.000Z'}));
writeFileSync('shared/chainshift/enrichment/LOCAL_PUZZLES_V2.json',JSON.stringify(manifests,null,2)+'\n');
writeFileSync('shared/chainshift/enrichment/METRICS_V2.json',JSON.stringify({baseline,after},null,2)+'\n');
console.log(JSON.stringify({reviewed:review.length,approved:additions.length,newWords:newWords.length,identity:enrichedReferee.identity,passing:after.passingCount,localManifests:manifests.length}));
