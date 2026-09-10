import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {state,status,clock,timing} from './common.js';
async function startPreview(){
const start=performance.now(),canvas=document.querySelector('canvas'),scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
const camera=new THREE.OrthographicCamera(-.56,.56,.56,-.56,.01,10);camera.position.set(.95,.95,1.65);camera.lookAt(0,.38,0);
scene.add(new THREE.HemisphereLight(0xfff1da,0x544332,2));
for(const [pos,power] of [[[-1,3,2],3],[[2,1.5,1],1.5],[[0,2,-2],2]]){const light=new THREE.DirectionalLight(0xfff4e5,power);light.position.set(...pos);scene.add(light)}
const gltf=await new GLTFLoader().loadAsync('/cdawg-mascot-feasibility-v001.glb');scene.add(gltf.scene);
const mixer=new THREE.AnimationMixer(gltf.scene),actions=Object.fromEntries(gltf.animations.map(c=>[c.name,mixer.clipAction(c)]));
for(const a of Object.values(actions)){a.play();a.paused=true;a.enabled=true;a.setEffectiveWeight(0)}
const loaded=performance.now()-start;let bytes=0;gltf.scene.traverse(o=>{if(o.isMesh){for(const b of Object.values(o.geometry.attributes))bytes+=b.array.byteLength;if(o.geometry.index)bytes+=o.geometry.index.array.byteLength}});
const measure=timing();let counter=0;
function resize(){const w=canvas.clientWidth,h=320;renderer.setSize(w,h,false);camera.left=-.56*w/h;camera.right=.56*w/h;camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(canvas);resize();
function draw(t){requestAnimationFrame(draw);if(document.hidden)return;const sample=measure(t);for(const a of Object.values(actions))a.setEffectiveWeight(0);
 if(state.pose==='lean'){const a=actions[state.lean<0?'lean_left':'lean_right'];a.time=1;a.setEffectiveWeight(Math.abs(state.lean));actions.idle_default.time=0;actions.idle_default.setEffectiveWeight(1-Math.abs(state.lean))}
 else{const a=actions[state.pose];a.time=clock(t);a.setEffectiveWeight(1)}
 mixer.update(0);renderer.render(scene,camera);
 if(counter++%20===0)status.textContent=`Ready · ${loaded.toFixed(1)} ms load/parse\n${renderer.info.render.triangles.toLocaleString()} triangles · ${renderer.info.render.calls} draws · ${(bytes/1024).toFixed(0)} KiB geometry\nrAF p50 ${sample.p50.toFixed(1)} / p95 ${sample.p95.toFixed(1)} ms · n=${sample.n}`;
}
requestAnimationFrame(draw);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();status.textContent='Graphics context lost. Reload this local preview to recover.'});

}
startPreview().catch(error=>{status.textContent='Preview unavailable: '+error.message});
