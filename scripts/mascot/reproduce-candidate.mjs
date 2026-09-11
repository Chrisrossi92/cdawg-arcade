// Complete offline Phase 2 rebuild. Output remains ignored until explicit packaging.
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
const blender=process.env.CDAWG_BLENDER_BIN??(process.platform==='darwin'?'/Applications/Blender.app/Contents/MacOS/Blender':'blender');
const root=process.argv[2]??'tmp/mascot/phase2-reproduce';mkdirSync(root,{recursive:true});
function run(script,args){execFileSync(blender,['--background','--factory-startup','--python-exit-code','1','--python',`scripts/mascot/${script}`,'--',...args],{stdio:'inherit'})}
for(const name of ['a','b'])run('build-candidate.py',['--output',`${root}/${name}`,'--render']);
execFileSync(process.execPath,['scripts/mascot/optimize-candidate.mjs',`${root}/a`,`${root}/composed`],{stdio:'inherit'});
run('reimport-check.py',['--candidate','--input',`${root}/a`,'--output',`${root}/reimport`]);
run('compare-renders.py',['--candidate','--a',`${root}/a`,'--b',`${root}/b`,'--reimport',`${root}/reimport`,'--report',`${root}/reproducibility.json`]);
for(const name of ['validate-glb','verify-animation'])execFileSync(process.execPath,[`scripts/mascot/${name}.mjs`,`${root}/a/cdawg-mascot-candidate-v002.glb`,`${root}/${name}.json`],{stdio:'inherit'});
console.log('Candidate rebuilt and validated. No shipping assets changed.');
