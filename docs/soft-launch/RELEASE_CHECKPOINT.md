# Soft-launch release checkpoint — 2026-09-15

**Intended stopping point. Release blocked; no deployment or remote-main push.** This handoff supersedes older readiness/checklist statements suggesting all release gates are complete. It preserves verified summaries only, not sensitive temporary evidence.

## Exact history and production checkpoint

- Checkpoint branch: `codex/soft-launch-release-checkpoint`; its first new commit adds only this document to the merge below. Resolve the checkpoint tip with `git rev-parse origin/codex/soft-launch-release-checkpoint`.
- Local merge/main: `1fc73aa740423770791ece2774fba6bfd68d0e28`.
- Merge first parent / accepted remote main: `7fbc5f54730e719652a1f168ed815715dca00295`.
- Merge second parent / approved candidate: `84d0ee38d9d744862de0d8b3db2f159c819b713d`, branch `codex/soft-launch-integration`.
- Candidate source before documentation-only advisory assessment: `bf071dffda0c1406ad8d1ae1b838e18a5b3f20eb`.
- Merge source tree exactly equals the approved candidate tree. Local main remains nine commits ahead of remote; do not reset or rewrite it.
- Accepted production source: `7fbc5f54730e719652a1f168ed815715dca00295`; Render deployment and rollback target: `dep-dak230uq1p3s73cb18l0`.
- Last verified Render automatic deployment: **Off**. No subsequent deployment, configuration change or remote-main push occurred. Preservation uses this existing read-only confirmation; it does not claim a new production inspection.

## Completed fresh validation of the local merge

| Gate | Completed result |
|---|---|
| Project automation | All 17 groups passed; 487 unit tests in 40 files, CDP tooling tests, application/readiness/lobby type checks |
| Ephemeral PostgreSQL | 681 checks: sessions 74, personal results 107, guild results 125, synthetic canary 16, attempts/replay 99, foundation/fallback/backup-restore 260 |
| Builds/smoke | Ordinary and enabled fixture builds; 219 compiled smoke assertions per mode |
| Reproducibility | Repeated ordinary/enabled comparison builds identical; exact merge production build reproduced twice; compiled backend unchanged apart from release metadata |
| Protected assets/scope | V004 atlas 265, brand 104, raster 56, lobby host 25, GLB 16, protected-scope 238 checks; immutable Balance rules verified |
| Portal package | All 12 approved PNG exports matched their recorded SHA-256, dimensions and PNG format; no regeneration/upload |
| Mobile/layout | Eight fixtures including portrait/landscape, 320px through desktop, safe areas and DPR3; expanded help overlap regression, settings focus, touch controls and return cleanup passed |
| Mobile interruption | Pagehide and freeze cases passed; input cleared, no automatic resume, canvas removed on return |
| Player surfaces/accessibility | Desktop and narrow contextual suites passed: 15 states, five viewport configurations, three runs and 15 focus returns each; bounded keyboard/labels/reduced-motion checks, not full WCAG certification |
| Countdown/readiness | 40 cases / 80 Start and Play Again captures across direct/lobby, audio/muted; readiness before issuance/countdown; clean zero-tick/empty-accumulator starts; countdown gaps discarded; active stalls retain 100 ms protection |
| Audio | All 32 scenarios passed; this already-running matrix finished normally after further gate scheduling was stopped |
| Lifecycle | 15 controls passed; control 16 failed as detailed below |
| Security | Pattern scan passed on 643 files, including a repeat after exact build; no dependency or manifest/lockfile changes |
| Read-only production baseline | Both origins passed 53 probes each: TLS, health/readiness, accepted hashes, authentication/session rejection, CORS and static boundaries. All 23 accepted traces replayed exactly; zero personal/guild/record/event projection mismatches. Aggregate table counts and permission/configuration fingerprints recorded locally; role boundaries verified; logs showed sanitized startup/drain events. No production writes |

