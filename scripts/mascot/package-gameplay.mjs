import {copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir=process.argv[2],root='assets/brand/mascot';if(!dir)throw Error('Provide packed output directory');
const manifest=JSON.parse(readFileSync(root+'/manifest.json'));const files=[];
for(const group of ['balance0','balance1','reactions0','reactions1'])for(const ext of ['webp','json']){
 const name=`cdawg-mascot-${group}-v003.${ext}`,path=`${root}/runtime/${name}`;copyFileSync(`${dir}/${name}`,path);files.push(path);
}
const report=`${root}/source/cdawg-mascot-gameplay-report-v003.json`;copyFileSync(`${dir}/pack-report.json`,report);
manifest.generatedAssets=manifest.generatedAssets.filter(a=>!a.path.includes('v003'));
for(const path of [...files,report]){const bytes=readFileSync(path);manifest.generatedAssets.push({path,status:'received',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),approvedToShip:false})}
manifest.status='design-approved-gameplay-integration';manifest.integrationExports=files;
manifest.approval={design:'User approved Phase 2 appearance for integration',scope:'Feature-branch gameplay presentation only; no deployment or production configuration authorization'};
writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
