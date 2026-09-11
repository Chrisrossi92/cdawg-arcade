// Separate local check: does not change Vite config or write production artifacts.
import assert from 'node:assert/strict';
import { build } from 'vite';
import {readFileSync} from 'node:fs';
const allowed=JSON.parse(readFileSync('assets/brand/mascot/manifest.json')).integrationExports??[];
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
            assert.ok(allowed.some(p=>id.split('?')[0].endsWith('/'+p))||!/\/(?:assets\/brand\/mascot|docs\/brand|scripts\/mascot)\//.test(id.replaceAll('\\', '/')),
              'Source-only mascot material entered the production module graph');
          }
          assert.ok(!output.code.includes('assets/brand/mascot/'), 'Mascot source URL in runtime');
        } else {
          const name=output.fileName.split('/').pop();
          const permitted=allowed.some(p=>{const file=p.split('/').pop(),dot=file.lastIndexOf('.');return name.startsWith(file.slice(0,dot)+'-')&&name.endsWith(file.slice(dot))});
          assert.ok(permitted||!/mascot|\.glb$|\.blend$/.test(output.fileName), 'Unexpected mascot output');
        }
      }
    },
  }],
});
console.log(`Mascot bundle boundary passed: ${modules} modules; only explicitly approved integration exports; no source or preview imports.`);
