import sharp from '../mascot/preview/node_modules/sharp/lib/index.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const r='assets/brand/arcade';let checks=0;const sizes={};
for(const file of (await fs.readdir(`${r}/runtime`)).filter(x=>x.endsWith('.png'))){
 const p=`${r}/runtime/${file}`, m=await sharp(p).metadata(),stats=await sharp(p).stats();
 assert(m.hasAlpha);assert(stats.channels[3].min===0&&stats.channels[3].max===255);checks+=2;
 const n=file.match(/-(\d+)-v001/);if(n){assert.equal(m.width,Number(n[1]));assert.equal(m.height,Number(n[1]));checks+=2;}
 sizes[file]={width:m.width,height:m.height,bytes:(await fs.stat(p)).size};
}
for(const file of (await fs.readdir(`${r}/vector`)).filter(x=>x.endsWith('.svg'))){
 const {data,info}=await sharp(`${r}/vector/${file}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 // Clear outer edges prove paths do not clip against their SVG viewport.
 for(let x=0;x<info.width;x++){assert.equal(data[x*4+3],0,file);assert.equal(data[((info.height-1)*info.width+x)*4+3],0,file)}
 for(let y=0;y<info.height;y++){assert.equal(data[y*info.width*4+3],0,file);assert.equal(data[(y*info.width+info.width-1)*4+3],0,file)}
 checks++;
}
await fs.writeFile('docs/brand/arcade-raster-validation.json',JSON.stringify({checks,sizes},null,2)+'\n');console.log(`Raster dimension/alpha and SVG unclipped-edge checks: ${checks}`);
