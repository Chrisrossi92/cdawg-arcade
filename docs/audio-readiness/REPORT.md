# Focused audio-readiness correction

**PASS WITH LIMITATIONS** for the focused correction. No merge or deployment.

## Scope and checkpoint

The authorized fix branch is `codex/fix-audio-readiness`, created from fetched `origin/main` / local `main` at `b2264466101956fd081e6326ccaa2935fc658650`. Release B remains `fc57961b098d5132a56a20d36aa135c233e84527`, unmerged. Its source is exported to a disposable directory, with only the audio implementation, shared preparation component and their tests/diagnostic tooling overlaid for enabled-path validation. Its branch/worktree are untouched.

[Release A acceptance](../brand/RELEASE_A_ACCEPTANCE.md) records production source `8931dab8e1282f61baed8c2dd170019d5180c32e` and artifact `dep-dajgkgdg1s2s73amhggg`. The source lobby gate remains false. These production facts are verified against retained acceptance/diagnostic records, not fresh production access; this task does not contact production, Render, Discord, or a production database.

The retained local diagnosis independently confirms that countdown interruptions reproduced on A and B; one first cue took 218.3 ms after renderer readiness and caused a valid zero-tick pause; the final quiet comparison passed 12/12; no B-only defect was established. The historical 637 ms active stall remains unattributed. The earlier diagnostic source is retained locally under the Release B checkout's ignored `tmp/release-b-diagnosis/DIAGNOSIS.md` and corresponding JSON files.

## Composite preparation

Start/Retry calls audio preparation synchronously, preserving the browser gesture for context creation and `resume()`. Renderer preparation starts in the same attempt generation. The existing drawable V004/texture/renderer latch is preserved.

Audio is synthesized with oscillators. There are **no required encoded audio files, network audio assets, or decoder calls** in this implementation. Audio asset loading and delayed audio decode are therefore not applicable; adding a fictitious decoder would neither exercise nor fix the demonstrated path. Existing delayed V004 image decoding remains part of renderer regression coverage.

Only enabled categories are warmed: square and sawtooth for SFX, triangle for music. Warm-up exercises oscillator creation, connection, start, the actual gain envelope, stop and completion behind a dedicated output gain of exactly zero. All warm-up voices finish and disconnect before that output is enabled. Two stable animation-frame intervals drain stale timestamps after synchronous preparation. This wait is separately bounded and cannot award ticks.

The component awaits audio and renderer completion, checks the generation and current audio-context validity, then records the positive composite latch. Exactly one issuance is permitted per generation. The new gameplay clock is installed only afterward; the existing inert renderer snapshot never advances during preparation. Countdown and simulation retain their separate existing clocks and zero initial accumulator/ticks.

Audio preparation has a five-second deadline, including synchronous overrun detection; the existing overall renderer deadline is 15 seconds. Failure produces a sanitized pre-start choice: Retry sound (within the existing three-total-tries limit), Play without sound, or Back. No attempt is issued while this choice is unresolved. Muted/degraded attempts cannot initialize or resume audio from a later cue. Settings are held for the attempt; disabled categories do no unnecessary initialization. Both disabled needs no context. The failure notice contains no raw platform/codec/device exception.

Play Again reuses verified waveform preparation and the same context, resumes/revalidates it from the new gesture, and replaces a closed context only there. A context that suspends during gameplay mutes further playback for that attempt; no automatic initialization, retry or Resume occurs. Cancellation clears pending timeouts/frames/voices, invalidates stale completions, and cannot cancel a newer generation. Unmount disposes audio in both direct and lobby modes; the disposal microtask distinguishes a real unmount from React Strict Mode's immediate development reattachment.

## Evidence and limitations

Counts, measurements and retained observations follow below. Browser tests use disposable Chromium profiles, real local WebAudio and Phaser, and mocked official transport. No synthetic official score reaches a service. The 42-tick fixture remains the canonical accepted result; deliberate interruptions convert it to practice.

A development smoke run before full-envelope/stable-frame warm-up recorded a 200 ms countdown gap. The subsequent full matrix also recorded a 616.7 ms gap in a degraded, muted lobby countdown with no active audio initialization. Both triggered the unchanged zero-tick pause. Neither is attributed to this fix or to the historical 637 ms event; the muted-run trace is retained in browser evidence, and the earlier development observation is explicitly labeled as a [tool-output summary](development-observation.json), not an intact raw trace. Passing isolated repeats do not erase those observations.


## Before/after audio timeline

The following local headless samples both inject 218 ms of synchronous context-construction delay. They demonstrate ordering, not a claim that native construction always takes that long. Times are milliseconds relative to Start. The baseline's total construction cost was 341.6 ms including the injection and native work.

