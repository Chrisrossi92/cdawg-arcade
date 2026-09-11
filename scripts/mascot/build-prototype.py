"""Deterministic feasibility blockout. Blender 4.5.13, factory startup, no add-ons.
Run: blender --background --factory-startup --python-exit-code 1 --python
scripts/mascot/build-prototype.py -- --output tmp/mascot/run-a [--render]
"""
import argparse, sys, math, json
from pathlib import Path
import bpy
from mathutils import Vector, Quaternion
p=argparse.ArgumentParser(); p.add_argument('--output',required=True); p.add_argument('--render',action='store_true'); a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
out=Path(a.output); out.mkdir(parents=True,exist_ok=True)
assert bpy.app.version == (4, 5, 13)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for block in list(bpy.data.materials): bpy.data.materials.remove(block)
scene=bpy.context.scene; scene.unit_settings.system='METRIC'; scene.render.fps=24
# sRGB concept approximations, not final sampled production colors.
colors={'fur':'302822','cream':'F1D5A9','orange':'BD4D15','brass':'AD8147','nose':'201C19','white':'FFF3DB','iris':'653415','mouth':'32110E','tongue':'D87670'}
def rgba(h):
 v=[int(h[i:i+2],16)/255 for i in (0,2,4)]
 return tuple(x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v)+(1,)
mats=[]
for name,rough,metal in [('coat',.78,0),('eye',.22,0),('leather',.58,0),('hardware',.38,.65)]:
 m=bpy.data.materials.new(name);m.use_nodes=True; bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 col=m.node_tree.nodes.new('ShaderNodeVertexColor');col.layer_name='Color';m.node_tree.links.new(col.outputs['Color'],bs.inputs['Base Color']); mats.append(m)
parts=[]
def register(obj,name,color,bone='chest',mat=0):
 obj.name=name; bpy.context.view_layer.objects.active=obj; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 obj.data.materials.clear();obj.data.materials.append(mats[mat])
 attr=obj.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
 for d in attr.data: d.color=rgba(colors.get(color,color))
 for f in obj.data.polygons:f.use_smooth=True
 if bone:
  group=obj.vertex_groups.new(name=bone); group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
 parts.append(obj);return obj

def ell(name,loc,scale,color,bone='chest',mat=0,segments=20,rings=12,square=1):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=loc);o=bpy.context.object
 if square!=1:
  for v in o.data.vertices:
   v.co=Vector([math.copysign(abs(c)**square,c) for c in v.co])
 o.scale=scale;return register(o,name,color,bone,mat)

def tube(name,points,radius,color,bone='head',mat=0):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=1;curve.bevel_depth=radius;curve.bevel_resolution=2
 s=curve.splines.new('POLY');s.points.add(len(points)-1)
 for v,co in zip(s.points,points):v.co=(*co,1)
 obj=bpy.data.objects.new(name,curve);scene.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH');obj=bpy.context.object
 for o in bpy.context.selected_objects:o.select_set(False)
 return register(obj,name,color,bone,mat)

def ring(name,loc,major,minor,color,bone='chest',axis='Z',mat=3):
 bpy.ops.mesh.primitive_torus_add(major_segments=40,minor_segments=8,location=loc,major_radius=major,minor_radius=minor)
 o=bpy.context.object
 if axis=='Y':o.rotation_euler.x=math.pi/2
 return register(o,name,color,bone,mat)

ell('barrel',(0,.065,.325),(.188,.285,.184),'fur')
ell('haunch.L',(.125,.23,.255),(.098,.125,.139),'fur','hind.L.upper')
ell('haunch.R',(-.125,.23,.255),(.098,.125,.139),'fur','hind.R.upper')
ell('chest',(0,-.145,.38),(.182,.13,.20),'fur')
# cream pointed blaze made as an actual curved surface following front chest.
verts=[];faces=[]
for row,(z,w,y) in enumerate([(.50,.065,-.242),(.465,.108,-.275),(.415,.096,-.284),(.36,.064,-.274),(.30,.018,-.238)]):
 for j in range(9):
  x=(j/4-1)*w;verts.append((x,y+.03*(x/max(w,.001))**2,z))
