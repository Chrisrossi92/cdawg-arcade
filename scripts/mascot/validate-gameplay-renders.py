import bpy, numpy as np, argparse,sys,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--a',required=True);p.add_argument('--b',required=True);p.add_argument('--report',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);left=Path(a.a);right=Path(a.b)
frames=json.loads((left/'frames.json').read_text());assert len(frames)==345;assert frames==json.loads((right/'frames.json').read_text())
def pixels(p):
 i=bpy.data.images.load(str(p));v=np.array(i.pixels[:]).reshape(256,256,4);bpy.data.images.remove(i);return v
worst=0;minimum=256
for f in frames:
 x=pixels(left/(f['name']+'.png'));y=pixels(right/(f['name']+'.png'));err=float(np.abs(x-y).mean());assert err<.001;worst=max(worst,err)
 ys,xs=np.where(x[:,:,3]>.02);margin=int(min(xs.min(),ys.min(),255-xs.max(),255-ys.max()));assert margin>=3;minimum=min(minimum,margin)
poses={p['name']:p['bones'] for p in json.loads((left/'pose-evidence.json').read_text())};maxStep={k:0 for k in ['head','tag']}
for phase in range(4):
 for i in range(48):
  for bone in maxStep:
   distance=float(np.linalg.norm(np.array(poses[f'balance-{phase}-{i:02d}'][bone])-poses[f'balance-{phase}-{i+1:02d}'][bone]));maxStep[bone]=max(maxStep[bone],distance);assert distance<.012
for side in [-1,1]:
 for bone in maxStep:
  assert np.allclose(poses[f'fall-{side}-30'][bone],poses[f'recover-{side}-00'][bone],atol=1e-6)
  assert np.allclose(poses[f'recover-{side}-30'][bone],poses['result-00'][bone],atol=1e-6)
report={'frames':len(frames),'repeatMaxMeanRGBAError':worst,'repeatThreshold':.001,'minimumMarginPixels':minimum,'maximumNeighbourBoneTravelMeters':maxStep,'fallRecoveryResultSeams':'Exact head/tag positions within 1e-6 m; common secondary phase at authored endpoints'}
Path(a.report).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
