# Countdown-gap correction validation

The only runtime change is in `src/games/balance/simulationClock.ts`: a positive countdown frame gap above 100 ms plus the existing epsilon returns `counting` after updating the timestamp baseline, without crediting elapsed time. Invalid/regressing timestamps still interrupt. The `SimulationClock` class and all lifecycle handlers are unchanged.

Base main: `432cba05fbd0c8842524143b04f0bef53ad54f53`. Starting correction branch: `30f04798a12ecaa0a0dddff17f88c5e294026dc7`. Main and Release B `fc57961b098d5132a56a20d36aa135c233e84527` were not advanced. No production access or production database writes occurred. There was no merge, deployment, production configuration or lobby-gate change.

## Behavior and evidence

In the prior controlled audio-enabled direct Start, audio readiness completed at +457.6 ms, renderer/composite readiness at +474.6/+474.7 ms, issuance at +475.2 ms, and countdown at +479.0 ms. A 233.3 ms gap entered `pauseRun` at +753.5 ms with zero ticks.

In a fresh corrected real-stall run, audio readiness completed at +213.7 ms, renderer/composite readiness at +222.6 ms, issuance at +222.7 ms, and countdown at +223.8 ms. A 233.4 ms gap observed at +512.8 ms retained countdown elapsed at 33.3 ms. Active transition occurred at +2889.7 ms, first active clock frame at +2906.3 ms, both with zero ticks and an empty accumulator. The mock submission had 42 ticks and zero interruptions. Times are relative to preparation start in separate runs, not a performance comparison.

All captured countdown frame intervals are checked against their following elapsed value. Discarded intervals add zero; normal intervals add only their delta. No simulation-clock frame appears before active transition. Official interruption and pause hooks remain absent in ordinary countdown-gap runs. Deliberate active stalls still pause and produce interruption evidence.

## Fresh validation

| Coverage | Result |
|---|---|
| Focused primary matrix | 80 passed: Start/Play Again × direct/lobby × audio/muted × ten cases |
| Repeated quiet/countdown-stall/active-stall matrices | 48 passed |
| Total focused captures | 128; 104 observed clean active transitions |
| Real countdown stalls | 24 completed without pause or official interruption |
| Gap followed by active stall | 24 correctly interrupted during active simulation |
| Discarded intervals audited | 80 |
| Freeze/cancel/mock identity-loss after gap | 16 passed; no stale issuance or simulation start |
| Existing audio matrix | 32 scenarios passed |
| Renderer matrix | 17 scenarios passed, including explicit deadline recovery |
| Standard reconciliation | 26 checkpoints passed |
| Lifecycle soaks | Two passed: total 40 cancellations and eight accepted completions; no Resume or practice result |
| Automated tests | 462 passed; includes six transport/report tests and focused clock/deadline/stale-result tests |
| Ephemeral PostgreSQL | 681 checks: 260 foundation/fallback, 74 session, 99 attempts/replay, 107 personal projection, 125 guild projection, 16 private canary |
| Production smoke | 192 ordinary and 216 enabled-fixture assertions; dummy local metadata only |
| Additional gates | Rapid cancellation, responsive fixtures, headed/headless suspended audio and headed quiet repeats passed |
| Build/reproducibility | Ordinary and enabled artifacts reproduced byte-for-byte; 36 server runtime files unchanged |
| Assets/security | 287 boundary assertions across 47 text artifacts; V004 hashes and immutable ruleset digest verified; artifact and source security scans passed |

Each settled soak returned scenes, timers, intervals, animation callbacks, audio contexts and canvases to zero. Listener count matched its initial baseline (four); host subscription count remained one; peak scenes was one. No permanent-resource leak was observed. A finite soak cannot prove absence of every leak or fully reclaim browser/OS caches.

## Integrity and preserved policy

Both exact boundary tests (99.9, 100, 100.1 ms) and real busy-loop stalls are covered. Multiple exceptional intervals and a subsequent clean start are covered. The existing 100 ms active-gameplay guard rejects the exceptional frame and fractional accumulator, and official evidence remains interrupted after a real active stall. Hidden visibility, blur, freeze, gameplay-button cancellation and identity loss remain protective during countdown.

