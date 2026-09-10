"""Repeat geometry/animation/pixel gate; PNG metadata need not be byte-identical."""
import bpy,numpy as np,argparse,sys,json,hashlib,struct
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--a',required=True);p.add_argument('--b',required=True);p.add_argument('--reimport',required=True);p.add_argument('--report',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);left=Path(a.a);right=Path(a.b)
def glb(path):
 b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0];return b,json.loads(b[20:20+n]),b[28+n:]
ba,ja,da=glb(left/'cdawg-mascot-feasibility-v001.glb');bb,jb,db=glb(right/'cdawg-mascot-feasibility-v001.glb');assert ja==jb,'GLB structure differs'
accessors=[]
indexAccessors={p["indices"] for m in ja["meshes"] for p in m["primitives"]}
normalAccessors={p["attributes"]["NORMAL"] for m in ja["meshes"] for p in m["primitives"]}
for i,x in enumerate(ja['accessors']):
 view=ja['bufferViews'][x['bufferView']];start=view.get('byteOffset',0)+x.get('byteOffset',0);types={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16};count=x['count']*types[x['type']];dtype={5126:'<f4',5123:'<u2',5125:'<u4',5121:'u1'}[x['componentType']];u=np.frombuffer(da,dtype=dtype,count=count,offset=start);v=np.frombuffer(db,dtype=dtype,count=count,offset=start)
 if i in indexAccessors:
  # Compare oriented triangle sets, allowing exporter emission-order differences.
  def canonical(values):
   result=[]
   for t in values.reshape(-1,3).tolist():result.append(min(tuple(t),tuple(t[1:]+t[:1]),tuple(t[2:]+t[:2])))
   return sorted(result)
  assert canonical(u)==canonical(v),f'Triangle topology differs: {i}'
  accessors.append(0);continue
 err=float(np.abs(u.astype(float)-v.astype(float)).max());limit=(2e-4 if i in normalAccessors else 1e-6) if x['componentType']==5126 else 0;assert err<=limit,f'Accessor {i} differs by {err}';accessors.append(err)
def pixels(path):
 i=bpy.data.images.load(str(path));x=np.array(i.pixels[:]).reshape(i.size[1],i.size[0],4);bpy.data.images.remove(i);return x
files=[];minimum=256
for p in sorted(list((left/'frames').glob('*.png'))+list((left/'views').glob('*.png'))):
 rel=p.relative_to(left);x=pixels(p);y=pixels(right/rel);err=float(np.abs(x-y).mean());maximum=float(np.abs(x-y).max());assert err<.001,f'Repeat render differs: {rel}: {err}'
 files.append({'path':str(rel),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'byteIdentical':p.read_bytes()==(right/rel).read_bytes(),'meanAbsoluteRGBAError':err,'maximumRGBAError':maximum})
 if rel.parts[0]=='frames':
  ys,xs=np.where(x[:,:,3]>.02);margin=int(min(xs.min(),ys.min(),255-xs.max(),255-ys.max()));minimum=min(minimum,margin);assert margin>=2,f'Clipped frame: {rel}'
comparisons=[]
for name,orig in [('idle_default','idle_default-00.png'),('panic','panic-07.png')]:
 x=pixels(left/'frames'/orig);y=pixels(Path(a.reimport)/f'reimport-{name}.png');err=float(np.abs(x-y).mean());assert err<.02,f'GLB import render mismatch: {name}: {err}';comparisons.append({'pose':name,'meanAbsoluteRGBAError':err,'threshold':.02})
report={'glbByteIdentical':ba==bb,'glbStructureIdentical':True,'accessorsCompared':len(accessors),'maximumAccessorError':max(accessors),'normalTolerance':.0002,'otherFloatTolerance':.000001,'integerTolerance':0,'triangleComparison':'Exact oriented triangle sets; exporter emission order may differ','rendersCompared':len(files),'maximumRenderMeanError':max(f['meanAbsoluteRGBAError'] for f in files),'renderMeanTolerance':.001,'files':files,'blendByteIdentityRequired':False,'reason':'Blend session metadata and PNG metadata are not visual equivalence gates.','independentImportRenderComparisons':comparisons,'minimumFrameMarginPixels':minimum}
Path(a.report).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='files'}))
