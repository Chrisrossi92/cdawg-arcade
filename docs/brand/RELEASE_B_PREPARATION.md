# Release B preparation — BLOCKED

Base/main: `b2264466101956fd081e6326ccaa2935fc658650`. Branch: `codex/arcade-lobby-release-b`. This is an unmerged, undeployed candidate, not release acceptance. Production remains Release A `8931dab8e1282f61baed8c2dd170019d5180c32e`, artifact `dep-dajgkgdg1s2s73amhggg`, with automatic deployment Off.

## Minimal change and scope

The only functional production change is `config/lobby-release.ts:2`, `lobbyReleased = false` → `true`. Its comment is updated. No new runtime/environment flag exists. No implementation, styling, mascot, dependency, physics, replay, session, database, guild, or interruption-policy change.

Required support: gate expectations in `src/arcade/runtime.test.ts`; Release B artifact/graph audit; reconciliation validator uses this baseline and fresh Release B evidence, preserving the corrected Resume tick rule; test viewport resource reporting and a loopback-only server for the untouched compiled candidate. Documentation contains this blocked report, the rollout/rollback plan, output inventory and failed timelines. The historical disabled-build validator remains historical; use `validate-release-b.mjs` for this candidate.

The approved appearance and interaction have not drifted: production UI/runtime/assets are identical to accepted main. The gate selects the already-reviewed entry. Existing history uses `#arcade/balance` after in-Activity navigation; fresh launch deliberately normalizes to the lobby. No new direct/deep-link bypass was added.

## Preflight and production isolation

Main and upstream were clean and synchronized before branch creation; no Release B branch existed. Both production origins reported accepted 8931dab through public health only, and all eight public frontend hashes matched the locally retained Release A artifact. Render Settings showed exact accepted artifact and automatic deployment/previews Off. The Release A acceptance/two-step plan was read; root AGENTS.md is the only applicable repository policy file found.

No production database, shell, private configuration or credentials were accessed in this slice. No production requests that issue attempts or scores were made. All real PostgreSQL validation used an owned disposable cluster. Only the expressly authorized feature push is an external write.

## Blocking browser evidence

The exact ordinary enabled production bundle passed the complete practice viewport matrix at 1280×900, 800×600, 390×844 and 375×667: lobby → Balance → practice → results → lobby, keyboard traversal, synthetic touch, reduced motion, 44px-or-larger controls and no horizontal overflow. Local Player/practice labeling and Coming Soon controls were inspected.

The authenticated-fixture readiness matrix passed eight scenarios, then stopped in `preparation-hidden` on an unexpected active-game stall:

- Ready 56180ms; attempt issued 56181.5ms; countdown start 56192.2ms.
- Countdown complete 58647.3ms; first gameplay clock 58677.6ms, ticks=0, accumulator=0.
- At tick 40, frame delta 637ms; interruption at 59982ms; pause policy at 60014.3ms.

The isolated rerun also failed, this time during countdown:

- Ready 12067.2ms; issuance 12067.4ms; countdown 12070.3ms.
- Pause at 12349ms, ticks=0. Countdown never completed and bounded wait expired.
- Observed page pacing: median 33.3ms, p95 34.3ms, maximum 500ms.

[First failure](release-b-browser.json) and [isolated rerun](release-b-isolated-browser.json) remain recorded. Neither pause was suppressed or automatically resumed. The 100ms policy remains unchanged. `validate-reconciliation.mjs` correctly fails on this evidence, preventing a false release-ready result.

The preparation-hidden failure is not evidence of a changed readiness implementation: BalanceExperience, BalanceScene, simulationClock, the readiness trace plugin and the matrix implementation exactly match accepted main. A read-only host load snapshot was 10.02/9.73/9.03; this alone does not establish the scheduling cause. The second failure occurred at a different phase. We cannot attribute either to harmless flakiness or conclude whether repeated normal rendering work is responsible without further bounded diagnosis. No production fix was attempted.

## Completed automated validation

2,086 independent assertions passed: 422 unit/integration; 216 ordinary enabled-production smoke; 216 explicit integration-mode smoke; 681 disposable PostgreSQL; 265 atlas; 104 brand/font/provenance; 56 raster; 25 host packing; 16 GLB (zero Khronos errors/warnings); 85 Release B graph/artifact gates. Typecheck and browser-harness compile passed. Build repeated byte-for-byte. Security pattern scan passed; final staged scan follows documentation review.

The backend suites cover real adapter selection/identity boundaries, authentication timeout/cancellation/retry, stale sessions, issuance/submission, uncertain network retry, immutable clock/replay fixtures, personal/guild projection consistency and guild authorization. Runtime tests cover 300 navigation cycles, one subscription/authentication, idempotent entry, navigation locks and stale completion. These passes do not replace the failed full browser gate.

Pending because of the repeated browser failure: completion of all readiness/failure scenarios; fresh 50+ browser lifecycle soak and rapid cancellation; full authenticated flow acceptance; final cold/warm performance acceptance. Prior Release A soak is historical and is not counted as a new Release B pass. Exact production practice layout coverage is current, but it cannot certify all authenticated paths.

## Artifact inventory and limitations

See `release-b-artifacts.json` for all output sizes, SHA-256, gzip and Brotli measurements, plus `release-b-release-a-baseline.json` for actual public Release A hashes/cache policy. Candidate metadata in this committed inventory is `development-release-b-preparation`; an exact branch-commit build is produced locally after committing and reported separately, avoiding a self-referential commit hash. No provider or environment setting is changed to build it.

Measured preparation build: Release A 3,956,932 bytes; Release B 4,095,069 bytes, a 138,137-byte increase. The initial lobby group is about 359.8KB, about 174.1KB gzip; Balance JS/CSS plus four atlases are deferred (about 3.576MB). Discord SDK is a separate conditional chunk (159,736 bytes) and ordinary practice does not initialize it. Hosts total 62,314 bytes, fonts 30,812 bytes, external logo SVG 9,760 bytes; tag/card artwork is existing inline SVG/CSS. Four V004 atlases remain 1,602,752 bytes with unchanged hashes. No Blender/GLB/reference-board/debug/fixture asset ships. Hashed assets are served immutable; index is no-cache. Cache assertions use the real compiled server smoke; the review wrapper is local test tooling only.

Exact enabled production and approved local lobby share the same source and assets. Release metadata changes chunk names; there is no creative change and no new creative review is requested. Preparation is BLOCKED despite the passing independent suites and clean pushed branch. Nothing is merged or deployed.

## Next authorization

Authorize focused local diagnosis of the repeated browser frame stalls, including comparison against the accepted source and safe timing attribution. Keep production unchanged and the 100ms rule authoritative. Any resulting application correction needs separate review/authorization. Release B merge/deployment must not be approved until the complete browser gates and lifecycle/performance checks pass.
