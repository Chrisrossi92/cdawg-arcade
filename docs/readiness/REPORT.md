# V004 renderer-readiness correction

**PASS WITH LIMITATIONS. Ready for review of a future release; not merged or deployed.**

## Scope and starting point

The clean, synchronized `main` at `758c926e9a733f0c83a904515c4654b2227e7728` was verified against the remote before creating `codex/fix-v004-renderer-readiness` in a separate worktree. That main differs from accepted production `b8f04949721f41fe1c87d50e9037581a2aa16197` only by acceptance documentation. The lobby checkout and branch remain untouched at `0df06aede788402238cfa1f263604767588dc849`.

## Implementation

- Start enters a branded preparation overlay at the final gameplay canvas dimensions. No official authorization, countdown or active clock begins during loading.
- `BalanceScene.preload()` loads all four unchanged V004 atlases. Scene creation follows Phaser decoding/texture registration. The scene draws V004 while simulation remains inactive, then requires two consecutive stable completed-render intervals before publishing readiness. Slow preparation restarts warm-up rather than evaluating gameplay interruption.
- One generation-scoped readiness latch authorizes exactly one start. Only after positive readiness does the existing official controller issue an attempt (or select practice), followed by the unchanged 2400 ms countdown. The existing SimulationClock initializes its baseline on the first active gameplay update.
- The prepared Phaser instance continues through countdown and play. The gameplay path no longer imports, constructs, or displays CdawgRig. V004 artwork, JSON metadata and WebP atlases are unchanged.
- Preparation has a 15-second deadline, initial try plus two retries, a fixed sanitized failure message, and Back. Back returns to the previous safe screen; it does not offer gameplay that bypasses failed preparation. Existing practice entry uses the same readiness path.
- A separate preparation clock preserves the previous completed result when Play Again is canceled. Cancellation, host-context replacement and unmount invalidate generations and clear the preparation timer. Repeated Start/Retry cannot create another active generation. An expired success is rejected even if a blocked main thread delayed the timeout callback.
- A renderer lease serializes Phaser creation through completed destruction, including result-to-Play-Again transitions. This also prevents canceled queued mounts from starting under Strict Mode. Owned Phaser visibility/focus listeners are removed on destruction; its unused audio system is disabled while the existing WebAudioManager continues providing game audio.
- No physics, input interruption rules, scoring, replay, official controller/client, session, database, dependency, environment or hosting code changed. In particular, control-button pointer cancellation retains its existing pause behavior; the diagnostic window-level cancellation probe exercised the separate clear-input handler.

## Before/after timeline

Times are milliseconds relative to each diagnostic document; compare ordering and durations rather than absolute timestamps across documents.

| Event | Accepted source, warm cache | Corrected final warm-cache sample |
|---|---:|---:|
| Start/preparation begins | 251.9 / no preparation | 325.8 / 325.9 |
| Renderer positively ready | No latch; V004 drawable at 2905.4 | 565.2 |
| Countdown starts | 252.5 | 566.6 |
| Countdown completes | 2675.8 | 2999.8 |
| First active clock call | 2778.1, before V004 readiness | 3031.5, after readiness/countdown |
| First character frame | Legacy | V004 |
| Startup interruption | 126.7 ms frame → pause at zero ticks | None |

The corrected sample spent about 239 ms preparing and then used a fresh zero-tick/zero-accumulator active clock. The final fresh-origin cold sample prepared in approximately 280 ms; HTTP transfer evidence distinguishes it from the subsequent warm run. Browser fixtures issued official attempts only after renderer readiness. The original failing event sequence is retained in `before-warm.json`.

## Validation

| Validation | Result |
|---|---|
| Unit/integration suite | 383 passed across 31 files, including 13 added readiness/lease/listener tests |
| Production smoke | 192 passed; compiled frontend/backend, dummy configuration only |
| Disposable PostgreSQL | 681 passed: sessions 74, personal results 107, guild boards 125, canary fixtures 16, attempts/replay 99, foundation/fallback/backup-restore 260 |
| V004 atlas validation | 265 records passed, including dimensions, phase/lean coverage and exact alpha gutters |
| Production repeatability | All 45 artifacts byte-for-byte identical under identical public dummy build inputs |
| Server isolation | All 36 compiled server files identical to main |
| Browser readiness matrix | 15 scenarios passed; no legacy frames or readiness-induced pauses |
| Additional layout/cleanup matrix | 4 scenarios passed; final fresh-origin cold/warm pair also passed |
| Harness TypeScript / production TypeScript | Passed |
| Boundary/security scan | 40 production text artifacts passed fixed credential/sentinel and diagnostic/lobby isolation checks; diff and evidence safety checks passed |