The client retry deadline remains 930000 ms and the server submit deadline remains 330000 ms. A focused test advances through the actual client deadline while discarding countdown time, verifies safe nonqualifying expiry, and forbids submission/reissuance. Server deadline/eligibility and replay/projection behavior are exercised by the unchanged ephemeral Postgres suites. No deadline is extended, no survival time comes from countdown, and scoring/replay schemas and physics are unchanged.

The intended eligibility change is limited to visible foreground presentation gaps: these no longer mark the official attempt interrupted. Genuine lifecycle/active interruptions still do. The lobby remains disabled in ordinary builds; enabled builds are local fixtures only.

## Bundle impact against reviewed main

| Graph | Total byte change | JavaScript gzip change |
|---|---:|---:|
| Ordinary | +10 | +2 |
| Enabled fixture | +10 | +1 |

Payload sizes exclude Vite’s build-only manifest, whose baseline symlink paths add 201 bytes unrelated to runtime code. Both graphs add 10 JavaScript bytes. The server runtime is byte-identical. Release metadata changes only as expected to describe client asset hashes; public build input fields match. Detailed before/after inventories are in `tmp/countdown-correction/artifacts.json`. Production artifacts contain no diagnostic hooks.

## Tooling corrections and unsuccessful evidence

The retained tooling patch now uses Vitest, records fresh failures even during browser startup, rejects lost CDP sessions without timeout inflation, handles late replies safely, and fails unexpected lifecycle pauses. Scene counters are independent of trace-buffer resets/truncation, and soak acceptance requires four accepted results with no practice/Resume outcome.

Four tooling issues were corrected during this validation: Node-test/Vitest discovery mismatch; using transient DOM canvases as a live-scene baseline; assuming a renderer stall must overlap audio preparation; and an unguarded diagnostic probe in the standalone viewport entry. The last race produced a valid normal run after audio had already settled ready. Recovery scenarios now explicitly inject an audio warm-up deadline failure and require its marker, degraded result and old-expectation rejection. Failed evidence is retained in `lifecycle-controls-diagnostic-failure.json` and `renderer-race-failure.json`; no runtime behavior or timeout was changed to accommodate them.

One additional detailed-trace reconciliation run detected a **genuine 107.9 ms active-gameplay gap at tick 33** in `preparation-hidden`. Composite readiness was at 55138.1 ms, countdown at 55144.7 ms, clean active transition at 57672.4 ms, first active frame at 57688.0 ms, and pause at 58363.5 ms. The actual hidden control had completed during preparation; the pause occurred visible/focused through `SimulationClock.frame → BalanceScene.update → onPause → pauseRun → official.interrupt`. The policy correctly rejected the frame. This run failed and was not resumed or relabeled as passing.

The same full reconciliation suite subsequently passed with standard instrumentation and identical functional assertions. That bounded comparison does **not** establish whether extra tracing, host pressure or another scheduling condition caused the earlier active gap. The failure remains an unresolved validation observation requiring review before treating this branch as release-ready. Remaining gates were run independently; a later pass does not erase this failure.

Host samples recorded approximately 6.9 GB swap during the first matrix and 7.2 GB near the active-gap failure, with load averages 4.90/4.15/4.37 near that event. These measurements are context, not proof of causation. The historical unexplained zero-tick pause, 637 ms stall and CDP timeout remain unattributed. All Discord behavior here is mocked; no real embedded Discord scheduling claim or manual canary is made.

## Review scope and next step

Application/runtime: `src/games/balance/simulationClock.ts` only. Focused tests: `simulationClock.test.ts` and `countdownIntegrity.test.ts`. Tooling: `scripts/countdown/`, retained CDP/legacy-runner/scene diagnostics, deterministic renderer recovery injection, and narrowly scoped artifact guards. Documentation records the behavior, evidence and limitations. No dependencies, assets, server/shared source, audio/renderer runtime, lobby flag or hosting settings changed.

This branch is for review only. Do not merge or deploy from this report alone: review the unresolved active-gap observation separately. Production and Release B remain untouched.

Tooling commit: `e52d1f5b14b295aeecddb5d593a3d239bfa15606`. Final cleanup found no disposable Chrome processes; observed CDP session cleanup had zero pending requests and no evaluation failures. The local fixture server was stopped.