The owned disposable browsers closed normally; no test-browser processes remained. Test runners and the owned loopback server were stopped. Host conditions were recorded locally; a sample showed load averages 4.95/4.91/5.04 and zero throttled memory pages. Browser testing used temporary sleep prevention without altering saved system settings. These observations do not establish the cause of the failed lifecycle accounting.

## Required blocker: muted Play Again → identity loss

Fixture: lobby, explicitly muted, Play Again, identity loss during countdown. Assertion: `scripts/countdown/lifecycle.mjs:31`, comparing `initialScenes + SCENE_CREATE` against `SCENE_DESTROY`; **2 versus 1**. This is not a previously accepted blur or active-frame protection event.

Second-run timeline, milliseconds from fixture navigation:

| Event | ms |
|---|---:|
| Start activation | 4422.0 |
| Scene creation | 4589.9 |
| Renderer/composite readiness | 4607.0 |
| Attempt issuance | 4607.0 |
| Countdown start | 4608.0 |
| Countdown frame baseline | 4624.3 |
| Identity-loss official interruption | 4700.8 |
| Scene destruction | 4707.2 |

**Proven:** the second-run log contains one creation, one destruction, one issuance and one official interruption. Canvas count returned to zero. No active simulation start or submission occurred; final ticks and accumulator were both zero. The test retained an initial scene count of one, producing the accounting mismatch.

**Unproven:** whether an old scene remained undisposed or a destruction event fell between the separate asynchronous baseline read and event-log reset at lines 16–17. That interval is not preserved in the failed capture. Neither a real scene leak nor a diagnostic race is established. Do not weaken the assertion, infer cleanup solely from canvas removal, suppress pauses, or rerun until a pass and discard the failure.

Recommended next diagnostic scope: retain one continuous event log with stable scene IDs across the first result, baseline capture, Play Again and identity loss. Measure actual scenes, listeners, timers, animation frames, audio resources and pending CDP requests after cleanup. Reproduce the accounting window deterministically and distinguish lost diagnostic events from an undisposed scene. Any tooling correction needs regression coverage; any application correction requires separate review. No diagnosis or correction was performed during checkpoint preservation.

## Exact payload

Exact merge build, in bytes (public production build configuration; values themselves are not copied here):

| Group | Raw | Gzip | Brotli |
|---|---:|---:|---:|
| Initial lobby | 368665 | 176956 | 165689 |
| Deferred Balance/game | 3577924 | 2144441 | 2056131 |
| Conditional Discord SDK | 159736 | 48353 | 41554 |
| Total | 4106325 | 2369750 | 2263374 |

Separate like-for-like comparison builds versus accepted production: initial gzip +2,802 bytes, deferred −239, conditional unchanged, total +2,563. Their absolute gzip values were 176,937 / 2,144,442 / 48,353 / 2,369,732 respectively. Do not conflate comparison-build metadata with the exact merge artifact. Balance remains deferred. Public artifact hashes existed in the local exact-build report; regenerate and verify them for any eventual deployment SHA, including a documentation-only successor.

## Accepted dependency assessment

See `DEPENDENCY_ADVISORY_ASSESSMENT.md` and sanitized `DEPENDENCY_ADVISORY_EVIDENCE.json`: 11 distinct advisories (6 high, 5 moderate, 0 critical), 10 represented after production pruning, **0 publicly reachable vulnerable paths**, and no required prelaunch remediation under the reviewed controls. Pruning does not remove all findings. Acceptance is based on path reachability and controls, not inheritance. Post-launch isolated dependency maintenance/pruning cleanup remains required as documented. Do not upgrade packages or modify manifests/lockfiles as part of release recovery.

## Remaining gates and rollout boundaries

Resolve and pass the lifecycle gate with fresh evidence, then complete renderer (17 scenarios), reconciliation (26 checkpoints), rapid cancellation, responsive coverage, both navigation/cancellation soaks, quiet/countdown-stall/active-stall repeats, headed/suspended-audio coverage, aggregation and final acceptance. Verify resource baselines, exact compiled browser flows, final artifact hashes and release-specific security checks. Refresh any affected earlier checks after changes. Only after all gates pass may a separately resumed controlled exact-SHA release proceed with postdeployment health, assets, UI/layout/readiness, authentication/CORS/static boundaries, read-only replay/projection/count/permission checks and sanitized logs.

