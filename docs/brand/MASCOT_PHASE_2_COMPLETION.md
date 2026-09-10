# Mascot Production Phase 2

Canonical refinement candidate for one consolidated creative review. No production integration is authorized by this work. See the versioned turnaround, expression and motion sheets in `assets/brand/mascot/previews`.

## Checkpoint and boundaries

Started from clean, synchronized `codex/mascot-production-foundation` at `0f7ffccc89546de1766e240f6088bad1501d2ce1`, remote `https://github.com/Chrisrossi92/cdawg-arcade.git`. All five canonical inputs and seven Phase 1 deliverables matched recorded hashes. The Phase 1 GLB was independently imported and rendered from its saved fixed camera as the baseline. Original source and references remain intact.

No changes to `src`, `server`, application package/lock files, normal build configuration, feature flags, Discord/hosting configuration, official scoring, sessions, replay or production databases. Only disposable synthetic Postgres databases were exercised. No credentials were read. No PR, merge or deployment. The local frontend layout check created a practice result only in that temporary local browser origin.

## Model and facial acting

The broader rounded square head, prominent cream muzzle, compact unified barrel/leg coat, thick lower legs, cream toes, folded ear flaps, painted chest blaze, curled tail, stitched burnt-orange collar, brass/cream C tag and warm eyes are authored geometry and vertex colors. The coat is voxel-unified and simplified; no strand fur or external texture maps. Four material groups cover coat, eyes, leather and hardware.

Independent brow, eye aim, eyelid, jaw, muzzle, cheek and lip-corner bones support nine fixed expressions: default, delighted, determined, worried, panic, frustrated, proud, dizzy and asymmetric mischief. Facial review images come from the actual editable model. Blink/look clips are independently selectable baked actions; they are not packaged as engine-independent additive layers.

Seventeen motion actions: idle_default, idle_mischief, ready, lean_left, lean_right, wobble_left, wobble_right, panic, fall, recover, victory_small, victory_big, defeat, host_wave, host_point, blink, look_direction. Nine additional expr_ actions preserve facial poses in GLB. Actions span source frames 1–24 at 24 fps (23/24 second). Gameplay sprites use 12 endpoint-inclusive samples. Continuous lean shifts chest weight while fixed IK paw targets hold the ground. Wobble/panic add alternating forepaw scrambles. Tail, ears and tag have restrained secondary motion. Face geometry follows the head/chest; no soft-body simulation. All motion is cosmetic and isolated from deterministic game state.

| Statistic | Phase 1 | Phase 2 |
| --- | ---: | ---: |
| GLB bytes | 1,061,368 | 1,564,196 |
| Triangles | 26,344 | 29,782 |
| Bones | 31 | 43 |
| Material primitives / draw calls | 4 | 4 |
| Texture maps | 0 | 0 |
| Motion / expression clips | 5 / 0 | 17 / 9 |

The model meets the preferred 22–30k triangle range, hard four-material ceiling and preferred <5 MB GLB budget. Four materials exceed the preferred two-to-three target. It is a stylized candidate, not final production sculpt/retopology certification.

## Display scale and sprite delivery

Bounds were measured in Phaser using the unmodified production `CdawgRig`: nine poses × 69 tilt values (-34° through +34°) × two panic endpoints, including maximum pulse scale, for 1,242 samples. Maximum axis-aligned bounds are 188.988 × 198.267 CSS pixels. Four extra pixels cover stroke edges. A 256 × 256 source cell leaves motion overscan, with per-frame transparent trimming and a fixed camera-derived ground anchor. No responsive mascot scaling exists in the current render path.

The actual unchanged frontend was served locally without a backend: at 1280 × 900 its active canvas is 974 × 502; at 390 × 844 it is 364 × 203 (CSS height 203.875). The separate workshop uses larger review stages so both silhouettes can be inspected at native pixel scale without game UI overlays.

Critical clips: idle, left/right lean, left/right wobble, panic, fall and victory_small. Optional clips contain the remaining host/idle/reaction motions. Optional resources are not requested by the initial Phaser page. Exact frame hashes deduplicate only identical cropped images; no lossy temporal deduplication. Frames have two duplicated gutter pixels and standard Phaser JSON trim/source-size metadata. PNG, lossless WebP and quality 95/90/82 WebP are measured; the lowest quality setting passing a maximum per-source-frame RMS error of 2/255 is selected after light/dark composite checks with exact alpha. AVIF is not needed and is not claimed verified. Full PNG baselines and individual 48-sample Cycles source renders remain reproducible in ignored temporary output instead of redundant shipping copies.

