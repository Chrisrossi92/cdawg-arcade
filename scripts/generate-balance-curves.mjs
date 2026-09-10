// Review-only generator for a NEW ruleset. Never runs during deployment or startup.
// Native transcendental math is captured once; official browser/server playback uses the same bytes.
import {writeFileSync} from 'node:fs';
import {balanceConfig} from '../build/shared/balance/config.js';
import {calculateDifficulty,calculateBoundedDisturbance} from '../build/shared/balance/simulation.js';
if (process.version !== 'v24.20.0') throw new Error('Use the pinned Node 24.20.0 reference runtime');
const bytes=Buffer.alloc(18000*16);
for(let tick=1;tick<=18000;tick++){
  const ms=tick*(1000/60),difficulty=calculateDifficulty(ms,balanceConfig);
  bytes.writeDoubleLE(difficulty,(tick-1)*16);
  bytes.writeDoubleLE(calculateBoundedDisturbance(ms,difficulty,balanceConfig),(tick-1)*16+8);
}
const chunks=bytes.toString('base64').match(/.{1,160}/g);
writeFileSync('shared/balance/curves.ts',`// Generated reference values: Node 24.20.0, existing Balance tuning, 18,000 ticks.\n// Two IEEE-754 little-endian doubles per tick: difficulty, bounded disturbance.\n// Part of the immutable official ruleset; never regenerate an issued version.\nexport const CURVE_BYTES_BASE64 = [\n${chunks.map(x=>'  '+JSON.stringify(x)+',').join('\n')}\n].join('');\n`);
console.log('Captured 18,000 official tick curves; practice remains on its existing math');
