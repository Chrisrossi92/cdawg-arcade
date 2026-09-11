"""Fixed-camera static comparison, including the preserved pre-correction model."""
import bpy,sys,argparse,json
from pathlib import Path
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
scene=bpy.context.scene;rig=next(o for o in scene.objects if o.type=='ARMATURE');camera=scene.camera
for track in rig.animation_data.nla_tracks:track.mute=True
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.seed=11;scene.cycles.use_animated_seed=False;scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.resolution_percentage=100
views=[('front-head',(0,-2,.62),(0,-.23,.555),.64,640,'default'),('three-quarter-head',(.72,-2,.77),(0,-.23,.555),.68,640,'default'),('lobby-host',(.65,-1.85,.85),(0,0,.38),1.12,512,'default'),('gameplay',(.65,-1.85,.85),(0,0,.38),1.12,256,'default')]+[(f'expr-{n}',(0,-2,.62),(0,-.23,.555),.64,480,n) for n in ['default','delighted','determined','worried','panic','mischief']]
for name,loc,target,scale,res,expression in views:
 rig.animation_data.action=bpy.data.actions['expr_'+expression];scene.frame_set(1)
 camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
 scene.render.resolution_x=res;scene.render.resolution_y=res
 scene.render.filepath=str(out/f'{name}.png');bpy.ops.render.render(write_still=True)
(out/'cameras.json').write_text(json.dumps({'views':views,'lighting':'Identical original Key/Fill/Rim area lights and world; unchanged Standard/None color management','render':'Cycles CPU / 48 samples / seed 11 / RGBA'},indent=2)+'\n')
