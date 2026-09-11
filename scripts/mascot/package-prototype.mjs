// Promote only explicit prototype outputs; canonical originals are never touched.
import {copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const source=process.argv[2],renders=process.argv[3];
if(!source||!renders)throw new Error('Usage: node scripts/mascot/package-prototype.mjs MODEL_DIR COMPOSED_DIR');
const root='assets/brand/mascot';
const files=[
 [source,'cdawg-mascot-feasibility-v001.glb','runtime'],
 [source,'cdawg-mascot-feasibility-v001.blend','source'],
 [renders,'cdawg-mascot-atlas-v001.png','runtime'],
 [renders,'cdawg-mascot-atlas-v001.json','runtime'],
 [renders,'cdawg-mascot-contact-v001.png','previews'],
 [renders,'cdawg-mascot-turntable-v001.png','previews'],
];
for(const [dir,name,category] of files)copyFileSync(join(dir,name),join(root,category,name));
copyFileSync(join(source,'model-report.json'),join(root,'source/cdawg-mascot-model-report-v001.json'));
const manifest=JSON.parse(readFileSync(join(root,'manifest.json')));manifest.status='feasibility-prototype-not-production-approved';
manifest.generatedAssets=[...files.map(([,name,category])=>join(root,category,name)),join(root,'source/cdawg-mascot-model-report-v001.json')].map(path=>{const data=readFileSync(path);return {path,status:'received',bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),approvedToShip:false}});
writeFileSync(join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Packaged ${manifest.generatedAssets.length} non-shipping prototype deliverables.`);