The counted test/atlas assertions total **1,521** (383 + 192 + 681 + 265). Browser scenarios and artifact comparisons are reported separately rather than added as equivalent unit assertions.

The browser matrix covers fresh-origin cold HTTP cache, warm cache, ordinary practice, verified simulated Activity context, initially unfocused iframe, narrow/reduced motion, 100/250/1000/5000 ms preparation stalls, 5000 ms asynchronous image-processing delay, missing images, 15-second timeout, repeated Retry, canceled delayed completion, and five consecutive official-fixture runs using Play Again. Every normal submitted fixture retained the canonical 42-tick result and zero interruptions. The intentionally injected 250 ms **active-game** stall produced an interruption, followed by a resumed 42-tick practice submission with interruption count one. No actual official production attempts were issued.

A separate ordinary-browser check used the actual compiled frontend without diagnostic instrumentation and completed a 0.7-second practice result. Warm Play Again and audio controls were also exercised.

At 375×667, the gameplay canvas measured 357×199; both control buttons were 44 px high with their bottom at 659 px, within the viewport. Desktop 1280×720 used a 974×343 canvas and controls ending at 708 px. No sampled horizontal overflow occurred. After failed preparation and Back, there were zero canvases and two application interruption listeners; after one completed run and after five repeated runs, there was one decorative result canvas and five application/renderer interruption listeners, with no cumulative growth.

Instrumentation is isolated in `scripts/readiness`, uses fixed events and safe timing/state values, and is absent from the production bundle. No tokens, real identities, query URLs, credentials or backend details are recorded.

## Bundle, assets and performance

- Frontend: **3,956,420 bytes**, versus main **3,955,937**: **+483 bytes** (~0.012%).
- Combined per-file JS gzip at identical compression settings: **656,537 bytes**, versus **656,473**: **+64 bytes**.
- Four V004 atlases remain **1,602,752 bytes**, with all accepted SHA-256 values unchanged (see `validation.json`). No new artwork or atlas generation.
- First active frame initializes with zero ticks/accumulator. Renderer preparation is paid before the countdown, not hidden by weakening the clock guard.
- Local instrumented samples: desktop final warm sample 21 active intervals, p95 ~36.6 ms/max 39 ms; narrow 22 intervals, p95 ~37.9 ms/max ~38.5 ms. These short samples reflect the tested host/browser pacing and are not a 60 fps/device certification. No active gap exceeded 100 ms except the deliberately injected interruption case.

## Reproduction

Use pinned Node 24.20.0 and the existing dependency lockfile. Standard validation remains `npm test`, `npm run test:production`, and `npm run test:database` (owned disposable PostgreSQL only). The database runner needs Docker on PATH when the installed libpq distribution lacks the PostgreSQL server executable.

For the isolated browser harness:

1. `node node_modules/typescript/bin/tsc -p scripts/readiness/tsconfig.json`
2. `node node_modules/vite/bin/vite.js build --config scripts/readiness/vite.config.ts`
3. `python3 scripts/readiness/serve.py`
4. Open loopback port 5206 and run the readiness matrix. `?subset=1` selects the additional layout/cleanup cases. Evidence is written only to ignored `tmp/readiness/browser.json`.
5. `node scripts/readiness/validate.mjs` checks the retained full matrix, immutable assets, protected source boundaries, and compiled artifact safety.

The baseline comparison checkout must remain outside this repository's test discovery. Early validation attempts exposed sandbox listener restrictions, a missing Docker PATH entry, premature harness activation before the initial host effect, and accidental baseline-test discovery. These were corrected; duplicate tests and failed environment/harness invocations are not counted as passing product tests.

## Pre-merge and rollback recommendation

Proceed to separately authorized pre-merge/release review of this focused branch. Preserve the paused lobby branch; reconcile its integration with this correction only when that work is resumed. No additional creative or routine user review is needed for this implementation phase. Native Discord acceptance belongs to a future explicitly authorized release, if required.

There is no production rollback to execute now because production was not changed. For a later deployment, retain and verify the exact accepted V004 provider artifact before release; the repository records `b8f0494` / `dep-dahv5euk1f9s73feiat0`. Reverting to it restores the known accepted artifact **but also restores the diagnosed readiness defect**. Provider retention and configuration compatibility must be verified at release time. A separately authorized rollback should follow the existing release runbook, preserve database contents, and never improvise settings or force-reset history.

## Limits

No live Discord process, physical-device certification, production writes, fresh production database audit, or provider-log inspection is claimed. The simulated Activity supplies the application's verified context and a local mock API; it is not real Discord authentication. The security scan is bounded pattern/artifact inspection, not a new dependency audit or penetration test. Existing dependency advisories and the large Phaser bundle warning were not changed by this focused correction.
