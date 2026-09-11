import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from './preview/node_modules/sharp/lib/index.js';
import {execFileSync} from 'node:child_process';
const root='assets/brand/mascot/correction-v004',manifest=JSON.parse(await fs.readFile(`${root}/manifest.json`,'utf8'));let checks=0;const images=[];
for(const [path,meta] of Object.entries(manifest.files)){
 const b=await fs.readFile(`${root}/${path}`);assert.equal(b.length,meta.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),meta.sha256);checks+=2;
 if(path.endsWith('.png')){const m=await sharp(b).metadata(),s=await sharp(b).stats();assert(m.hasAlpha);assert.equal(s.channels[3].min,0);assert.equal(s.channels[3].max,255);checks+=3;const expected=path.includes('expr-')?480:path.includes('head')?640:path.includes('gameplay')?256:null;if(expected){assert.equal(m.width,expected);assert.equal(m.height,expected);checks+=2}images.push({path,width:m.width,height:m.height,bytes:b.length});}
}
const original=JSON.parse(await fs.readFile('assets/brand/mascot/manifest.json','utf8'));
for(const entry of original.inputs.filter(x=>['turnaround','expressions'].includes(x.role))){const b=await fs.readFile(entry.path);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),entry.sha256);checks++}
const unchanged=['src','server','shared','assets/brand/arcade','assets/brand/mascot/runtime','assets/brand/mascot/source','vite.config.ts','package.json','package-lock.json','index.html'];
assert.equal(execFileSync('git',['diff','bc803e4','--name-only','--',...unchanged],{encoding:'utf8'}).trim(),'');checks++;
const baseline=JSON.parse(await fs.readFile('docs/brand/arcade-production-comparison.json','utf8')).files;
for(const [path,meta] of Object.entries(baseline)){const b=await fs.readFile(path);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),meta.sha256);checks++}
const result={checks,images,canonicalInputsUnchanged:true,approvedBrandAndProductionSourcesUnchanged:true,productionArtifactsIdentical:Object.keys(baseline).length,atlasesRegenerated:false};
await fs.writeFile('docs/brand/mascot-correction-assets.json',JSON.stringify(result,null,2)+'\n');console.log(`Correction asset/isolation checks: ${checks}; production unchanged; no atlas regeneration`);
