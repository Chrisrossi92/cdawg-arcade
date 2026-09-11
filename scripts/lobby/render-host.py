"""Render the approved owned scene unchanged, at lobby resolution; never save the .blend."""
import bpy
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(root/'assets/brand/mascot/correction-v004/source/cdawg-mascot-correction-v004.blend'))
scene=bpy.context.scene
rig=next(o for o in scene.objects if o.type=='ARMATURE')
rig.animation_data.action=bpy.data.actions['expr_default'];scene.frame_set(1)
scene.render.resolution_x=512;scene.render.resolution_y=512
scene.render.resolution_percentage=100
scene.cycles.samples=48;scene.cycles.seed=11
scene.camera.location=(.65,-1.85,.85)
scene.camera.rotation_euler=(Vector((0,0,.38))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.ortho_scale=1.12
scene.render.film_transparent=True
out=root/'tmp/lobby-integration/host'
out.mkdir(parents=True,exist_ok=True)
for expression in ['default','mischief','delighted']:
 rig.animation_data.action=bpy.data.actions['expr_'+expression];scene.frame_set(1)
 scene.render.filepath=str(out/(expression+'.png'))
 bpy.ops.render.render(write_still=True)
