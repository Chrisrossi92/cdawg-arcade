/** Deterministic CLI report generation only; no application or server wiring. */
import {writeFileSync} from 'node:fs';
import {seedReferee} from './seed.js';
import {createAnalysis,ANALYSIS_POLICY} from './analysis.js';
import {CATEGORIES} from './rules.js';
import {localPuzzles} from './local-puzzles.js';
const analysis=createAnalysis(seedReferee),h=analysis.health();
const pct=(n:number,d=h.nodeCount)=>(n/d*100).toFixed(2)+'%';
const header=`Graph ${h.identity.graphVersion}; ${h.identity.checksum}; rules ${h.identity.rulesRevision}.\n\nAnalysis policy ${ANALYSIS_POLICY.revision}. No graph-v1 edits. All counts use approved enabled edges only.\n\n`;
const lines:string[]=['# Chainshift graph health\n',header,
 `Nodes: ${h.nodeCount}; directed edges: ${h.edgeCount}; isolated: ${h.isolated.length}; source-only: ${h.sources.length}; sink-only: ${h.sinks.length}.\n`,
 '| Degree | Outgoing words | Incoming words |\n|---|---:|---:|'];
for(const n of [...new Set([...Object.keys(h.outgoingDistribution),...Object.keys(h.incomingDistribution)])].map(Number).sort((a,b)=>a-b))lines.push(`| ${n} | ${h.outgoingDistribution[n]??0} | ${h.incomingDistribution[n]??0} |`);
lines.push('\n| Degree group | Outgoing | Incoming |\n|---|---:|---:|');
for(const [label,test] of [['0',(n:number)=>n===0],['1',(n:number)=>n===1],['2+',(n:number)=>n>=2],['4+',(n:number)=>n>=4]] as const)lines.push(`| ${label} | ${pct(h.degree.filter(d=>test(d.outgoing)).length)} | ${pct(h.degree.filter(d=>test(d.incoming)).length)} |`);
lines.push(`\nWeak components: ${h.weakComponents.length}; largest ${h.weakComponents[0].length} (${h.largestWeakPercent.toFixed(2)}%).`,
 `Strong components: ${h.strongComponents.length}; largest ${h.strongComponents[0].length} (${h.largestStrongPercent.toFixed(2)}%).`,
 `Reachable nonidentical directed pairs: ${h.reachablePairs}/${h.possiblePairs} (${pct(h.reachablePairs,h.possiblePairs)}). Mean shortest ${h.meanShortest.toFixed(2)}; maximum ${h.maxShortest}.`,
 '\n| Shortest shifts | Reachable pairs |\n|---|---:|',...Object.entries(h.shortestLengths).map(([n,count])=>`| ${n} | ${count} |`),
 '\n## Outgoing hubs\n',...h.outgoingHubs.map(d=>`- ${d.word}: ${d.outgoing}`), '\n## Incoming hubs\n',...h.incomingHubs.map(d=>`- ${d.word}: ${d.incoming}`),
 '\n## Weak islands outside the main component\n',...h.weakComponents.slice(1).map(c=>`- ${c.join(', ')}`),
 '\n## Nontrivial strongly connected components\n',...h.strongComponents.filter(c=>c.length>1).map(c=>`- ${c.length} words: ${c.join(', ')}`),
 '\n## Source-only words\n',h.sources.join(', '),'\n## Sink-only words\n',h.sinks.join(', '),'');
