import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
const root=process.argv[2]??'tmp/mascot/gameplay-reproduce';mkdirSync(root,{recursive:true});
const version=JSON.parse(readFileSync('assets/brand/mascot/manifest.json')).integrationVersion??'v003';
const source=version==='v004'?'assets/brand/mascot/correction-v004/source/cdawg-mascot-correction-v004.blend':'assets/brand/mascot/source/cdawg-mascot-candidate-v002.blend';
const blender=process.env.CDAWG_BLENDER_BIN??(process.platform==='darwin'?'/Applications/Blender.app/Contents/MacOS/Blender':'blender');
function run(script,args){execFileSync(blender,['--background','--factory-startup','--python-exit-code','1','--python',`scripts/mascot/${script}`,'--',...args],{stdio:'inherit'})}
for(const side of ['a','b'])run('render-gameplay.py',['--source',source,'--output',`${root}/${side}`]);
run('validate-gameplay-renders.py',['--a',`${root}/a`,'--b',`${root}/b`,'--report',`${root}/render-validation.json`]);
execFileSync(process.execPath,['scripts/mascot/pack-gameplay.mjs',`${root}/a`,`${root}/packed`,version],{stdio:'inherit'});
console.log('Validated output remains temporary; promote explicitly with package-gameplay.mjs.');
