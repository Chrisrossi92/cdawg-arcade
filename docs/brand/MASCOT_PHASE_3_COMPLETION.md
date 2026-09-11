# Mascot Phase 3: smooth gameplay integration

Status: **implemented and validated on the existing feature branch**. The owner approved the Phase 2 appearance for integration. No further creative approval is required for this checkpoint. Deployment remains unauthorized.

## Gameplay behavior

The approved v002 model is unchanged. A reproducible Blender authoring script samples 49 signed balance positions and four continuous secondary-motion phases, plus left/right fall, recovery and result sequences. The final atlas uses 29 adaptively spaced balance positions × four phases (116 frames), 62 fall frames, 62 recovery frames and 25 result frames: **265 runtime records from 345 rendered source frames**.

A critically damped spring follows the existing signed balance value and preserves velocity through reversals. Adjacent direction and phase samples blend continuously. Idle, determined, worried and panic acting is authored across that same continuous grid; independent clips never restart when input changes. Expressions pass through intermediate samples. State thresholds use hysteresis (lean .14/.07, wobble .60/.48, panic .86/.74) and an 80 ms dwell; a shared oscillator changes cadence smoothly. Collar, tag, ears, tail and breathing share its uninterrupted phase.

Only the existing clock's fixed `finished` outcome can trigger a loss. The presentation latches its direction/outcome, blends the last sampled pose into the fall, and completes the fall within the unchanged 380 ms result callback interval. Impact particles align with landing and cannot affect scoring. The result screen starts at the matching fallen endpoint, pauses briefly, recovers and reacts. Successful results take a separate reaction path. Render stalls cannot slow the terminal sequence by imposing the normal spring timestep cap.

Reduced motion freezes the secondary phase, keeps a slower responsive lean and presents a stable result pose; particles and camera shake are suppressed. The preference is read continuously. The automated preview exercises the same reduced-motion branch through a local override; it does not change the system preference.

Loading is asynchronous and never gates scene creation, countdown or the simulation clock. Balance images warm on the home screen; reactions warm during the existing countdown. The previous drawn mascot remains a loading fallback. Once sprites appear, missing reaction sheets hold the last rendered sprite instead of flashing back to the fallback.

## Measured cost and quality

| Sheet | Frames | Dimensions | WebP bytes | Metadata bytes |
| --- | ---: | --- | ---: | ---: |
| Balance 0 | 58 | 2048 × 888 | 359,976 | 10,259 |
| Balance 1 | 58 | 2048 × 889 | 361,240 | 10,259 |
| Reactions 0 | 87 | 2048 × 1296 | 507,550 | 15,163 |
| Reactions 1 | 62 | 2048 × 917 | 328,288 | 10,855 |

All four images total **1,557,054 bytes**; images plus source metadata total **1,603,590 bytes (1.53 MiB)**. Metadata is bundled into application JavaScript, avoiding a new server artifact type. Balance images alone are 721,216 bytes. Decoded RGBA storage totals 32,686,080 bytes (31.17 MiB), excluding driver overhead. At most five sprite layers are active. Phaser was already in the application; no new renderer dependency was added.

The main production JavaScript grows from 2,130,476 to 2,179,498 bytes (**+49,022 bytes**). Vite's gzip report grows by approximately 6.5 kB. The existing secondary JavaScript chunk is byte-identical. All image files are explicitly imported and hashed. No canonical images, Blender file, GLB, raw PNG frames or preview tools enter the application bundle.

| Local browser measurement | Canvas | Samples | Frame interval p95 | Update CPU p95 |
| --- | --- | ---: | ---: | ---: |
| Previous mascot | 974 × 502 | 300 | 16.75 ms | 0.10 ms |
| Integrated sprites | 974 × 502 | 323 | 16.78 ms | 0.20 ms |
| Previous mascot, narrow | 364 × 204 | 600 | 16.74 ms | 0.10 ms |
| Integrated sprites, narrow | 364 × 204 | 600 | 16.74 ms | 0.20 ms |

The diagnostic scenes use the same deterministic reversal/threshold trace and Phaser renderer. These are short local embedded Chromium measurements, not a mobile hardware guarantee. CPU measurements cover scene update, not isolated GPU execution. The actual application narrow canvas measures **364 × 203** at a 390 × 844 viewport (one pixel below the diagnostic harness), with no horizontal overflow; gameplay controls, result reaction and result buttons were checked in the real React UI. Desktop placement and result presentation were visually inspected. The local preview uses an in-memory score repository; its unchanged application copy saying “Saved in this browser” does not imply persistence in this harness.

All 345 A/B source renders match exactly. Minimum source margin is 11 pixels. Adjacent source samples move the head at most .002295 m and tag .002058 m; runtime spacing is at most two source samples. Fall/recovery and recovery/result endpoint bone positions agree within 1e-6 m. WebP alpha is exact; maximum premultiplied per-frame RGB RMS error is 1.793/255. Packing validates dimensions, coverage, trim bounds and alpha gutters. Small alpha-over blends can soften moving silhouette edges; there is no optical-flow synthesis or live 3D rendering.

## Validation and isolation

- 370 tests across 29 files pass, including continuous reversals, hysteresis exit, phase wrap, terminal timing under stalls, successful results, reduced motion and equality of deterministic state/ticks with a presentation observer.
- Production typecheck/build and 192 compiled smoke assertions pass with dummy configuration; immutable ruleset digest verified.
- 681 disposable PostgreSQL checks pass, including replay, ownership, atomic rollback, retention and backup/restore. Synthetic resources were removed; no production database was used.
- A five-second delayed-loader browser check reached tick 302 before the first sprite, finished normally, and delivered the existing result callback after 381.9 ms. No fall occurred before the outcome was fixed. This check predates final atlas resampling; the loading/clock integration is unchanged.
- All 32 compiled server files remain byte-identical to the synchronized Phase 2 checkpoint. Simulation, physics/config, replay, scoring, session, official controller, database and hosting/Discord configuration sources are unchanged.
- Canonical and generated asset hashes, the explicit eight-file integration allowlist and source/preview bundle exclusion pass. The main branch remains untouched.

Evidence: [machine-readable measurements](mascot-phase3-measurements.json). Earlier [Phase 2 evidence](MASCOT_PHASE_2_COMPLETION.md) remains historical. Validation used Blender 4.5.13 LTS and Node 24.14.1; the repository's Node 24.20.0 pin is unchanged. The original ZIP checksum is still unverified because the ZIP was not supplied; copied canonical input hashes remain verified.

## Reproduce and preview

From the repository root, with the existing application dependencies installed:

```sh
npm ci --prefix scripts/mascot/preview
node scripts/mascot/reproduce-gameplay.mjs
node scripts/mascot/package-gameplay.mjs tmp/mascot/gameplay-reproduce/packed
node scripts/mascot/validate.mjs
node scripts/mascot/validate-gameplay-atlas.mjs
node scripts/mascot/check-bundle.mjs
npm test
npm run test:database
npm run test:production
npm run dev --prefix scripts/mascot/preview
```

`CDAWG_BLENDER_BIN` can select an existing Blender binary; the macOS default is `/Applications/Blender.app/Contents/MacOS/Blender`. Repeat renders and packing stay in ignored temporary storage until explicitly packaged. This phase adds no new model or GLB export because the approved source appearance is preserved and delivery is pre-rendered sprites.

Final local gameplay preview: `http://127.0.0.1:5187/integrated.html`. The diagnostic page at `/gameplay.html` exposes automated gameplay, reversal, delayed-loading, legacy-comparison and reduced-motion controls with DOM-readable measurements. These preview entry points are excluded from production.
