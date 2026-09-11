import sharp from './preview/node_modules/sharp/lib/index.js';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [source,out,version="v003"]=process.argv.slice(2);assert.match(version,/^v\d{3}$/);mkdirSync(out,{recursive:true});
const samples=Array.from({length:49},(_,i)=>i).filter(i=>i%2===0||[3,5,43,45].includes(i));
const inputs=JSON.parse(readFileSync(source+'/frames.json')).filter(f=>!f.group.startsWith('balance')||samples.includes(f.index));const reports=[];
for(const group of ['balance0','balance1','reactions0','reactions1']){
 const selected=inputs.filter(f=>f.group.startsWith('balance')?f.group===group:(group==='reactions0'?(f.side===-1||f.name.startsWith('result')):group==='reactions1'&&f.side===1));
 const frames={},tiles=[],seen=new Map();let x=0,y=0,row=0,minMargin=256;
 for(const f of selected){const {data,info}=await sharp(`${source}/${f.name}.png`).raw().toBuffer({resolveWithObject:true});let l=255,t=255,r=0,b=0;
 for(let yy=0;yy<256;yy++)for(let xx=0;xx<256;xx++)if(data[(yy*256+xx)*4+3]>5){l=Math.min(l,xx);t=Math.min(t,yy);r=Math.max(r,xx);b=Math.max(b,yy)}
 minMargin=Math.min(minMargin,l,t,255-r,255-b);assert.ok(minMargin>=3,'Clipped '+f.name);l--;t--;r++;b++;const w=r-l+1,h=b-t+1;
 const crop=await sharp(data,{raw:info}).extract({left:l,top:t,width:w,height:h}).raw().toBuffer();const key=createHash('sha256').update(crop).update(`${l},${t},${w},${h}`).digest('hex');let entry=seen.get(key);
 if(!entry){if(x+w+4>2048){x=0;y+=row;row=0}entry={frame:{x:x+2,y:y+2,w,h},rotated:false,trimmed:true,spriteSourceSize:{x:l,y:t,w,h},sourceSize:{w:256,h:256}};seen.set(key,entry);tiles.push({input:await sharp(crop,{raw:{width:w,height:h,channels:4}}).extend({top:2,bottom:2,left:2,right:2,extendWith:'copy'}).png().toBuffer(),left:x,top:y});x+=w+4;row=Math.max(row,h+4)}frames[f.group.startsWith('balance')?`balance-${f.phase}-${String(samples.indexOf(f.index)).padStart(2,'0')}`:f.name]=entry;
 }
 const height=y+row;assert.ok(height<=2048);const png=await sharp({create:{width:2048,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).png().toBuffer();const webp=await sharp(png).webp({quality:90,alphaQuality:100,effort:4}).toBuffer();const raw=await sharp(png).raw().toBuffer(),decoded=await sharp(webp).raw().toBuffer();let maxRMS=0;
 for(const {frame:f} of Object.values(frames)){let sum=0;for(let yy=f.y;yy<f.y+f.h;yy++)for(let xx=f.x;xx<f.x+f.w;xx++){const i=(yy*2048+xx)*4;assert.equal(raw[i+3],decoded[i+3]);for(let c=0;c<3;c++)sum+=((raw[i+c]-decoded[i+c])*raw[i+3]/255)**2}maxRMS=Math.max(maxRMS,Math.sqrt(sum/(256*256*3)))}assert.ok(maxRMS<2,'Quality gate');
 const stem=`cdawg-mascot-${group}-${version}`;const metadata={frames,meta:{image:stem+'.webp',size:{w:2048,h:height},groundOffset:30,extrusion:2,balanceSamples:samples.length,sourceIndices:samples,phaseSamples:4,lossSamples:31,resultSamples:25}};writeFileSync(`${out}/${stem}.webp`,webp);writeFileSync(`${out}/${stem}.json`,JSON.stringify(metadata)+'\n');writeFileSync(`${out}/${stem}.png`,png);
 reports.push({group,frames:selected.length,unique:tiles.length,dimensions:[2048,height],webpBytes:webp.length,jsonBytes:Buffer.byteLength(JSON.stringify(metadata))+1,pngBytes:png.length,decodedRGBABytes:2048*height*4,maxFrameRMS:maxRMS,minMargin});
}
writeFileSync(out+'/pack-report.json',JSON.stringify(reports,null,2)+'\n');console.log(JSON.stringify(reports));
