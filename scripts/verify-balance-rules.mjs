import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
// Length-delimited source identity includes tuning, physics, protocol and validation.
const files = ['shared/balance/simulation.ts','shared/balance/config.ts','shared/balance/official.ts','shared/balance/curves.ts','server/attempts/replay.ts','server/attempts/definition.ts'];
const hash = createHash('sha256');
for (const path of files) {
  const text = readFileSync(path,'utf8').replace(/simulationDigest: '[a-f0-9]{64}'/, "simulationDigest: 'TO_GENERATE'");
  hash.update(JSON.stringify([path,text]));
}
const expected = readFileSync('server/attempts/definition.ts','utf8').match(/simulationDigest: '([a-f0-9]{64})'/)?.[1];
if (hash.digest('hex') !== expected) throw new Error('Balance ruleset source changed: review and version the immutable definition');
console.log('Immutable Balance ruleset digest verified');
