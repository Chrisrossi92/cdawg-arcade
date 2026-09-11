import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {expressions,hostCrop,packHost} from './host-image.mjs';
const crop=await hostCrop();
const report=[];
for(const expression of expressions){
 const source=`tmp/lobby-integration/host/${expression}.png`,path=`assets/brand/arcade/runtime/cdawg-host-${expression}-v004.webp`;
 fs.writeFileSync(path,await packHost(expression,crop));
 const data=fs.readFileSync(path);report.push({path,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),source:'approved correction-v004 model',action:`expr_${expression}`,crop});
}
fs.writeFileSync('docs/brand/lobby-host-assets.json',JSON.stringify(report,null,2)+'\n');
