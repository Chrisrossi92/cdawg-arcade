# Mascot Production Phase 1 — prototype completion

Result: **PASS WITH LIMITATIONS for feasibility; not final mascot approval.**

## Git and boundaries

Started on clean `codex/mascot-production-foundation` at
`be6cb8c2ba0e9c5ff69b0a00596e2e78be5812dd`, tracking the same origin branch. A fresh
fetch confirmed zero divergence. The verified remote is
`https://github.com/Chrisrossi92/cdawg-arcade.git`. The applicable operating policy
was read before edits. The other existing checkout was not modified.

This work stays on the same feature branch. No main merge, pull request, deployment,
provider dashboard, Discord/hosting setting, credential access, global Blender
preference or production database action. All database tests used a disposable local
cluster and synthetic identities. Application/server source, package/lockfile, build config,
official scoring and replay code are unchanged. Normal gameplay still uses the old
character. The isolated preview does not enter the shipping module graph.

## Inputs and tooling

Five supplied originals copied byte-for-byte: turnaround, expressions, movement,
authority README and production specification. Stable repository names and hashes
are in `assets/brand/mascot/manifest.json`; original specification/README are retained
verbatim. Files arrived already extracted; the ZIP was not supplied, so the provided
archive hash is recorded as unverified rather than falsely certified.

Blender 4.5.13 LTS / daeeeca98fb0 installed from the approved official Apple Silicon
DMG after matching the official checksum. Installer 311,910,354 bytes; installed app
814 MiB. Headless factory smoke passed. No paid service, external artwork upload,
third-party model or font. Details and repeat commands: `MASCOT_PRODUCTION_PLAN.md`.
Node app checks used installed 24.14.1 rather than the repository's 24.20.0 pin;
that exact-version limitation remains explicit.

## Prototype deliverables

- Editable Blender source plus deterministic procedural build script and settings.
- Valid self-contained GLB: **1,061,368 bytes**, **26,344 triangles**, **4 materials**,
  **31 bones**, five named clips, no external images or buffers.
- Neutral idle, continuously blendable left/right lean, panic via brows/eyes/jaw,
  and a harmless root-motion fall. GLB clips are 0–1 seconds.
- Basic quadruped IK, fixed paw targets, collar and geometric circular C tag.
- Transparent 40-frame 2048×1280 atlas with JSON and 8-view contact/turntable sheets.
- Isolated local live-3D/atlas comparison with responsive layout and motion controls.
- Hash-based intake gates, structural/official validator, independent animation and
  reimport checks, reproducibility and bundle evidence.

No LFS: individual files are small and no existing LFS workflow exists. Bulky trial
frames, installer, intermediate exports, logs and caches remain ignored in `tmp`.

## Validation results

| Check | Evidence |
| --- | --- |
| Existing unit/mocked integration suite | 28 files, 362 tests passed |
| Typecheck/production build | Passed; immutable Balance ruleset digest verified |
| Existing local compiled smoke | 180 assertions passed; dummy configuration only |
| Disposable Postgres integration | 681 checks passed including replay, isolation, concurrency, atomic rollback, backup/restore and fallback matrix |
| Asset intake | Five originals and seven generated outputs hashed; four positive/negative intake checks passed |
| Khronos glTF Validator | 0 errors, 0 warnings, 0 informational findings |
| Two independent importers | Three.js and Blender glTF importer load all five clips |
| Planted paws | Maximum idle/lean drift below 0.00000024 m in independent sampled checks |
| Continuous lean | Five blend weights evaluated from neutral through held left lean |
| Repeat generation | Exact GLB JSON structure and oriented triangle topology; 270 accessors compared |
| Repeat numeric variation | Maximum 0.00009976 in normals; other floats within 0.000001, integers/topology exact |
| Repeat render comparison | 52 images; greatest mean RGBA difference 0.00000008976 |
| Independent GLB render comparison | Neutral/panic mean RGBA error below 0.0000023 |
| Framing | All 40 atlas frames have at least 4 pixels of alpha-margin |
| Desktop/narrow browser checks | 1280×900 and 390×844; narrow document width 390 without horizontal overflow; controls exercised |
| Shipping artifact comparison | All four artifact SHA-256 values identical to baseline; 0-byte delta |
| Production bundle graph | 133 modules; no mascot source or preview imports |
| Security/diff checks | Source, staged contents and artifacts scanned; no secrets/environment files included |

The staged security scanner was updated to size its read buffer from Git's blob
size and withhold failed-read payloads; its former 1 MiB default could not read the
canonical PNGs. Actual multi-megabyte staged files now pass the unchanged scan rules.
Blender's default Shading-workspace file browser stored a home-directory path; this
was changed to a project-relative directory in the source and generator. The
compressed source was decompressed and verified free of user/home path strings.
Global preferences were not modified. The original production specification has
two Markdown hard-break lines with trailing spaces; those are preserved verbatim.
All other staged files pass `git diff --check`.

GLB bytes are not identical between runs: exporter triangle emission order and small
normal-vector differences remain. Equivalent topology/animation and pixel tolerances
are measured explicitly; no binary-determinism claim. Blend session metadata and PNG
metadata are not treated as visual changes. Exporter IK-baking notices are expected;
Khronos validation and independent imports confirm the baked result.

Full JSON evidence is next to this report: `mascot-glb-validation.json`,
`mascot-animation-validation.json`, `mascot-reproducibility.json`,
`mascot-presentation-measurements.json`, `mascot-browser-measurements.json`.
Desktop/narrow screenshots are local in `tmp/mascot/comparison-*.png`; intentional
mascot review sheets are versioned in the asset package.

## Production bundle baseline remains unchanged

HTML 415 bytes; CSS 13,418 bytes; main JS 2,130,476 bytes; additional JS 159,736 bytes.
Corresponding gzip values: 278; 3,651; 601,614; 48,353. Existing >500 kB main chunk
warning remains. The local 3D preview also has a separate 586 kB renderer chunk;
that file is not shipped by the application.

## Limits and next phase

This is a recognizable low-detail interpretation, with visible gaps from canonical
art: blocky/disconnected surfaces, simplified folded ears, cream blaze and muzzle,
flat coat shading, limited facial nuance and rigid collar/tag details. No final
sculpt/retopology, texture baking, verified LOD, full animator IK/FK controls, full
nine-expression library or complete production animation set. No final visual
approval or production-spec completion is implied.

Recommend pre-rendered sprites for the first integration after optimizing the
current 1.90 MB atlas. The 1.06 MB GLB plus renderer can transfer less than this PNG;
see the comparison report for that tradeoff. Actual Discord device GPU/memory,
reduced-motion OS emulation and context loss remain unmeasured. The in-app browser
emitted an unsourced observer error despite successful rendering/controls; it is
recorded in browser evidence rather than hidden.

Next recommended phase: production-quality silhouette/face/marking and deformation
refinement against the supplied canonical sheets, followed by an optimized atlas
candidate at actual gameplay size. Default character integration remains separately
authorized work. No new owner decision is required to review this Phase 1 result.
