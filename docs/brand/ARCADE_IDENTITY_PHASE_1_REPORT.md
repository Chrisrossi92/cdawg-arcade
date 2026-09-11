# Identity Phase 1 — PASS WITH LIMITATIONS

## Verified checkpoint and scope

Started from clean, synchronized `main` / `origin/main` at `af3c5d7242ed94958ac1c5dcbdede05da70ed4c5`, after fetching origin. The accepted mascot feature remains preserved. The read-only production readiness response was healthy at accepted release `615898dcc24214206774e551b5bfb935171eefa1`. No further mascot canary was requested. Work is on `codex/arcade-brand-foundation` only; no merge, deployment or PR is authorized or performed.

The only applicable AGENTS.md is the repository root operating policy. Current README, app entry, global styling, HostContext, connection/status surfaces, Balance flow, mascot pipeline, Vite and validation scripts were reviewed. The current production app directly mounts BalanceExperience; home/results/leaderboards are internal phases, not a lobby route. Identity and authentication belong to the host adapter. Existing styles declare Inter with system fallback without an embedded Inter file, use a dark blue/black and orange palette, and have no shared semantic brand-token file. No existing public favicon/app-icon asset convention was present. Balance owns timing, pause/resume, results and responsive canvas behavior; none of those files changed.

The complete ZIP `CDAWG_ARCADE_BRAND_DIRECTION_V1.zip` was found, SHA-256 matched `d3969780b9be18f22ff11aae1ef6a15ceec330e2b3d96390e3e48cb80e06541c`, and safe extraction verified all five preserved originals. Archive paths, symlinks and sizes were checked. Boards are reference-only. The user's request controls scope; source documents control approved creative direction, not release authorization.

## Candidate delivered

- 18 deterministic SVG assets: primary horizontal, stacked, standalone tag and wordmark families in dark, light and two one-color variants; simplified small tag; reusable avatar frame.
- 10 runtime derivatives: four transparent favicon PNGs (16/24/32/48), three owned mascot avatar PNGs (64/128/256), one transparent owned host render, two local WOFF2 subsets.
- Fredoka 600 display and Atkinson Hyperlegible 400 UI, SIL OFL 1.1. Both original fonts, licenses, modified-font naming and provenance committed. Subsets total **30,812 bytes**.
- Semantic charcoal/cream/orange/brass palette, accessible control/state colors and generated CSS. Fourteen contrast pairs pass; primary text 15.46:1, action label 8.04:1, secondary text 7.56:1, focus 6.40:1, control border 3.20:1, light orange 4.79:1.
- Local lobby with existing safe public identity shape, owned host, CDAWG BALANCE and two untitled coming-soon cards, honest personal/guild empty states, reusable stateful card, restrained motion, keyboard/focus, reduced motion, responsive layouts and local practice navigation.
- Single candidate page also contains logo-family comparison, true-size small marks, avatar, palette and type specimens. No cropped reference artwork appears in the interface.

## Automated evidence

| Check | Result |
| --- | --- |
| Existing unit/security/gameplay tests | **370 passed / 29 files** |
| Production build and smoke | **192 assertions passed**, typecheck passed |
| Disposable PostgreSQL | **681 checks passed**, backup/restore passed, no production DB |
| Preview TypeScript + separate build | Passed |
| SVG/XML, original hashes, font coverage/license/size, contrast | **104 checks passed** |
| Raster alpha/dimensions and unclipped SVG edges | **48 checks passed** |
| Browser states, keyboard, motion, entry/return and layout | **27 checks passed** |
| Browser screenshots | 1280×900, 760×620, 390×844, 375×667; no horizontal overflow, broken images or font fallback |
| Derivative rebuild | **28/28 byte-identical** across repeated vector/font/raster builds and independent owned-scene renders |
| Production artifact comparison | **45/45 byte-identical**, frontend **3,910,261 bytes**, delta **0 bytes** |
| Boundary | Lobby graph excludes Phaser, original fonts, reference boards and Blender source; production files unchanged |
| Security | Repository pattern scanner passed; no local environment values read; no credentials/configuration included |

The initial unit test attempt was blocked by sandbox socket restrictions; the authorized local-socket rerun passed all tests. Blender likewise required normal local hardware access. Neither workaround accessed production. Raw Blender PNG metadata varies (render timing); Sharp strips it, and all generated runtime derivatives are byte-identical.

All optional vector files total **117,434 bytes**; all optional runtime derivatives total **315,968 bytes**. The actual separate lobby build graph is **467,398 bytes raw / 286,818 bytes gzip**, including React, CSS, fonts and its specimen assets. This is a build-graph measurement, not a claimed HTTP transfer or FPS benchmark. The game is a separate HTML entry and its unchanged Phaser chunk loads only after Play. The existing >500kB Phaser chunk warning remains unchanged in production; it is also present in the optional practice entry. No continuous animation loop is introduced in the lobby.

See `arcade-asset-validation.json`, `arcade-raster-validation.json`, `arcade-browser-validation.json`, `arcade-reproducibility.json`, `arcade-preview-bundle.json` and `arcade-production-comparison.json` for sizes, hashes and measurements.

## Limits and handoff

This is an isolated local prototype, not a live Discord lobby. Signed-in identity is an explicitly labeled fixture; real personal/guild data are not fetched. The game uses memory-only practice. Other browser engines and real Discord embedding were not exercised; in-app Chromium rendering was verified. The OS reduced-motion media rule was inspected; its equivalent Less motion override was exercised interactively. Latin font subsets rely on system fallback for other scripts. The owned mascot is the approved stylized 3D candidate, not the furry AI reference rendering. A 16px tag is a favicon fallback; use 24px or larger for recognizable standalone UI identity.

The remaining decision is **one consolidated creative approval of this brand system and lobby direction**, including small-size tag recognition. Automation establishes geometry, rendering, contrast and behavior, but cannot supply the owner's aesthetic acceptance. No repeated gameplay canary is needed. Integration into the production entry remains a separate future authorization.

Review locally at **http://127.0.0.1:5193/**. Reproduction and launch instructions are in `scripts/brand/README.md`. Main, production behavior, scoring, replay, sessions, databases, Discord, hosting and DNS remain unchanged.