for i in range(4):
 for j in range(8):k=i*9+j;faces.append((k,k+1,k+10,k+9))
mesh=bpy.data.meshes.new('blaze');mesh.from_pydata(verts,[],faces);obj=bpy.data.objects.new('blaze',mesh);scene.collection.objects.link(obj);register(obj,'cream chest blaze','cream')
# rear marking from turnaround; small underside patch.
ell('belly',(0,.105,.187),(.093,.19,.025),'cream')
ell('blaze volume',(0,-.275,.365),(.098,.035,.100),'cream')
ell('blaze point',(0,-.249,.294),(.044,.024,.058),'cream')
ell('rear marking',(0,.323,.25),(.034,.018,.07),'cream')
for side,x in [('L',.132),('R',-.132)]:
 for end,y in [('front',-.15),('hind',.255)]:
  bone=f'{end}.{side}'
  ell(bone+' leg',(x,y,.183),(.072,.073,.153),'fur',bone+'.upper')
  ell(bone+' wrist',(x,y-.013,.083),(.065,.062,.062),'fur',bone+'.lower')
  ell(bone+' paw',(x,y-.035,.036),(.076,.084,.036),'cream',bone+'.paw')
  for n in range(3):
   ell(bone+f' toe{n}',(x+(n-1)*.038,y-.087,.030),(.023,.035,.028),'cream',bone+'.paw',segments=12,rings=8)
  # dark sole visible only during fall.
  ell(bone+' pad',(x,y-.027,.008),(.040,.042,.009),'nose',bone+'.paw',segments=12,rings=8)
head=ell('broad square head',(0,-.216,.581),(.222,.168,.169),'fur','head',segments=28,rings=18,square=.82)
ell('cheek.L',(.135,-.316,.515),(.086,.062,.088),'fur','head')
ell('cheek.R',(-.135,-.316,.515),(.086,.062,.088),'fur','head')
ell('lower cream muzzle',(0,-.343,.485),(.15,.067,.067),'cream','jaw')
ell('mouth cavity',(0,-.385,.505),(.116,.035,.010),'mouth','mouth')
for sign,side in [(1,'L'),(-1,'R')]:
 ell('muzzle.'+side,(sign*.066,-.385,.55),(.087,.061,.053),'cream','head')
 # eye whites protrude enough to be legible from front and three quarter.
 ell('eye.'+side,(sign*.089,-.356,.635),(.043,.024,.043),'white','eye.'+side,1)
 ell('iris.'+side,(sign*.082,-.378,.632),(.025,.010,.029),'iris','head',1)
 ell('pupil.'+side,(sign*.080,-.386,.634),(.014,.006,.020),'nose','head',1)
 ell('catchlight.'+side,(sign*.080-.008,-.391,.647),(.008,.004,.009),'white','head',1,segments=12,rings=8)
 brow=ell('brow.'+side,(sign*.099,-.355,.696),(.054,.018,.016),'cream','brow.'+side,segments=16,rings=8)
 brow.rotation_euler.y=sign*-.16
 # folded ears built from rounded wedges rather than upright cones.
 ear=ell('folded ear.'+side,(sign*.213,-.241,.702),(.061,.041,.079),'fur','ear.'+side,square=.7)
 ear.rotation_euler.y=sign*-.72
 inner=ell('ear inset.'+side,(sign*.226,-.277,.700),(.022,.008,.035),'653A29','ear.'+side,segments=16,rings=8)
 inner.rotation_euler.y=sign*-.72
 for i in range(3):
  ell('whisker dot.'+side+str(i),(sign*(.060+i*.017),-.443+i*.006,.55-(i%2)*.014),(.0028,.002,.0028),'brass','head',segments=8,rings=6)
