# V004 mascot and Arcade identity: final preparation

Status: creatively approved for pre-merge preparation; **no merge or deployment performed or authorized in this phase**.

Approved implementation: `d6a56c99edb3f7190c0f16ae69733a03af4e86d1` on `codex/arcade-brand-foundation`. Target main: `af3c5d7242ed94958ac1c5dcbdede05da70ed4c5`. Both heads were clean and synchronized before this documentation-only preparation. Main is an ancestor, making the current integration conflict-free. This record's commit adds documentation only and does not change the approved application tree.

## Exact release scope

The branch contains the approved Arcade identity assets, local lobby preview, corrected Blender source and reproducible rendering tools. **The lobby is still isolated from the production entry point.** A later deployment of this branch would update the gameplay mascot to V004; it would not publish the Arcade lobby or replace the production interface. Publishing the lobby requires a separately scoped integration.

Relative to main, the only production application source change is eight V003-to-V004 asset imports. Server, shared deterministic rules, timing, replay, scoring, session code, dependencies, migrations and hosting configuration are unchanged. The bundle admits only four approved WebP sheets plus bundled metadata. The rest of the brand package remains source-only. Nothing requires a schema change, data repair, permission grant or new configuration.

## Final automated evidence

Final validation ran on pinned Node 24.20.0 against the approved commit:

- 370 tests across 29 files and 192 compiled production smoke assertions passed.
- 681 disposable PostgreSQL checks passed, including replay, isolation, projections and backup/restore. Production was not contacted.
- All 45 build outputs exactly match the committed approved-build hash inventory. All 36 compiled server files match the pre-integration server baseline.
- Canonical/source hashes, four adversarial intake checks, 265 packed sprite records, 16 GLB assertions with zero Khronos errors/warnings, 104 brand checks, 56 raster checks and the 145-module production boundary passed.
- Source, staged documentation and build security pattern scanning and diff hygiene passed. No credential contents were read. This bounded scanner does not replace a dependency or penetration audit.

The first database run overlapped production output replacement and failed with a missing file during migrations. Running it sequentially after the build resolves that harness ordering issue; future release checks must build before running the database suite. The first GLB invocation omitted its required path arguments; the corrected invocation passed without asset changes. Neither issue required application changes.

Prior paired Blender renders and browser checks remain applicable because source and assets are byte-identical. No unchanged manual gameplay or owner canary was repeated. Images total 1,602,752 bytes (+45,698); the frontend totals 3,955,937 bytes (+45,676). Local p95 frame interval is 16.75ms at both tested gameplay sizes; p95 scene-update CPU is 0.20ms. See [V004 pre-merge evidence](MASCOT_V004_PREMERGE.md) and its linked JSON reports for methodology and limits.

## Gates for a separately authorized release

1. Refresh target and feature heads and verify clean/synchronized state. Recheck the entire diff if either head changes. Preserve the feature branch. Use a normal merge only after explicit approval; do not squash, rebase, force-push or delete it.
2. Before any deployment, identify the currently healthy live source and immutable provider artifact through the existing manual workflow. Record that exact rollback target and confirm it is still retained and compatible with current configuration, without exposing secret values. Do not assume the historical target below is still available.
3. Validate the merged source with unit tests, typecheck/production build, compiled smoke, then disposable database checks sequentially, followed by hashes, atlas, bundle and security gates. Compare frontend artifacts under identical public build inputs; dummy-config hashes are reproducibility evidence, not production-config hashes. Stop before deployment if any gate fails.
4. If deployment is separately approved, use the existing manual Render workflow for the exact merged SHA. Keep automatic deployment off. No environment, service, DNS, Discord or database changes are included.
5. Validate the deployed SHA, `/api/health`, `/api/ready`, persistence readiness, immutable asset hashes/content types/cache policy, CORS and anonymous authentication/session boundaries, sanitized logs, practice gameplay, pause/resume, results and Play Again. Use existing sanctioned read-only database verification for consistency only if release authorization includes it. Do not create synthetic official attempts or repair production data.

Existing workflow details and endpoint contracts live in the deployment runbooks and smoke suite. Unchanged Discord acceptance already exists; do not request repeated manual checks for coverage established by automation. Any new production acceptance request must be consolidated and justified by the actual release scope.

## Rollback decision and procedure

The last repository-recorded accepted live application is `615898dcc24214206774e551b5bfb935171eefa1`, Render artifact `dep-dahmqmjm8hqs73cgdbn0`, from [mascot release acceptance](MASCOT_RELEASE_ACCEPTANCE.md). It is the historical candidate fallback for V004, **not a freshly verified live provider state**. The older `7cd6db0` fallback in that historical report is not the default rollback target for this release.

Local readiness is verified: the accepted commit exists, all eight V003 runtime files remain byte-identical to it, and current main still uses the accepted V003 imports. No asset deletion or schema change makes reversal dependent on restoring data. Provider artifact availability and configuration compatibility must be verified immediately before a future deployment; no live rollback drill was run in this phase.

Rollback triggers after an authorized deployment include wrong release identity; health/readiness failure; missing or mismatched mascot assets; new startup errors; broken authentication/session/CORS contracts; official replay or projection regression; or material animation, layout or performance failure. Stop further rollout and do not improvise production fixes.

When release authorization covers nondestructive rollback, use the existing documented Dashboard Rollback operation to the **verified immediately preceding healthy artifact**. Confirm its configuration compatibility without reading secrets or changing settings. Wait for the prior release identity, repeat health/readiness, static hash/cache checks, sanitized logs and automated browser gates, then record the outcome. Do not restore a database backup for this presentation-only release: preserve legitimate sessions, attempts and results. If the retained artifact is unavailable or configuration compatibility is uncertain, stop and report the boundary rather than inventing a deployment or configuration workaround.

Separately reconcile source after a rollback through a normally reviewed revert of the eventual integration merge using its verified mainline parent (`git revert -m 1 <actual-merge-sha>`). This is a future procedure, not a command executed here. Validate the revert and merge normally only with authorization. Preserve source history and the feature branch. Do not force-reset main, delete assets manually, change runtime flags, or deploy documentation-only follow-up commits.

## Remaining limits

No fresh production probes, provider artifact inspection, production database query, live deployment or rollback was performed. Historical dependency advisories and the large Phaser chunk warning remain separately scoped maintenance items; no dependency audit refresh or automatic fixes are claimed. Local viewport measurements are not physical-device/GPU/load certification. There is no remaining creative or routine manual-testing request for this preparation milestone.
