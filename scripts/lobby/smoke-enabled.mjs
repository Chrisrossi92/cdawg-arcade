// Exercise the compiled server against explicit enabled-mode assets in a disposable
// directory. Never changes the source release gate or ordinary production output.
import {mkdtempSync,cpSync,readFileSync,writeFileSync,readdirSync,symlinkSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=mkdtempSync(join(tmpdir(),'arcade-enabled-smoke-'));
try{
 cpSync('build',join(root,'build'),{recursive:true});
 cpSync('tmp/lobby-integration/dist',join(root,'dist'),{recursive:true,filter:p=>!p.includes('/.vite')});
 symlinkSync(resolve('node_modules'),join(root,'node_modules'),'dir');
 const files={};for(const p of readdirSync(join(root,'dist'),{recursive:true})){
  if(p==='index.html'||p.startsWith('assets/')){const f=join(root,'dist',p);if(/\.(?:html|js|css|svg|woff2|webp)$/.test(p))files[p]=createHash('sha256').update(readFileSync(f)).digest('hex');}
 }
 writeFileSync(join(root,'build/release.json'),JSON.stringify({clientId:'123456789012345678',apiBase:'/api',version:'development-lobby-integration',releaseSha:'development-lobby-integration',files}));
 execFileSync(process.execPath,[resolve('scripts/smoke-production.mjs')],{cwd:root,stdio:'inherit',env:{PATH:process.env.PATH}});
}finally{rmSync(root,{recursive:true,force:true});}