ell('nose',(0,-.437,.578),(.047,.027,.030),'nose','head',1,square=.8)
for s in [-1,1]:ell('nostril',(s*.025,-.459,.583),(.011,.005,.008),'nose','head',segments=12,rings=8)
tube('philtrum',[(0,-.445,.563),(0,-.445,.535)],.0025,'nose')
ell('tongue',(0,-.414,.499),(.044,.015,.010),'tongue','tongue')
# collar ring lies around neck with flattened oval cross section.
collar=ring('leather collar',(0,-.20,.435),.151,.021,'orange',mat=2);collar.scale=(1.12,.78,1.48)
for z in [.418,.451]:
 for i in range(40):
  ang=2*math.pi*i/40
  tube('cream stitch',[(.174*math.cos(ang+t),-.20+.127*math.sin(ang+t),z) for t in [-.020,.020]],.0014,'cream','chest',2)
ring('tag link',(0,-.337,.413),.015,.004,'brass',axis='Y')
ring('tag rim',(0,-.348,.371),.032,.004,'brass','tag',axis='Y')
ell('tag enamel',(0,-.349,.371),(.030,.006,.030),'cream','tag',3,segments=32,rings=12)
# Geometry C avoids font licensing and export ambiguity.
tube('C emblem',[(.016*math.cos(t),-.357,.371+.019*math.sin(t)) for t in [math.radians(48+i*264/28) for i in range(29)]],.004,'nose','tag')
# Curled tail chain, visible above rump.
tube('curled tail',[(0,.28+.065*math.cos(t),.444+.065*math.sin(t)) for t in [i*math.pi*1.8/24 for i in range(25)]],.027,'fur','tail',0)
# Armature with deformation chains and fixed world paw targets. IK is baked into glTF.
bpy.ops.object.select_all(action='DESELECT');armdata=bpy.data.armatures.new('CDAWG quadruped');rig=bpy.data.objects.new('CDAWG_Rig',armdata);scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,h,t,parent=None,deform=True):
 b=armdata.edit_bones.new(name);b.head=h;b.tail=t;b.use_deform=deform
 if parent:b.parent=armdata.edit_bones[parent]
 return b
bone('root',(0,0,0),(0,0,.1));bone('pelvis',(0,.19,.27),(0,.19,.36),'root');bone('chest',(0,.10,.33),(0,-.17,.41),'pelvis');bone('head',(0,-.19,.45),(0,-.22,.66),'chest');bone('jaw',(0,-.27,.52),(0,-.37,.49),'head');bone('mouth',(0,-.385,.505),(0,-.385,.525),'head');bone('tongue',(0,-.414,.499),(0,-.414,.519),'head');bone('tag',(0,-.337,.413),(0,-.348,.371),'chest');bone('tail',(0,.28,.4),(0,.32,.47),'pelvis')
for sign,side in [(1,'L'),(-1,'R')]:
 bone('ear.'+side,(sign*.175,-.19,.727),(sign*.235,-.20,.67),'head')
 bone('eye.'+side,(sign*.089,-.356,.635),(sign*.089,-.356,.665),'head')
 bone('brow.'+side,(sign*.09,-.352,.691),(sign*.13,-.352,.691),'head')
 for end,y in [('front',-.15),('hind',.255)]:
  x=sign*.132;n=f'{end}.{side}'
  bone(n+'.upper',(x,y,.34),(x,y+.050,.17),'chest' if end=='front' else 'pelvis')
  bone(n+'.lower',(x,y+.050,.17),(x,y,.059),n+'.upper')
  bone(n+'.paw',(x,y,.059),(x,y-.065,.04),n+'.lower')
  bone(n+'.target',(x,y,.059),(x,y-.065,.04),'root',False)
bpy.ops.object.mode_set(mode='POSE')
for side in ['L','R']:
 for end in ['front','hind']:
  n=f'{end}.{side}';c=rig.pose.bones[n+'.lower'].constraints.new('IK');c.target=rig;c.subtarget=n+'.target';c.chain_count=2
  # Paw follows target orientation while remaining at the solved ankle.
  c=rig.pose.bones[n+'.paw'].constraints.new('COPY_ROTATION');c.target=rig;c.subtarget=n+'.target';c.target_space='WORLD';c.owner_space='WORLD'
