# Authoring sources

Reserved for reviewed editable model files and deterministic authoring inputs.
No Blender source exists yet. A procedural low-detail model can be scripted locally
without services or paid dependencies, but canonical visual matching requires the
missing references, and mesh/rig/export testing requires Blender. Do not present
an unexecuted generation script as a validated prototype.

Future coordinates: meters, Z up in Blender, ground at Z=0, facing -Y; record any
change in the model metadata. Export glTF with standard Y-up conversion. Apply mesh
scale before rigging. Keep neutral pose and left/right lean actions on one skeleton;
use facial bones or morph targets for panic. Keep score/simulation logic out of all
source and export scripts. These are proposed technical defaults, not recovered
requirements from the missing production specification.