## Reproduce and review

Use the checksum-verified Blender 4.5.13 LTS installation from Phase 1. No additional Blender add-ons. Local encoder `sharp` 0.34.3 is pinned in the isolated preview package; application dependencies are unchanged. The approved canonical source archive hash remains owner-supplied and unverified because only extracted files were provided. Original file hashes, authority and licensing statements are unchanged. No new stock assets or fonts are used in the model; the C is geometry. Blender GPL covers the tool, not a new license claim over the character. Sharp uses Apache-2.0 with its bundled library notices; Three.js and Phaser retain their existing MIT notices.

```sh
npm ci --prefix scripts/mascot/preview --ignore-scripts
node scripts/mascot/reproduce-candidate.mjs
node scripts/mascot/package-candidate.mjs tmp/mascot/phase2-reproduce/a tmp/mascot/phase2-reproduce/composed
node scripts/mascot/validate.mjs
node scripts/mascot/validate-atlas.mjs
npm run dev --prefix scripts/mascot/preview
```

Open `http://127.0.0.1:5187/candidate.html` for the actual Phaser side-by-side comparison; `candidate-live.html` is the separate GLB viewer. Controls provide deterministic state/time selection, playback, a reduced-motion still-pose override and light/dark edge inspection. System reduced-motion preferences are respected. These entries build only under ignored `tmp/mascot/preview-dist`, never under the normal application output.

Source `.blend` and reports are under `source`; review sheets under `previews`; optimized browser-compatible candidate files under `runtime`. Directory naming does not imply shipping approval: every generated asset remains `approvedToShip: false`, and `runtimeExports` is empty.

## Known visual limits and next integration

The candidate preserves the quadruped identity but interprets the reference in smooth toy-like surfaces. It lacks the reference's plush fur, sculpted folds, subtle asymmetry and nuanced lip shapes. Facial pieces remain separate weighted surfaces; broad acting is readable but less organic than the reference, particularly open mouths, closed eyes and cheek transitions. Folded ears and collar hardware are simplified. There is no artist-oriented IK/FK interface, LOD package, production texture bake or real-device Discord GPU certification. Source/source normal tolerances are explicit; binary-identical `.blend` files are not promised.

Recommend pre-rendered sprites first: use the game's existing Phaser texture manager, preload only the critical atlas, and select cosmetic frames from a read-only projection of gameplay state. Load host/celebration extras on demand. A later authorized integration must retain the present deterministic simulation, replay, timing, session and score interfaces. Live 3D remains useful for reusable host scenes or camera changes, but would add a renderer, GPU skinning and device/context-loss obligations to this 2D game.

Creative approval is required for this final candidate before any integration. Technical validation cannot establish the owner's preferred likeness or expression quality. No further routine gameplay test is requested.

## Measured delivery and validation results

**PASS WITH LIMITATIONS:** the technical gates pass; likeness, nuanced acting and integration remain subject to the consolidated creative review above.

| Atlas measurement | Critical | Optional |
| --- | ---: | ---: |
| Sampled / unique frames | 96 / 80 | 108 / 101 |
| Cropped PNG baseline bytes | 2,937,722 | 2,659,840 |
| Lossless WebP bytes | 1,960,302 | 2,114,594 |
| Selected quality-90 WebP bytes | 511,692 | 600,550 |
| JSON bytes | 18,523 | 20,691 |
| Image + JSON bytes | **530,215** | 621,241 |
| Texture dimensions | 2048 × 1270 | 2048 × 1445 |
| Decoded RGBA allocation | 10,403,840 bytes | 11,837,440 bytes |
| Maximum per-source-frame RMS error, byte units | 1.7743 | 1.7932 |
| Maximum alpha error | 0 | 0 |

Phase 1 loaded a 1,898,883-byte PNG plus 5,367-byte JSON for just 40 frames. The new critical payload is 72.2% smaller while supplying 96 sampled gameplay frames. These are payload sizes before HTTP compression. Optional animations cost nothing until requested; all 204 frames together total 1,151,456 bytes including both metadata files. Quality 82 failed the per-frame 2/255 RMS threshold (worst 2.346); quality 95 passed but added bytes without a visible native-size benefit. The quality gate normalizes each frame to its original 256-pixel cell, avoiding a packing-density-dependent error threshold. Atlas-space RMS is also recorded. Alpha and duplicated edge gutters remain exact.

