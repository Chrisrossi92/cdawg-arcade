// Build the reviewed main snapshot locally, then repeat both current production graphs.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,symlinkSync,readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const sha='432cba05fbd0c8842524143b04f0bef53ad54f53';
const baseline=mkdtempSync(join(tmpdir(),'arcade-countdown-base-'));
const archive=execFileSync('git',['archive',sha],{maxBuffer:512*1024*1024});
execFileSync('tar',['-x','-C',baseline],{input:archive});symlinkSync(resolve('node_modules'),join(baseline,'node_modules'));
const env={PATH:dirname(process.execPath)+':'+process.env.PATH};
const run=(cwd,args)=>execFileSync(process.execPath,args,{cwd,env,stdio:'inherit'});
const inventory=root=>Object.fromEntries(readdirSync(root,{recursive:true}).filter(p=>statSync(join(root,p)).isFile()).sort().map(p=>{const b=readFileSync(join(root,p));return[p,{bytes:b.length,gzip:gzipSync(b).length,sha256:createHash('sha256').update(b).digest('hex')}];}));
const artifacts=cwd=>({ordinary:inventory(join(cwd,'dist')),server:inventory(join(cwd,'build')),enabled:inventory(join(cwd,'tmp/lobby-integration/dist'))});
run(baseline,['scripts/test-production.mjs']);run(baseline,['scripts/lobby/build.mjs']);const before=artifacts(baseline);
run('.', ['scripts/test-production.mjs']);run('.', ['scripts/lobby/build.mjs']);const after=artifacts('.');
run('.', ['scripts/test-production.mjs']);run('.', ['scripts/lobby/build.mjs']);const repeated=artifacts('.');assert.deepEqual(repeated,after,'production build does not reproduce');
const serverBefore={...before.server},serverAfter={...after.server};
delete serverBefore['release.json'];delete serverAfter['release.json'];
assert.deepEqual(serverAfter,serverBefore,'server runtime artifact changed');
// release.json legitimately records the changed client asset hashes.
const oldRelease=JSON.parse(readFileSync(join(baseline,'build/release.json'))),newRelease=JSON.parse(readFileSync('build/release.json'));
for(const key of ['clientId','apiBase','version','releaseSha'])assert.equal(newRelease[key],oldRelease[key]);
// Compare shipped payload; Vite's build-only manifest contains baseline symlink paths.
const totals=group=>({bytes:Object.entries(group).filter(([p])=>!p.startsWith('.vite/')).reduce((n,[,v])=>n+v.bytes,0),jsGzip:Object.entries(group).filter(([p])=>p.endsWith('.js')).reduce((n,[,v])=>n+v.gzip,0)});
const sizes=Object.fromEntries(['ordinary','enabled'].map(key=>{const a=totals(before[key]),b=totals(after[key]);return[key,{before:a,after:b,delta:{bytes:b.bytes-a.bytes,jsGzip:b.jsGzip-a.jsGzip}}];}));
writeFileSync('tmp/countdown-correction/artifacts.json',JSON.stringify({baselineSha:sha,baselineDirectory:baseline,sizesExcludeBuildManifest:true,byteIdenticalRepeated:true,unchangedServer:true,unchangedServerFiles:Object.keys(serverAfter).length,releaseMetadataChanged:before.server['release.json'].sha256!==after.server['release.json'].sha256,sizes,before,after},null,2));console.log(JSON.stringify(sizes));