writeFileSync('shared/chainshift/GRAPH_HEALTH.md',lines.join('\n'));
const accepted:ReturnType<typeof analysis.evaluate>[]=[];let considered=0;
const rejected:Record<string,number>={},bottlenecks=new Map<string,number>();
for(const from of analysis.nodes)for(const to of analysis.nodes){
 const path=analysis.shortest(from,to);if(!path||path.shifts<3||path.shifts>6)continue;
 considered++;const result=analysis.evaluate(from,to);
 if(result.accepted)accepted.push(result);else result.reasons.forEach(r=>rejected[r]=(rejected[r]??0)+1);
 for(const n of new Set([...(result.metrics?.mandatory??[]),...(result.metrics?.boundedMandatory??[])]))bottlenecks.set(n,(bottlenecks.get(n)??0)+1);
}
accepted.sort((a,b)=>b.metrics!.openings.length+b.metrics!.approaches.length-a.metrics!.openings.length-a.metrics!.approaches.length||a.metrics!.minInternalOverlap-b.metrics!.minInternalOverlap||b.metrics!.routeCount-a.metrics!.routeCount|| (a.metrics!.from<b.metrics!.from?-1:a.metrics!.from>b.metrics!.from?1:0)||(a.metrics!.to<b.metrics!.to?-1:a.metrics!.to>b.metrics!.to?1:0));
const gaps=['# Chainshift route diversity and corpus gaps\n',header,
 `Evaluated all ${considered} reachable 3–6-shift pairs. ${accepted.length} pass; ${considered-accepted.length} fail. Rejection reasons overlap. The length range is an experimental analysis filter, not a frozen product invariant.\n`,
 ...Object.entries(rejected).sort().map(([r,n])=>`- ${r}: ${n}`),
 '\n## Most frequent mandatory/within-bound bottlenecks\n',... [...bottlenecks].sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:1)).slice(0,20).map(([n,c])=>`- ${n}: ${c} evaluated pairs`),
 '\n## Category boundary signals\n',
 'Shared-node transitions count ordered pairs of adjacent active edges in different categories. This is a topology signal, not an editorial measure of semantic diversity. Sink counts use global outgoing degree.\n',
 '| Category | Edges | Category words outside main weak component | Category words that are sinks | Cross-category next-edge transitions |\n|---|---:|---:|---:|---:|'];
const active=seedReferee.snapshot.edges.filter(e=>e.enabled&&e.approval==='approved'),main=new Set(h.weakComponents[0]);
for(const category of CATEGORIES){const e=active.filter(e=>e.category===category),words=new Set(e.flatMap(x=>[x.from,x.to]));gaps.push(`| ${category} | ${e.length} | ${[...words].filter(w=>!main.has(w)).length} | ${[...words].filter(w=>h.sinks.includes(w)).length} | ${e.reduce((sum,x)=>sum+active.filter(y=>y.from===x.to&&y.category!==category).length,0)} |`);}
gaps.push('\n## Targeted expansion priorities\n',
 '- Connect the ice/cream/cheese/cake/mix/tape and chicken/soup/kitchen/sink islands in both directions. Food already has some strong central links; these islands remain isolated.',
 '- Add reviewed onward expressions around the train/station/wagon and travel/agent islands. Travel has dead-end destinations; adding incoming-only edges will not create recovery routes.',
 '- Add alternative exits and entrances around point/guard, line/drive, tag/line, house/party, and room/charge. The current long routes repeatedly funnel through these words.',
 '- Seek independently recognizable links between technology/data/storage and household/food/travel. Technology has sink words base, down, mode, review, and site; add reviewed exits from these strands and independent return paths.',
 '- Cultural/gaming islands around magic/kingdom, iron/man, monster/hunter, and street/fighter need routes back into everyday vocabulary; franchise names alone do not create strategic choice.',
 '- Prioritize 0- and 1-outdegree words with recognizable potential, then verify each addition creates a bypass or return path. Review new edges in graph-v2; do not edit graph-v1 or chase a numerical edge target.',
 '\nNo proposed edge has been approved or added in this slice. Topology cannot certify endpoint familiarity or obscure vocabulary.\n',
 'Verdict: PARTIALLY — usable but needs targeted expansion. The passing core supports a local playtest set, but its repeated hubs and sparse peripheral vocabulary do not establish a varied V1 daily catalog.');