bpy.ops.object.mode_set(mode='OBJECT')
# Join disconnected blockout surfaces into one skinned mesh with four material primitives.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();mesh=bpy.context.object;mesh.name='CDAWG_FeasibilityMesh'
# Apply all transforms for stable glTF positions and vertex weighting.
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.quads_convert_to_tris(quad_method='FIXED',ngon_method='CLIP');bpy.ops.object.mode_set(mode='OBJECT')
mod=mesh.modifiers.new('Quadruped deformation','ARMATURE');mod.object=rig
# Smooth leg weights between upper and lower deform bones to avoid rigid hinge breaks.
for side in ['L','R']:
 for end in ['front','hind']:
  n=f'{end}.{side}';up=mesh.vertex_groups[n+'.upper'];lo=mesh.vertex_groups[n+'.lower']
  ids=[v.index for v in mesh.data.vertices if any(g.group==up.index for g in v.groups)]
  for idx in ids:
   z=mesh.data.vertices[idx].co.z;t=max(0,min(1,(.22-z)/.11));up.add([idx],1-t,'REPLACE');lo.add([idx],t,'REPLACE')
for b in rig.pose.bones:b.rotation_mode='XYZ'
rig.animation_data_create(); clips=[]
def move(name,xyz):
 b=rig.pose.bones[name];b.location=b.bone.matrix_local.to_3x3().inverted() @ Vector(xyz)
def rotate(name,axis,angle):
 b=rig.pose.bones[name];local=b.bone.matrix_local.to_3x3().inverted() @ Vector(axis);b.rotation_euler=Quaternion(local,angle).to_euler('XYZ')
def pose(name,t):
 for b in rig.pose.bones:b.location=(0,0,0);b.rotation_euler=(0,0,0);b.scale=(1,1,1)
 chest=rig.pose.bones['chest'];head=rig.pose.bones['head']
 if name=='idle_default':
  move('chest',(0,0,.003*math.sin(t*2*math.pi)));rotate('head',(0,1,0),.022*math.sin(t*2*math.pi))
  rig.pose.bones['tail'].rotation_euler.x=.05*math.sin(t*2*math.pi)
 if name in ['lean_left','lean_right']:
  sign=-1 if name=='lean_left' else 1
  move('chest',(sign*.026*t,0,0));rotate('chest',(0,1,0),sign*.07*t);rotate('head',(0,1,0),sign*.055*t)
 if name in ['panic','fall']:
  q=min(t*3,1);move('jaw',(0,-.008*q,-.070*q));move('mouth',(0,0,-.025*q));rig.pose.bones['mouth'].scale.y=1+4.5*q;move('tongue',(0,-.004*q,-.038*q))
  rotate('jaw',(1,0,0),.08*q)
  for side,s in [('L',1),('R',-1)]:
   move('brow.'+side,(0,0,.019*q));rotate('brow.'+side,(0,1,0),s*.40*q);rig.pose.bones['eye.'+side].scale=(1+.22*q,1+.22*q,1+.22*q)
   rig.pose.bones['ear.'+side].rotation_euler.y=s*.15*q
  head.rotation_euler.x=-.07*q
 if name=='fall':
  rotate('root',(0,1,0),-1.25*t)
  move('root',(.36*t,0,.14*math.sin(t*math.pi/2)))
  for side in ['L','R']:
   for end in ['front','hind']:move(f'{end}.{side}.target',(0,0,.035*math.sin(t*math.pi)))
 rig.pose.bones['tag'].rotation_euler.x=.10*math.sin(t*math.pi) if name!='idle_default' else 0
for name in ['idle_default','lean_left','lean_right','panic','fall']:
 action=bpy.data.actions.new(name);rig.animation_data.action=action
 for frame in range(1,26):
  pose(name,(frame-1)/24)
  for b in rig.pose.bones:
   for field in ['location','rotation_euler','scale']:b.keyframe_insert(data_path=field,frame=frame,group=b.name)
 track=rig.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,1,action);track.mute=True
 clips.append({'name':name,'seconds':1,'frames':[1,25],'loop':name=='idle_default','rootMotion':name=='fall'})
