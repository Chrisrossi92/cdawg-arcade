# Mascot production release — accepted

Normal merge and live source: `615898dcc24214206774e551b5bfb935171eefa1`.
Approved feature: `5774a20c12cc25ac28171d77cf5097983cf4ca45`, preserved and synchronized.
Render manual exact-commit deployment: `dep-dahmqmjm8hqs73cgdbn0`.
Previous live release/rollback artifact: `7cd6db0f89e984ff477f26a5af9155512617d4ff`, `dep-dahbkcrl550s73edjedg`; retained rollback link verified. No rollback needed.

Pre-merge: feature and main clean/synchronized, target ancestor verified, eight frontend artifacts reproduced exactly using checksum-verified official Node 24.20.0. Merge retained both parents and produces the exact approved source tree. Main and feature remain clean/synchronized. No rebase, squash, force-push or branch deletion.

Post-merge: 370 unit tests, 192 compiled smoke assertions, 681 disposable PostgreSQL checks (1,243 total), typecheck, immutable ruleset digest, asset hashes, 265-frame atlas validation, 145-module bundle boundary and security scan passed. Render independently repeated 370 tests and 192 smoke assertions. Temporary PostgreSQL resources were removed.

Production: 31 public probes passed; health, core readiness and persistence readiness all HTTP 200 for the exact merge, schema compatible. Session/official/leaderboard anonymous boundaries reject correctly; approved-origin CORS passes, untrusted origins reject. Forbidden source/private paths return 404. Token malformed-body probe never sends an OAuth code. The temporary probe was corrected for quoted public-ID parsing and the already-tested token CORS 400 contract; these were harness corrections, not service failures.

Assets: four WebP sheets total 1,557,054 bytes. Every production asset hash matches its approved local artifact, correct image/webp type and immutable cache headers. Sequential single-sample downloads: 179–247 ms per atlas from this host. Previous approved local frame benchmark remains applicable (identical application/source assets): p95 frame interval approximately 16.8 ms; mascot update CPU 0.2 ms. Browser production checks cover start, focus pause/resume, results and Play Again, desktop visual placement and narrow 364×203 canvas at 390px viewport without horizontal overflow. No browser error entries observed. No fresh live GPU/frame-time instrumentation or mobile hardware certification is claimed.

Data: all fourteen table counts unchanged before/after automated deployment validation. Two accepted runs and two retained traces remain. Read-only replay matches authoritative 42 and 1,385 ticks exactly. Personal/group/record/event projections have zero mismatches. Restricted runtime role verifies true, issuance/scoring/leaderboards remain enabled, one eligible guild remains, other-guild access denies, browser remains practice. No synthetic production attempts, repairs, migrations, grants or deletions.

Runtime logs: twelve observed lines show successful startup, service live and orderly prior-instance drain, with no error lines or secret material observed. Security pattern scan passes 325 source/staged/artifact files. No local environment contents or credential values were read. No provider environment values, DNS, Discord mappings, database configuration or service settings were changed. Existing runtime configuration is consumed only by the existing sanctioned database verification functions. Auto-deploy remains Off.

Limitations: Render reports seven existing dependency advisories (two moderate, five high); dependencies/lockfile are unchanged and no automatic fix ran. Large Phaser chunk warning remains. Short local browser/network observations are not broad load or device certification. Discord identity, animation, official/personal result, leaderboard, Play Again, background interruption and Resume were subsequently confirmed by the owner. The exact database evidence and its limit are recorded below.

## Final Discord acceptance and read-only verification

On 2026-09-10 (America/New_York; verification 2026-09-11 UTC), the owner reported that identity, smooth mascot animation, official result, personal result, leaderboard, Play Again, background interruption and Resume all worked. The owner confirmed the interrupted attempt correctly became practice. This completes the requested single consolidated Discord canary; no further owner testing was requested.

Read-only post-canary verification found one new application session (6 total), one new attempt authorization (3 total), and one new result fact (3 total). The new result is `practice`, reason `rejected_interrupted`, interruption count 1 and authoritative ticks 0. It did not add a retained trace or alter official aggregates. The two existing accepted facts and retained traces remain: 1,385 ticks and 42 ticks, each replaying exactly. Personal statistics still contain one group; the guild has one entry, one record and one record event, with zero personal/board/record/event mismatches. Players/guilds/participations remain 1 each; versions remain 2; auth challenges 0; security events 1. Runtime privileges and the one-guild eligibility boundary remain valid.

Evidence distinction: the owner attested the official-result flow; the post-canary database contains no additional accepted score beyond the two existing accepted facts. This record does not claim a newly verified accepted score from this canary. The interrupted-practice outcome is directly verified. No data was repaired, created synthetically, deleted or reclassified. An initial ad-hoc SELECT used a nonexistent authorization column; the read-only probe was corrected without application or data changes.

Core and persistence readiness remain HTTP 200 on application release `615898dcc24214206774e551b5bfb935171eefa1`, schema compatible. The exact deployed application is unchanged. No rollback was required.

## Acceptance documentation

Acceptance is recorded on `codex/mascot-release-acceptance` and merged normally into main. Changes are Markdown and evidence JSON only; no application, asset, lockfile, configuration or database change. No documentation-only deployment is performed. The original mascot branch remains preserved at `5774a20`. The merged-main acceptance commit is identified by Git history rather than a self-referential hash in this document.

Machine evidence: [release and final acceptance validation](mascot-release-validation.json). Prior [Phase 3 validation](MASCOT_PHASE_3_COMPLETION.md) and [pre-merge checkpoint](MASCOT_PREMERGE.md) remain historical evidence. Dependency advisories and broad device/load limitations remain separately scoped maintenance items.
