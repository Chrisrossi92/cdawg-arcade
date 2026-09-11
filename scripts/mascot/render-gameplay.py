"""Author continuous gameplay sprites from the supplied approved source.
Blender 4.5.13; --source FILE --output DIR. No generated concepts or geometry edits.
"""
import bpy, argparse, sys, math, json
from pathlib import Path
from mathutils import Vector, Quaternion
p=argparse.ArgumentParser();p.add_argument('--source',default='assets/brand/mascot/source/cdawg-mascot-candidate-v002.blend');p.add_argument('--only-recovery',action='store_true');p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
assert bpy.app.version==(4,5,13)
bpy.ops.wm.open_mainfile(filepath=a.source);scene=bpy.context.scene;rig=next(o for o in scene.objects if o.type=='ARMATURE')
for track in rig.animation_data.nla_tracks:track.mute=True
names=list(rig.pose.bones.keys())
def capture(action,t=0):
 act=bpy.data.actions[action];rig.animation_data.action=act
 if act.slots:rig.animation_data.action_slot=act.slots[0]
 f=1+23*t;scene.frame_set(int(f),subframe=f-int(f));bpy.context.view_layer.update()
 return {b.name:(b.location.copy(),b.rotation_euler.to_quaternion(),b.scale.copy()) for b in rig.pose.bones}
neutral=capture('expr_default');left=capture('lean_left',1);right=capture('lean_right',1)
faces={n:capture('expr_'+n) for n in ['default','determined','worried','panic','delighted','frustrated']}
rig.animation_data.action=None
for b in rig.pose.bones:b.rotation_mode='QUATERNION'
def mix(a,b,t):return {n:(a[n][0].lerp(b[n][0],t),a[n][1].slerp(b[n][1],t),a[n][2].lerp(b[n][2],t)) for n in names}
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def face_pose(state,f):
 for n in names:
  if n in ['jaw','mouth','tongue'] or n.split('.')[0] in ['brow','eye','gaze','upper','lower','lip','muzzle','cheek']:state[n]=f[n]
 return state
def offset(state,name,xyz):
 l,q,s=state[name];state[name]=(l+rig.pose.bones[name].bone.matrix_local.to_3x3().inverted()@Vector(xyz),q,s)
def turn(state,name,axis,angle):
 l,q,s=state[name];v=rig.pose.bones[name].bone.matrix_local.to_3x3().inverted()@Vector(axis);state[name]=(l,q@Quaternion(v,angle),s)
def balance(x,phase):
 mag=abs(x);state=mix(neutral,left if x<0 else right,mag)
 f=mix(faces['default'],faces['determined'],smooth(.06,.28,mag));f=mix(f,faces['worried'],smooth(.46,.72,mag));f=mix(f,faces['panic'],smooth(.74,.96,mag));face_pose(state,f)
 theta=phase*math.tau;amount=smooth(.5,.95,mag)
 offset(state,'chest',(0,0,.0015*math.sin(theta)))
 for side,shift in [('L',0),('R',math.pi)]:
  offset(state,'front.'+side+'.target',(0,0,.015*amount*max(0,math.sin(theta+shift))))
  turn(state,'ear.'+side,(0,1,0),.025*math.sin(theta-.4+shift))
 turn(state,'tag',(1,0,0),.045*math.sin(theta-.35));turn(state,'tail',(1,0,0),.04*math.sin(theta-.7))
 return state
def fall(side,t):
 q=smooth(0,1,t);state=mix(balance(side,0),neutral,q);face_pose(state,faces['panic'])
 offset(state,'root',(-side*.34*q,0,.13*q));turn(state,'root',(0,1,0),side*1.18*q)
 return state
def recover(side,t):
 state=mix(fall(side,1-t),balance(0,0),smooth(.5,1,t));return face_pose(state,mix(faces['panic'],faces['default'],smooth(.35,1,t)))
def result(t):
 state=balance(0,0);face_pose(state,mix(faces['default'],faces['delighted'],smooth(0,.4,t)*(1-smooth(.7,1,t))))
 offset(state,'chest',(0,0,.008*math.sin(math.pi*t)**2));turn(state,'tag',(1,0,0),.05*math.sin(math.tau*t));return state
records=[];poses=[]
if a.only_recovery:
 records=[f for f in json.loads((out/'frames.json').read_text()) if not f['name'].startswith('recover')]
 poses=[f for f in json.loads((out/'pose-evidence.json').read_text()) if not f['name'].startswith('recover')]
def render(name,state,group,coordinate):
 if a.only_recovery and not name.startswith('recover'):return
 for n,(l,q,s) in state.items():b=rig.pose.bones[n];b.location=l;b.rotation_quaternion=q;b.scale=s
 bpy.context.view_layer.update();scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
 records.append({'name':name,'group':group,**coordinate})
 # Root/head/tag transforms retain numerical continuity evidence independent of pixels.
 poses.append({'name':name,'bones':{n:list(rig.pose.bones[n].matrix.translation) for n in ['root','head','tag','front.L.paw','front.R.paw']}})
scene.render.resolution_x=256;scene.render.resolution_y=256
for phase in range(4):
 for index in range(49):render(f'balance-{phase}-{index:02d}',balance(index/24-1,phase/4),'balance'+str(phase//2),{'phase':phase,'index':index})
for side in [-1,1]:
 for i in range(31):render(f'fall-{side}-{i:02d}',fall(side,i/30),'reactions',{'side':side,'index':i})
 for i in range(31):render(f'recover-{side}-{i:02d}',recover(side,i/30),'reactions',{'side':side,'index':i})
for i in range(25):render(f'result-{i:02d}',result(i/24),'reactions',{'index':i})
records.sort(key=lambda f:f['name']);poses.sort(key=lambda f:f['name'])
(out/'frames.json').write_text(json.dumps(records,indent=2)+'\n');(out/'pose-evidence.json').write_text(json.dumps(poses,indent=2)+'\n')
print('GAMEPLAY_SPRITES_COMPLETE',len(records))
