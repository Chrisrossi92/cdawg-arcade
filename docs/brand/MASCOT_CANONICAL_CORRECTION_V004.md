# Focused canonical mascot correction — static checkpoint V004

Status: **owner creatively approved; affected atlases regenerated and integrated on the feature branch**. See [V004 pre-merge validation](MASCOT_V004_PREMERGE.md). The evidence below records the original static checkpoint. The owner approved the CDAWG Arcade brand system, Notched Tag, typography, palette and overall lobby direction after `bc803e4`. That approval explicitly excluded the lobby mascot render. This checkpoint does not reopen or edit the approved interface.

## Scope and canonical authority

The original supplied turnaround and expression sheet remain binding, unchanged reference inputs. Their hashes were rechecked against the existing mascot manifest. Source images are not regenerated or cropped into new artwork. Every new specimen comes from the corrected Blender model. The source model, export and static previews live under `assets/brand/mascot/correction-v004`, separately from the existing production runtime/source directories.

The correction preserves the existing chunky quadruped construction, planted-paw rig, all 43 bones, bone rest matrices/hierarchy and 26 action names. It changes the head, facial shapes and poses, collar and tag:

- Shared pupil translation and aligned rest positions replace the divergent gaze. Round brown eyes have consistent catchlights. Mischief no longer closes one eyelid heavily.
- Cream brow forms nest into the forehead, with a restrained asymmetrical mischievous pose. Thin aperture edges replace the thick horizontal sleepy lids.
- A broad rounded canine muzzle and recessed oral cavity replace the narrow horizontal lip treatment. Mouth opening moves the jaw and cavity together; the tongue stays associated with the mouth. Default uses small upward corner accents.
- The head is broader and squarer, overlapping dark cheek disks are removed, and folded-ear tips are softened with an inner-ear surface.
- The collar is a thin, broad leather strap with 8mm wall thickness and a 43mm face, soft edges, burnt-orange vertex color, small cream stitches and a rear buckle. The circular cream/brass C tag is enlarged for clearer reading.
- Cream muzzle, brow, chest and paw markings remain. The existing short-limbed body geometry is retained. No new costume, fur simulation or broader character redesign is introduced.

## Review specimens

The review includes front head-and-shoulders, three-quarter head-and-shoulders, a default lobby host at 220px character height, a 256px gameplay-source specimen and six front expressions: default, delighted, determined, worried, panic and mischief. Earlier-model front/three-quarter renders are available under a comparison disclosure.

All renders use the same existing Key/Fill/Rim area lights, world, Standard/None color management, Cycles CPU, 48 samples and seed 11. Cameras and framing are fixed and recorded in `reports/cameras.json`. The supplied reference sheets have baked artistic lighting; their unknown original camera/light rig cannot be recovered. They are displayed unaltered for canonical shape/expression comparison, while before/after model comparisons use identical known settings.

The close views intentionally crop at the shoulders. Full-body lobby/gameplay sources have at least 27px of alpha margin; the lobby derivative trims empty space for the existing 220px display height. The gameplay specimen is static. No animation atlas has been regenerated and the approved lobby page still contains its historical, unapproved mascot render; this isolated checkpoint is the correction candidate.

## Technical evidence

