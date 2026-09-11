"""Independent GLB importer checks the neutral and extreme mouth poses."""
import bpy,argparse,sys,json
from pathlib import Path
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);source=Path(a.input).resolve();out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source/'cdawg-mascot-correction-v004.blend'))
for o in list(bpy.data.objects):
 if o.type in {'MESH','ARMATURE'}:bpy.data.objects.remove(o,do_unlink=True)
for action in list(bpy.data.actions):bpy.data.actions.remove(action)
bpy.ops.import_scene.gltf(filepath=str(source/'cdawg-mascot-correction-v004.glb'))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');assert len(rig.data.bones)==43;assert len(bpy.data.actions)==26
for track in rig.animation_data.nla_tracks:track.mute=True
scene=bpy.context.scene;camera=scene.camera;camera.location=(0,-2,.62);camera.rotation_euler=(Vector((0,-.23,.555))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=.64
scene.render.resolution_x=480;scene.render.resolution_y=480
for name in ['default','panic']:
 action=next(x for x in bpy.data.actions if 'expr_'+name in x.name);rig.animation_data.action=action
 if action.slots:rig.animation_data.action_slot=action.slots[0]
 scene.frame_set(0);scene.render.filepath=str(out/f'expr-{name}.png');bpy.ops.render.render(write_still=True)
(out/'report.json').write_text(json.dumps({'bones':43,'actions':26,'poses':['default','panic'],'importer':'Blender 4.5.13 glTF'},indent=2)+'\n')
