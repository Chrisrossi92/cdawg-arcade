"""Assemble original Blender render outputs, no external imaging dependency."""
import bpy, numpy as np, argparse,sys,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);source=Path(a.input);out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
def sheet(name,paths,columns):
 rows=(len(paths)+columns-1)//columns;arr=np.zeros((rows*256,columns*256,4),dtype=np.float32)
 for i,path in enumerate(paths):
  img=bpy.data.images.load(str(path));pixels=np.array(img.pixels[:]).reshape(256,256,4);r=rows-1-i//columns;c=i%columns;arr[r*256:(r+1)*256,c*256:(c+1)*256]=pixels;bpy.data.images.remove(img)
 img=bpy.data.images.new(name,width=columns*256,height=rows*256,alpha=True);img.pixels.foreach_set(arr.ravel());img.filepath_raw=str(out/name);img.file_format='PNG';img.save();bpy.data.images.remove(img)
frames=json.loads((source/'atlas-frames.json').read_text());sheet('cdawg-mascot-atlas-v001.png',[source/'frames'/f['file'] for f in frames],8)
sheet('cdawg-mascot-contact-v001.png',[source/'views'/f'{n}.png' for n in ['front','side','back','three-quarter']]+[source/'frames'/f'{n}-07.png' for n in ['lean_left','lean_right','panic','fall']],4)
sheet('cdawg-mascot-turntable-v001.png',[source/'views'/f'turntable-{i:02d}.png' for i in range(8)],4)
metadata={'frameWidth':256,'frameHeight':256,'columns':8,'rows':5,'clips':{n:{'row':i,'frames':8,'durationSeconds':1,'loop':n=='idle_default'} for i,n in enumerate(['idle_default','lean_left','lean_right','panic','fall'])},'origin':[.5,1],'sampling':'Endpoints included; sample times are rounded source frames 1..25 at 24 fps.','sourceFrames':frames}
(out/'cdawg-mascot-atlas-v001.json').write_text(json.dumps(metadata,indent=2)+'\n')
