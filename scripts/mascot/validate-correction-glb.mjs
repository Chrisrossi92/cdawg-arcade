import fs from 'node:fs';
import assert from 'node:assert/strict';
import validator from './preview/node_modules/gltf-validator/index.js';
const file=process.argv[2], bytes=fs.readFileSync(file), n=bytes.readUInt32LE(12), data=JSON.parse(bytes.subarray(20,20+n));
assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.length,bytes.readUInt32LE(8));assert.equal(data.animations.length,26);assert.equal(data.skins[0].joints.length,43);assert.ok(bytes.length<5_000_000);assert.ok(data.materials.length<=4);assert.ok(!data.images?.length);assert.ok(!data.buffers.some(x=>x.uri));
for(const name of ['default','delighted','determined','worried','panic','mischief'])assert.ok(data.animations.some(x=>x.name==='expr_'+name));
const result=await validator.validateBytes(new Uint8Array(bytes),{uri:'cdawg-mascot-correction-v004.glb',maxIssues:100});delete result.validatedAt;
assert.equal(result.issues.numErrors,0);assert.equal(result.issues.numWarnings,0);
fs.writeFileSync(process.argv[3],JSON.stringify({bytes:bytes.length,validator:validator.version(),checks:16,result},null,2)+'\n');console.log('GLB correction: 16 assertions; zero Khronos errors/warnings;',bytes.length,'bytes');
