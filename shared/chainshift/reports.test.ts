import {it,expect} from 'vitest';
import {mkdtempSync,mkdirSync,readFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
it('reproduces all Slice 2 reports and manifest fixtures deterministically in isolation',()=>{
 const temporary=mkdtempSync(join(tmpdir(),'chainshift-reports-'));
 const outputs=['GRAPH_HEALTH.md','CORPUS_GAPS.md','CANDIDATE_REVIEW.md','LOCAL_PUZZLES.json'];
 try{
  mkdirSync(join(temporary,'shared/chainshift'),{recursive:true});
  const args=['--import',resolve('node_modules/tsx/dist/loader.mjs'),resolve('shared/chainshift/reports.ts')];
  for(let repeat=0;repeat<2;repeat++){
   execFileSync(process.execPath,args,{cwd:temporary,timeout:30000});
   for(const output of outputs)expect(readFileSync(join(temporary,'shared/chainshift',output),'utf8')).toBe(readFileSync(resolve('shared/chainshift',output),'utf8'));
  }
 }finally{rmSync(temporary,{recursive:true,force:true});}
},30000);
