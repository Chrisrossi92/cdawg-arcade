import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=mkdtempSync(join(tmpdir(),'cdawg-mascot-intake-'));
const script=resolve('scripts/mascot/validate.mjs');
try {
  mkdirSync(join(root,'assets/brand'),{recursive:true});
  cpSync('assets/brand/mascot',join(root,'assets/brand/mascot'),{recursive:true});
  mkdirSync(join(root,'docs/brand'),{recursive:true});
  cpSync('docs/brand/CDAWG_MASCOT_3D_PRODUCTION_SPEC_V1.md',join(root,'docs/brand/CDAWG_MASCOT_3D_PRODUCTION_SPEC_V1.md'));
  const run=()=>spawnSync(process.execPath,[script],{cwd:root}).status;
  assert.equal(run(),0);
  const path=join(root,'assets/brand/mascot/reference/cdawg-b1-turnaround-v001.png'),original=readFileSync(path);
  writeFileSync(path,Buffer.from('corrupt reference'));assert.notEqual(run(),0);writeFileSync(path,original);
  const manifestPath=join(root,'assets/brand/mascot/manifest.json'),manifest=readFileSync(manifestPath,'utf8'),data=JSON.parse(manifest);
  data.generatedAssets[0].approvedToShip=true;writeFileSync(manifestPath,JSON.stringify(data));assert.notEqual(run(),0);writeFileSync(manifestPath,manifest);
  writeFileSync(join(root,'assets/brand/mascot/runtime/unregistered.glb'),'unregistered');assert.notEqual(run(),0);
  console.log('Asset intake: 4 checks passed (valid package, corrupted reference, unapproved shipping, unregistered binary).');
} finally {rmSync(root,{recursive:true,force:true});}