The refined GLB is 1,564,196 raw bytes / 405,089 gzip bytes. The separate Three.js loader/renderer chunk is 583,860 raw / 148,686 gzip bytes; viewer glue adds about 1.9 KB gzip including shared controls. A compressed full live library is therefore about 556 KB, close to the critical sprite transfer, but requires a new renderer. The isolated Phaser comparison bundle is 1,489,878 raw / 342,975 gzip bytes, mostly the engine already present in the game. **Neither preview bundle ships.** Live geometry arrays measured about 1,032 KiB and four draw calls; 43 bone matrices require at least 2,752 bytes before implementation padding. Framebuffers, animation arrays, renderer overhead and device-specific GPU allocations are additional. The critical atlas alone requires about 9.9 MiB decoded RGBA GPU storage, potentially another decoded CPU copy; optional textures should be released when unused. Sprite delivery wins on integration simplicity and consistent baked appearance, not total GPU memory.

Local browser observation: GLB load/parse 56.3 ms; rAF p50 16.7 ms / p95 17.6 ms across 300 samples. Final Phaser candidate loading measured 71.6 ms. These observations use a warm local desktop, development server, and different harness startup paths; they are not comparable universal benchmarks or Discord mobile promises. Initial Phaser resource evidence contains exactly the critical WebP and JSON, with no optional atlas, GLB or Three.js request.

| Validation | Result |
| --- | --- |
| Existing unit/integration suite | 362 tests, 28 files passed |
| Typecheck and production build | Passed |
| Isolated preview TypeScript check/build | Passed |
| Compiled production smoke | 180 assertions passed |
| Disposable Postgres | 681 checks passed; synthetic databases removed |
| Intake fixtures | Four positive/negative checks passed |
| Asset integrity | Five canonical originals plus 18 generated assets verified |
| Khronos validator | Zero errors, warnings or infos; both historical and refined GLBs checked |
| Independent Three.js importer | All 26 clips; nine distinct facial transforms; finite bounds |
| Paw/lean checks | Four planted paws in idle/lean, five continuous blend weights |
| Independent Blender importer | All 26 clips; neutral/panic render agreement |
| Repeated model | 745 accessors; exact GLB structure and oriented triangle sets |
| Numeric repeat error | Maximum 0.000086695 in normals, below 0.0002; other floats ≤0.000001; integers exact |
| Repeated images | 225/225; maximum mean RGBA error 0.00000013464, below 0.001 |
| Independent import image error | Neutral 0.000001302; panic 0.000011968; both below 0.02 |
| Framing | All 204 gameplay source frames retain ≥14 pixels of alpha-margin |
| Atlas consistency | 204 metadata entries, trim bounds, ≤2048 dimensions, exact alpha gutters passed |
| Browser | Actual Phaser WebGL, eight deterministic states, playback, desktop/narrow and light/dark review passed |
| Reduced motion | Explicit override stays at frame zero even with Play enabled; preference listener inspected |
| Production artifact comparison | All four baseline SHA-256 values identical; **zero bytes added** |
| Bundle boundary | 133 application modules; no mascot source, preview or Three.js additions |
| Security | Source, staged files and artifacts scanned; compressed `.blend` verified free of personal home paths |

The initial sandboxed integration run could not open loopback sockets; the complete suite passed when run with the required local socket access. Tests used installed Node 24.14.1; the repository's 24.20.0 pin was preserved, so an exact pinned-runtime run remains unverified. Browser OS-level reduced-motion emulation and real Discord/mobile GPU/context-loss tests remain unverified; the explicit accessible override is automated. The browser tool's full-page screenshot stitching is unreliable at narrow sizes, so viewport screenshots are used. No clean-console claim is made for the tool's unsourced observer error.

Evidence: `mascot-phase2-glb-validation.json`, `mascot-phase2-animation-validation.json`, `mascot-phase2-atlas-validation.json`, `mascot-phase2-reproducibility.json`, `mascot-phase2-presentation-measurements.json`, and `mascot-phase2-browser-measurements.json`. Local viewport captures are `tmp/mascot/phase2/browser-desktop.png`, `browser-narrow.png` and `browser-light.png`. Committed review sheets are generated from the final model; trial frames, rejected intermediary models, PNG baselines, caches and installation binaries remain ignored.
