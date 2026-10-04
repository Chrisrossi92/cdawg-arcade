/** Run with: node --import tsx shared/chainshift/review.ts */
import {seedReferee} from './seed.js';
import {CATEGORIES} from './rules.js';
const {snapshot, identity} = seedReferee;
const words = new Set(snapshot.edges.flatMap(e => [e.from,e.to]));
console.log(`# Chainshift seed review\n\nGraph: ${identity.graphVersion}\nRules: ${identity.rulesRevision}\nChecksum: ${identity.checksum}\nWords: ${words.size}\nDirected edges: ${snapshot.edges.length}\n`);
console.log('Editorial source: original hand-curated direct-expression review; no imported dataset or live lookup. Seed approval is provisional editorial acceptance for local development, not a claim of Chris approval. All entries are G-rated; automated classification checks cannot certify language quality.\n');
console.log('Exact ASCII alphabetic word forms only. Compound labels may join the two words. No implicit aliases. Score counts completed final-route edges; removed edges do not count. Elapsed-time behavior is deferred.\n');
for (const category of CATEGORIES) {
 const edges=snapshot.edges.filter(e=>e.category===category).sort((a,b)=>a.from<b.from?-1:a.from>b.from?1:a.to<b.to?-1:1);
 console.log(`## ${category} (${edges.length})\n\n| From | To | Canonical connection | Rating | Approval | Enabled |\n|---|---|---|---|---|---|`);
 for (const e of edges) console.log(`| ${e.fromDisplay} | ${e.toDisplay} | ${e.phrase} | ${e.rating} | ${e.approval} | ${e.enabled} |`);
 console.log('');
}
