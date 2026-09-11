# Arcade lobby integration — disabled release candidate

## Scope and starting point

Phase 1 connects the approved lobby to the existing Activity architecture. Starting main was clean and synchronized at `758c926e9a733f0c83a904515c4654b2227e7728`. Work stays on `codex/arcade-lobby-integration`; no merge, PR, deployment, production database inspection/write, environment change or service configuration change is part of this phase. The accepted deployed V004 application remains `b8f04949721f41fe1c87d50e9037581a2aa16197`.

The enabled candidate uses `createHostAdapter`, `LocalScoreRepository`, `OfficialController` and `OfficialClient`. It contains no sample identities or fake scores. Isolated fixtures live exclusively under `scripts/lobby/harness`; neither application entry imports them.

## Gate and builds

`config/lobby-release.ts` contains the public, non-secret `lobbyReleased = false`. The ordinary Vite/production build uses `src/main.tsx` and opens Balance directly. Only the explicit `lobby-integration` mode selects `src/arcade/main.tsx`. HTML entry selection runs before Vite resolves imports. A URL, hash or query cannot change this compile-time choice. Existing server routing is unchanged; it cannot deliver an excluded lobby module.

Use the pinned Node version in `package.json`, installed dependencies, and repository-root commands:

```sh
npm test
npm run test:production
npm run test:database
npm run build:lobby
npm run preview:lobby
node scripts/lobby/validate-build.mjs
node scripts/lobby/repeat-builds.mjs
node scripts/scan-production.mjs
```

The local integrated candidate is `http://127.0.0.1:5195/`. The dedicated build script uses an explicit allowlist of public dummy inputs and never reads dotenv files. Its dummy client ID is for local validation, not a live Discord launch. Production builds continue to receive their existing public configuration through the unchanged production builder. No additional environment variable is introduced. The ordinary development command is unchanged.

The gate auditor checks actual Rollup module graphs in both modes, output strings/files, unchanged server and V004 assets, and the dynamic game boundary. Baseline hashes are committed in `lobby-baseline.json`. Repeatability compares every file in `dist`, `build`, and the enabled output under the same dummy inputs. These scripts write only local build/evidence files.

## One Activity lifecycle

`ArcadeRuntime` owns one host adapter, official controller and score repository. The root subscribes once and authenticates once on an eligible Discord launch. The game receives that same controller; its existing standalone connection effect is bypassed only inside the enabled integration. The ordinary entry retains its lifecycle.

Navigation uses a small History adapter rather than a router dependency. History state stores only `lobby` or `balance`; pathname and launch query are preserved. Back/forward is tested. Internal section anchors do not carry identity or authorization. Identity/session loss clears official data and returns to the lobby. The original Discord adapter still owns transport cleanup and bounded authentication.

Entering Balance lazily mounts one existing game. Leaving an active/countdown run invokes the existing interruption and cancellation path once. Navigation is blocked during preparation, checking and unconfirmed submission, keeping recovery controls reachable. Results retain Play Again, personal results/leaderboard controls and add Back to Arcade. Returning after acceptance refreshes summaries without reauthenticating; a guarded refresh avoids overlapping lobby reads. Accepted-best celebration is consumed once per accepted attempt.

Music and SFX preferences persist across enabled-mode game mounts; the lobby is silent. Game unmount closes its audio context and delayed tones. Less motion persists locally and combines with the operating-system preference; the same setting reaches gameplay sprites. Decorative transitions are removed while status text stays readable.

## Renderer cleanup

The installed Phaser 3.90.0 `VisibilityHandler` installs a document closure that `Game.runDestroy` does not remove. A repeated-game browser soak found one retained listener per gameplay/result renderer. The enabled-only managed renderer wraps the synchronous `Game.start` installation, restores existing window property handlers, owns equivalent focus/visibility listeners and releases them on Phaser's destroy event. It calls the upstream start/loop unchanged and restores the document method in `finally`, including failed starts. It does not change clock, pause or visibility semantics.

The managed renderer disables Phaser's unused audio manager; the game's existing WebAudio cues remain the sole audio owner. Standalone production still selects the original renderer. The bundle auditor confirms the enabled lifecycle helper does not bring lobby code into production. Re-run the lifecycle soak when updating Phaser; this compatibility adapter is intentionally tied to the installed implementation, not a fork of its game loop.

The enabled wrapper reserves a grid row for its toolbar during countdown/play. The remaining viewport belongs to the existing game grid. Results and leaderboard remain content-height screens. Audio labels and buttons have at least 44px targets in the enabled UI.

## Data and authorization

