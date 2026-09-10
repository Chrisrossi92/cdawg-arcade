import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import validator from './preview/node_modules/gltf-validator/index.js';
const path=process.argv[2]??'assets/brand/mascot/runtime/cdawg-mascot-feasibility-v001.glb';
const bytes=readFileSync(path);assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
const jsonLength=bytes.readUInt32LE(12);assert.equal(bytes.readUInt32LE(16),0x4e4f534a);const model=JSON.parse(bytes.toString('utf8',20,20+jsonLength));
assert.equal(model.asset.version,'2.0');assert.equal(model.buffers.length,1);assert.ok(!model.buffers[0].uri);assert.ok(!model.images?.some(i=>i.uri));
assert.deepEqual(model.animations.map(a=>a.name).sort(),['fall','idle_default','lean_left','lean_right','panic']);
assert.ok(model.skins?.length>0);assert.ok(model.materials.length<=4);assert.ok(bytes.length<5_000_000);
const triangles=model.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+model.accessors[p.indices].count/3,0);assert.ok(triangles<=40000);
for(const anim of model.animations){assert.ok(anim.channels.length>0);for(const s of anim.samplers){const a=model.accessors[s.input];assert.ok(a.max[0]>a.min[0]);assert.ok(a.max[0]<=1.001)}}
const result=await validator.validateBytes(new Uint8Array(bytes),{uri:path.split('/').pop(),maxIssues:100});
// No timestamp or machine path in committed evidence.
delete result.validatedAt;
const report={validator:validator.version(),bytes:bytes.length,triangles,materials:model.materials.length,skins:model.skins.length,clips:model.animations.map(a=>a.name),result};
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({bytes:bytes.length,triangles,materials:model.materials.length,errors:result.issues.numErrors,warnings:result.issues.numWarnings,infos:result.issues.numInfos}));
assert.equal(result.issues.numErrors,0,'Khronos validator errors');assert.equal(result.issues.numWarnings,0,'Khronos validator warnings');
