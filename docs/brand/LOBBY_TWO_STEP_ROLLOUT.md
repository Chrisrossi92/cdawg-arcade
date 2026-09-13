# Lobby two-step release and rollback plan

Status: Release A deployed and accepted with the gate false; see [Release A acceptance](RELEASE_A_ACCEPTANCE.md). Release B remains uncreated and requires separate authorization. The release gate remains `false` in `config/lobby-release.ts`. No environment or dashboard setting enables the lobby.

## Accepted baseline and reconciliation

Accepted application: `f98e1c39183709347824f1f1e9fcedbf39cf7baf`, artifact `dep-dajei2m7bikc73bp7c9g`. Acceptance documentation main: `0f44cb134e7650cffe6dc961e272c16679e71141`. Verify current provider identity, artifact retention and configuration compatibility again immediately before any future deployment. These are repository-recorded facts, not a fresh production audit in this slice.

The lobby branch `codex/arcade-lobby-integration` started at `0df06aede788402238cfa1f263604767588dc849`. Normal main-to-feature merge base: `758c926e9a733f0c83a904515c4654b2227e7728`. Main had four unique commits (readiness implementation, its normal merge, acceptance documentation and its normal merge); the lobby had one unique commit. No rebase, force push or discarded work.

Four overlapping files required resolution. `managedGame.ts`, `BalanceGameCanvas.tsx` and `mascot/ResultMascot.tsx` use accepted main in full: one renderer lease, completion-aware destruction and owned listeners. `BalanceExperience.tsx` keeps the accepted generation latch, 15-second deadline, bounded retries, independent preparation clock, readiness-before-issuance ordering and cancellation. Lobby-only phase notification, shared controller ownership, Back to Arcade, audio preference/disposal and milestone cleanup remain. The obsolete image warm-up and lobby start shortcut were removed. Navigation during texture preparation unmounts and invalidates the readiness generation; navigation during official issuance/submission stays locked. Actual blur/hidden interruption during countdown still converts the attempt to practice. The 100ms active clock policy is unchanged.

## Local release gates

Use pinned Node 24.20.0 and the existing lockfile. Do not source dotenv. PostgreSQL validation owns a disposable cluster/container; it must never receive a production URL. Run build before database checks, sequentially.

```sh
npm test
npm run typecheck
npm run test:production
npm run test:database
npm run build:lobby
node scripts/lobby/validate-build.mjs
node scripts/lobby/smoke-enabled.mjs
node scripts/lobby/validate-reconciliation.mjs
node scripts/lobby/repeat-builds.mjs
node node_modules/typescript/bin/tsc -p scripts/lobby/harness/tsconfig.json
node node_modules/vite/bin/vite.js build --config scripts/lobby/harness/vite.config.mjs
node scripts/lobby/validate-assets.mjs
node scripts/mascot/validate-gameplay-atlas.mjs assets/brand/mascot/runtime v004
node scripts/mascot/validate-correction-glb.mjs assets/brand/mascot/correction-v004/source/cdawg-mascot-correction-v004.glb tmp/lobby-reconciliation/glb.json
node scripts/scan-production.mjs
```

The host packing validator requires the existing local fixed-camera PNG renders in `tmp/lobby-integration/host`; regenerate them only if missing with the already approved Blender and `scripts/lobby/render-host.py`. Font/raster tooling uses `scripts/brand/requirements.txt` and `scripts/brand/README.md`. No production build imports these tools.

Serve `tmp/lobby-integration/harness` on loopback, activate **Run readiness reconciliation**, then reload and activate **Run lifecycle soak**. **Run rapid preparation cancellation** verifies repeated Start/Back while image work is pending; `?profile=1` selects a short two-run timing sample. Use `responsive.html` / **Run viewport matrix** for real iframe dimensions. Controls and fake API data exist only in the separate harness graph. Browser results and stable dummy-input hashes are linked from the reconciliation report. Build hashes with public dummy metadata are not expected to equal deployment hashes carrying the release SHA and public application ID.

## Release A: foundation with gate disabled

Requires explicit owner authorization naming the final approved feature commit.

```sh
git fetch origin
git switch main
git pull --ff-only origin main
git merge --no-ff codex/arcade-lobby-integration
# Repeat the complete local release gates above on this exact merge.
git push origin main
git rev-parse HEAD
```

Verify the feature did not advance beyond approval before merging. No squash, rebase, force push or branch deletion. In the existing Render service use Manual Deploy → Deploy a specific commit → the verified merge SHA. Keep automatic deployment Off; change no environment, service, DNS, Discord or database configuration. Record the exact deploy artifact.

Require multiple successful TLS/health/readiness rounds on permanent and provider origins before and after release. Confirm exact release metadata, unchanged V004 atlases, static caching, CORS and anonymous auth/session boundaries, sanitized logs, direct Balance root and absence of lobby/preview/debug paths. Verify cold/warm preparation, no fallback, true-stall protection, practice/results/Play Again with automated browser checks. Official/replay/projection behavior uses isolated deterministic fixtures and sanctioned read-only production checks if release authorization permits them. No synthetic production official attempts.

The disabled graph contains no Arcade modules, host images, fonts, SVGs or fixtures. Its 511-byte frontend delta from accepted main is enumerated in `lobby-build-validation.json`: presentation hook scaffolding and audio lifetime tracking, plus changed chunk references/manifest hashes. Backend, existing CSS, SDK and atlases remain identical. Exact stable output hashes live in `lobby-repeatability.json`.

No owner canary is needed for A unless automated evidence exposes a new Discord-specific uncertainty. The readiness canary is already accepted.

Rollback A to the freshly verified retained `f98e1c3` artifact, keeping all legitimate data. Stop rollout for wrong release/hash, unhealthy endpoints, auth/CORS or projection failure, startup pause/fallback, layout or resource regression, or any lobby exposure. Use the documented provider rollback only after its confirmation establishes compatible configuration. Do not repair data or improvise flags/settings. Reconcile source separately with a reviewed normal revert of the A merge using its verified first parent.

## Release B: minimal source enablement (not created here)

After A is accepted and separately authorized, branch from its accepted main. Change only `lobbyReleased = false` to `lobbyReleased = true` in `config/lobby-release.ts`, plus strictly required release documentation. Do not use a new environment variable, runtime query, dashboard flag, public fixture or URL bypass. `build:lobby` is local test tooling; production B uses the ordinary production build with real existing public metadata supplied by the unchanged provider build process.

Rebuild enabled artifacts and run enabled smoke, graph, lifecycle, readiness, authority and viewport suites. Gate tests currently asserting the intentionally disabled source gate must be updated deliberately for enabled release expectations; do not silently skip them. Record B's exact hashes after metadata is fixed. Merge normally and deploy that exact merge via the same manual workflow. Verify production lobby entry, identity/practice separation, data adapters, V004 readiness, protected game timing, results refresh and Back to Arcade.

After all automated checks pass, request one consolidated Discord canary covering lobby identity, game entry, V004 readiness, one official result, personal/guild refresh, and Back to Arcade. No incremental creative review.

Retain the accepted A artifact for a one-operation provider rollback to direct Balance, with no schema restore or configuration edit. Triggers include private data exposure, wrong guild identity, duplicate SDK/attempt/submission, stale navigation, resource growth, broken readiness, or broken lobby entry/results refresh. Stop B rollout, restore A and verify health/hashes/direct-game behavior. Source restoration is a separate normal reviewed revert. Do not delete the preserved feature branches.
