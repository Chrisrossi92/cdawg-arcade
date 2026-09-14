# Release B reconciliation — locally validated, not merged or deployed

Accepted main baseline: `cdc0d46e8c5366ef1bf1a22439e80d0502bfb277`. Original Release B candidate: `fc57961b098d5132a56a20d36aa135c233e84527`. Dedicated branch: `codex/reconcile-release-b-readiness`. Normal merge of accepted main into the original candidate: `41bd66a13926d89f3d82e1f1e4dd4433f0cee0c3`. No conflicts occurred. Main and the original candidate branch remain unchanged.

Only the existing `config/lobby-release.ts` source gate differs in runtime behavior from accepted main. It enables the already-reviewed Arcade entry. Application implementations, styles, V004 assets, composite audio/renderer readiness, removal of legacy fallback, countdown-gap discarding, zero-tick/empty-accumulator starts, 100 ms active policy, lifecycle handling, deadlines, physics, scoring, replay, sessions and database code are byte-identical to accepted main. The runtime test expects the enabled gate. No new runtime flag or configuration mechanism was added.

Tooling reconciliation updates the old Release B validators to the accepted baseline and fresh evidence, strengthens composite readiness ordering and exact gate scope, adds isolated disabled/enabled artifact comparison, compiled candidate checks, and fixes the local review server's `/lobby/assets/` wrapper route. The initial wrapper run timed out because that route was missing; failed evidence is retained under `tmp/release-b-reconciliation/compiled-wrapper-failure.*`. No application assertion was weakened. Earlier `release-b-browser.json` and `release-b-isolated-browser.json` are retained historical failures, not current passes.

## Fresh validation

All 16 automated/build groups passed: 462 tests in 36 files; type checks; 681 owned ephemeral PostgreSQL checks; 216 ordinary enabled-production and 216 explicit enabled-mode smoke assertions; 265 atlas, 104 brand, 56 raster, 25 host and 16 GLB checks; 86 current graph/artifact assertions, immutable ruleset verification and security scan. Two isolated disabled builds each pass 192 smoke assertions. The disabled graph exclusion validator also passed. Asset and server runtime hashes are unchanged.

Browser coverage passed: 128 focused countdown captures, 104 clean zero-tick transitions, 80 discarded intervals, 24 real countdown stalls without interruption, 24 active-stall controls with correct interruption; 16 freeze/cancellation/identity-loss controls; 32 audio scenarios; 17 renderer scenarios including all deadline recovery choices; 26 reconciliation checkpoints; 10 rapid cancellations; four fixture viewports; suspended headed/headless and quiet headed coverage (20 runs). Three independent lifecycle soaks cover 72 cycles: 60 cancellations and 12 accepted completions, no practice results or Resume actions. Every soak returns scenes, timers, intervals, frames, open audio and canvases to zero; listeners return to four, host subscriptions to one, peak scenes one. No unexpected countdown pause, legacy frame, duplicate issuance/action, replay divergence, projection mismatch or lifecycle leak was observed.

The untouched compiled enabled candidate additionally passed four cold/warm Start/Play Again runs and four viewport cases (1280×900, 800×600, 390×844, 375×667). Lobby loads first and does not fetch GameEntry/V004 game assets before entry. Keyboard focus, accessible control naming, image alternatives, one primary heading, fixture focus traversal, reduced motion, touch controls and viewport bounds pass. These are bounded accessibility checks, not comprehensive WCAG certification or a physical-device audit.

## Payload and performance

Identical public dummy metadata was used to compare source trees, avoiding release-string hash differences. Disabled candidate dist/build are byte-identical to accepted main. Enabled ordinary and explicit integration outputs repeat byte-for-byte. Thirty-six server runtime files are identical (release.json changes only to describe the frontend). V004 atlas total remains 1,602,752 bytes.

| Artifact group | Accepted main bytes | Enabled candidate bytes |
| --- | ---: | ---: |
| Initial HTML/entry/CSS plus lobby assets where applicable | 2,198,398 | 359,812 |
| Deferred game/assets | 1,602,752 | 3,579,429 |
| Conditional Discord SDK | 159,736 | 159,736 |
| Total | 3,960,886 | 4,098,977 |

Total increase: 138,091 bytes. Candidate initial group: 174,135 gzip / 163,042 Brotli bytes; accepted initial: 613,471 gzip / 511,861 Brotli. Candidate deferred group: 2,144,681 gzip / 2,056,494 Brotli bytes. Compressed values are local per-file estimates, not network transfer promises.

Untouched compiled lobby-to-Balance entry: 579 ms cold, 350 ms warm in this bounded local sample. Instrumented composite preparation: 348.0 ms cold, 232.3 ms warm. Cold timeline: preparation 9616.3 → composite ready 9964.3 → issuance 9964.7 → countdown 9967.9 → first active clock 12396.7 ms. Warm: 13781.9 → 14014.2 → 14014.3 → 14016.7 → 16463.2 ms. First active clocks have zero ticks and empty accumulator. Gameplay frame p95 17.3 ms both; maximum 17.4 ms cold / 21.0 ms warm, 42 sampled frames each. These are local samples, not broad device, network or load certification.

## Security, limitations and isolation

Fresh source/artifact pattern scan passed 576 files. Logged CDP sessions ended with zero pending requests and successful browser exits; no owned disposable Chromium processes remained. Both owned fixture servers were stopped. Host swap was 7405.31 MB before browser validation, 7389.75 MB during renderer checks, and 6886.50 MB afterward; final load was 10.25/7.51/6.62. Host pressure is recorded without attributing historical stalls to it. Read-only npm audit retains seven inherited advisories (two moderate, five high); dependencies and lockfile are unchanged and no automatic fix ran. Large Phaser chunk warnings remain. Historical unexplained pauses, the 637 ms stall and CDP Runtime.evaluate timeout remain unresolved history. A correctly handled active-gameplay gap is valid protection; the historical 107.9 ms event is not a failure of this candidate. This run did not need to waive or suppress any unexpected pause.

All database checks use real owned disposable Postgres with synthetic identities. No fresh production health, production database audit, Render access or native Discord certification is claimed. No production settings, secrets, DNS, permissions, costs, Discord mappings or data were accessed or changed. Production's lobby remains disabled. No merge into main or deployment occurred. See [rollout plan](RELEASE_B_ROLLOUT_AND_ROLLBACK.md) and [compact fresh evidence](release-b-reconciliation.json). Detailed local evidence is retained under `tmp/release-b-reconciliation/`.
