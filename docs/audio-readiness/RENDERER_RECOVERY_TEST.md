# Renderer audio-deadline recovery test correction

**Correction passed; release stopped at a separate lifecycle gate.** No merge or deployment.

Base: clean synchronized main at `432cba05fbd0c8842524143b04f0bef53ad54f53`. Dedicated branch: `codex/fix-renderer-audio-recovery-test`. Release B remains `fc57961b098d5132a56a20d36aa135c233e84527` and the production lobby gate remains false.

## Test-only correction

The old warmup-5000 renderer scenario expected automatic completion after injecting a five-second scene stall. That stall can exhaust the approved audio deadline. The application instead waits for Retry sound or Play without sound. The test now explicitly expects that recovery state.

Before a choice, it reads the real diagnostic renderer clock and verifies zero ticks, an empty accumulator, an inactive gameplay phase, no issuance/countdown/clock frame/submission, and V004-only zero-tick frames. It repeats the check after an observation interval. The old validator must reject the actual recovery trace specifically with `ready/countdown/clock absent`; each focused case records that negative control.

The muted case completes after renderer readiness with no later audio prepare, resume or oscillator creation. Retry removes only the injected fault, makes exactly one fresh preparation call, settles ready within the existing five-second deadline, and issues only after renderer/composite/audio readiness. The cancellation case leaves the recovery screen, cancels a subsequent preparation with deferred native resume, starts a new generation, then releases the old completion. Exactly one issuance and a 42-tick result demonstrate that the stale completion cannot start another run. Fresh clocks have zero ticks/accumulator; countdown spacing, V004 frames and genuine interruptions remain asserted.

Diagnostic-only additions expose the preparation clock and oscillator creation events. The production artifact audit explicitly rejects those diagnostic markers. The existing browser runner can select a single renderer case using `--case=NAME`. No application source, policy constant, physics, scoring, replay, database, asset, dependency or hosting configuration changed.

## Results

- All three focused deadline cases passed: muted, Retry and cancellation/stale completion. Each rejected the old automatic-completion assertion and produced exactly one eventual issuance.
- Full corrected renderer matrix: **17/17 passed**, including delayed decode, active stall, failure/retry, cancellation and repeated Play Again.
- Full audio matrix: **32/32 scenarios passed**, **60 completed runs**, two canceled preparations and four deliberate active interruptions. No unexpected pause was accepted.
- Enabled reconciliation: **26 checkpoints passed**, zero reported errors and no open audio contexts, timers, frames or canvases afterward.
- Traditional suites: **2,059 passed** (445 unit/integration, 192 direct smoke, 216 enabled smoke, 681 owned disposable PostgreSQL, 265 atlas, 104 brand, 56 raster, 25 host, 16 GLB, 59 graph). All 16 suite gates passed, including application/harness typechecks, security scanning and **286 additional boundary assertions**.
- Reproducibility: **45 ordinary outputs and 17 enabled outputs** reproduce byte-for-byte and equal the reviewed pre-correction inventory under identical public dummy metadata. This includes all V004 assets and all 36 compiled backend/shared modules. No runtime or production artifact changes are introduced by the correction. A later deployment's source/version metadata would naturally identify its new merge SHA.

## Separate stopping gate

The subsequent lifecycle soak failed with **`CDP timeout: Runtime.evaluate`** after a diagnostic evaluation received no response within 20 seconds. Its last progress line was `soak running 60`. No fresh completion report was produced. This does not establish an application pause, leak, or a cause; it is an unresolved failed release gate.

The release runner stopped immediately. Rapid-cancellation, responsive and final headed-repeat suites were not reached. No rerun was substituted for the failed soak. An older passing soak JSON was initially copied by the local orchestration script because the standard runner writes its result only on completion. File timestamps identified it as historical; it was quarantined as `stale-prior-soak-NOT_CURRENT.json` and is explicitly excluded from current validation. Only the current timeout log is authoritative for this gate.

See [machine-readable correction evidence](renderer-recovery-evidence.json). Complete local traces and the current timeout stderr remain in `tmp/renderer-recovery-test/`. The original warmup-5000 failure is preserved alongside corrected focused traces.

## Release boundary and next step

Only the correction branch is to be committed/pushed. Main stays at 432cba0; no normal merge is performed while a required release gate is failed. Production was not contacted or modified during this correction phase. The last verified live release remains accepted Release A source `8931dab8e1282f61baed8c2dd170019d5180c32e`, artifact `dep-dajgkgdg1s2s73amhggg`, retained as the rollback target. No rollback was needed. No settings, credentials, permissions, DNS, Discord mappings, database contents, costs or automatic deployment changes occurred.

Next review should resolve the lifecycle diagnostic timeout, preserve this failed run, then complete all remaining gates before merge/deployment. No application modification is authorized by this result. No Discord canary is indicated by a local diagnostic timeout. The prior isolated unexplained muted countdown pause and historical 637 ms active stall remain unresolved and are not attributed to this test correction. No Release B work is included.