| Event | Archived main | Corrected direct path |
| --- | ---: | ---: |
| Start | 0 | 0 |
| Context construction completes / resume called | 606.3 / no explicit resume | 219.0 |
| Resume completes | Not gated | 231.5 |
| Silent warm-up and stable frames finish | Not gated | 405.7 |
| V004 renderer ready | 261.3 | 444.8 |
| Composite ready | Absent | 444.9 |
| Attempt issued | 261.8 | 444.9 |
| Countdown starts | 264.6 | 446.3 |
| First active clock | Never reached | 2895.3, ticks 0 / accumulator 0 |
| First gameplay sound | Never reached | 3444.8 |
| Unexpected pause | 614.7, zero ticks | None |

The baseline violates the new ordering invariant in **1/1** controlled negative-control sequences and reproduces a valid zero-tick pause. The corrected construction-delay and first-playback-delay cases complete **16/16 starts** across both paths and both Chromium modes, with no startup interruption. Delayed resume adds eight more successful starts. These are controlled regressions, not estimates of real-world failure prevalence. Audio decoding is inapplicable to synthesized tones.

## Validation totals

| Check | Result |
| --- | --- |
| Unit/integration, including 24 audio cases | 445 passed in 34 files |
| Direct production build/smoke | 192 assertions passed |
| Explicit enabled production smoke | 216 assertions passed |
| Real owned disposable PostgreSQL | 681 passed (74 sessions, 107 personal, 125 guild, 16 canary, 99 attempts/replay, 260 foundation/fallback/restore) |
| V004 atlas records/alpha gutters | 265 passed |
| Brand/font/provenance/contrast | 104 passed |
| Raster/alpha/edge checks | 56 passed |
| Host packing/hash validation | 25 passed |
| GLB validation | 16 passed, zero Khronos errors/warnings |
| Enabled/disabled graph and artifact gates | 59 passed |
| **Traditional suite total, without double-counting reruns** | **2,059** |
| Additional focused source/artifact/security boundaries | 286 assertions, 47 production text artifacts |
| Whole source/staged/artifact credential-pattern scan | Passed: 562 source/staged/artifact files; no private environment values read |
| Application and both harness typechecks | Passed |
| Reproducible builds | 45 ordinary production outputs and 17 enabled outputs identical |
| Disposable B export with final audio fix | Its own 445 unit/integration tests and 216 ordinary enabled-production smoke assertions passed; repeated coverage is not added to 2,059 |

[Artifact/source audit](validation.json), [suite outcomes](suites.json), and [repeatability](repeatability.json) retain the measured facts. All 36 compiled backend/shared outputs are byte-identical to the main baseline. Both application changes are confined to `WebAudioManager` and its preparation/lifetime integration in `BalanceExperience`; all other changes are tests, diagnostics, or documentation.

[Audio browser evidence](browser-evidence.json) contains **70 passing final scenario records, 132 completed fixture runs, four canceled preparations, and eight deliberate interruptions**. It combines the 32-case headless matrix with its clearly identified isolated reruns, the 32-case headed matrix, final suspension-specific reruns, and six final quiet pairs. It is not presented as an uninterrupted initial 70-case pass. Every completion is exactly 42 ticks; the eight deliberate interruptions have one interruption and practice disposition. No test silently accepts a genuine pause as an ordinary success.

The initial headless matrix had **one unexpected pause in 57 started countdowns**, in a muted rejection case; both rejection-path isolated repeats subsequently passed. Its trace and the two corrected retry-assertion failures remain in the evidence. The retry assertion originally compared successful warm-up with the prior degraded latch; it now checks the final latch preceding issuance. A disposable browser-profile teardown race was fixed with bounded cleanup retries, with no application change.

The complete enabled [reconciliation matrix](lobby-reconciliation.json) passed **26 scenario/checkpoint records**, including hidden/blur, active stalls, renderer failure/retry, identity/session loss, cancellation and final cleanup. Its five-second renderer stall can also exhaust the audio deadline; the updated fixture first asserts zero issuance, explicitly chooses muted audio, and preserves all existing interruption/replay assertions. The old fixture's wait for automatic countdown was retained as a test-compatibility failure, not an application pause.

