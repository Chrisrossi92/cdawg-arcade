"""Run with --background --factory-startup --python-exit-code 1; writes nothing."""
import bpy

assert bpy.app.background, "Smoke check requires background mode"
assert bpy.app.version[:2] == (4, 5), "Expected pinned Blender 4.5 LTS family"
assert bpy.app.version_string == "4.5.13", "Expected approved Blender 4.5.13"
assert bpy.context.scene is not None
print("CDAWG Blender smoke:", bpy.app.version_string, bpy.app.build_hash.decode())
