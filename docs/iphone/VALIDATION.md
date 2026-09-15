# iPhone readiness validation

Base: `fb8fa515f8113cbdad0e283cd72c5862d38c6883`. See [audit, official requirements, Portal findings and future canary](READINESS.md) and [reproduction commands](../../scripts/iphone/README.md).

## Project gates

The clean full run passed all **17 groups**. Before restoring the existing ignored host-render fixture, that one group failed; the failed result remains in `tmp/iphone/suites-before-host-fixture.json`. No tracked assets or dependencies were modified to resolve it.

| Gate | Result |
| --- | --- |
| Unit suite | 487 tests / 40 files passed, including 3 new interruption tests |
| Browser transport tooling | 12 tests / 3 files passed (also included in unit total) |
| Ephemeral PostgreSQL | 681 checks: sessions 74, personal results 107, guild 125, canary 16, attempts/replay 99, integration/backup 260 |
| Compiled production smoke | 219 assertions passed |
| Enabled Arcade compiled smoke | 219 assertions passed |
| TypeScript | Application, readiness fixture and lobby fixture passed |
| V004 atlas | 265 sprite records, coverage/bounds/alpha validated |
| Brand / raster / host assets | 104 / 56 / 25 checks passed |
| V004 GLB | 16 assertions; zero Khronos errors or warnings |
| Scope and build graph | 238 checks; protected runtime/assets unchanged and game remains deferred |
| Balance rules | Immutable ruleset digest passed |
| Security patterns | 638 source/artifact files passed in the final unstaged scan; no environment values read |

No dependency registry audit was performed. The inherited baseline is seven advisories (two moderate, five high), as documented by the accepted candidate; the earlier registry metadata transfer rejection was not bypassed. The existing large Phaser-chunk warning remains.

## Browser and reproducibility gates

Repeated ordinary and enabled builds are byte-for-byte reproducible. Comparison with the exact approved base confirms every server runtime file is unchanged (release metadata naturally reflects client hashes).

| Payload bucket | Base bytes | Candidate bytes | Raw delta | Gzip delta |
| --- | ---: | ---: | ---: | ---: |
| Initial | 366,869 | 368,596 | +1,727 | +327 |
| Deferred game/assets | 3,577,786 | 3,577,924 | +138 | +29 |
| Conditional SDK | 159,736 | 159,736 | 0 | 0 |
| Total | 4,104,391 | 4,106,256 | +1,865 | +356 |

These are deterministic file-bucket sums, not measured CDN transfers. No new runtime dependency or artwork is introduced. Mobile acceptance passed **8/8** cases: 320×568, 375×667, 390×844, 430×932, 844×390, 932×430, 1440×900, plus 390×844 at 3× device density. Fixtures use 20 or 59 px top insets, 21 or 34 px bottom insets, and 59 px landscape side insets. All checked controls are at least 44 CSS pixels and remain within the safe rectangle; focused skip navigation is safe too. Touch sliding/capture, multi-touch precedence, cancellation, no gesture-induced scrolling/zoom, paused rotation and post-navigation cleanup passed.

The 772 active frame samples measured median **16.7 ms**, p95 **17.6 ms**, maximum **19.9 ms**. Touch automation round trips ranged **25.9–39.5 ms** (upper median **32.5 ms**). These are desktop Chromium fixture measurements, not physical iPhone latency. Post-return JS heap snapshots ranged 9.8–21.8 MB; this is neither total process/GPU memory nor a leak proof. Scenes, game timers, intervals, frame callbacks, open audio contexts and canvases all returned to zero.

The separate **2/2 mobile interruption cases** passed pointer-up release, pagehide/freeze held-input clearing, frozen tick count, no automatic resume on pageshow/resume and zero canvases after exit. Desktop and iPhone context suites each passed **15 states, 5 settings viewports, 3 played runs and 15 dialog focus returns**, including official/practice results, leaderboard, help and error/recovery presentation.

The first broad browser batch lost its local CDP connection after 62 countdown captures; the following lifecycle startup did not reach countdown. The cause of the connection loss was not established. A fresh direct diagnostic completed normally. Those failed attempts are retained under `tmp/iphone/failed-browser-batch/`. The same failure repeated at the 32nd fixture navigation. Its isolated case passed. The countdown runner now bounds independent full-page navigation history with one browser per entry-path/audio bank; all original assertions and 40 cases/80 runs are retained. Repeated SPA navigation remains in the lifecycle soaks. Diagnostic capture was added to lifecycle failures without changing pass/fail behavior. The bounded matrix then failed `lobby/audio/gap-100.1` because an actual `visibilitychange` reported `hidden:true` during countdown. The application paused at zero ticks/zero accumulator. This is correct interruption behavior but does not satisfy the quiet-case precondition. No visibility assertion or deadline was weakened. The remaining 18 readiness jobs were executed with failures retained; the driver now continues after a failed job and still exits unsuccessfully if any job fails. **Acceptance remained blocked at that stage.**

