# Mascot Production Phase 1 — foundation handoff

Result: **BLOCKED for the complete phase; safe repository foundation validated.**
Three canonical images and the original production specification were absent from
the received attachment. Blender is not installed. No approved model, GLB, rig,
animations, rendered mascot comparison, or mascot preview harness exists yet.

## Verified Git state and scope

The task's configured workspace was empty. Found the existing intended checkout
in a separate local project directory; it was clean on `main`, tracking
`origin/main`, at `6f2f87a5c21a94a3e6f51a7031aec1d526bba109`. Left it untouched.
Cloned the verified remote `https://github.com/Chrisrossi92/cdawg-arcade.git` into
the task workspace. The fresh network clone confirmed the same main SHA, clean
working tree and zero ahead/behind divergence. Read the applicable `AGENTS.md`.

Created `codex/mascot-production-foundation` from freshly fetched `origin/main`.
The reported release `7cd6db0f89e984ff477f26a5af9155512617d4ff` exists in Git; this
phase did not query production to establish which release is currently running.
Commit/push state is reported in the task handoff; no PR, merge or deployment.

No changes to application/server code, dependencies/lockfile, official scoring,
simulation/replay, feature flags, build or hosting configuration. No dashboard,
Discord settings, credential files, production database, or production endpoint
access. All database testing used disposable local synthetic data. No secrets
were requested, read, rotated, uploaded or needed. No external art service used.

## Deliverables

`assets/brand/mascot/{reference,source,runtime,previews}` contains documented
boundaries, a missing-input manifest and no binary assets. `docs/brand` contains
identity, provenance, continuation plan, provisional presentation comparison and
bundle evidence. The legacy character bible is explicitly historical; its jacket
and sneakers cannot override the approved permanent quadruped identity.

`scripts/mascot/validate.mjs` checks intake paths, hashes and unregistered assets.
Default mode exits nonzero with missing inputs; `--allow-missing` explicitly checks
foundation integrity without asserting completion. `check-bundle.mjs` inspects
Vite's production module graph without writing outputs. A Blender smoke script is
prepared and syntax-checked, but not executed. No LFS or global preferences added.

## Validation evidence

| Check | Result |
| --- | --- |
| Existing Vitest baseline | 28 files, 362 tests passed |
| Typecheck and production build | Passed before and after foundation |
| Local compiled production smoke | 180 assertions passed before and after |
| Disposable Postgres integration | 681 checks passed: 260 main, 74 session, 107 personal, 125 guild, 16 canary, 99 attempt |
| Backup/restore and compiled fallback matrix | Passed in disposable database suite |
| Immutable Balance ruleset digest | Verified by both production builds |
| Asset intake gate behavior | 3 fixture checks: strict missing rejection, explicit foundation acceptance, unregistered binary rejection |
| Actual bundle module graph | 133 modules inspected; no mascot source imports |
| Secret/credential pattern scan | Passed for source, staging and artifacts; no private dotenv values read |
| Frontend artifact comparison | All four SHA-256 hashes and raw/gzip sizes identical |
| Blender smoke source | Python syntax passed; runtime unavailable |
| Desktop screenshot | 1280 × 800 existing start screen readable |
| Narrow screenshot | 390 × 844 existing start screen readable; document scroll width equals 390 |
| GLB/rig/render/reproducibility | Blocked: no model/toolchain/canonical images |

Tests initially encountered sandbox `listen EPERM`; the existing loopback server
suites passed when rerun with local server access. These were environment failures,
not code changes. Used installed Node **24.14.1**, npm **11.11.0**; repository pins
**24.20.0**, which was not available locally. Dependency installation emitted an
engine warning. Successful checks do not establish parity with that exact pin.
No global Node install or engine relaxation was performed.

The full unit suite ran before edits. Only documentation and standalone validation
utilities changed afterward; production/typecheck, smoke and database checks ran
on the completed foundation. No runtime code was changed to make tests pass.

Screenshots are intentional local test evidence in ignored
`tmp/mascot/existing-game-desktop.png` and `tmp/mascot/existing-game-narrow.png`.
They show the existing start screen, not a new mascot or animation acceptance.
No routine gameplay testing was handed to the owner.

## Bundle baseline and final

| Artifact | Raw bytes | Gzip bytes | Delta |
| --- | ---: | ---: | ---: |
| HTML | 415 | 278 | 0 |
| CSS | 13,418 | 3,651 | 0 |
| Main JS | 2,130,476 | 601,614 | 0 |
| Additional JS | 159,736 | 48,353 | 0 |

The existing >500 kB chunk warning remains. Do not claim this phase fixed it.
Exact file names and hashes: `mascot-bundle-evidence.json`. Both builds used the
same dummy public configuration via `npm run test:production`. No mascot file
entered the application bundle; no runtime dependency was added.

## Next action

Complete this same Phase 1 after receiving the three canonical images and original
specification and approving Blender 4.5.13 LTS installation. See
`MASCOT_PRODUCTION_PLAN.md` for official source, exact installer size, estimated
disk allowance, license reference and reproducible smoke command. No installation
was performed. These are two independent input/toolchain gaps, not one Blender-only
blocker.

Then build and validate the neutral quadruped prototype, idle/lean/panic/fall poses,
GLB and reproducible source, compare live 3D with atlas exports using the same model,
and capture local mascot desktop/narrow renders. The provisional recommendation is
a Phaser atlas first; future renderer/asset load and memory deltas remain unmeasured.
Production character replacement remains outside this authorization.
