// Crop, extrude, deduplicate and encode the actual Blender frames. Local tooling only.
import sharp from './preview/node_modules/sharp/lib/index.js';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [source,out]=process.argv.slice(2);assert.ok(source&&out);mkdirSync(out,{recursive:true});
const frames=JSON.parse(readFileSync(source+'/atlas-frames.json'));
const critical=['idle_default','lean_left','lean_right','wobble_left','wobble_right','panic','fall','victory_small'];
const model=JSON.parse(readFileSync(source+'/model-report.json'));
const [cx,cy,cz]=model.camera.blenderPosition,[tx,ty,tz]=model.camera.target;
const dx=cx-tx,dy=cy-ty,dz=cz-tz,horizontal=Math.hypot(dx,dy),distance=Math.hypot(horizontal,dz);
const up=[-dx*dz/(horizontal*distance),-dy*dz/(horizontal*distance),horizontal/distance];
const groundOffset=Math.round(256*(.5+((-tx)*up[0]+(-.2-ty)*up[1]+(-tz)*up[2])/model.camera.orthographicHeight));
const results=[];
for(const [group,predicate] of [['critical',n=>critical.includes(n)],['optional',n=>!critical.includes(n)]]){
 const selected=frames.filter(f=>predicate(f.clip)),unique=[],seen=new Map(),records={},clips={};let x=0,y=0,row=0;
 for(const f of selected){const {data,info}=await sharp(source+'/frames/'+f.file).raw().toBuffer({resolveWithObject:true});let minX=info.width,minY=info.height,maxX=0,maxY=0;
 for(let yy=0;yy<info.height;yy++)for(let xx=0;xx<info.width;xx++)if(data[(yy*info.width+xx)*4+3]>5){minX=Math.min(minX,xx);minY=Math.min(minY,yy);maxX=Math.max(maxX,xx);maxY=Math.max(maxY,yy)}
 assert.ok(minX>=2&&minY>=2&&maxX<info.width-2&&maxY<info.height-2,'Clipped '+f.file);
 minX=Math.max(0,minX-1);minY=Math.max(0,minY-1);maxX=Math.min(info.width-1,maxX+1);maxY=Math.min(info.height-1,maxY+1);
 const w=maxX-minX+1,h=maxY-minY+1;const crop=await sharp(data,{raw:info}).extract({left:minX,top:minY,width:w,height:h}).raw().toBuffer();const hash=createHash('sha256').update(crop).update(`${minX},${minY},${w},${h}`).digest('hex');const key=f.file.replace('.png','');let entry=seen.get(hash);
 if(!entry){if(x+w+4>2048){x=0;y+=row;row=0}entry={frame:{x:x+2,y:y+2,w,h},rotated:false,trimmed:true,spriteSourceSize:{x:minX,y:minY,w,h},sourceSize:{w:info.width,h:info.height}};seen.set(hash,entry);const padded=await sharp(crop,{raw:{width:w,height:h,channels:4}}).extend({top:2,bottom:2,left:2,right:2,extendWith:'copy'}).png().toBuffer();unique.push({input:padded,left:x,top:y});x+=w+4;row=Math.max(row,h+4)}
 records[key]=entry;(clips[f.clip]??=[]).push(key);
 }
 const height=y+row;assert.ok(height<=2048,'Split atlas before exceeding GPU limit');const base=await sharp({create:{width:2048,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(unique).png().toBuffer();
 const raw=await sharp(base).raw().toBuffer();const experiments=[];let chosen,selectedQuality;
 for(const quality of [100,95,90,82]){const encoded=await sharp(base).webp(quality===100?{lossless:true,effort:4}:{quality,alphaQuality:100,effort:4}).toBuffer();const decoded=await sharp(encoded).raw().toBuffer();let sum=0,count=0,alphaError=0;
 for(let i=0;i<raw.length;i+=4){alphaError=Math.max(alphaError,Math.abs(raw[i+3]-decoded[i+3]));for(let c=0;c<3;c++){const a=raw[i+3]/255,b=decoded[i+3]/255;for(const bg of [24,232]){const err=(raw[i+c]*a+bg*(1-a))-(decoded[i+c]*b+bg*(1-b));sum+=err*err;count++}}}
 const rms=Math.sqrt(sum/count);let maxFrameRMS=0;
 for(const {frame:f} of Object.values(records)){let error=0;for(let yy=f.y;yy<f.y+f.h;yy++)for(let xx=f.x;xx<f.x+f.w;xx++){const i=(yy*2048+xx)*4;for(let c=0;c<3;c++)error+=((raw[i+c]-decoded[i+c])*raw[i+3]/255)**2}maxFrameRMS=Math.max(maxFrameRMS,Math.sqrt(error/(256*256*3)))}
 experiments.push({format:quality===100?'WebP lossless':`WebP q${quality}`,bytes:encoded.length,compositedRMSByteError:rms,maxSourceFrameRMSByteError:maxFrameRMS,maxAlphaByteError:alphaError});console.log(JSON.stringify({group,quality,bytes:encoded.length,rms,maxFrameRMS,alphaError}));if(quality!==100&&maxFrameRMS<2&&alphaError===0){chosen=encoded;selectedQuality=quality}
 }
 assert.ok(chosen,'No lossy encoding meets the composite error gate');
 const stem=`cdawg-mascot-${group}-v002`;writeFileSync(`${out}/${stem}.webp`,chosen);writeFileSync(`${out}/${stem}.png`,base);
 const metadata={frames:records,meta:{app:'CDAWG local Blender pipeline',version:2,image:stem+'.webp',format:'RGBA8888',size:{w:2048,h:height},scale:'1',groundOffset,clips,durationSeconds:23/24,cadence:'12 endpoint-inclusive samples across 24 source frames; deterministic selection',extrusion:2,group}};const json=JSON.stringify(metadata);writeFileSync(`${out}/${stem}.json`,json+'\n');
 results.push({group,frames:selected.length,uniqueFrames:unique.length,sourcePixels:selected.length*256*256,atlasPixels:2048*height,width:2048,height,pngBytes:base.length,webpBytes:chosen.length,selectedQuality,metadataBytes:Buffer.byteLength(json)+1,initialPayloadBytes:chosen.length+Buffer.byteLength(json)+1,experiments});
}
assert.ok(results[0].initialPayloadBytes<750000,'Initial atlas payload exceeds preferred budget');
async function sheet(name,paths,cols,size,labels){const tiles=[];for(let i=0;i<paths.length;i++){const tile=await sharp(paths[i]).resize(size,size).png().toBuffer();tiles.push({input:tile,left:(i%cols)*size,top:Math.floor(i/cols)*(size+30)});if(labels){const svg=Buffer.from(`<svg width="${size}" height="30"><text x="${size/2}" y="21" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#4d3a2b">${labels[i].replaceAll('_',' ').toUpperCase()}</text></svg>`);tiles.push({input:svg,left:(i%cols)*size,top:Math.floor(i/cols)*(size+30)+size})}}await sharp({create:{width:cols*size,height:Math.ceil(paths.length/cols)*(size+30),channels:4,background:'#e7dccb'}}).composite(tiles).png().toFile(`${out}/${name}.png`)}
const expressions=['default','delighted','determined','worried','panic','frustrated','proud','dizzy','mischief'];await sheet('cdawg-mascot-expressions-v002',expressions.map(n=>`${source}/expressions/${n}.png`),3,384,expressions);
const views=['front','side','back','three-quarter'];await sheet('cdawg-mascot-turnaround-v002',views.map(n=>`${source}/views/${n}.png`),4,256,views);
await sheet('cdawg-mascot-motion-v002',critical.map(n=>`${source}/frames/${n}-09.png`),4,256,critical);
writeFileSync(out+'/optimization-report.json',JSON.stringify({encoder:sharp.versions,results,alpha:'Alpha exact; per-source-cell RMS must be below 2/255 for every frame; composited RMS tested on light and dark backgrounds; two-pixel duplicated gutters',avif:'Not selected: WebP verified directly in Phaser; no additional format needed'},null,2)+'\n');console.log(JSON.stringify(results));