**Older passing reports must never be treated as fresh acceptance.** Existing JSON files may be stale because the stopped runners did not overwrite later reports. Tie each result to the tested source and fixture builds, preserve failures, and record which jobs actually ran. The current merge is not accepted for deployment.

Rollback compatibility: accepted artifact `dep-dak230uq1p3s73cb18l0` uses unchanged backend/schema/dependencies/configuration; rollback requires no database migration or writes. Reverify artifact availability before any future deployment. No rollback was needed here.

Historical unexplained stalls (including 637 ms), the historical CDP timeout, correctly protected active gaps and limited hardware/browser sampling remain limitations. A correctly handled active gap is not itself a release failure. No routine repeat native iPhone test is requested; owner platform-access certification remains accepted.

## Discord and soft-launch status

- Creative review approved: canonical icon family, Activity cover/background, compact settings/identity, first-time help and copy.
- Permanent destination: **#cdawg-arcade**, channel ID `1549149791915737129`, Community. Channel and pinned welcome already exist by owner confirmation; do not duplicate them.
- Application invitation icon remains unverified/pending. Approved package and exact filenames are in `PORTAL_UPLOAD_PLAN.md`; this checkpoint grants no artwork upload authority. Bot avatar and Activity cover/background are prepared; no completed upload is asserted.
- Fresh invitation artwork verification remains pending after separately authorized Portal work; allow normal caching.
- Feedback & Bugs thread under the pinned welcome is drafted but not created. Do not route feedback to #conference-room.
- Broader announcement is drafted and intentionally pending; announce last after release and remaining authorized launch actions. Live-audience functionality remains deferred.
- Do not merge, deploy, push remote main, upload artwork, publish Discord content, change provider settings/credentials/permissions/DNS/costs/automatic deployment or modify production data while at this checkpoint.

## Restart instructions (do not execute as checkpoint work)

Read this handoff before `PHASE_1_CHECKLIST.md` or old passing reports. Start with read-only Git checks:

```sh
git fetch origin
git status --short --branch
git rev-parse HEAD main origin/main origin/codex/soft-launch-release-checkpoint
git merge-base --is-ancestor 1fc73aa740423770791ece2774fba6bfd68d0e28 origin/codex/soft-launch-release-checkpoint
git diff --name-only 1fc73aa740423770791ece2774fba6bfd68d0e28 origin/codex/soft-launch-release-checkpoint
```

Expected checkpoint difference: only this document. Preserve local main and the checkpoint branch; use a separately authorized diagnostic branch. Confirm the established Node 24.20.0/npm 10.8.0 toolchain and installed dependencies; never read secrets or environment files to recreate fixtures. After renewed diagnostic authorization, build local fixtures and reproduce the focused gate:

```sh
node node_modules/vite/bin/vite.js build --config scripts/countdown/vite.config.ts
node node_modules/vite/bin/vite.js build --config scripts/countdown/lobby.config.ts --base=/lobby/
python3 scripts/countdown/serve.py
# In another terminal, from the same checkout:
caffeinate -diu node scripts/countdown/lifecycle.mjs
```

The fixture server binds loopback port 5231. Check for an existing owned server before starting one; close only processes created for the session. Preserve the initial failed evidence separately before any rerun. After the cause is established and an authorized correction is reviewed, the established full drivers are `node scripts/iphone/full-validation.mjs`, `node scripts/iphone/artifacts.mjs`, `node scripts/iphone/artifacts.mjs --accepted-main`, and `caffeinate -diu node scripts/iphone/browser-validation.mjs` (fixture server required). Run builds and browsers sequentially, not in competing batches. These commands are a restart reference, not authorization to resume development or deployment now.