rig.animation_data.action=None;pose('neutral',0);scene.frame_start=1;scene.frame_end=25;scene.frame_set(1)
# Camera and render settings shared with the local Three.js preview.
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(.95,-1.65,.95));camera=bpy.context.object;camera.name='ReviewCamera';aim(camera,(0,0,.38));camera.data.type='ORTHO';camera.data.ortho_scale=1.12;scene.camera=camera
for name,loc,power,size in [('Key',(-1,-2,3),170,3),('Fill',(2,-1,1.5),90,2),('Rim',(0,2,2),160,2)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,.35))
scene.world.color=(.18,.18,.18);scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.cycles.seed=11;scene.cycles.use_animated_seed=False
scene.render.resolution_x=256;scene.render.resolution_y=256;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast' if False else 'None'
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.filepath='//preview.png'
# Export only the model and rig, not camera/lights. Keep animations in named actions.
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
settings=dict(export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_anim_slide_to_zero=True,export_skins=True,export_yup=True,export_materials='EXPORT',export_texcoords=False,export_cameras=False,export_lights=False)
bpy.ops.export_scene.gltf(filepath=str(out/'cdawg-mascot-feasibility-v001.glb'),**settings)
# File stores no absolute texture paths and a relative render destination.
# Store project-relative file-browser state, not the machine's home directory.
for screen in bpy.data.screens:
 for area in screen.areas:
  for space in area.spaces:
   if space.type=='FILE_BROWSER' and space.params:space.params.directory=b'//'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'cdawg-mascot-feasibility-v001.blend'),compress=True)
mesh.data.calc_loop_triangles();report={'blender':bpy.app.version_string,'buildHash':bpy.app.build_hash.decode(),'triangles':len(mesh.data.loop_triangles),'vertices':len(mesh.data.vertices),'materials':len(mesh.data.materials),'bones':len(rig.data.bones),'heightMeters':max(v.co.z for v in mesh.data.vertices),'forwardBlender':'-Y','forwardGLTF':'+Z','origin':'ground between paws','clips':clips,'exportSettings':settings,'paletteSRGB':colors,'camera':{'blenderPosition':[.95,-1.65,.95],'target':[0,0,.38],'orthographicHeight':1.12},'render':{'engine':'Cycles CPU','samples':32,'denoise':True,'seed':11,'size':[256,256],'colorManagement':'Standard / None','transparent':True},'shortcuts':['Disconnected overlapping blockout surfaces, not production retopology','Approximate cream shapes and flat vertex colors; no baked fur texture','Basic baked IK; no animator-facing IK/FK switching','Panic via jaw/brow/ear bones; full nine-expression set not built','No final sculpt, LOD, full face controls or production deformation approval']}
(out/'model-report.json').write_text(json.dumps(report,indent=2)+'\n')
if a.render:
 (out/'frames').mkdir(exist_ok=True);(out/'views').mkdir(exist_ok=True)
 # fixed views on neutral, plus panic close view and eight turntable angles.
 for name,loc in [('front',(0,-2,.55)),('side',(2,0,.55)),('back',(0,2,.55)),('three-quarter',(.95,-1.65,.95))]:
  rig.animation_data.action=None;pose('neutral',0);camera.location=loc;aim(camera,(0,0,.38));scene.render.filepath=str(out/'views'/f'{name}.png');bpy.ops.render.render(write_still=True)
 camera.location=(.95,-1.65,.95);aim(camera,(0,0,.38))
 atlas=[]
 for clip in clips:
  rig.animation_data.action=bpy.data.actions[clip['name']]
  for i in range(8):
   frame=1+round(i*24/7);scene.frame_set(frame);name=f"{clip['name']}-{i:02d}.png";scene.render.filepath=str(out/'frames'/name);bpy.ops.render.render(write_still=True);atlas.append({'clip':clip['name'],'sample':i,'sourceFrame':frame,'file':name})
 rig.animation_data.action=None;pose('neutral',0)
 for i in range(8):
  theta=i*math.pi/4;camera.location=(1.8*math.sin(theta),-1.8*math.cos(theta),.85);aim(camera,(0,0,.38));scene.render.filepath=str(out/'views'/f'turntable-{i:02d}.png');bpy.ops.render.render(write_still=True)
 (out/'atlas-frames.json').write_text(json.dumps(atlas,indent=2)+'\n')
print('CDAWG_GENERATION_COMPLETE',json.dumps(report))
