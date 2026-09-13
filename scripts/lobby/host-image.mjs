import sharp from '../mascot/preview/node_modules/sharp/lib/index.js';
export const expressions=['default','mischief','delighted'];
// One union crop for every expression preserves alignment across crossfades.
export async function hostCrop(){
 let left=512,top=512,right=0,bottom=0;
 for(const expression of expressions){const {data,info}=await sharp(`tmp/lobby-integration/host/${expression}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>0){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}}
 const size=Math.min(512,Math.max(right-left+1,bottom-top+1)+24);left=Math.max(0,Math.min(512-size,Math.floor((left+right-size)/2)));top=Math.max(0,Math.min(512-size,Math.floor((top+bottom-size)/2)));return {left,top,width:size,height:size};
}
export async function packHost(expression,crop){return sharp(`tmp/lobby-integration/host/${expression}.png`).extract(crop).resize(512,512).webp({quality:85,alphaQuality:100,effort:6}).toBuffer();}
