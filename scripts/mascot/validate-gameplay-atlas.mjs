import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import sharp from './preview/node_modules/sharp/lib/index.js';
const root=process.argv[2]??'assets/brand/mascot/runtime',version=process.argv[3]??JSON.parse(readFileSync('assets/brand/mascot/manifest.json')).integrationVersion??'v003';assert.match(version,/^v\d{3}$/);let total=0;
for(const [group,count] of [['balance0',58],['balance1',58],['reactions0',87],['reactions1',62]]){
 const m=JSON.parse(readFileSync(`${root}/cdawg-mascot-${group}-${version}.json`));const {data,info}=await sharp(`${root}/cdawg-mascot-${group}-${version}.webp`).raw().toBuffer({resolveWithObject:true});assert.equal(info.width,m.meta.size.w);assert.equal(info.height,m.meta.size.h);assert.ok(info.width<=2048&&info.height<=2048);assert.equal(Object.keys(m.frames).length,count);
 for(const f of Object.values(m.frames)){const {x,y,w,h}=f.frame;assert.ok(x>=2&&y>=2&&x+w+2<=info.width&&y+h+2<=info.height);assert.equal(f.sourceSize.w,256);assert.equal(f.sourceSize.h,256);
  for(let yy=y;yy<y+h;yy++)for(const [edge,gutter]of[[x,x-1],[x+w-1,x+w]])assert.equal(data[(yy*info.width+edge)*4+3],data[(yy*info.width+gutter)*4+3]);
  for(let xx=x;xx<x+w;xx++)for(const [edge,gutter]of[[y,y-1],[y+h-1,y+h]])assert.equal(data[(edge*info.width+xx)*4+3],data[(gutter*info.width+xx)*4+3]);
 }total+=count;
}
for(let p=0;p<4;p++)for(let i=0;i<29;i++){const group=`balance${Math.floor(p/2)}`;const m=JSON.parse(readFileSync(`${root}/cdawg-mascot-${group}-${version}.json`));assert.ok(m.frames[`balance-${p}-${String(i).padStart(2,'0')}`])}
console.log(`Validated ${total} sprite records, phase/lean coverage, texture bounds and exact alpha gutters.`);
