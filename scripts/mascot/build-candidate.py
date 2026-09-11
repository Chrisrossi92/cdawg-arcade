"""Deterministic canonical refinement candidate. Blender 4.5.13, factory startup, no add-ons.
Run: blender --background --factory-startup --python-exit-code 1 --python
scripts/mascot/build-candidate.py -- --output tmp/mascot/run-a [--render]
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
colors={'fur':'282625','cream':'F5DBB7','orange':'B74A17','brass':'AD8147','nose':'201C19','white':'FFF3DB','iris':'653415','mouth':'32110E','tongue':'D87670'}
def rgba(h):
 v=[int(h[i:i+2],16)/255 for i in (0,2,4)]
 return tuple(x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v)+(1,)
mats=[]
for name,rough,metal in [('coat',.78,0),('eye',.22,0),('leather',.58,0),('hardware',.38,.65)]:
 m=bpy.data.materials.new(name);m.use_nodes=True; bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 col=m.node_tree.nodes.new('ShaderNodeVertexColor');col.layer_name='Color';m.node_tree.links.new(col.outputs['Color'],bs.inputs['Base Color']); mats.append(m)
parts=[]
def register(obj,name,color,bone='chest',mat=0):
 obj.name=name;obj['paint']=color; bpy.context.view_layer.objects.active=obj; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
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

ell('barrel',(0,.055,.302),(.208,.242,.196),'fur')
ell('haunch.L',(.125,.23,.255),(.098,.125,.139),'fur','hind.L.upper')
ell('haunch.R',(-.125,.23,.255),(.098,.125,.139),'fur','hind.R.upper')
ell('chest',(0,-.145,.38),(.190,.139,.186),'fur')
# rear marking from turnaround; small underside patch.
ell('belly',(0,.105,.187),(.093,.19,.025),'cream')
ell('rear marking',(0,.323,.25),(.034,.018,.07),'cream')
for side,x in [('L',.132),('R',-.132)]:
 for end,y in [('front',-.15),('hind',.255)]:
  bone=f'{end}.{side}'
  ell(bone+' leg',(x,y,.166),(.082,.079,.137),'fur',bone+'.upper')
  ell(bone+' wrist',(x,y-.013,.083),(.065,.062,.062),'fur',bone+'.lower')
  ell(bone+' paw',(x,y-.035,.036),(.083,.086,.043),'cream',bone+'.paw')
  for n in range(3):
   ell(bone+f' toe{n}',(x+(n-1)*.038,y-.087,.030),(.027,.038,.032),'cream',bone+'.paw',segments=12,rings=8)
  # dark sole visible only during fall.
  ell(bone+' pad',(x,y-.027,.008),(.040,.042,.009),'nose',bone+'.paw',segments=12,rings=8)
head=ell('broad square head',(0,-.225,.562),(.250,.195,.177),'fur','head',segments=28,rings=18,square=.87)
ell('cheek.L',(.15,-.333,.500),(.094,.070,.087),'fur','cheek.L')
ell('cheek.R',(-.15,-.333,.500),(.094,.070,.087),'fur','cheek.R')
ell('lower cream muzzle',(0,-.384,.486),(.178,.071,.100),'cream','jaw')
ell('mouth cavity',(0,-.460,.487),(.119,.014,.009),'mouth','mouth')
for sign,side in [(1,'L'),(-1,'R')]:
 ell('muzzle.'+side,(sign*.060,-.418,.528),(.097,.051,.059),'cream','muzzle.'+side)
 # eye whites protrude enough to be legible from front and three quarter.
 ell('eye.'+side,(sign*.089,-.423,.622),(.046,.025,.045),'white','eye.'+side,1)
 ell('iris.'+side,(sign*.082,-.445,.621),(.025,.010,.029),'iris','gaze.'+side,1)
 ell('pupil.'+side,(sign*.080,-.453,.623),(.014,.006,.020),'nose','gaze.'+side,1)
 ell('catchlight.'+side,(sign*.080-.008,-.459,.636),(.008,.004,.009),'white','gaze.'+side,1,segments=12,rings=8)
 brow=ell('brow.'+side,(sign*.099,-.415,.688),(.054,.018,.016),'cream','brow.'+side,segments=16,rings=8)
 brow.rotation_euler.y=sign*-.16
 # folded ears built from rounded wedges rather than upright cones.
 ear_vertices=[];ear_faces=[]
 for j in range(9):
  t=j/8;cx=.167+.096*t;cy=-.205-.082*t;cz=.716-.092*t+.031*math.sin(math.pi*t)
  width=.059*math.sin(math.pi*(.12+.84*t))
  for k in range(7):
   u=k/3-1;ear_vertices.append((sign*(cx+width*u),cy-.013*(1-u*u),cz-.030*u*u))
 for j in range(8):
  for k in range(6):i=j*7+k;ear_faces.append((i,i+1,i+8,i+7))
 em=bpy.data.meshes.new('folded flap');em.from_pydata(ear_vertices,[],ear_faces);eo=bpy.data.objects.new('ear',em);scene.collection.objects.link(eo);bpy.context.view_layer.objects.active=eo;eo.select_set(True)
 solid=eo.modifiers.new('Ear thickness','SOLIDIFY');solid.thickness=.018;bpy.ops.object.modifier_apply(modifier=solid.name)
 sub=eo.modifiers.new('Soft fold','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
 register(eo,'folded ear.'+side,'fur','ear.'+side)
 # Upper/lower skin lids are composable with eye white squash for blink.
 for lid,z in [('upper',.655),('lower',.582)]:
  ell(lid+' lid.'+side,(sign*.089,-.442,z),(.047,.017,.008),'fur',lid+'.'+side,segments=16,rings=8)
 tube('lip corner.'+side,[(sign*.117,-.442,.49),(sign*.144,-.428,.497),(sign*.153,-.416,.512)],.003,'nose','lip.'+side)
 for i in range(3):
  ell('whisker dot.'+side+str(i),(sign*(.060+i*.017),-.468+i*.006,.532-(i%2)*.014),(.0028,.002,.0028),'brass','head',segments=8,rings=6)
ell('nose',(0,-.464,.564),(.047,.027,.030),'nose','head',1,square=.8)
for s in [-1,1]:ell('nostril',(s*.025,-.486,.569),(.011,.005,.008),'nose','head',segments=12,rings=8)
tube('philtrum',[(0,-.475,.548),(0,-.475,.520)],.0025,'nose')
ell('tongue',(0,-.441,.485),(.036,.013,.008),'tongue','tongue')
# collar ring lies around neck with flattened oval cross section.
collar=ring('leather collar',(0,-.20,.395),.175,.021,'orange',mat=2);collar.scale=(1.23,1.32,1.15)
for z in [.380,.410]:
 for i in range(40):
  ang=2*math.pi*i/40
  tube('cream stitch',[(.216*math.cos(ang+t),-.20+.244*math.sin(ang+t),z) for t in [-.020,.020]],.0014,'cream','chest',2)
ring('tag link',(0,-.449,.367),.015,.004,'brass',axis='Y')
ring('tag rim',(0,-.460,.326),.032,.004,'brass','tag',axis='Y')
ell('tag enamel',(0,-.461,.326),(.030,.006,.030),'cream','tag',3,segments=32,rings=12)
# Geometry C avoids font licensing and export ambiguity.
tube('C emblem',[(.016*math.cos(t),-.469,.326+.019*math.sin(t)) for t in [math.radians(48+i*264/28) for i in range(29)]],.004,'nose','tag')
# Curled tail chain, visible above rump.
tube('curled tail',[(0,.28+.065*math.cos(t),.444+.065*math.sin(t)) for t in [i*math.pi*1.8/24 for i in range(25)]],.027,'fur','tail',0)
# Voxel union of the torso and limb coat; face/ears stay independently deformable.
coat=[o for o in parts if o.name in ['barrel','chest','haunch.L','haunch.R'] or o.name.endswith(' leg') or o.name.endswith(' wrist')]
bpy.ops.object.select_all(action='DESELECT')
for o in coat:o.select_set(True);parts.remove(o)
bpy.context.view_layer.objects.active=coat[0];bpy.ops.object.join();body=bpy.context.object
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
remesh=body.modifiers.new('Unified coat','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.011;remesh.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=remesh.name)
sm=body.modifiers.new('Round transitions','SMOOTH');sm.factor=1.1;sm.iterations=4;bpy.ops.object.modifier_apply(modifier=sm.name)
dec=body.modifiers.new('Game topology','DECIMATE');dec.ratio=.30;bpy.ops.object.modifier_apply(modifier=dec.name)
body.vertex_groups.clear()
for attr in list(body.data.color_attributes):body.data.color_attributes.remove(attr)
register(body,'Unified barrel and legs','fur',None)
# Paint the blaze on the coat itself: no floating disks or z-fighting.
for poly in body.data.polygons:
 for li in poly.loop_indices:
  v=body.data.vertices[body.data.loops[li].vertex_index].co
  width=max(0,min(.105,(v.z-.245)*.68))
  if v.y<-.215 and .245<v.z<.49 and abs(v.x)<width:
   body.data.color_attributes['Color'].data[li].color=rgba(colors['cream'])
for v in body.data.vertices:
 x,y,z=v.co
 if z<.275 and abs(x)>.065:
  end='front' if y<.05 else 'hind';side='L' if x>0 else 'R';t=max(0,min(1,(.22-z)/.11))
  for name,w in [(f'{end}.{side}.upper',1-t),(f'{end}.{side}.lower',t)]:
   g=body.vertex_groups.get(name) or body.vertex_groups.new(name=name);g.add([v.index],w,'REPLACE')
 else:
  g=body.vertex_groups.get('chest') or body.vertex_groups.new(name='chest');g.add([v.index],1,'REPLACE')
# Armature with deformation chains and fixed world paw targets. IK is baked into glTF.
bpy.ops.object.select_all(action='DESELECT');armdata=bpy.data.armatures.new('CDAWG quadruped');rig=bpy.data.objects.new('CDAWG_Rig',armdata);scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,h,t,parent=None,deform=True):
 b=armdata.edit_bones.new(name);b.head=h;b.tail=t;b.use_deform=deform
 if parent:b.parent=armdata.edit_bones[parent]
 return b
bone('root',(0,0,0),(0,0,.1));bone('pelvis',(0,.19,.27),(0,.19,.36),'root');bone('chest',(0,.10,.33),(0,-.17,.41),'pelvis');bone('head',(0,-.19,.45),(0,-.22,.66),'chest');bone('jaw',(0,-.27,.52),(0,-.37,.49),'head');bone('mouth',(0,-.460,.487),(0,-.460,.507),'head');bone('tongue',(0,-.443,.480),(0,-.414,.519),'head');bone('tag',(0,-.449,.367),(0,-.460,.326),'chest');bone('tail',(0,.28,.4),(0,.32,.47),'pelvis')
for sign,side in [(1,'L'),(-1,'R')]:
 bone('ear.'+side,(sign*.175,-.19,.727),(sign*.235,-.20,.67),'head')
 for name in ['gaze','muzzle','cheek','lip','upper','lower']:
  bone(name+'.'+side,(sign*.089,-.423,.622),(sign*.089,-.423,.662),'head')
 bone('eye.'+side,(sign*.089,-.423,.622),(sign*.089,-.423,.662),'head')
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
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();mesh=bpy.context.object;mesh.name='CDAWG_CandidateMesh'
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
EXPRESSIONS=['default','delighted','determined','worried','panic','frustrated','proud','dizzy','mischief']
CLIPS=['idle_default','idle_mischief','ready','lean_left','lean_right','wobble_left','wobble_right','panic','fall','recover','victory_small','victory_big','defeat','host_wave','host_point','blink','look_direction']
def face(name,amount=1):
 # open, brow inward angle, brow height, gaze x, lid closure, smile, cheek compression
 values={'default':(0,0,0,0,0,.3,0),'delighted':(.70,-.12,.008,0,0,1,.15),'determined':(.02,-.35,-.009,0,.20,-.2,.08),'worried':(.22,.35,.013,.012,0,-.3,0),'panic':(1,.5,.024,0,0,-.6,0),'frustrated':(.0,-.45,-.012,-.008,.35,-.5,.25),'proud':(.08,0,.004,0,.85,.7,.2),'dizzy':(.55,.16,.012,0,.45,.2,.1),'mischief':(.18,0,0,.015,.15,.8,.05)}
 op,angle,height,gaze,lid,smile,cheek=values[name];q=amount
 move('jaw',(0,-.005*op*q,-.045*op*q));move('mouth',(0,-.004*op*q,-.021*op*q));rig.pose.bones['mouth'].scale.y=1+4*op*q;move('tongue',(0,-.045*op*q,-.027*op*q))
 for side,sgn in [('L',1),('R',-1)]:
  asym=1 if side=='L' else -.6
  browh=height+(.016*asym if name=='mischief' else 0)
  move('brow.'+side,(0,0,browh*q));rotate('brow.'+side,(0,1,0),(sgn*angle+(.30*asym if name=='mischief' else 0))*q)
  move('gaze.'+side,(gaze*q,0,(.012*sgn if name=='dizzy' else 0)*q))
  close=lid if name!='mischief' else (.4 if side=='R' else 0)
  for part in ['eye','gaze']:
   rig.pose.bones[part+'.'+side].scale.y=max(.08,1-close*q)
   if close>.5:move(part+'.'+side,((gaze if part=='gaze' else 0)*q,.065*(close-.5)*2*q,0))
  move('upper.'+side,(0,.040*close*q,-.037*close*q));move('lower.'+side,(0,.025*close*q,.006*close*q))
  move('lip.'+side,(sgn*.007*smile*q,0,.011*smile*q));move('muzzle.'+side,(sgn*.003*smile*q,0,.005*smile*q))
  rig.pose.bones['muzzle.'+side].scale=(1+cheek*.08*q,1,1-cheek*.12*q)
  move('cheek.'+side,(0,0,.006*smile*q));rig.pose.bones['cheek.'+side].scale=(1-cheek*.1*q,1,1+cheek*.1*q)
def pose(name,t):
 for b in rig.pose.bones:b.location=(0,0,0);b.rotation_euler=(0,0,0);b.scale=(1,1,1)
 face('default')
 if name in EXPRESSIONS:face(name);return
 cyc=math.sin(t*math.pi*2);ease=math.sin(t*math.pi/2)
 if name in ['idle_default','idle_mischief']:
  move('chest',(0,0,.002*cyc));rotate('head',(0,1,0),.018*cyc)
  if name=='idle_mischief':face('mischief');rotate('head',(0,0,1),.05*cyc)
 if name=='ready':face('determined');move('chest',(0,-.012*ease,-.018*ease))
 if name in ['lean_left','lean_right','wobble_left','wobble_right']:
  sign=-1 if name.endswith('left') else 1;wobble=name.startswith('wobble');q=ease if not wobble else .65+.35*cyc
  move('chest',(sign*.045*q,0,-.013*q));rotate('chest',(0,1,0),sign*.07*q);rotate('head',(0,1,0),sign*.09*q)
  face('worried' if wobble else 'determined')
  if wobble:
   for side,offset in [('L',0),('R',math.pi)]:
    move('front.'+side+'.target',(.007*math.sin(t*math.pi*4+offset),-.01*max(0,cyc),.022*max(0,math.sin(t*math.pi*4+offset))))
 if name=='panic':
  face('panic',min(1,t*4));move('chest',(.014*cyc,0,-.012))
  for side,offset in [('L',0),('R',math.pi)]:move('front.'+side+'.target',(0,0,.025*max(0,math.sin(t*math.pi*6+offset))))
 if name in ['fall','recover']:
  q=ease if name=='fall' else 1-ease;face('panic',q);rotate('root',(0,1,0),-1.18*q);move('root',(.34*q,0,.13*q))
 if name in ['victory_small','victory_big','host_wave','host_point']:
  face('delighted' if name.startswith('victory') else 'default');q=math.sin(t*math.pi) if name.startswith('victory') else ease
  if name=='victory_big':move('root',(0,0,.075*q));rotate('head',(1,0,0),-.12*q)
  if name=='victory_small':move('chest',(0,0,.006*cyc))
  if name in ['host_wave','host_point']:
   move('front.L.target',(.065*q,-.03*q,.09*q));rotate('front.L.target',(0,1,0),(.3*cyc if name=='host_wave' else .45)*q)
 if name=='defeat':face('frustrated');rotate('head',(1,0,0),.12*ease);move('chest',(0,0,-.018*ease))
 if name=='blink':
  close=math.sin(t*math.pi)**6
  for side in ['L','R']:
   for part in ['eye','gaze']:
    rig.pose.bones[part+'.'+side].scale.y=max(.04,1-close)
    move(part+'.'+side,(0,.065*max(0,close-.5)*2,0))
   move('upper.'+side,(0,.040*close,-.037*close));move('lower.'+side,(0,.025*close,.006*close))
 if name=='look_direction':
  for side in ['L','R']:move('gaze.'+side,(.015*cyc,0,0))
 for side,sgn in [('L',1),('R',-1)]:rotate('ear.'+side,(0,1,0),sgn*.05*math.sin(t*math.pi*2-.4))
 rotate('tail',(1,0,0),.06*cyc);rotate('tag',(1,0,0),.07*math.sin(t*math.pi*2-.2))
for name in CLIPS+['expr_'+n for n in EXPRESSIONS]:
 action=bpy.data.actions.new(name);rig.animation_data.action=action
 for frame in range(1,25):
  pose(name.removeprefix('expr_'),(frame-1)/23)
  for b in rig.pose.bones:
   for field in ['location','rotation_euler','scale']:b.keyframe_insert(data_path=field,frame=frame,group=b.name)
 track=rig.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,1,action);track.mute=True
 clips.append({'name':name,'seconds':23/24,'frames':[1,24],'loop':name in ['idle_default','idle_mischief','wobble_left','wobble_right'],'rootMotion':name in ['fall','recover','victory_big']})
rig.animation_data.action=None;pose('neutral',0);scene.frame_start=1;scene.frame_end=24;scene.frame_set(1)
# Camera and render settings shared with the local Three.js preview.
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(.65,-1.85,.85));camera=bpy.context.object;camera.name='ReviewCamera';aim(camera,(0,0,.38));camera.data.type='ORTHO';camera.data.ortho_scale=1.12;scene.camera=camera
for name,loc,power,size in [('Key',(-1,-2,3),170,3),('Fill',(2,-1,1.5),90,2),('Rim',(0,2,2),160,2)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,.35))
scene.world.color=(.18,.18,.18);scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.cycles.seed=11;scene.cycles.use_animated_seed=False
scene.render.resolution_x=256;scene.render.resolution_y=256;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast' if False else 'None'
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.filepath='//preview.png'
# Export only the model and rig, not camera/lights. Keep animations in named actions.
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
settings=dict(export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_anim_slide_to_zero=True,export_skins=True,export_yup=True,export_materials='EXPORT',export_texcoords=False,export_cameras=False,export_lights=False)
bpy.ops.export_scene.gltf(filepath=str(out/'cdawg-mascot-candidate-v002.glb'),**settings)
# File stores no absolute texture paths and a relative render destination.
# Store project-relative file-browser state, not the machine's home directory.
for screen in bpy.data.screens:
 for area in screen.areas:
  for space in area.spaces:
   if space.type=='FILE_BROWSER' and space.params:space.params.directory=b'//'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'cdawg-mascot-candidate-v002.blend'),compress=True)
mesh.data.calc_loop_triangles();report={'blender':bpy.app.version_string,'buildHash':bpy.app.build_hash.decode(),'triangles':len(mesh.data.loop_triangles),'vertices':len(mesh.data.vertices),'materials':len(mesh.data.materials),'bones':len(rig.data.bones),'heightMeters':max(v.co.z for v in mesh.data.vertices),'forwardBlender':'-Y','forwardGLTF':'+Z','origin':'ground between paws','clips':clips,'exportSettings':settings,'paletteSRGB':colors,'camera':{'blenderPosition':[.65,-1.85,.85],'target':[0,0,.38],'orthographicHeight':1.12},'render':{'engine':'Cycles CPU','samples':48,'denoise':True,'seed':11,'size':[256,256],'colorManagement':'Standard / None','transparent':True},'shortcuts':['Unified voxel-remeshed coat; face components remain separate','Vertex-color stylized materials; no texture maps or strand fur','Baked IK with composable facial bones; no animator-facing FK switch','Candidate requires final creative approval']}
(out/'model-report.json').write_text(json.dumps(report,indent=2)+'\n')
if a.render:
 (out/'frames').mkdir(exist_ok=True);(out/'views').mkdir(exist_ok=True)
 # fixed views on neutral, plus panic close view and eight turntable angles.
 for name,loc in [('front',(0,-2,.55)),('side',(2,0,.55)),('back',(0,2,.55)),('three-quarter',(.65,-1.85,.85))]:
  rig.animation_data.action=None;pose('neutral',0);camera.location=loc;aim(camera,(0,0,.38));scene.render.filepath=str(out/'views'/f'{name}.png');bpy.ops.render.render(write_still=True)
 camera.location=(.65,-1.85,.85);aim(camera,(0,0,.38))
 atlas=[]
 for clip in clips:
  if clip['name'].startswith('expr_'):continue
  rig.animation_data.action=bpy.data.actions[clip['name']]
  for i in range(12):
   frame=1+round(i*23/11);scene.frame_set(frame);name=f"{clip['name']}-{i:02d}.png";scene.render.filepath=str(out/'frames'/name);bpy.ops.render.render(write_still=True);atlas.append({'clip':clip['name'],'sample':i,'sourceFrame':frame,'file':name})
 rig.animation_data.action=None;pose('neutral',0)
 for i in range(8):
  theta=i*math.pi/4;camera.location=(1.8*math.sin(theta),-1.8*math.cos(theta),.85);aim(camera,(0,0,.38));scene.render.filepath=str(out/'views'/f'turntable-{i:02d}.png');bpy.ops.render.render(write_still=True)
 (out/'expressions').mkdir(exist_ok=True)
 for expression in EXPRESSIONS:
  rig.animation_data.action=bpy.data.actions['expr_'+expression];scene.frame_set(1);camera.location=(0,-1.85,.65);aim(camera,(0,-.15,.55));camera.data.ortho_scale=.73;scene.render.resolution_x=384;scene.render.resolution_y=384;scene.render.filepath=str(out/'expressions'/f'{expression}.png');bpy.ops.render.render(write_still=True)
 (out/'atlas-frames.json').write_text(json.dumps(atlas,indent=2)+'\n')
print('CDAWG_GENERATION_COMPLETE',json.dumps(report))
