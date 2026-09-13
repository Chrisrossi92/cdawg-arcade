# Release A acceptance — PASS

Released September 13, 2026. Production continues directly into Cdawg Balance. The source-controlled lobby gate is false; Release B was not created or deployed. No user canary is required because the accepted visible experience is preserved and automated gates passed.

## Commits and deployment

- Original normal Release A merge: `063eb9de9ff64838d6a264acef3c7955144d7cae`.
- Test-only branch: `codex/release-a-test-gate-correction`, commit `c1b4d6372e09794bee784721fb7fd0f611cb439d`.
- Normal test-correction merge and deployed source: `8931dab8e1282f61baed8c2dd170019d5180c32e`.
- Render artifact: `dep-dajgkgdg1s2s73amhggg`; manual exact-commit deployment, duration 1m04s, live at approximately 16:41:38 EDT.
- Preserved rollback: `f98e1c39183709347824f1f1e9fcedbf39cf7baf`, artifact `dep-dajei2m7bikc73bp7c9g`.

No squash, rebase, force push or branch deletion. The original lobby feature and test branch remain preserved. No production source changes were made to satisfy the test. Automatic deployment and previews remain Off. Render confirmed “No configuration changes since this deploy” for the retained rollback artifact; its confirmation was canceled without executing rollback.

## Corrected gate and original stall

See [test correction](RELEASE_A_TEST_GATE_CORRECTION.md). The old assertion confused a new clock baseline with Resume. New runs start at zero ticks; Resume preserves ticks captured at pause and resets the accumulator. Final fixture submission remains exactly 42 ticks. Four focused checks accept two preserved ticks and reject countdown ticks, lost progress and retained interruption elapsed time.

The isolated direct-launch rerun passed: ready 827.3ms, issuance 827.6ms, countdown 831.9ms, initial clock 3259.9ms at zero ticks. The intentional 250ms stall produced one 251.4ms frame and one pause; explicit Resume at 3548.1ms completed without another pause. The original additional host/frame stall remains recorded in the stopped-release evidence. It was not suppressed, auto-resumed or dismissed as harmless. Full serial direct matrix subsequently passed 15/15. The 100ms policy is unchanged.

## Automated totals

All 2,036 assertions reran successfully: 422 unit/integration in 34 files, 192 disabled production smoke, 216 enabled smoke, 681 disposable PostgreSQL, 265 atlas records, 104 brand/font, 56 raster/alpha, 25 host packing, 16 GLB, 59 build/isolation gates. Type checks and protected-source reconciliation passed. Four additional focused assertion checks passed.

Browser validation: isolated corrected Resume gate; isolated direct stall/Resume case; 15-case direct matrix; 26 enabled scenario/checkpoint records; lifecycle soak; ten rapid cancellations; four responsive viewports including reduced motion, keyboard and synthetic touch. No overlapping browser stress suites were run. The native cold/warm gameplay frame samples were p95 17.6/17.5ms and maxima 17.9/17.8ms in the enabled harness. These are host observations, not device performance guarantees.

Before deployment, 18 consecutive verified TLS/health/readiness responses on both origins reported f98e1c3. After deployment, 18 reported exact 8931dab. Production probing passed 61 checks per origin (122): health/readiness/schema, exact public frontend hashes, atlas MIME/cache, authentication rejection, trusted/untrusted CORS, malformed exchange rejection and protected/lobby path isolation. Local/Postgres suites cover rate limits, official issuance/submission, replay, session/guild restrictions and transaction behavior without production writes.

## Artifacts and disabled lobby

With identical dummy public metadata, all 45 production and 17 enabled outputs are unchanged by the test-only correction. Both builds reproduce. Compared with accepted main before Release A, disabled frontend size increases by 511 bytes (3,956,420 to 3,956,931); 42/45 outputs are identical. The three logical differences are main JavaScript (shared presentation hooks and audio lifetime cleanup), index.html's hashed script reference, and build/release.json's hashes. Backend, SDK, CSS and atlases are unchanged.

A second local build used the public client ID obtained from the public bundle and exact deployed SHA. Every one of its eight frontend files matched live bytes on both origins, including main chunk `index-DaDfq-eR.js`. No private configuration was inspected. Release metadata explains the different production chunk name from dummy builds.

Disabled graph excludes lobby modules, fonts, SVG family, host imagery, fixtures and diagnostic controls. Their enabled-build filenames return 404 in production, as do preview/harness/config/brand-source paths. `/arcade` is the existing SPA fallback serving the identical Balance document, not a lobby route. Live `/#arcade` opens Cdawg Balance directly.

V004 atlas payload remains 1,602,752 bytes. SHA-256:
- balance0: `42da55184ed19413cadc1c549a2a047ea2ac640d42d987a703dac93275cd8c12`
- balance1: `1c8bd805a87019d7ab0c43525aa62063346f29d5679e3f9983bb8ff36ded3569`
- reactions0: `7e701c7426d7eb270ccd49cf3554946ba2800d368929054071ba3be2e6aa6c31`
- reactions1: `c49f4097c678e50ca7f780c2ca93fa288bc3ec48155d8525d7105fdeb9a809be`

Permanent-origin individual atlas fetches measured 194.0–307.9ms in this probe. Immutable caching remained correct. Preparation precedes attempt issuance and countdown in both instrumented local paths, every captured first rendered frame is V004, and genuine interruptions still pause. Live production practice and Play Again each reached 0.7s results without a startup pause; V004 result appearance was inspected. Live narrow/pop-out home layouts were visually inspected, while interactive four-viewport coverage came from the local identical application source. The browser tool could not activate the cross-origin iframe button reliably; this is not counted as an additional successful live narrow run.

## Database, security and operating state

Read-only production verification before/after: all 17 retained traces replay exactly; personal and guild board/record/event mismatches are zero. All 14 table counts match the pre-release baseline. Counts and permission/configuration fingerprints are in [machine-readable evidence](release-a-acceptance.json). Runtime role has no superuser, create-database, create-role or bypass-RLS privileges. No schema, permissions, configuration or row changes were made. Official runs were not synthetically issued in production.

Post-build security pattern scan passed 520 source/staged/artifact files. Available runtime logs show the correct release listening event and the prior instance draining, with no new application errors or sensitive-value markers observed. These are bounded log observations, not an exhaustive historic audit. The scan is not a fresh dependency vulnerability audit; inherited dependency advisories and the Phaser bundle-size warning remain known limitations.

An initially indirect shell-audit call was rejected by automatic review as opaque. The SELECT-only command was made explicit, reviewed and then executed successfully. Nothing remains blocked by that review. No secrets, environment variables, DNS, Discord mappings, hosting settings, automatic-deploy settings or database configuration were changed.

## Rollback and documentation

Retained f98e1c3 rollback is available and configuration-compatible. The documented two-step plan remains authoritative for future regression triggers; no rollback was needed. This acceptance and its evidence are documentation-only and may be normally merged without redeploying. No Release B enablement is included. No user action or routine Discord canary is required.