The existing direct renderer matrix passed **15/15** ([renderer evidence](renderer-evidence.json)). The [lifecycle and viewport evidence](lifecycle-evidence.json) establishes a 53-cycle soak with 24 issuances, 20 deliberate cancellations, four accepted results, zero practice results, zero Resume calls, one host authentication/subscription, and stable listener count (4 at settled baseline/final). Final contexts, timers, intervals, animation-frame requests and canvases are all zero. Ten rapid preparation cancellations passed, as did desktop, pop-out, 390×844 and 375×667 flows, keyboard traversal, synthetic touch and reduced motion. The 300-navigation runtime tests are included in the unit suite.

## Timing and bundle impact

Normal final browser samples include ten runs per path across headless/headed Chromium and cold first-run/warm Play Again pairs. The final quiet cohort alone completed **12/12** runs with no pause. Startup n=10 per path is too small for a useful p95 estimate, so startup p95 is deliberately omitted.

| Measurement (ms) | Direct | Enabled lobby |
| --- | ---: | ---: |
| Start → composite readiness, median / max (n=10 each) | 236.3 / 626.6 | 210.2 / 330.3 |
| Active frame median / p95 / max | 16.7 / 18.4 / 24.6 (427 intervals) | 16.7 / 18.6 / 21.6 (426 intervals) |
| Active audio-node creation median / p95 / max | 0.1 / 0.2 / 2.5 (112 calls) | 0.1 / 0.2 / 0.2 (107 calls) |

Safe diagnostic buffers include Start, resume, warm completion, renderer/composite latches, issuance, countdown, first clock, first gameplay cue, and every observed RAF gap above 50 ms. No screenshot or repeated visible report painting occurs inside audio timing samples. Native timings vary with host scheduling; these are not physical-device performance guarantees or proof that all future allocations are bounded.

Using identical dummy metadata, frontend size is **3,960,876 bytes** versus **3,956,931**, a **3,945-byte increase**. Combined per-file JavaScript gzip is **657,806** versus **656,738**, **+1,068 bytes**. Four V004 WebP atlases remain **1,602,752 bytes**, with all image and metadata hashes unchanged. No dependency, schema, replay, scoring, session, physics, official-controller, asset, source lobby-gate or Release B branch change occurs.

The 100 ms active and countdown protections are intact. The historical 637 ms active stall remains unexplained; this correction addresses demonstrated post-renderer first-use audio work only. The unrelated muted 616.7 ms observation reinforces the limit of that claim. No production rollback is currently recommended.

## Reproduction

Use the existing pinned Node 24.20.0 and lockfile. No dependency, credential, runtime environment setting or service configuration is added. Build/test processes receive only existing public dummy fixture metadata; no dotenv file is read.

1. Export `b226446` and `fc57961` into `/private/tmp/cdawg-audio-baseline` and `/private/tmp/cdawg-audio-release-b`; link the existing dependencies. Overlay this branch's two application files (`audioManager.ts`, `BalanceExperience.tsx`) and the readiness/lobby diagnostic files onto the disposable B export. Keep its gate true.
2. Build the direct readiness harness normally; build baseline readiness with `--base=/before/`; build the disposable B lobby harness with `--base=/lobby/`. Start `python3 scripts/audio-readiness/serve.py`, which exposes only these loopback test artifacts.
3. Run `node scripts/audio-readiness/browser.mjs --before`, then `node scripts/audio-readiness/browser.mjs`, then `node scripts/audio-readiness/browser.mjs --headed` serially. `--case=NAME` isolates a case; `--case=normal --repeat=3` repeats cold first-run/warm Play Again pairs. Faults never enter a production bundle.
4. Run `node scripts/audio-readiness/legacy-browser.mjs MODE` separately for `direct`, `reconcile`, `soak`, `rapid`, and `responsive`. These retain existing renderer/readiness/interruption/lifecycle assertions.
5. Run unit/typecheck/production smoke/disposable database and enabled build/smoke gates, atlas/brand/asset validation, then `node scripts/audio-readiness/validate.mjs`. Stop builds and database processes before quiet browser timing runs.

The browser driver starts its own installed Chromium using a disposable profile; it does not attach to personal tabs or require an account sign-in. Its timing observations are local host samples, not physical-device/Discord certification. Audio decode timing is explicitly inapplicable. Existing dependency advisories and the Phaser chunk-size warning are unchanged.

## Authorization boundary

No merge, deployment, lobby enablement, production access, schema/data change, permission change, or manual testing request is made. The sole intended external write is the expressly authorized non-force push of this fix branch. No rollback is recommended: accepted A remains unchanged and the historical active stall has no demonstrated audio cause.

Next authorization, after review of the final validation evidence: normal merge of the reviewed fix into main, followed by separate exact-SHA release authorization with health gates and lobby still false. Release B reconciliation/merge/enablement/deployment remains a separate decision; do not infer it from this fix's enabled-path tests.
