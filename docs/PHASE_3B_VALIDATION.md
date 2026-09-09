# Phase 3B production-readiness validation

Date: 2026-09-08. Result: **PASS WITH LIMITATIONS**; hosting and live production acceptance remain Phase 3C work.

## Baseline and scope

The verified clean starting main and freshly fetched origin/main were both `aeba4673978584d20c5b235c95a5146d91d2ddaf`. The SHA in the request was mistyped. Work was performed on `codex/phase-3b-production-runtime`. No applicable repository AGENTS.md was found in the repository or checked ancestor paths. Existing development, timing, live-validation documents and hosting audit findings informed the work.

Only the runtime, production configuration/build/test tooling, and documentation changed. Gameplay source and tuning did not change. No Render service, deployment, DNS record, Discord mapping, database, or VPS change was made. The local `.env` was neither read nor printed and remained ignored/untracked.

## Automated evidence

- Official Node 24.20.0 macOS ARM64 archive verified against its published SHA-256 checksum and used for checks.
- Lockfile installation passed. No dependency versions changed.
- **162 tests across 18 files passed**: the original 122 plus 40 production cases. One original health assertion was updated to the new safe liveness contract.
- Typecheck, standalone frontend production build, standalone backend compilation, and complete `build:production` passed.
- **71 compiled smoke assertions passed**, covering runtime startup, host/port, static routing/caches, SPA fallback, API and forbidden-file errors, health fields, missing config/assets, CORS, malformed tokens, release metadata, artifact checks, signals, and port closure. Compiled startup refuses absent/non-production NODE_ENV.
- The smoke passed again after dev-dependency pruning and with tsx physically absent. Vite's optional peer dependency retains tsx under npm pruning, so it was temporarily moved out for this check and restored. Development dependencies were then reinstalled from the unchanged lockfile.
- Production tests additionally cover limiter capacity/expiry/malformed addresses, forwarded-header spoofing, exact Activity origins, request body/type/size/method, upstream timeout including body reads, client-disconnect cancellation, 20-exchange concurrency bound, artifact hash/ID/revision mismatch, symlinks, importing without listeners, normal drain and forced deadline.
- Source, staged content, and generated output are scanned by `scripts/scan-production.mjs` without reading local dotenv files or printing matches. It checks credential patterns, dummy-secret leakage, frontend backend-only variable names, unexpected build files, and local absolute paths. Static artifacts also have an explicit file allowlist and integrity manifest. Pattern scans are not a proof against every possible credential format; environment isolation prevents the actual backend secret from reaching the frontend builder.

All production tests used dummy credentials and public dummy IDs. The acceptance build is explicitly marked `development-phase3b`, not a production source revision. The existing large Phaser bundle warning remains; optimizing it is excluded from this phase.

## Browser evidence

The in-app browser loaded the actual compiled single-origin process at a loopback address using dummy configuration. Direct observations: Local practice, Start Game, countdown at zero, available left/right keyboard controls, loss at 0.7 seconds, final score saved locally, Local results, and Play Again resetting to zero. No game behavior was modified.

A temporary local iframe harness tested focus loss against the compiled game. Moving focus to a button outside the frame displayed Paused, held score at zero, and disabled controls. Resume restarted the countdown; a second interruption and resume behaved the same way without stale input. The harness lived outside the repository and was not part of the production artifacts.

The layout was inspected at default desktop dimensions and at an explicitly verified 375×667 viewport. The narrow page had a 375-pixel scroll width, readable score/status, Start Game, and both bottom controls without horizontal overflow. This is browser viewport validation, not physical-device or native-Discord touch certification. Detailed input/timing behavior retains the automated and prior Phase 2 live evidence. No live Discord launch was required or performed in this phase.

Temporary browser/server resources were cleaned up and the viewport override reset after validation. See the production runbook for the configuration, health contracts, deployment sequence, rollback gates, and remaining provider-specific acceptance work.
