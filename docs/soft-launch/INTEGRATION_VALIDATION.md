# Soft-launch integration validation — 2026-09-15

## Scope and source state

Dedicated branch: `codex/soft-launch-integration`, based on independently verified accepted main `7fbc5f54730e719652a1f168ed815715dca00295`. Accepted deployment reference `dep-dak230uq1p3s73cb18l0` is owner-provided; production was not accessed.

Before integration, GitHub branch `codex/iphone-readiness-audit`, its local branch, and upstream all matched `8f83b0c08d301ca5899697c56ca743aa262b9a3d`; its worktree/index were clean. Soft-launch branch matched `fb8fa515f8113cbdad0e283cd72c5862d38c6883`.

Normal no-fast-forward merges preserve both histories: `7843300` merges soft-launch into accepted main, and `49739f4` merges iPhone readiness. No conflicts occurred and no manual resolutions were needed. The merged tree was identical to the reviewed iPhone commit. Integration-specific edits include documentation, a test-only accepted-main baseline option, expanded-help regression coverage, and one home-screen CSS declaration described below.

Preserved: compact identity/settings, contextual authentication recovery, first-time help, friendly results, canonical branding, channel drafts, safe areas/viewport, interruption/input cleanup, desktop/pop-out/narrow/reduced motion, renderer/audio/countdown readiness, 100 ms active protection, official scoring/replay/sessions/database, V004 assets, dependencies, hosting configuration, and feature flags.

## Owner-attested completion

The owner confirms the channel exists and its welcome is posted/pinned. Native Discord iPhone launch succeeds after correction/confirmation in Activities settings. Platform-access certification passes; prior OS-error diagnosis is closed. No further iPhone test is requested during preparation. This is not a claim of complete physical gameplay/audio/accessibility certification. No Portal or production inspection occurred during this integration.

Feedback thread remains pending. Application invitation icon remains pending unless independently verified. Broader announcement is intentionally pending. Live-audience functionality remains deferred. See PHASE_1_CHECKLIST.md and ROLLOUT_PLAN.md.

## Reproduction

Use pinned Node 24.20.0 and existing dependency installations. Run the commands in scripts/iphone/README.md sequentially, then run `node scripts/iphone/artifacts.mjs --accepted-main` for the exact production baseline. The default baseline remains the reviewed soft-launch candidate for historical compatibility. Browser testing uses loopback-only fixtures, synthetic identities, mocked official transport, disposable Chromium instances, and process-scoped `caffeinate -diu`; no saved power settings change. PostgreSQL tests create and remove their own local database.

## Attempt history and limitations

The first sandboxed batch could not bind local test listeners (EPERM); preserved under `tmp/integration-sandbox-attempt`. An authorized local run passed all groups except one guild-route test reporting `socket hang up`. The isolated unchanged guild file passed all 20 tests, then the complete unchanged unit suite passed all 487 tests in 40 files. The failure, isolated result, full rerun, and original group summary are retained. No test assertion, timeout, runtime protection, or application code was weakened. Exact socket-failure cause is unproven.

Existing large Phaser chunk warning remains. Local source/artifact security scanning does not refresh the inherited dependency advisory inventory (seven advisories: two moderate, five high). Prior automatic review blocked the registry audit; this preparation does not bypass that restriction. Resolve this assessment before broader exposure. Chromium simulations do not certify native WebKit rendering, audio hardware, OS overlays, thermal behavior, or VoiceOver. Owner-confirmed native platform access is separately recorded.

## Results

The complete initial combined batch passed. The complete 17-group project suite passed again after the correction (487/487 tests across 40 files, 681 disposable PostgreSQL checks). Post-correction expanded-help/mobile, interruption, both context suites, and responsive checks are recorded in INTEGRATION_RESULTS.json.

| Validation | Result |
|---|---|
| Unit/integration | 487 tests / 40 files; all passed on final full run |
| Disposable PostgreSQL | 681 checks: 74 sessions + 107 personal + 125 guild + 16 canary + 99 attempts/replay + 260 integration/backup |
| Builds and smoke | Ordinary and enabled modes; 219 assertions each; repeat builds byte-identical |
| TypeScript | Application/server/shared build plus readiness and lobby fixture programs passed |
| Assets/scope | 265 atlas records, brand 104, raster 56, host 25, GLB 16; 238 protected-scope/build-graph checks; ruleset digest intact |
| Mobile | Eight viewports including portrait, landscape, 3× density; eight expanded-help assertions; safe areas, touch/multi-touch/sliding/cancel and cleanup |
| Context/accessibility | Two suites, each 15 states, five settings sizes, three result/navigation runs, 15 focus returns; desktop/pop-out/narrow, reduced motion and no normal-player diagnostics |
| Full countdown/readiness batch | 40 main cases / 80 captures; 128 total captures with repeats; 104 clean transitions; 80 discarded countdown gaps; 24 real countdown stalls + 24 active stalls |
| Lifecycle/audio/renderer | 16 lifecycle controls, 32 audio scenarios, 17 renderer scenarios, 26 reconciliation checkpoints; all 18 jobs passed |
| Soaks | Two passes; each 24 attempts (20 cancels + four accepted mock runs), plus repeated no-start navigation; peak one scene; scenes/timers/intervals/frames/audio/canvases zero at return; listeners at baseline; zero unexpected resumes |
| Post-correction scope | One home-only CSS rule; no gameplay/server/asset/config/dependency changes; all affected browser checks refreshed |

