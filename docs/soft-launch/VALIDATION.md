# Phase 1 candidate validation

Base: `7fbc5f54730e719652a1f168ed815715dca00295`. Branch: `codex/soft-launch-brand-player-cleanup`.

This is local repository validation, not deployment acceptance. The accepted production checkpoint is `dep-dak230uq1p3s73cb18l0`, backed by the prior deployment record and the owner's passed Discord canary. No live origin, provider configuration or production database was accessed in this phase.

## Repository selection

The brief named `/Users/christopherrossi/Projects/cdawg-arcade`. That separate clone was at an older commit. The active `/Users/christopherrossi/Documents/cdawg-arcade` checkout was clean and synchronized at the exact accepted main. Work uses the accepted Documents checkout on a dedicated feature branch; the older Projects clone is untouched. This assumption was disclosed while proceeding with independent work.

## Scope and integrity

Only player presentation, local diagnostics, tests/tooling and new derivative brand assets change. The scope validator compares protected simulation, readiness, official-attempt, replay, server/database, deployment configuration, dependencies and canonical mascot/identity assets against accepted main. Critical Balance readiness/countdown/input/official lifecycle blocks remain byte-identical. The compiled server is byte-identical apart from release metadata. No migrations, permission changes, new secret, dependencies or runtime service are introduced.

Production diagnostics remain absent even under dev/tuning/owner query parameters. Development-only local observation remains read-only; tuning mutation controls are removed. The accepted 100 ms active interruption and countdown-gap policy is unchanged.

## Local evidence

Final validation totals and artifact manifest accompany this report. Ignored detailed traces and screenshots are under `tmp/soft-launch/`; commands are documented in `scripts/soft-launch/README.md`. Full browser evidence is generated fresh for this candidate, not borrowed from accepted Release B.

## Final local results

All 17 suite groups passed on the finished source: 484 tests / 39 files; 681 ephemeral PostgreSQL checks; 219 production-smoke assertions per mode; 228 scope/graph assertions; 61 derivative-brand checks. Asset suites covered 265 sprite records, 104 brand, 56 raster, 25 host and 16 GLB checks.

Browser evidence: 128 countdown captures, 104 clean active transitions, 80 discarded gaps, 24 real-countdown-stall runs and 24 active-stall runs; 16 lifecycle controls; 32 audio and 17 renderer scenarios; 26 reconciliation checkpoints; ten rapid cancellations; four responsive matrix layouts; two 24-cycle navigation soaks. Both soaks ended at zero scenes, timers, intervals, animation frames, audio contexts and canvases; four baseline listeners/one host listener; exactly four accepted results/twenty cancellations each. Final owned Chromium process count: zero.

The Phase 1 UI suite passed fifteen states, five layouts, fifteen Escape/focus returns, explicit Tab/Shift+Tab wrapping, reduced motion, first/return help, two practice runs and one official fixture run. Four exact compiled-build runs passed with 344 ms cold and 314 ms warm local entry. Suspended audio passed four runs each headless/headed. Final quiet headed rerun: six cases/twelve runs passed. Its original blur-affected batch report remains failed and unchanged; separate fresh successful rerun evidence is recorded with hashes in validation-summary.json.

The keyboard regression found native reverse-tab could leave the dialog. Explicit edge wrapping now passes. A clean build also rejected Array.at under the existing TypeScript target; equivalent indexing fixed compatibility without changing the target. The entire final suite passed after the correction.

Exact per-file SHA-256, byte sizes and compressed sizes are in artifact-manifest.json. Ordinary and enabled-integration builds repeated byte-identically using identical public dummy metadata against accepted main. These are local comparison artifacts, not deployment metadata.

| Payload bucket | Accepted bytes | Candidate bytes | Delta | Candidate gzip | Candidate Brotli |
|---|---:|---:|---:|---:|---:|
| Initial lobby graph/assets | 359,812 | 366,869 | +7,057 | 176,586 | 165,194 |
| Deferred Balance/game | 3,579,429 | 3,577,786 | −1,643 | 2,144,411 | 2,055,842 |
| Conditional Discord SDK | 159,736 | 159,736 | 0 | 48,353 | 41,554 |
| Total | 4,098,977 | 4,104,391 | +5,414 | 2,369,350 | 2,262,590 |

Initial gzip delta: +2,451 bytes; total gzip delta: +2,181. Sizes sum deterministic file buckets, not CDN wire traffic. Upload masters/PNGs and diagnostic tooling are excluded from the runtime graph. Existing large Phaser bundle warnings remain; this phase does not restructure gameplay payload.

## Known limitations

- Two fresh disposable-browser startup failures occurred before navigating to the application: an invalid/partial debugging-port read attempted port 80; another run timed out at `Page.enable`. Tooling now waits for a complete port line and waits for owned process cleanup before deleting its profile. Existing command deadlines and functional assertions are unchanged. Both failures are retained in local evidence; a port-file write race is the supported explanation for the first, not proof of the exact interleaving.
- A later quiet-repeat browser lost its CDP socket after four passing runs. The pending mouse event failed; no application pause was reported. Browser cleanup returned pending requests to zero and terminated the owned process. The failed trace is retained; unfinished checks passed fresh reruns without changing assertions. Closing an already-disconnected socket now skips the impossible Browser.close request.
- Suspended-audio controls also observed real hidden-page events during preparation. The existing safe cancellation path prevented issuance; unchanged foreground reruns passed. Headed evidence showed the newly created test tab was hidden before Start, so the owned runner now explicitly brings its tab forward before navigation. It does not override document visibility or suppress blur/freeze events.
- A headed quiet batch later recorded a genuine blur during countdown (zero ticks and accumulator), correctly entering pause. Later interactions in that session timed out. This is retained separately from foreground countdown-gap behavior; the final fresh uninterrupted headed batch passed.
- Host pressure was observed during diagnosis (load 3.70/4.35/5.09; swap 7075.38 MB of 8192 MB). At the later socket failure, load was 8.34/6.29/5.55 and swap 7030.81 MB. This does not establish causality for Chromium startup instability. Historical unexplained stalls and the prior CDP timeout remain unresolved limitations.
- A fresh public-registry dependency audit was rejected by automatic approval review because it would transmit dependency metadata externally. Local scans and unchanged package/lock verification are used; the accepted release's 7 advisories (2 moderate, 5 high, 0 critical) are an inherited baseline, not a fresh registry result. Reassessment remains a pre-exposure security item.
- Automated labels, focus, keyboard, motion and viewport checks are bounded coverage, not full assistive-technology or device certification. Native Discord creative acceptance for these new surfaces remains part of the later single consolidated external-user session.
- PNG reproducibility is established with pinned Sharp 0.34.3 and Node 24.20.0 on this host. Portal rendering/upload is intentionally untested and unauthorized in this phase.

## Rollback and next step

Accepted Release B `dep-dak230uq1p3s73cb18l0` is the immediate rollback reference for a future authorized Phase 1 deployment. No schema/configuration change is required. Availability must be reverified during that later rollout, not claimed from local work.

Stop for one consolidated creative review of lobby/settings/help/copy, seven icon sizes, cover crops/background and the named upload directory. Choose an existing feedback destination as part of that handoff. Merge, deployment, Portal work and announcements require a subsequent authorized phase.
