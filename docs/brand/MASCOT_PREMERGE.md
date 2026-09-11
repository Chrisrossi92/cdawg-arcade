# Approved mascot: pre-merge readiness

The owner approved both the mascot appearance and integrated animation. Final pre-merge validation is complete. **Ready for merge review; merge and deployment remain separately unauthorized.**

## Exact integration scope

- Target: `main`, refreshed at `6f2f87a5c21a94a3e6f51a7031aec1d526bba109`.
- Feature branch: `codex/mascot-production-foundation`.
- Approved application implementation: `0205d8075161b1869cb3eaa9088624e28ddfe407`.
- This preparation commit only records approval/readiness and preserves approval metadata during future packaging. It does not alter the approved application or assets.
- The target is an ancestor of the feature branch, so integration is currently conflict-free. No merge, rebase or target-branch write was performed.

The complete branch includes canonical intake, historical feasibility/candidate assets, reproducible authoring tools, approval evidence and the final Phaser integration. Only eight v003 WebP/JSON paths may enter the application module graph. The security scanner also accommodates large staged binary files without exposing their contents on errors. Review the final integration alongside the historical source material; the source and historical exports do not ship in the frontend.

No server, database/migration, deterministic rules/config, clock, replay, score repository, platform/session, application dependency/lockfile, hosting or Discord configuration changes are present relative to the target. No automatic deployment workflow was added. Main and production remain untouched.

## Final gates

| Gate | Result |
| --- | --- |
| Full tests | 370 passed across 29 files |
| Typecheck and production build | Passed; immutable ruleset digest verified |
| Compiled production smoke | 192 assertions passed with dummy configuration |
| Disposable PostgreSQL suites | 681 checks passed, including backup/restore; synthetic cluster cleaned up |
| Canonical/generated hashes | Passed; approved image files unchanged |
| Runtime atlas | 265 records; full phase/direction coverage, bounds and alpha gutters passed |
| Module/bundle isolation | 145 modules checked; only eight explicit integration exports allowed |
| Artifact reproduction | All eight frontend artifacts byte-identical to the approved implementation build |
| Server isolation | All 32 compiled server files byte-identical to the pre-integration baseline |
| Sensitive-pattern scan | Source, staged changes and compiled artifacts passed; local environment file contents not read |
| Diff hygiene | Passed except two intentionally preserved Markdown hard-break spaces in the original canonical specification |

Fresh test logs remain in ignored `tmp/mascot/premerge`. [Recorded final evidence](mascot-premerge-validation.json) captures counts, source SHA and target SHA. Previous [animation and browser evidence](MASCOT_PHASE_3_COMPLETION.md) remains applicable: application source and assets are unchanged, so the already accepted manual preview was not repeated.

The four WebP sheets total 1,557,054 bytes; images plus source metadata total 1,603,590 bytes. Main JavaScript adds 49,022 raw bytes (about 6.5 kB in Vite's gzip report). Measured local p95 frame interval is approximately 16.8 ms and sprite update CPU 0.2 ms at gameplay dimensions. These are local Chromium measurements, not device-wide guarantees.

Known validation limits remain explicit: tests ran on installed Node 24.14.1, while the repository retains its existing 24.20.0 pin; the source ZIP checksum cannot be verified without the archive; real mobile GPU/Discord coverage is not newly claimed. These are carried-forward limits, not failures introduced by this integration.

## Prepared pull-request text

Title: **Integrate approved Cdawg mascot with continuous gameplay animation**

Cdawg now follows the existing balance value with smooth directional sprite blending, intermediate expressions and uninterrupted secondary motion. Hysteresis prevents expression flicker, reversals preserve animation continuity, and a fall begins only after the deterministic outcome is fixed. The result screen continues from the matching fallen endpoint into recovery; reduced motion keeps essential feedback readable.

Includes the canonical source package and reproducible Blender-to-atlas tools. Production receives only four optimized WebP sheets and bundled metadata. Gameplay physics, timing, replay, scoring, sessions, database behavior and deployment configuration are unchanged.

Validation: 370 tests, 192 compiled production smoke assertions, 681 disposable PostgreSQL checks, atlas/hash/bundle gates and exact artifact reproduction passed. Appearance and integrated animation are approved. See `docs/brand/MASCOT_PREMERGE.md` for evidence, payload costs and existing toolchain limits.

This is a prepared description in the repository; it is not a published pull request.

## Integration and rollback preparation

After explicit merge approval, refresh the target and feature heads. If either implementation or target changes, review the new diff and rerun affected gates before merging. Keep deployment as a separate authorized action; a merge alone is not release approval. No migration, secret, Discord permission or hosting change is needed for this presentation integration.

If rollback is later authorized, revert the eventual mascot integration commit on main through normal review and rerun the gates. Preserve historical source evidence. A production rollback, if ever needed, must use the actual previously deployed immutable release identifier recorded by the deployment process; no production release identifier was accessed or invented here.
