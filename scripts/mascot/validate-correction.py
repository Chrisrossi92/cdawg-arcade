"""Structural gate for a static correction. Does not authorize animation-atlas use."""
import bpy,bmesh,argparse,sys,json,math,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--report',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
root=Path(__file__).resolve().parents[2]
def snapshot(path):
 bpy.ops.wm.open_mainfile(filepath=str(path))
 rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
 return {b.name:{'parent':b.parent.name if b.parent else None,'matrix':[round(v,8) for row in b.matrix_local for v in row],'deform':b.use_deform} for b in rig.data.bones}
old=snapshot(root/'assets/brand/mascot/source/cdawg-mascot-candidate-v002.blend');new=snapshot(Path(a.input).resolve());assert old==new,'Rig rest hierarchy changed'
scene=bpy.context.scene;rig=next(o for o in scene.objects if o.type=='ARMATURE');mesh=next(o for o in scene.objects if o.type=='MESH');checks=1
assert len(rig.data.bones)==43;checks+=1
assert len(bpy.data.actions)==26;checks+=1
for v in mesh.data.vertices:
 assert all(math.isfinite(x) for x in v.co);assert abs(sum(g.weight for g in v.groups)-1)<1e-5
checks+=2
bm=bmesh.new();bm.from_mesh(mesh.data);boundary=sum(e.is_boundary for e in bm.edges);nonmanifold=sum(not e.is_manifold for e in bm.edges);degenerate=sum(f.calc_area()<1e-12 for f in bm.faces);bm.free()
assert boundary==0 and nonmanifold==0,(boundary,nonmanifold);checks+=1
assert degenerate==0,degenerate;checks+=1
mesh.data.calc_loop_triangles();assert len(mesh.data.loop_triangles)<=40000;checks+=1
assert len(mesh.data.materials)<=4;checks+=1
assert all(x>0 for x in mesh.scale);checks+=1
poses=[]
for name in ['default','delighted','determined','worried','panic','mischief']:
 rig.animation_data.action=bpy.data.actions['expr_'+name];scene.frame_set(1);dg=bpy.context.evaluated_depsgraph_get();evaluated=mesh.evaluated_get(dg);m=evaluated.to_mesh();coords=[v.co.copy() for v in m.vertices];assert all(math.isfinite(x) for co in coords for x in co);assert all(abs(x)<2 for co in coords for x in co);evaluated.to_mesh_clear();checks+=1
 # Both eyes use the same world translation: no independent pupil wandering.
 delta=rig.pose.bones['gaze.L'].location-rig.pose.bones['gaze.R'].location
 assert delta.length<1e-7;checks+=1
 poses.append(name)
report={'checks':checks,'rigRestHierarchyIdentical':True,'bones':43,'actions':26,'triangles':len(mesh.data.loop_triangles),'vertices':len(mesh.data.vertices),'materials':len(mesh.data.materials),'boundaryEdges':boundary,'nonManifoldEdges':nonmanifold,'zeroAreaFaces':degenerate,'normalizedWeights':True,'staticPosesChecked':poses,'gazeTranslationsMatched':True,'limitations':['Separate intersecting closed facial components remain; this is the existing stylized vertex-color production approach, not a new retopology or fur pass.','Static checkpoint only; updated animation atlas deformation and continuity are gated on creative approval.']}
Path(a.report).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