writeFileSync('shared/chainshift/CORPUS_GAPS.md',gaps.join('\n')+'\n');
const candidates=['# Chainshift candidate review (contains solutions)\n',header,
 'Local review only. Topological acceptance is not editorial approval or a claim of fun. Do not open representative routes before manual solving.\n',
 `Found ${accepted.length} passing ordered pairs. Strongest means deterministic ordering by openings + approaches (descending), best-pair overlap (ascending), route count (descending), then endpoint keys.\n`,
 '| START | FINISH | Optimum | Shortest routes | Openings | Approaches | Exact optimum / +1 / +2 / +3 route counts | Best / mean internal overlap |\n|---|---|---:|---:|---:|---:|---|---|'];
for(const {metrics:m} of accepted.slice(0,10))candidates.push(`| ${m!.from} | ${m!.to} | ${m!.shortest.shifts} | ${m!.shortestRoutes.count}${m!.shortestRoutes.capped?'+':''} | ${m!.openings.length} | ${m!.approaches.length} | ${Object.values(m!.countsByExtraShift).join(' / ')} | ${m!.minInternalOverlap.toFixed(3)} / ${m!.meanInternalOverlap.toFixed(3)} |`);
candidates.push('\n## Curated local fixtures\n');
for(const p of localPuzzles){const m=p.diversityCertificate;candidates.push(`### ${p.number}: ${p.start.display} → ${p.finish.display}\n`,
 `Optimal ${m.shortest.shifts}; shortest routes ${m.shortestRoutes.count}; viable openings ${m.openings.join(', ')}; final approaches ${m.approaches.join(', ')}.`,
 `Exact optimum/+1/+2/+3: ${Object.values(m.countsByExtraShift).join('/')}; ${m.routeCount} bounded simple routes; complete: ${!m.truncated}; mandatory nodes: ${m.mandatory.join(', ')||'none'}; within-bound mandatory: ${m.boundedMandatory.join(', ')||'none'}; max node prevalence ${(m.dominant[0]?.fraction??0).toFixed(3)}.`,
 ...m.representativeRoutes.map(r=>`- ${r.join(' → ')}`),'');}
candidates.push('## Manual playtest set\n',
 '- Easier/highly connected: GAME → HOUSE (3 shifts).',
 '- Medium: BOOK → ROOM (4 shifts).',
 '- Harder, topology-fair: BOARD → FOOD (6 shifts); phrase familiarity still needs review.',
 '- Distinct strategies: PLAY → POINT (5 shifts); its optimal and longer route use different interiors.',
 '\nThese are suggested manual language exercises, not a request for Chris to repeat Arcade acceptance or interact with a new UI. No gameplay UI exists.\n',
 '## Enumeration and interpretation\n',
 'Routes are directed simple paths, bounded at optimum +3. Each pair allows at most 512 stored routes and 50,000 DFS expansions. Enumeration stops conservatively and the candidate fails if truncated. Reverse-distance pruning avoids impossible branches. Shortest-route DAG counts saturate at 1,000 with an explicit exceeded-cap flag.',
 'Opening/final-approach counts use reachability within the bound while forbidding return to START or early arrival at FINISH. Mandatory nodes are verified by removal, both without a length bound and within the useful-route bound. Dominance is node prevalence in bounded routes; >=90% rejects. Internal overlap is Jaccard similarity of interior-node sets. A passing pair needs two openings, two final approaches and a route pair with overlap <=0.5; any mandatory node rejects. These are transparent experimental thresholds, not recognizability guarantees.',
 'Exact +k counts are reported separately, rather than cumulatively. Repeated or cyclic walks are excluded: they cannot improve final-route shift count. Nearby alternate solutions and low internal overlap are structural signals; they do not prove semantic-region novelty.');
writeFileSync('shared/chainshift/CANDIDATE_REVIEW.md',candidates.join('\n')+'\n');
writeFileSync('shared/chainshift/LOCAL_PUZZLES.json',JSON.stringify(localPuzzles,null,2)+'\n');
console.log(JSON.stringify({nodes:h.nodeCount,edges:h.edgeCount,considered,accepted:accepted.length,manifests:localPuzzles.length}));
