import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import sharp from './preview/node_modules/sharp/lib/index.js';
const dir=process.argv[2]??'assets/brand/mascot/runtime',results=[];
for(const group of ['critical','optional']){
 const stem=`${dir}/cdawg-mascot-${group}-v002`,json=readFileSync(stem+'.json'),m=JSON.parse(json),webp=readFileSync(stem+'.webp');const {data,info}=await sharp(webp).raw().toBuffer({resolveWithObject:true});
 assert.equal(info.channels,4);assert.equal(info.width,m.meta.size.w);assert.equal(info.height,m.meta.size.h);assert.ok(info.width<=2048&&info.height<=2048);assert.equal(m.meta.extrusion,2);
 const used=[];
 for(const [name,list] of Object.entries(m.meta.clips)){assert.equal(list.length,12);for(const key of list){assert.ok(key.startsWith(name+'-'));assert.ok(m.frames[key]);used.push(key)}}
 assert.deepEqual(used.sort(),Object.keys(m.frames).sort());assert.equal(used.length,group==='critical'?96:108);
 for(const f of Object.values(m.frames)){const {x,y,w,h}=f.frame;assert.ok([x,y,w,h].every(Number.isInteger));assert.ok(x>=2&&y>=2&&x+w+2<=info.width&&y+h+2<=info.height);assert.equal(f.sourceSize.w,256);assert.equal(f.sourceSize.h,256);assert.equal(f.spriteSourceSize.w,w);assert.equal(f.spriteSourceSize.h,h);assert.ok(f.spriteSourceSize.x+w<=256&&f.spriteSourceSize.y+h<=256);
 // Exact alpha extrusion guards filtering at every left/right frame edge.
 for(let yy=y;yy<y+h;yy++)for(const [edge,gutter] of [[x,x-1],[x+w-1,x+w]])assert.equal(data[(yy*info.width+edge)*4+3],data[(yy*info.width+gutter)*4+3]);
 for(let xx=x;xx<x+w;xx++)for(const [edge,gutter] of [[y,y-1],[y+h-1,y+h]])assert.equal(data[(edge*info.width+xx)*4+3],data[(gutter*info.width+xx)*4+3]);
 }
 if(group==='critical')assert.ok(webp.length+json.length<750000);results.push({group,frames:used.length,dimensions:[info.width,info.height],webpBytes:webp.length,metadataBytes:json.length,textureRGBABytes:info.width*info.height*4,alphaGutters:'exact'});
}
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
