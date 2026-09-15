// Deterministic derivatives of owned, approved vectors and V004 renders. No AI or remote assets.
import fs from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import sharp from '../mascot/preview/node_modules/sharp/lib/index.js';
const root='assets/brand/soft-launch/v001',source=root+'/source',out=root+'/CDAWG-Arcade-Discord-Upload-v001';fs.mkdirSync(source,{recursive:true});fs.mkdirSync(out,{recursive:true});
const inputs={tag:'assets/brand/arcade/vector/cdawg-tag-small-v001.svg',logo:'assets/brand/arcade/vector/cdawg-horizontal-dark-v001.svg',mascot:'assets/brand/arcade/runtime/cdawg-host-default-v004.webp'};
const digest=b=>createHash('sha256').update(b).digest('hex');
const mascotPng=await sharp(inputs.mascot).png().toBuffer();
const uri=p=>`data:${p.endsWith('.svg')?'image/svg+xml':'image/png'};base64,${(p===inputs.mascot?mascotPng:fs.readFileSync(p)).toString('base64')}`;
const image=(p,x,y,w,h)=>`<image href="${uri(p)}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const svg=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><title>CDAWG ARCADE</title><rect width="${w}" height="${h}" fill="#0F1113"/>${body}</svg>`;
const icons=svg(1024,1024,`<circle cx="512" cy="512" r="410" fill="#191C1E"/><path d="M225 819H799" stroke="#FF8A2B" stroke-width="24" stroke-linecap="round"/>${image(inputs.tag,216,135,592,666)}`);
const cover=svg(1920,1080,`<circle cx="1350" cy="650" r="480" fill="#191C1E"/><path d="M340 910H1580" stroke="#B08B4F" stroke-width="4"/><path d="M360 870H780" stroke="#FF8A2B" stroke-width="12"/>${image(inputs.logo,440,140,1040,250)}${image(inputs.mascot,640,360,640,640)}`);
const background=svg(1920,1080,`<path d="M0 96H480M1440 984H1920" stroke="#B08B4F" stroke-width="4"/><path d="M0 118H260M1660 962H1920" stroke="#FF8A2B" stroke-width="12"/>${image(inputs.tag,35,770,170,200)}${image(inputs.mascot,1490,0,430,430)}`);
const masters={'application-icon':icons,'activity-cover':cover,'embedded-background':background};for(const [name,body]of Object.entries(masters))fs.writeFileSync(`${source}/${name}-v001.svg`,body+'\n');
const files=[];async function exportPng(name,input,width,height,destination){const bytes=await sharp(Buffer.from(input)).resize(width,height,{fit:'fill'}).png({compressionLevel:9,adaptiveFiltering:false,palette:false}).toBuffer();fs.writeFileSync(out+'/'+name,bytes);const m=await sharp(bytes).metadata();assert.equal(m.width,width);assert.equal(m.height,height);files.push({file:name,width,height,format:'png',bytes:bytes.length,sha256:digest(bytes),destination});}
await exportPng('01-application-icon-1024-v001.png',icons,1024,1024,'General Information → App Icon');
await exportPng('02-bot-avatar-1024-v001.png',icons,1024,1024,'Bot → Avatar (same identity, separately configured)');
await exportPng('03-activity-cover-1920x1080-v001.png',cover,1920,1080,'Activities → Art Assets → Cover Art');
await exportPng('04-embedded-background-1920x1080-v001.png',background,1920,1080,'Activities → Art Assets → Embedded Background');
await exportPng('05-social-share-1200x675-v001.png',cover,1200,675,'Repository/share derivative; not a Portal field');
for(const size of [16,24,32,48,64,128,256])await exportPng(`specimen-icon-${size}-v001.png`,icons,size,size,'Small-size review specimen only');
fs.writeFileSync(`${source}/favicon-v001.svg`,icons+'\n');
fs.writeFileSync(out+'/manifest.json',JSON.stringify({version:'v001',provenance:'Owned approved CDAWG Arcade Notched Tag / outlined Fredoka wordmark / unchanged approved V004 host render. Derivative composition only; no mascot regeneration.',inputs:Object.fromEntries(Object.entries(inputs).map(([k,p])=>[k,{path:p,sha256:digest(fs.readFileSync(p))}])),masters:Object.keys(masters).map(n=>({path:`source/${n}-v001.svg`,sha256:digest(fs.readFileSync(`${source}/${n}-v001.svg`))})),exporter:'scripts/soft-launch/export-brand.mjs; pinned Sharp 0.34.3; PNG compressionLevel=9, no timestamp metadata',specificationSource:'https://docs.discord.com/developers/activities/development-guides/assets-and-metadata',files},null,2)+'\n');console.log(`Exported ${files.length} deterministic PNG derivatives`);
