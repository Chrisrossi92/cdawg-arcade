# Approved V004 mascot — animation integration and pre-merge validation

Final owner-approved preparation: [release gates and rollback plan](V004_RELEASE_AND_ROLLBACK_PLAN.md); [final automated evidence](mascot-v004-final-validation.json).

The owner approved the corrected static mascot after the V004 checkpoint at `bc9e4cb`. This closes the head, expression, collar and tag creative gate and authorizes affected atlas regeneration and feature-branch integration. No additional creative review is requested. No merge or deployment is authorized by this approval.

The unchanged approved Blender model supplies the new V004 gameplay atlases and the V002 lobby host/avatar derivatives. The approved brand vectors, typography, palette, layout and styles remain unchanged. The only production source change since the checkpoint is eight asset-version substitutions in `src/games/balance/mascot/assets.ts`. Motion logic, deterministic physics, timing, replay, scoring, session and database behavior are unchanged.

## Render and asset evidence

- Blender 4.5.13 LTS rendered all 345 gameplay source frames twice: exact pixel matches, zero mean RGBA difference. All eight independently packed WebP/JSON files are byte-identical.
- The 265 runtime frame records retain signed balance sampling, shared secondary-motion phase, falls, recovery and results. Minimum source margin is 6px. All 265 packed frames pass alpha, gutter, bounds and coverage validation. WebP alpha is exact; maximum per-frame RGB RMS is below 1.85/255.
- Adjacent balance samples move the head at most 2.30mm and the tag 2.06mm. Fall/recovery/result head and tag endpoints match within 1e-6m. Existing interpolation, reversal, hysteresis and deterministic-loss gating remain intact.
- The approved source hash is unchanged. Its existing geometry, GLB and 43-bone rig checks remain applicable; source and export hashes were revalidated. No model or rig edits followed approval.
- Four atlas images total **1,602,752 bytes**, up **45,698 bytes (2.9%)**. JSON totals 46,514 bytes. Decoded RGBA is 33,447,936 bytes (31.90 MiB), up 761,856 bytes; maximum texture dimension remains 2048px.

Detailed evidence: `mascot-v004-reproducibility.json`, `mascot-v004-integration.json`, and the correction package's unchanged geometry, GLB and repeatability reports. Historical V003 assets remain registered; only the eight V004 integration exports are imported.

## Browser and bundle results

Same-browser motion stress tests retained 600 samples at each display size, with Blender/render jobs stopped. These measure browser frame intervals and scene-update CPU, not isolated GPU cost or a physical mobile device.

| Game canvas | Before p95 frame interval | V004 p95 frame interval | Before / V004 p95 scene update |
| --- | ---: | ---: | ---: |
| 974 × 502 | 16.74ms | 16.75ms | 0.20 / 0.20ms |
| 364 × 204 | 16.76ms | 16.75ms | 0.20 / 0.20ms |

Both sizes remain approximately 60 FPS in this local browser. Direction reversals and threshold noise run through the existing real scene. The automated gameplay check loads the atlas by tick 3, completes with a fixed result, and reports `lossBeforeFixed: false`. A forced five-second atlas delay first displays sprites at tick 302 while gameplay continues, also with no premature loss. Reduced motion holds secondary phase at zero and retains readable balance/expression feedback.

The actual React game completes local runs, displays results and restarts through Play Again at 390×844 and 1280×900. Lobby and result layouts have no horizontal overflow or broken images. Gameplay and result screenshots show the corrected model with readable markings and no obvious clipping. All source frames pass bounds checks. These local previews use a memory score repository; no real identity, official submission or production database is involved.

The production frontend totals **3,955,937 bytes**, up 45,676 bytes from the checkpoint. Two complete builds are byte-identical across all **45 output files**. All **36 compiled server files** are byte-identical to the prior baseline; `build/release.json` changes because it inventories the new frontend hashes. The module-boundary check passes for 145 modules, admitting only the eight approved mascot files and excluding brand lobby assets, fonts, source models, references and preview tools.

The separate lobby build graph totals 462,323 bytes (281,759 gzip estimate), with no Phaser loaded until gameplay navigation. This is a build-graph estimate, not a measured network transfer. The existing large Phaser chunk warning remains; no new dependency is added.

## Validation and isolation

- 370 tests in 29 files passed, including existing motion, replay, timing and security cases.
- 681 real disposable PostgreSQL checks passed, including isolation, concurrency, personal/guild projections, replay, rollback and backup/restore. No production database was used.
- 192 compiled production smoke assertions passed on each of two identical builds, using dummy configuration only.
- Type checking, 104 brand structure/font/contrast checks, 56 raster checks, four adversarial intake checks, 265 packed-frame checks and the production bundle boundary passed.
- Full source, staged-file and built-artifact security pattern scan passed before commit. It checks known credential patterns, forbidden client variables, accidental local paths and environment-file tracking; it is not a comprehensive penetration test. No credentials were opened.
- Remote references refreshed: local and remote main remain `af3c5d7242ed94958ac1c5dcbdede05da70ed4c5`, an ancestor of this feature branch. Main and deployed production are untouched. No environment, hosting, DNS, Discord, permission, package or database configuration changes.

The original static-only isolation check is historical evidence for its checkpoint; the new `verify-v004-integration.mjs` gate explicitly checks the now-authorized asset substitution and unchanged server/brand sources. It does not waive a production gate.

## Reproduction and handoff

Use pinned Node 24.20.0 and Blender 4.5.13 LTS. `node scripts/mascot/reproduce-gameplay.mjs <temporary-directory>` uses the active V004 approved source, renders both passes and validates them. Pack each pass with `node scripts/mascot/pack-gameplay.mjs <frames-directory> <packed-directory> v004` and compare the eight outputs. Explicit promotion uses `node scripts/mascot/package-gameplay.mjs <packed-directory> v004`; follow with atlas, intake and bundle validation. Regenerating is optional for review because paired hashes and reproducibility evidence are committed.

The feature branch is prepared for a separate merge/deployment decision. No merge, deployment, production canary or production rollback was performed. The prior live release remains in place. The final local preview is `http://127.0.0.1:5193/`, with Play opening the actual corrected gameplay. This preview remains local practice only.