The 12 CDP tooling tests are included in the 487 total, not additional unit tests. All official submissions in browser fixtures are mocked; no real player score or production database was touched. The full readiness batch predates the home-only CSS correction; the affected layout/navigation and full project checks were rerun afterward. Detailed phase provenance is retained rather than claiming every unchanged matrix was run twice.

## Exact payload against accepted production

| Group | Accepted raw bytes | Candidate raw bytes | Raw change | Gzip change |
|---|---:|---:|---:|---:|
| Initial | 359,812 | 368,664 | +8,852 | +2,802 |
| Deferred Balance/assets | 3,579,429 | 3,577,924 | −1,505 | −239 |
| Conditional SDK | 159,736 | 159,736 | 0 | 0 |
| Total | 4,098,977 | 4,106,324 | +7,347 | +2,563 |

Both baseline comparisons passed byte-identical repeat builds (ordinary and enabled modes); all server runtime hashes match accepted production except release metadata identifying client artifacts. Asset inventories retain exact SHA-256 hashes in the local artifacts reports. Compression totals sum per-file gzip; they are not a measured native-device download trace.

## Integration-only file inventory

- `docs/iphone/READINESS.md`: superseding owner platform-access confirmation.
- `docs/soft-launch/PHASE_1_CHECKLIST.md`: channel, welcome, iPhone, and pending-item state.
- `docs/soft-launch/ROLLOUT_PLAN.md`: current bounded rollout sequence; no duplicate welcome/channel or iPhone retest.
- `docs/soft-launch/destination.json`: owner-attested welcome/channel state; unknown message/thread IDs remain null.
- `docs/soft-launch/INTEGRATION_ARTIFACTS.json`: exact accepted-main/candidate hashes and payload inventory.
- `docs/soft-launch/INTEGRATION_VALIDATION.md`: combined report and limitations.
- `scripts/iphone/README.md`: accepted-main comparison command.
- `scripts/iphone/artifacts.mjs`: explicit accepted-main baseline option and separate output directory; default behavior preserved.

The two normal merge commits additionally carry the previously reviewed feature files unchanged. No merge resolutions were needed. One inherited home-screen layout defect was corrected after visual review, without changing gameplay or server behavior. Original feature worktrees are preserved.

## Fresh simulated-mobile performance

After the correction, across eight fixtures: 507 sampled active frame intervals, median 33.4 ms, p95 34.4 ms, maximum 39.9 ms. Synthesized touch automation round trips ranged 51.41–66.00 ms; these are not physical input-to-photon measurements. Every fixture returned scene/timer/interval/frame/audio/canvas counters to zero. The initial integration capture was also about 33.3 ms median, slower than the earlier audit capture (16.7 ms median) despite initially byte-identical runtime; the cause was not isolated and this result must not be presented as a device benchmark or proof of a performance improvement. The active 100 ms protection was unchanged and no unexpected pause occurred in these fixtures.

## Visual finding and bounded correction

At 320×568 with first-time help expanded, the inherited cabinet aspect ratio kept its height at 240 px while the help/start panel grew to 370.66 px. The panel ended at y=600.66 while the inactive controls began at y=481, visibly overlapping. Start remained hittable after scrolling, but this was not accepted as a clean layout.

A single rule in `src/styles/mobile.css` sets `aspect-ratio: auto` only for `.balance-v1-shell.phase-home .balance-stage`. The cabinet now grows to 372.66 px and the controls begin at y=613.66, below the panel. Start remains hittable; the explicit no-overlap diagnostic passed and its screenshot was visually reviewed. Playing, countdown, results, and all gameplay/server logic are untouched.

`scripts/iphone/browser.mjs` now resets the help-seen marker for every viewport and asserts expanded help is open and its panel ends before the controls. This prevents the earlier matrix from checking expanded help only on its first viewport. Pre-correction passing browser evidence is preserved under `tmp/integration-before-help-correction`; the complete original countdown/readiness outputs remain intact. After the correction, builds, payload inventories, the full project groups, all eight mobile fixtures, interruption checks, both context suites, and responsive checks are refreshed. The already passing full renderer/audio/countdown/reconciliation/soak batch is retained for unchanged logic; it is not misrepresented as rerun after a home-only CSS change.

Additional integration files: `src/styles/mobile.css` (home-only layout correction), `scripts/iphone/browser.mjs` (eight expanded-help regressions), and `docs/soft-launch/INTEGRATION_RESULTS.json` (final combined evidence summary).

## Review stopping point and rollback

Candidate only: no main merge, deployment, Portal action, thread/message creation, or production access. Original feature worktrees remain clean. Recommended next steps are review, disposition of the inherited advisory assessment, separately authorized normal main merge/exact-SHA rollout with health gates, pending artwork/feedback actions, then announcement last. Accepted Release B remains the rollback reference; verify its availability and configuration at rollout. No schema migration is introduced. See ROLLOUT_PLAN.md for the bounded sequence.

Final security pattern scans passed for 641 source/artifact files and 652 entries including the eleven staged files. Changed script syntax and Git whitespace checks passed. No environment-file values were read. This is local secret/boundary scanning, not a fresh package-registry advisory audit.

## Dependency assessment follow-up — 2026-09-15

The explicitly authorized, names/versions-only npm assessment of exact candidate bf071dffda0c1406ad8d1ae1b838e18a5b3f20eb is complete. See DEPENDENCY_ADVISORY_ASSESSMENT.md and DEPENDENCY_ADVISORY_EVIDENCE.json: 11 distinct findings, ten represented in the pruned tree, zero public vulnerable paths and no blocker under the owner’s standard. Documentation-only follow-up; the earlier full integration validation above is not misrepresented as rerun. Dependencies, runtime files, main and production are unchanged.
