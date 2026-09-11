import sharp from '../mascot/preview/node_modules/sharp/lib/index.js';
import fs from 'node:fs/promises';
const root='assets/brand/arcade';
for(const n of [16,24,32,48]) await sharp(`${root}/vector/cdawg-tag-small-v001.svg`).resize(n,n,{fit:'contain'}).png().toFile(`${root}/runtime/cdawg-favicon-${n}-v001.png`);
const host=await sharp('tmp/brand/owned-host.png').trim({threshold:5}).png().toBuffer();
await fs.writeFile(`${root}/runtime/cdawg-host-v001.png`,host);
const info=await sharp(host).metadata();
const portrait=await sharp(host).extract({left:0,top:0,width:info.width,height:Math.round(info.height*.65)}).resize(232,232,{fit:'cover',position:'top'}).toBuffer();
for(const n of [64,128,256]){
 const frame=await sharp(`${root}/vector/cdawg-avatar-frame-v001.svg`).png().toBuffer();
 const composed=await sharp(frame).composite([{input:portrait,left:12,top:12}]).png().toBuffer();
 const mask=Buffer.from('<svg width="256" height="256"><rect width="256" height="256" rx="58" fill="white"/></svg>');
 const masked=await sharp(composed).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
 await sharp(masked).resize(n,n).png().toFile(`${root}/runtime/cdawg-avatar-${n}-v001.png`);
}
