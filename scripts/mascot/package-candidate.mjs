// Explicit promotion keeps originals and historical Phase 1 evidence intact.
import {copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const [source,composed]=process.argv.slice(2);if(!source||!composed)throw Error('Usage: package-candidate.mjs MODEL_DIR COMPOSED_DIR');
const root='assets/brand/mascot',files=[];
for(const [dir,name,category] of [[source,'cdawg-mascot-candidate-v002.glb','runtime'],[source,'cdawg-mascot-candidate-v002.blend','source'],...['critical','optional'].flatMap(group=>['webp','json'].map(ext=>[composed,`cdawg-mascot-${group}-v002.${ext}`,'runtime'])),...['expressions','turnaround','motion'].map(name=>[composed,`cdawg-mascot-${name}-v002.png`,'previews'])]){const path=`${root}/${category}/${name}`;copyFileSync(`${dir}/${name}`,path);files.push(path)}
for(const [dir,name,target] of [[source,'model-report.json','cdawg-mascot-model-report-v002.json'],[composed,'optimization-report.json','cdawg-mascot-optimization-v002.json']]){const path=`${root}/source/${target}`;copyFileSync(`${dir}/${name}`,path);files.push(path)}
const manifest=JSON.parse(readFileSync(`${root}/manifest.json`));manifest.status='canonical-candidate-awaiting-creative-approval';manifest.generatedAssets=manifest.generatedAssets.filter(x=>!x.path.includes('v002'));
for(const path of files){const data=readFileSync(path);manifest.generatedAssets.push({path,status:'received',bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),approvedToShip:false})}
writeFileSync(`${root}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');console.log(`Registered ${files.length} non-shipping candidate assets.`);
