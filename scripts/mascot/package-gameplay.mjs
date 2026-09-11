import {copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir=process.argv[2],version=process.argv[3]??JSON.parse(readFileSync('assets/brand/mascot/manifest.json')).integrationVersion??'v003',root='assets/brand/mascot';if(!/^v\d{3}$/.test(version))throw Error('Invalid asset version');if(!dir)throw Error('Provide packed output directory');
const manifest=JSON.parse(readFileSync(root+'/manifest.json'));const files=[];
for(const group of ['balance0','balance1','reactions0','reactions1'])for(const ext of ['webp','json']){
 const name=`cdawg-mascot-${group}-${version}.${ext}`,path=`${root}/runtime/${name}`;copyFileSync(`${dir}/${name}`,path);files.push(path);
}
const report=`${root}/source/cdawg-mascot-gameplay-report-${version}.json`;copyFileSync(`${dir}/pack-report.json`,report);
manifest.generatedAssets=manifest.generatedAssets.filter(a=>!a.path.includes(version));
for(const path of [...files,report]){const bytes=readFileSync(path);manifest.generatedAssets.push({path,status:'received',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),approvedToShip:false})}
manifest.status='design-approved-gameplay-integration';manifest.integrationExports=files;manifest.integrationVersion=version;
manifest.approval={...manifest.approval,design:version==='v004'?'User approved corrected V004 head, six expressions, collar and tag for atlas rebuild and pre-merge preparation':'User approved Phase 2 appearance for integration',scope:'Feature-branch gameplay presentation only; no deployment or production configuration authorization'};
writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
