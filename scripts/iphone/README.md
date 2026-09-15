# Local iPhone readiness validation

Base: fb8fa515f8113cbdad0e283cd72c5862d38c6883. Use pinned Node 24.20.0 and existing dependencies (including the mascot preview tools and brand Python environment). Never point these fixtures at production. The existing host-asset validator also requires the canonical ignored render fixtures `tmp/lobby-integration/host/{default,mischief,delighted}.png`; this audit copied them from the approved candidate checkout and verified exact repacking against the unchanged runtime WebPs.

Run sequentially to avoid CPU contention causing legitimate 100 ms active-frame interruptions:

1. `node scripts/iphone/full-validation.mjs` — 17 existing unit, PostgreSQL, build, smoke, static/security and asset groups; narrowly updated mobile scope validator. Historical release-specific validators stay intact.
2. `node scripts/iphone/artifacts.mjs` — exact candidate-base comparison, repeated ordinary/enabled builds and server-byte comparison.
3. Build direct/lobby fixtures and serve loopback using the commands in `scripts/countdown/README.md`.
4. `node scripts/iphone/browser.mjs` — eight viewport/touch/safe-area/rotation/cleanup fixtures (including a 3× density control), screenshots and frame samples. Optional width argument is diagnostic only; a single-width run is not the acceptance matrix.
5. `node scripts/iphone/interruption-browser.mjs` verifies pointer-up, pagehide/freeze pause, held-input clearing and no automatic resume. Then `node scripts/soft-launch/browser.mjs` then `node scripts/soft-launch/browser.mjs --iphone` — context, identity, help, reduced motion, dialog, results, leaderboard, navigation and error suites. iPhone mode starts and plays at 390×844; shared settings viewport coverage also includes desktop.
6. `node scripts/countdown/browser.mjs`; preserve `tmp/countdown-correction/browser.json` as `matrix.json` before continuing.
7. `node scripts/countdown/validation-browser.mjs` then `node scripts/countdown/reports.mjs` — all existing readiness, lifecycle and repeated soak gates. Any failure is retained and investigated; no automatic retry masks it.
The build/browser steps 3–7 can also be run sequentially with `node scripts/iphone/browser-validation.mjs` while the loopback server is running. Failures remain failures and all job results are retained.

8. `node scripts/iphone/reports.mjs` requires every completed output, including all 40 countdown cases/80 captures and 18 readiness jobs. Then `git diff --check` and inspect changed-file scope before commit.

The mobile test hides only the fixture's debug toolbar, injects four public CSS safe-area variables, and uses actual synthesized touch events for Start/game controls. It does not change document visibility, frame deadlines, scoring rules or runtime thresholds. Result/fixture navigation may use simulated mouse clicks; gameplay uses touch. Device emulation is Chromium, not a WebKit or physical iPhone certification.

The countdown matrix uses one disposable browser per entry-path/audio bank to bound independent full-page history. This follows two local connection failures at the 32nd navigation; the isolated case passed. No case or assertion was removed. The separate lifecycle soaks continue testing repeated in-app reuse. Lifecycle failures now retain phase, visibility and event diagnostics.

The readiness driver runs every job even after a failure and exits nonzero if any failed. This preserves coverage and does not turn failed jobs into acceptance.

On macOS, run the browser batch as `caffeinate -diu node scripts/iphone/browser-validation.mjs` to preserve the awake/foreground test precondition. These assertions end with the process; no saved power setting changes. This audit host reported AC idle sleep of one minute and display sleep of ten minutes. Actual hidden-page interruptions still fail uninterrupted scenarios; visibility is never mocked away.

For soft-launch integration, additionally run `node scripts/iphone/artifacts.mjs --accepted-main`. This uses accepted main `7fbc5f54730e719652a1f168ed815715dca00295` and writes `tmp/soft-launch-integration/artifacts.json`; it does not replace the default candidate-base report used by the existing acceptance aggregator. Both modes repeat ordinary/enabled builds and compare server runtime bytes.
