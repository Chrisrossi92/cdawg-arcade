// Explicit local validation using public dummy metadata and owned disposable data.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
const env={PATH:`${dirname(process.execPath)}:/Applications/Docker.app/Contents/Resources/bin:${process.env.PATH}`};
execFileSync('mkdir',['-p','tmp/soft-launch']);
const outcomes=[];
const run=(name,args,{command=process.execPath,preserve=[]}={})=>{
 const prior=preserve.map(path=>[path,readFileSync(path)]);
 try{const output=execFileSync(command,args,{env,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:8*1024*1024});writeFileSync(`tmp/soft-launch/${name}.log`,output);outcomes.push({name,pass:true});console.log('PASS',name);}
 catch(error){writeFileSync(`tmp/soft-launch/${name}.log`,String(error.stdout??'')+String(error.stderr??''));outcomes.push({name,pass:false});console.log('FAIL',name);}
 finally{for(const [path,bytes]of prior){writeFileSync(`tmp/soft-launch/${path.split('/').at(-1)}`,readFileSync(path));writeFileSync(path,bytes);}writeFileSync('tmp/soft-launch/suites.json',JSON.stringify(outcomes,null,2)+'\n');}
};
run('cdp-tooling',['node_modules/vitest/vitest.mjs','run','scripts/audio-readiness/cdp-port.test.mjs','scripts/audio-readiness/cdp-process.test.mjs','scripts/audio-readiness/cdp-transport.test.mjs']);
run('unit',['node_modules/vitest/vitest.mjs','run','--maxWorkers=2']);
run('typecheck',['node_modules/typescript/bin/tsc','-b']);
run('production',['scripts/test-production.mjs']);
run('database',['scripts/test-database.mjs']);
run('enabled-build',['scripts/lobby/build.mjs']);
run('enabled-smoke',['scripts/lobby/smoke-enabled.mjs']);
run('readiness-typecheck',['node_modules/typescript/bin/tsc','-p','scripts/readiness/tsconfig.json']);
run('lobby-typecheck',['node_modules/typescript/bin/tsc','-p','scripts/lobby/harness/tsconfig.json']);
run('atlas',['scripts/mascot/validate-gameplay-atlas.mjs','assets/brand/mascot/runtime','v004']);
run('brand',['scripts/brand/validate.py'],{command:'/private/tmp/cdawg-brand-tools/bin/python',preserve:['docs/brand/arcade-asset-validation.json']});
run('raster',['scripts/brand/validate-raster.mjs'],{preserve:['docs/brand/arcade-raster-validation.json']});
run('host',['scripts/lobby/validate-assets.mjs'],{preserve:['docs/brand/lobby-host-validation.json']});
run('glb',['scripts/mascot/validate-correction-glb.mjs','assets/brand/mascot/correction-v004/source/cdawg-mascot-correction-v004.glb','tmp/soft-launch/glb.json']);
run('graph',['scripts/soft-launch/validate.mjs']);
run('boundaries',['scripts/verify-balance-rules.mjs']);
run('security',['scripts/scan-production.mjs']);
if(outcomes.some(o=>!o.pass))process.exitCode=1;