| Gate | Result |
| --- | --- |
| Geometry/rig/static-pose assertions | **22 passed** |
| Geometry | **38,330 triangles; 19,513 vertices; 4 materials** |
| Surface topology | **0 boundary edges; 0 non-manifold edges; 0 zero-area faces** |
| Weights | Normalized; finite evaluated positions in all six requested poses |
| Rig preservation | All **43 bones**, rest matrices, hierarchy and deform flags identical to V002 |
| Gaze | Identical L/R gaze translations across all six reviewed expressions |
| GLB assertions / Khronos validator | **16 passed; 0 errors; 0 warnings** |
| GLB size | **1,840,768 bytes** |
| Independent build/export comparison | **701 accessors compared**; exact oriented triangle sets; structure identical |
| Float tolerance | Maximum difference **0.000069499** in normals; below **0.0002** tolerance; other float attributes below **0.000001** |
| Render repeatability | **10 renders**; maximum mean RGBA error **0.0000001277**, below **0.001** |
| Independent GLB import/render | Default mean error **0.000003617**; panic **0.000003745**, below **0.02** |
| Packaged asset/hash/dimension/alpha/reference/isolation checks | **142 passed** |
| Production | **45/45 existing artifacts byte-identical**; approved brand, game, runtime atlases and configuration unchanged |
| Review page | 1280px desktop and 390px narrow; 14 images loaded; no horizontal overflow; 220px lobby / 256px gameplay display confirmed |
| Security | Existing repository pattern scanner passed; no environment values or credentials read |

GLB binary bytes are not identical across independent rebuilds: triangle emission order and tiny normal differences vary. Geometry, animation accessors and pixels meet explicit tolerances. Blender session/PNG metadata is not used as a visual-repeatability gate. Detailed reports and hashes are committed with the checkpoint.

The closed-surface gate initially caught unwelded coincident curve-cap seams. The builder now fills and welds those seams before triangulation. Separate overlapping closed facial components remain as in the existing stylized production approach; this is not a new unified sculpt, retopology or fur-texture pass. Full animation continuity/deformation and atlas performance remain unvalidated for this corrected model until the static creative checkpoint is accepted.

## Review and next gate

Open `http://127.0.0.1:5194/`. Review the head/collar, display-size specimens and six expressions together; binding original sheets are on the same page. **One consolidated creative approval is requested for the corrected head, expressions, collar and circular tag.** Automation establishes model integrity and repeatability but cannot establish the owner's aesthetic acceptance.

After that acceptance, regenerate the affected animation atlases, validate motion continuity, integrate the accepted host derivative and continue pre-merge preparation. This checkpoint does not authorize that next stage before approval. Nothing was merged or deployed; no production/Discord/hosting/database settings were touched.

## Reproduction

Use the already approved Blender 4.5.13 LTS, pinned Node 24.20.0 and the existing mascot preview's pinned Sharp/Khronos validator dependencies. From the repository root:

```sh
blender --background --factory-startup --python-exit-code 1 --python scripts/mascot/build-canonical-correction.py -- --output tmp/mascot/correction-a --render
blender --background --factory-startup --python-exit-code 1 --python scripts/mascot/build-canonical-correction.py -- --output tmp/mascot/correction-b --render
blender --background --python-exit-code 1 --python scripts/mascot/render-correction-checkpoint.py -- --input assets/brand/mascot/source/cdawg-mascot-candidate-v002.blend --output tmp/mascot/correction-before
mkdir -p tmp/mascot/correction-validation
blender --background --python-exit-code 1 --python scripts/mascot/validate-correction.py -- --input tmp/mascot/correction-a/cdawg-mascot-correction-v004.blend --report tmp/mascot/correction-validation/geometry.json
node scripts/mascot/validate-correction-glb.mjs tmp/mascot/correction-a/cdawg-mascot-correction-v004.glb tmp/mascot/correction-validation/glb.json
blender --background --python-exit-code 1 --python scripts/mascot/reimport-correction.py -- --input tmp/mascot/correction-a --output tmp/mascot/correction-reimport
blender --background --python-exit-code 1 --python scripts/mascot/compare-correction.py -- --a tmp/mascot/correction-a --b tmp/mascot/correction-b --reimport tmp/mascot/correction-reimport --report tmp/mascot/correction-validation/repeatability.json
node scripts/mascot/package-correction.mjs
node scripts/mascot/validate-correction-assets.mjs
node scripts/scan-production.mjs
node node_modules/vite/bin/vite.js --config scripts/mascot/correction-preview/vite.config.mjs
```

The packaged asset isolation check expects the existing production build to be present. On a fresh checkout, `npm run test:production` recreates the dummy-config baseline before running that check.
