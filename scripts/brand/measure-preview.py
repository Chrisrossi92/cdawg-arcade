from pathlib import Path
import re,json,gzip
r=Path('tmp/brand/preview-dist');todo=['index.html'];seen=set();files={}
while todo:
 p=todo.pop()
 if p in seen:continue
 seen.add(p);b=(r/p).read_bytes();files[p]={'bytes':len(b),'gzipBytes':len(gzip.compress(b,mtime=0))}
 if p.endswith(('.js','.html','.css')):
  text=b.decode();
  for match in re.findall(r'(?:/assets/|\./)([A-Za-z0-9_.-]+\.(?:js|css|png|svg|woff2|webp))',text):
   q='assets/'+match
   if (r/q).is_file():todo.append(q)
assert not any('balance-' in p or 'mascot-' in p for p in seen)
assert all(not any(x in p for x in ['reference','source','.ttf','.blend']) for p in seen)
report={'lobbyGraphOnly':True,'phaserLoadedByLobby':False,'noReferenceOrSourceAssets':True,'files':files,'totalBytes':sum(x['bytes'] for x in files.values()),'totalGzipBytes':sum(x['gzipBytes'] for x in files.values()),'note':'Build graph bytes, not measured HTTP transfer; SVGs below Vite threshold are embedded in JS. Separate Balance HTML adds unchanged gameplay only on navigation.'}
Path('docs/brand/arcade-preview-bundle.json').write_text(json.dumps(report,indent=2)+'\n');print('Lobby build graph:',len(files),'files,',report['totalBytes'],'bytes;',report['totalGzipBytes'],'gzip bytes; no Phaser or source boards')