Some initial browser jobs also lacked `tmp/audio-readiness`; the driver now creates its output directories, and those jobs were rerun. The host reported AC idle sleep of one minute and display sleep of ten minutes. This does not prove every failure cause. The complete rerun used a process-scoped `caffeinate -diu` assertion, with all visibility and timing assertions unchanged and no saved power-setting changes. All 18 readiness jobs passed. The shared context test also received the native dialog focus-restoration wait and both desktop/iPhone replays passed afterward. The strict combined report `tmp/iphone/final-gates.json` is **passed**; earlier failed reports remain preserved. All required gates were resolved before the release decision.

Final browser totals: **40 main countdown cases / 80 captures**, **128 captures including repeats**, 104 clean transitions, 80 discarded countdown gaps, 24 real-countdown-stall checks and 24 active-stall checks. All **16 lifecycle controls**, **32 audio scenarios**, **17 renderer scenarios**, **26 reconciliation checkpoints**, rapid cancellation and responsive checks passed. Both 24-attempt soaks passed with 20 cancellations/four accepted mock results each, zero unexpected resumes, peak one scene, and all game resources at zero. Listener counts returned to their initial four window/document listeners and one host subscription.

The corrected browser harness adds output-directory initialization, bounded full-page sessions, explicit dialog-focus synchronization, failure diagnostics and continuation through remaining jobs with a nonzero exit on failure. No safety assertion, visibility check, clock threshold or timeout was relaxed. A passing controlled rerun does not establish the cause of every earlier environment failure.

Raw evidence is local and ignored: `tmp/iphone/`, `tmp/countdown-correction/`, `tmp/audio-readiness/`, and `tmp/soft-launch/`. The browser driver preserves per-job failures and performs no automatic retries.

## Asset footprint

V004 artwork is unchanged. Four WebP atlases occupy 1,602,752 compressed file bytes. Their dimensions are 2048×906 (twice), 2048×1331 and 2048×940. One decoded RGBA copy of all four is 33,447,936 bytes (about 31.9 MiB), before browser/GPU copies, mipmaps or engine overhead. This is a calculated footprint, not measured iPhone resident memory. Asset readiness matrices must verify load/decode/first-frame ordering before countdown; no resolution or quality reduction is made in this slice.

## Changed-file scope

Runtime:

- `index.html`
- `src/main.tsx`
- `src/arcade/ArcadeApp.tsx`
- `src/styles/mobile.css`
- `src/games/balance/interruption.ts`

Tests, fixtures and documentation:

- `src/games/balance/mobileInterruption.test.ts`
- `scripts/lobby/harness/index.html`
- `scripts/readiness/candidate.html`
- `scripts/readiness/harness.tsx`
- `scripts/soft-launch/browser.mjs`
- `scripts/countdown/browser.mjs`
- `scripts/countdown/lifecycle.mjs`
- `scripts/countdown/validation-browser.mjs`
- `scripts/iphone/README.md`
- `scripts/iphone/artifacts.mjs`
- `scripts/iphone/browser-validation.mjs`
- `scripts/iphone/browser.mjs`
- `scripts/iphone/full-validation.mjs`
- `scripts/iphone/interruption-browser.mjs`
- `scripts/iphone/validate.mjs`
- `scripts/iphone/reports.mjs`
- `docs/iphone/READINESS.md`
- `docs/iphone/VALIDATION.md`

No server, shared replay/configuration, dependency manifest, artwork, database, permission or deployment configuration changes. The original working checkout is preserved; all changes are in the dedicated worktree.

Final static checks also passed all three TypeScript programs, syntax checks for 11 changed/new JavaScript scripts, whitespace checks and the 238-check protected-source/build-graph audit.

## Release decision

**PASS for repository commit/push and separately authorized deployment review.** This is simulated mobile readiness, not physical iPhone certification. The OS launch message remains unexplained by the current saved platform settings; all three platforms were already enabled. No Portal change is proposed. No merge, deployment or production access occurred.

The dedicated worktree is based on the approved candidate. The original checkout remains clean. No migration or rollback data transformation is needed; use the prior accepted immutable release if a separately authorized future deployment must be rolled back.