| Presentation | Existing source / boundary |
| --- | --- |
| Discord name | Authenticated host context; verified sessions provide the established player name. No query-derived identity. |
| Avatar | Omitted: the established session context currently supplies ID/name without an avatar. No arbitrary remote avatar URL is introduced. |
| Official eligibility | Existing `/api/me`, including exact player/guild match and existing availability. |
| Official best | Existing `/api/me/balance/stats`; authoritative ticks displayed at 60 Hz. |
| Guild summary | Existing `/api/guild/balance/leaderboard`; top three plus own rank when supplied. Existing server guild restriction remains authoritative. |
| Practice | `Local Player`, existing browser-local best, explicit local-only labels; no official reads. |
| Submission | Exclusively the existing game/controller attempt and replay flow; the lobby never issues or submits an attempt. |

Official data is rendered only for verified, eligible contexts. Switching to practice clears it; stale stats cannot be displayed as practice results. Empty, loading, unavailable, other-server and sanitized authentication errors have explicit states. Errors offer retry or practice. The original network clients enforce their existing 10-second timeout, same-origin credentials and `no-store`; existing authentication has its bounded cancellation/retry path. Lazy game loading has a 10-second bound and safe Back/Reload recovery. No backend, API authorization, cookies, CORS, caching, limiter, database schema, permissions, scoring or replay changes were made.

The reusable card supports official, practice, loading, error, unavailable and coming-soon states. Exactly two future cards are titled `COMING SOON`, with disabled native buttons. No games, dates or example records are invented.

## Host and loading

Three static expressions are rendered from the owned, unchanged corrected V004 Blender model using a fixed camera, lighting, seed and render settings. One union crop is applied to every expression, preventing size changes during crossfades. Their combined WebP size is 62,314 bytes. Default and mischief load for the initial host; delighted is requested only when shown for a new accepted best. There is one brief alternate, a throttled attention cue and one short success reaction, not a perpetual animation loop. The card uses the approved vector Notched Tag rather than a duplicate mascot.

The enabled entry owns lobby code, two subset fonts and small brand assets. Phaser, Balance, gameplay stylesheet and V004 atlases are behind the game dynamic import. The existing game warm-up behavior starts after selection; no gameplay atlas blocks initial lobby interaction. The SDK remains a separate dynamic import, initialized only through the existing valid-launch-context checks.

See `lobby-build-validation.json`, `lobby-repeatability.json`, `lobby-host-assets.json`, `lobby-host-validation.json` and the validation report for exact bytes, hashes and measurements.

## Automated browser tooling

```sh
node node_modules/typescript/bin/tsc -p scripts/lobby/harness/tsconfig.json
node node_modules/vite/bin/vite.js build --config scripts/lobby/harness/vite.config.mjs
node node_modules/vite/bin/vite.js preview --config scripts/lobby/harness/vite.config.mjs --host 127.0.0.1 --port 5196
```

The harness's explicit fixture selector covers practice, official, empty, restricted, unavailable and error states. Its transport returns deterministic existing API response shapes and sends no network requests. The real controller, React game, deterministic simulation, Phaser sprites and cleanup run normally. The soak button uses application controls for 20 canceled countdowns, four completed runs (including Play Again), and 30 further lobby/game round trips. A paused run is resumed and must remain practice. Counters expose duplicate attempts/submissions, subscriptions, canvases, audio, timers, animation frames, heap samples and page errors as visible test output.

`responsive.html` embeds a real application entry in same-origin iframe viewports at 1280×900, 800×600, 390×844 and 375×667. It reports actual child viewport dimensions, scroll bounds, loaded images, touch targets and navigation/motion state. This avoids relying on the desktop panel's physical size; it is CSS/browser viewport testing, not native Discord pop-out certification. Test controls are not part of either production or integrated candidate artifacts.

Host render/packing checks require the already approved Blender, Sharp tooling and generated PNGs:

```sh
blender --background --python scripts/lobby/render-host.py
node scripts/lobby/pack-host.mjs
node scripts/lobby/validate-assets.mjs
```

## Next release and rollback

The next phase requires review of this complete integrated flow. There is no additional mascot or Discord canary during this disabled phase. A future separately approved release should change only `lobbyReleased` to true, run both gate expectations intentionally updated for release, rebuild reproducibly, validate exact source and follow the controlled release runbook. No dashboard gate or environment secret is needed.

To keep the lobby disabled, retain false and use the ordinary production build. To undo a future lobby release, follow the accepted V004 release/rollback plan and deploy the previously accepted artifact under that release's authorization; do not change database/configuration state. Before any future deployment verify retained artifact availability and the then-current accepted release. The documented current accepted V004 source is `b8f0494` and artifact `dep-dahv5euk1f9s73feiat0`; this phase has not inspected or altered Render retention/settings. A source rollback uses a normal reviewed revert/gate change, never force-push or database rollback.

Known limits: local fixtures are not a new live Discord integration certification; network/device performance is a local sample; browser heap values are approximate and include retained module caches. Existing dependency advisories and the large Phaser chunk remain separately scoped maintenance. A cold or background-stalled frame can trigger the existing protective pause and practice classification, which this phase preserves and tests.
