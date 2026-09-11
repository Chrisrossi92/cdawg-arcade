// Explicit intake gate. Missing references are never silently accepted as canonical.
import assert from 'node:assert/strict';
import { readFileSync, existsSync, lstatSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const manifest = JSON.parse(readFileSync('assets/brand/mascot/manifest.json', 'utf8'));
assert.equal(manifest.schemaVersion, 1);
assert.deepEqual(manifest.inputs.map(x => x.role).sort(),
  ['authority', 'expressions', 'movement', 'production-spec', 'turnaround']);
assert.equal(new Set(manifest.inputs.map(x => x.path)).size, 5);
const missing = [];
for (const input of manifest.inputs) {
  const permitted = input.role === 'authority'
    ? /^assets\/brand\/mascot\/reference\/canonical-package-readme-v001\.md$/
    : input.role === 'production-spec'
    ? /^docs\/brand\/CDAWG_MASCOT_3D_PRODUCTION_SPEC_V1\.md$/
    : /^assets\/brand\/mascot\/reference\/cdawg-b1-[a-z-]+-v\d{3}\.(png|jpe?g|webp)$/;
  assert.match(input.path, permitted);
  assert.ok(['missing', 'received'].includes(input.status));
  if (input.status === 'missing') {
    assert.ok(!existsSync(input.path), `Unregistered input: ${input.path}`);
    for (const field of ['sha256', 'bytes', 'originalFilename']) assert.equal(input[field], null);
    missing.push(input.role);
  } else {
    assert.ok(lstatSync(input.path).isFile());
    assert.match(input.sha256, /^[a-f0-9]{64}$/);
    assert.ok(typeof input.originalFilename === 'string' && input.originalFilename.length > 0);
    const data = readFileSync(input.path);
    assert.ok(data.length > 0);
    assert.equal(data.length, input.bytes);
    assert.equal(createHash('sha256').update(data).digest('hex'), input.sha256);
  }
}
// The approved static correction has its own closed inventory; it remains source-only.
const correctionRoot='assets/brand/mascot/correction-v004';
const correction=existsSync(correctionRoot+'/manifest.json')?JSON.parse(readFileSync(correctionRoot+'/manifest.json','utf8')):null;
const correctionFiles=[];
if(correction)for(const [relative,expected] of Object.entries(correction.files)){
 assert.match(relative,/^(source\/cdawg-mascot-correction-v004\.(blend|glb)|previews\/[a-z-]+\.png|reports\/[a-z-]+\.json)$/);
 const path=correctionRoot+'/'+relative;assert.ok(lstatSync(path).isFile());
 const bytes=readFileSync(path);assert.equal(bytes.length,expected.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),expected.sha256);correctionFiles.push(path);
}
// Until the next phase, this package must contain no unregistered binary assets.
function inspect(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    assert.ok(!entry.isSymbolicLink(), `Symlink forbidden: ${path}`);
    if (entry.isDirectory()) inspect(path);
    else assert.ok(path.endsWith('.md') || path.endsWith('/manifest.json') ||
      correctionFiles.includes(path) || [...manifest.inputs, ...(manifest.generatedAssets ?? [])].some(x => x.path === path && x.status === 'received'),
    `Unregistered asset: ${path}`);
  }
}
inspect('assets/brand/mascot');
for (const item of manifest.generatedAssets ?? []) {
  assert.match(item.path, /^assets\/brand\/mascot\/(source|runtime|previews)\/cdawg-[a-z0-9-]+\.(blend|glb|png|webp|json)$/);
  assert.equal(item.approvedToShip, false);
  assert.ok(lstatSync(item.path).isFile());
  const data = readFileSync(item.path);
  assert.equal(data.length, item.bytes);
  assert.equal(createHash('sha256').update(data).digest('hex'), item.sha256);
}

assert.deepEqual(manifest.runtimeExports, [], 'Deployment remains unauthorized');
if (manifest.integrationExports) {
 const version=manifest.integrationVersion??'v003';assert.ok(['v003','v004'].includes(version));
 if(version==='v004')assert.equal(correction?.animationAtlasRegenerationAuthorized,true);
 const expected=['balance0','balance1','reactions0','reactions1'].flatMap(g=>['webp','json'].map(e=>`assets/brand/mascot/runtime/cdawg-mascot-${g}-${version}.${e}`));
 assert.deepEqual([...manifest.integrationExports].sort(), expected.sort());
 for(const path of expected)assert.ok(manifest.generatedAssets.some(a=>a.path===path));
}
if (missing.length) {
  console.log(`FOUNDATION ONLY: ${missing.length} missing canonical inputs (${missing.join(', ')}).`);
  if (!process.argv.includes('--allow-missing')) process.exitCode = 1;
} else console.log('Canonical intake hashes and paths verified; visual approval remains separate.');
