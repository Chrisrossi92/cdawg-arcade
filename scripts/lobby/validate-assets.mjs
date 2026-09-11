import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
execFileSync('git',['diff','--exit-code','758c926e9a733f0c83a904515c4654b2227e7728','--','assets/brand/mascot/correction-v004/source/cdawg-mascot-correction-v004.blend'],{stdio:'pipe'});
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from '../mascot/preview/node_modules/sharp/lib/index.js';
import {hostCrop,packHost} from './host-image.mjs';
const crop=await hostCrop();
const hash=data=>createHash('sha256').update(data).digest('hex');let checks=0;
const sources=[];
for(const expression of ['default','mischief','delighted']){
 const file=`assets/brand/arcade/runtime/cdawg-host-${expression}-v004.webp`,data=fs.readFileSync(file),meta=await sharp(data).metadata(),stats=await sharp(data).stats();
 assert.equal(meta.width,512);assert.equal(meta.height,512);assert.equal(meta.hasAlpha,true);assert.equal(stats.channels[3].min,0);assert.equal(stats.channels[3].max,255);assert(data.length<35000);checks+=6;
 const packed=await packHost(expression,crop);assert.equal(hash(data),hash(packed));checks++;
 const {data:raw,info}=await sharp(data).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let x=0;x<info.width;x++){assert.equal(raw[x*4+3],0);assert.equal(raw[((info.height-1)*info.width+x)*4+3],0);}for(let y=0;y<info.height;y++){assert.equal(raw[y*info.width*4+3],0);assert.equal(raw[(y*info.width+info.width-1)*4+3],0);}checks++;
 sources.push({file,bytes:data.length,sha256:hash(data),alpha:true,width:512,height:512});
}
assert.notEqual(sources[0].sha256,sources[1].sha256);checks++;
fs.writeFileSync('docs/brand/lobby-host-validation.json',JSON.stringify({checks,reproduciblePacking:true,unclipped:true,modelUnmodified:true,files:sources},null,2)+'\n');console.log(`Lobby host assets: ${checks} checks; deterministic packing, alpha and unclipped edges`);
