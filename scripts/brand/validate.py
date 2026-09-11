"""Offline brand structure, source integrity, font and contrast checks."""
from pathlib import Path
import json,hashlib,xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
r=Path('assets/brand/arcade'); count=0
for p in (r/'vector').glob('*.svg'):
 e=ET.fromstring(p.read_text()); assert e.attrib['viewBox'];assert '<text' not in p.read_text();assert '<image' not in p.read_text();assert '<script' not in p.read_text(); count+=4
for p in (r/'runtime').glob('*.woff2'):
 f=TTFont(p);assert set(range(32,127))<=set(f.getBestCmap());assert p.stat().st_size<25000;count+=2
for p in (r/'fonts').glob('*OFL.txt'):
 assert 'SIL OPEN FONT LICENSE Version 1.1' in p.read_text();count+=1
manifest=json.loads((r/'provenance.json').read_text())
for path,m in manifest['files'].items():
 assert hashlib.sha256((r/path).read_bytes()).hexdigest()==m['sha256'];count+=1
c=json.loads((r/'tokens.json').read_text())
def lum(hex):
 rgb=[int(hex[i:i+2],16)/255 for i in (1,3,5)];rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb];return sum(v*w for v,w in zip(rgb,[.2126,.7152,.0722]))
def contrast(a,b):
 x,y=sorted([lum(c[a]),lum(c[b])]);return (y+.05)/(x+.05)
pairs=[('text','background',4.5),('text','surface',4.5),('muted','surfaceRaised',4.5),('onAction','action',4.5),('onAction','actionHover',4.5),('onAction','actionActive',4.5),('disabled','surfaceRaised',4.5),('success','surface',4.5),('warning','surface',4.5),('error','surface',4.5),('focus','surfaceRaised',3),('border','surfaceRaised',3),('lightInk','lightBackground',4.5),('lightAccent','lightBackground',4.5)]
ratios=[]
for a,b,minval in pairs:
 value=contrast(a,b);assert value>=minval,(a,b,value);count+=1;ratios.append({'foreground':a,'background':b,'ratio':round(value,2),'minimum':minval})
files={str(p.relative_to(r)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for d in ['vector','runtime'] for p in sorted((r/d).glob('*')) if p.is_file()}
report={'checks':count,'contrast':ratios,'files':files,'vectorBytes':sum(v['bytes'] for k,v in files.items() if k.startswith('vector')),'runtimeBytes':sum(v['bytes'] for k,v in files.items() if k.startswith('runtime'))}
Path('docs/brand/arcade-asset-validation.json').write_text(json.dumps(report,indent=2)+'\n');print('Brand structural/font/provenance/contrast checks:',count)
