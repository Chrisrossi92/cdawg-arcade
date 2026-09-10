"""Second viewer: import the GLB into Blender and render, without authoring rig constraints."""
import bpy,argparse,sys,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);source=Path(a.input);out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source/'cdawg-mascot-feasibility-v001.blend'))
for o in list(bpy.data.objects):
 if o.type in {'MESH','ARMATURE'}:bpy.data.objects.remove(o,do_unlink=True)
for action in list(bpy.data.actions):bpy.data.actions.remove(action)
bpy.ops.import_scene.gltf(filepath=str(source/'cdawg-mascot-feasibility-v001.glb'))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');actions=list(bpy.data.actions)
assert len(actions)==5
assert len(rig.pose.bones)>=25
for track in rig.animation_data.nla_tracks:track.mute=True
for name in ['idle_default','panic']:
 action=next(x for x in actions if name in x.name);rig.animation_data.action=action
 if hasattr(action,'slots') and action.slots:rig.animation_data.action_slot=action.slots[0]
 bpy.context.scene.frame_set(0 if name=='idle_default' else 24);bpy.context.scene.render.filepath=str(out/f'reimport-{name}.png');bpy.ops.render.render(write_still=True)
(out/'reimport-report.json').write_text(json.dumps({'viewer':'Blender glTF importer','version':bpy.app.version_string,'actions':[a.name for a in actions],'bones':len(rig.pose.bones),'renders':['reimport-idle_default.png','reimport-panic.png']},indent=2)+'\n')
