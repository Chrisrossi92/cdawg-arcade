import fs from 'node:fs/promises';
import sharp from './preview/node_modules/sharp/lib/index.js';
import crypto from 'node:crypto';
const out='assets/brand/mascot/correction-v004';
for(const dir of ['source','previews','reports'])await fs.mkdir(`${out}/${dir}`,{recursive:true});
for(const suffix of ['blend','glb'])await fs.copyFile(`tmp/mascot/correction-a/cdawg-mascot-correction-v004.${suffix}`,`${out}/source/cdawg-mascot-correction-v004.${suffix}`);
for(const name of (await fs.readdir('tmp/mascot/correction-a/views')).filter(n=>n.endsWith('.png'))){
 let input=sharp(`tmp/mascot/correction-a/views/${name}`);
 if(name==='lobby-host.png')input=input.trim({threshold:5});
 await input.png({compressionLevel:9}).toFile(`${out}/previews/${name}`);
}
for(const name of ['front-head','three-quarter-head'])await sharp(`tmp/mascot/correction-before/${name}.png`).png({compressionLevel:9}).toFile(`${out}/previews/before-${name}.png`);
for(const name of ['geometry','glb','repeatability'])await fs.copyFile(`tmp/mascot/correction-validation/${name}.json`,`${out}/reports/${name}.json`);
await fs.copyFile('tmp/mascot/correction-before/cameras.json',`${out}/reports/cameras.json`);
const files={};for(const dir of ['source','previews','reports'])for(const f of (await fs.readdir(`${out}/${dir}`)).sort()){
 const p=`${dir}/${f}`,b=await fs.readFile(`${out}/${p}`);files[p]={bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};
}
await fs.writeFile(`${out}/manifest.json`,JSON.stringify({status:'static-correction-awaiting-creative-review',parentModel:'assets/brand/mascot/source/cdawg-mascot-candidate-v002.blend',authoring:'scripts/mascot/build-canonical-correction.py',references:['assets/brand/mascot/reference/cdawg-b1-turnaround-v001.png','assets/brand/mascot/reference/cdawg-b1-expressions-v001.png'],animationAtlasRegenerationAuthorized:false,productionImports:false,files},null,2)+'\n');
console.log('Packaged focused model and 12 static comparison specimens; no atlas work.');
