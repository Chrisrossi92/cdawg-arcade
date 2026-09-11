// Run from repository root. No installs, network, credentials or global preferences.
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
const blender=process.env.CDAWG_BLENDER_BIN??(process.platform==='darwin'?'/Applications/Blender.app/Contents/MacOS/Blender':'blender');
const root='tmp/mascot/reproduce';mkdirSync(root,{recursive:true});
function run(script,args){execFileSync(blender,['--background','--factory-startup','--python-exit-code','1','--python',`scripts/mascot/${script}`,'--',...args],{stdio:'inherit'})}
for(const name of ['a','b'])run('build-prototype.py',['--output',`${root}/${name}`,'--render']);
run('compose-previews.py',['--input',`${root}/a`,'--output',`${root}/composed`]);
run('reimport-check.py',['--input',`${root}/a`,'--output',`${root}/reimport`]);
run('compare-renders.py',['--a',`${root}/a`,'--b',`${root}/b`,'--reimport',`${root}/reimport`,'--report',`${root}/reproducibility.json`]);
for(const name of ['validate-glb','verify-animation'])execFileSync(process.execPath,[`scripts/mascot/${name}.mjs`,`${root}/a/cdawg-mascot-feasibility-v001.glb`,`${root}/${name}.json`],{stdio:'inherit'});
console.log('Reproduction validated. Review outputs before promoting with package-prototype.mjs.');
