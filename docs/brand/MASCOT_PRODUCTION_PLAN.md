Current continuation: [Phase 3 gameplay integration and commands](MASCOT_PHASE_3_COMPLETION.md). Appearance is approved and integrated on the feature branch. Earlier feasibility evidence below remains historical.

# Reproduce and inspect the Phase 1 prototype

The original `CDAWG_MASCOT_3D_PRODUCTION_SPEC_V1.md` is preserved verbatim. It defines
the eventual production asset; this checkpoint implements its small feasibility
prototype, not the high-resolution sculpt, full retopology and complete face rig.

## Verified toolchain

Blender **4.5.13 LTS**, build **daeeeca98fb0**, official Apple Silicon DMG.
Installer: **311,910,354 bytes**; installed app measured **814 MiB** by `du -sh`.
Verified official SHA-256:
`663ce944257c61ff1d6aa09e15c8f57bbd8d59023adb2fa7edde33a9ed960b53`.
Official [installer and checksum listing](https://download.blender.org/release/Blender4.5/).
The owner explicitly approved installation. No fee, account, API key, add-on or
preference change. Factory-startup headless smoke passed. macOS sandbox restrictions
caused a native crash; approved local execution outside that sandbox succeeded.

Existing validation environment: Node 24.14.1 and npm 11.11.0. The repository's
24.20.0 Node pin remains unchanged and was not installed. Preview-only dependencies
are locked separately from the application's unchanged package/lockfile.

## Commands (from repository root)

```sh
npm ci --prefix scripts/mascot/preview --ignore-scripts
node scripts/mascot/reproduce.mjs
```

The command discovers the standard macOS Blender app or `blender` on other
platforms. Set `CDAWG_BLENDER_BIN` to override the executable. It starts separate
factory-clean processes, generates A and B models/rigs/GLBs, renders 52 images per
run, composes an atlas/contact sheets, imports the GLB through Blender's independent
importer, and verifies repeat geometry/animation/pixels and Khronos/Three.js checks.
All output goes to ignored `tmp/mascot/reproduce`; it never overwrites canonical
inputs or commits exports automatically. Review, then explicitly promote:

```sh
node scripts/mascot/package-prototype.mjs tmp/mascot/reproduce/a tmp/mascot/reproduce/composed
node scripts/mascot/validate.mjs
node scripts/mascot/check-bundle.mjs
npm run dev --prefix scripts/mascot/preview
```

Open local port **5187**. Build the isolated harness with
`npm run build --prefix scripts/mascot/preview`; outputs go only to ignored
`tmp/mascot/preview-dist`. It uses no application entry, score adapter, environment
file, provider endpoint or external CDN. No internal route was added to production.

## Design and limits

Meters, Z-up/-Y-forward in Blender; Y-up/+Z-forward in GLB. Ground-centered origin;
height about 0.780 m including ears. Fixed orthographic camera and lighting; Cycles
CPU, seed 11, 32 samples, denoising, Standard/None color management, transparent
256² output. Explicit fixed triangulation preserves topology; exporter triangle emission order
can still differ and is compared as exact oriented triangle sets. Model report records all export settings and provisional sRGB colors.
No textures are required: four PBR materials use vertex colors. Geometry forms the C.

The basic rig has pelvis/chest/head, jaw, brows, eye-white/ear controls, tail, tag,
and four two-bone IK chains with world-relative paw targets. Export samples IK
constraints to ordinary bones; exporter notices about baking constraints are
expected and do not indicate missing GLB animation. Khronos validation is separate.
Idle/left lean/right lean/panic/fall each span exactly 0–1 seconds in GLB. Original
Blender source frames are 1–25 at 24 fps. The held lean is blendable from neutral;
fall root motion is cosmetic. Atlas samples endpoints in eight frames per clip.

Known gaps: primitive/disconnected overlapping geometry; no production topology,
high-resolution sculpt, UV texture bakes, fur detail, verified LOD, full IK/FK UI,
complete nine-expression rig or full reusable animation library. Ears, chest blaze,
muzzle and collar/tag proportions remain visibly simplified. Panic is readable but
has less facial nuance than the expression sheet. These are recorded limitations,
not a redesign or an assertion of final creative acceptance.

Next recommended phase: refine the silhouette/face/markings against the canonical
sheets, production topology and deforming shoulders, improve folded ears and collar
fit, then choose a compact atlas budget and sampled animation cadence. Validate
that refined candidate before authorizing any default-character integration.
