// Separate local check: does not change Vite config or write production artifacts.
import assert from 'node:assert/strict';
import { build } from 'vite';
let modules = 0;
await build({
  logLevel: 'error',
  build: { write: false },
  plugins: [{
    name: 'mascot-boundary-check',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk') {
          for (const id of Object.keys(output.modules)) {
            modules++;
            assert.ok(!/\/(?:assets\/brand\/mascot|docs\/brand|scripts\/mascot)\//.test(id.replaceAll('\\', '/')),
              'Source-only mascot material entered the production module graph');
          }
          assert.ok(!output.code.includes('assets/brand/mascot/'), 'Mascot source URL in runtime');
        } else {
          assert.ok(!/mascot|\.glb$|\.blend$/.test(output.fileName), 'Unexpected mascot output');
        }
      }
    },
  }],
});
console.log(`Mascot bundle boundary passed: ${modules} modules; no mascot source imports.`);
