# Soft-launch Phase 1 local validation

Base: 7fbc5f54730e719652a1f168ed815715dca00295. Use Node 24.20.0 and the existing pinned Sharp installation. No production credentials, service settings or Discord session are required.

1. `node scripts/soft-launch/validate-brand.mjs` regenerates exports twice and checks exact hashes/dimensions, small specimens and background center.
2. `node scripts/soft-launch/full-validation.mjs` runs the existing 16 automated/database/build/asset/security groups plus the CDP tooling regression group with the Phase 1 scope validator. Historical Release B's “only a gate may change” scope assertion is retained for that old release; this phase's validator explicitly permits reviewed UI files and compares all simulation/readiness/server/assets against accepted main.
3. `node scripts/soft-launch/artifacts.mjs` builds an archive of accepted main and the current candidate using identical public dummy metadata, repeats ordinary/enabled builds and compares server bytes plus initial/deferred payloads.
4. Build the direct and lobby countdown fixtures with the Vite configs in `scripts/countdown/`, serving them with `python3 scripts/countdown/serve.py` on loopback port 5231. Run `node scripts/soft-launch/browser.mjs` and `node scripts/countdown/browser.mjs`; preserve its 80-capture browser.json as matrix.json before other runners overwrite it.
5. Run `node scripts/countdown/validation-browser.mjs` for lifecycle controls, audio/renderer matrices, reconciliation, rapid cancellation, viewports, repeated soaks, countdown/active-stall repeats and headed controls. Keep every failure trace and distinguish actual visibility/active protection from a foreground-countdown defect. Do not hide unexpected pauses or weaken assertions.
6. Run `node scripts/countdown/reports.mjs` only against fresh outputs, then copy the resulting reports into `tmp/soft-launch/`.
7. `python3 scripts/soft-launch/serve.py` exposes the exact compiled root and a local-only review page at `http://127.0.0.1:5254/review.html`. It also exposes the compiled mock-Discord fixtures and upload package through explicit bounded roots. No API or private files are routed. `node scripts/soft-launch/capture.mjs` saves desktop/narrow screenshots to ignored temporary storage.

The new browser suite covers 15 context states, native dialog Escape/focus return, five viewports, touch targets, reduced motion, first-time/returning help, practice/official results and navigation. Native dialog close completion is asynchronous; focus is checked within one second at the required trigger, not weakened to any focused element. First-time help waits for the game start panel, not the lobby settings' similarly named help. Displayed copy checks account for the existing CSS uppercase styling.

Production diagnostics remain absent even with dev/tuning/owner query parameters. Local development retains read-only observation via `?dev`; tuning mutation controls are removed. No server-owner authorization or new secret is added.

The public-registry dependency audit was rejected by automatic approval review in this phase because it would transmit dependency metadata. Do not bypass it. Local source/artifact scanning and byte-identical dependency verification remain available; the accepted release's seven advisory findings remain the known baseline, not a freshly queried registry assessment.

The Chromium startup helper now waits for a complete valid port line, rather than file existence alone. The original lifecycle startup failure attempted HTTP port 80 before a page opened. Port parsing regressions cover empty/partial/invalid files; the original polling deadline and CDP command deadlines are unchanged.

Browser disposal now waits for the owned Chromium process to exit, with bounded TERM/KILL fallback, before removing its temporary profile. Both successful and failed startup paths close their CDP transport. Regression tests cover graceful exit, escalation and already-stopped processes. A pre-navigation Page.enable timeout is retained as infrastructure evidence; the command timeout is unchanged.

The disposable target tab is explicitly brought forward before navigation to establish the foreground fixture precondition. No visibility/focus API is mocked by this startup action, and later lifecycle events are still observed and asserted. Already-closed CDP sockets skip Browser.close, then use the same bounded process cleanup.
