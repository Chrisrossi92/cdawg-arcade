// Independent Three.js import and animation evaluation, with no browser or score code.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import * as THREE from './preview/node_modules/three/build/three.module.js';
import {GLTFLoader} from './preview/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
const buffer=readFileSync(process.argv[2]);const g=await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
const mixer=new THREE.AnimationMixer(g.scene);const paws=[];g.scene.traverse(o=>{if(o.isBone&&/^(front|hind).*paw$/.test(o.name))paws.push(o)});assert.equal(paws.length,4);
const actions=g.animations.map(c=>mixer.clipAction(c));const results=[];
for(let i=0;i<actions.length;i++){
 mixer.stopAllAction();const action=actions[i];action.reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(0);g.scene.updateMatrixWorld(true);
 const start=paws.map(p=>p.getWorldPosition(new THREE.Vector3()));let maxDrift=0;const boxes=[];
 for(const t of [0,.25,.5,.75,1]){mixer.setTime(t);g.scene.updateMatrixWorld(true);paws.forEach((p,n)=>maxDrift=Math.max(maxDrift,p.getWorldPosition(new THREE.Vector3()).distanceTo(start[n])));const b=new THREE.Box3().setFromObject(g.scene,true);assert.ok([...b.min,...b.max].every(Number.isFinite));boxes.push({time:t,min:b.min.toArray(),max:b.max.toArray()})}
 if(['idle_default','lean_left','lean_right'].includes(g.animations[i].name))assert.ok(maxDrift<.003,`Paw drift ${maxDrift}`);
 results.push({clip:g.animations[i].name,duration:g.animations[i].duration,maxPawDriftMeters:maxDrift,bounds:boxes});
}
// Continuous lean blend at held endpoints. No root translation should be introduced.
mixer.stopAllAction();const idle=mixer.clipAction(g.animations.find(c=>c.name==='idle_default')),lean=mixer.clipAction(g.animations.find(c=>c.name==='lean_left'));
for(const action of [idle,lean]){action.reset().play();action.paused=true}idle.time=0;lean.time=1;
const blend=[];for(const weight of [0,.25,.5,.75,1]){idle.setEffectiveWeight(1-weight);lean.setEffectiveWeight(weight);mixer.update(0);g.scene.updateMatrixWorld(true);const head=g.scene.getObjectByName('head');blend.push({weight,position:head.getWorldPosition(new THREE.Vector3()).toArray()})}
assert.ok(new THREE.Vector3(...blend[0].position).distanceTo(new THREE.Vector3(...blend[4].position))>.01);
const report={engine:THREE.REVISION,paws:paws.map(p=>p.name),clips:results,leanBlend:blend};if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');console.log('Independent Three.js load and five animation clips passed; planted-paw and continuous lean checks passed.');
