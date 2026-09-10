# Phase 4F: guild leaderboards and record events

## A. Executive result

Implementation complete; deployment acceptance pending. Backend remains disabled. No UI integration or Discord delivery is included. See [architecture](GUILD_LEADERBOARD_ARCHITECTURE.md).

## B. Starting state

Clean synchronized main `43664d39dcf31a5c43a312973185eedab69a2148`; accepted production `677e71b71dee7254df1f2d8b52e83bd9da512bb8`. Sessions enabled, attempts/scoring disabled, score tables empty per accepted Phase 4E evidence. Phase 4F read-only runtime inspection reconfirmed sessions on and attempts/scoring/leaderboards off.

## C. Leaderboard model and ordering

Existing composite keys enforce one accepted best per guild/ruleset/player. Strict improvement only. All pages/ranks order ticks descending, acceptance time ascending, player UUID ascending. Top 25 by default, hard maximum 100, own rank separate, validated revision-bound keyset cursor. Latest bounded escaped names and guild-scoped pseudonymous disambiguation.

## D. Record transaction and concurrency

Guild/version record row serializes acceptance timestamps and current-record comparison through commit. Only initial or strictly higher scores generate one immutable event with a gapless sequence. Accepted fact, personal stats, guild best, record, event, evidence and stable response commit or roll back together. Identical retry returns prior metadata. Existing bounded known-abort retry remains.

## E. API behavior

Session-derived guild only, explicitly supported rulesets, read-only snapshot, no-store, safe unavailable/errors, bounded rates/concurrency and page size. No arbitrary player/guild selector; no public reads. Independent default-off board flag. Current rank is returned on board reads rather than frozen into historical submit metadata.

## F. Rebuild and administrative recalculation

SELECT-only full-history verifier checks best entries, current record and transition sequence. Exclusion/anonymization fixtures establish non-celebratory administrative behavior. Production repair execution remains separately controlled and unimplemented; the architecture specifies privacy/audit prerequisites. No auto-repair or age-based deletion.

## G. Migrations and runtime privileges

No schema migration needed. Explicit reproducible additive grant command tested with real Postgres; no new role, password, schema ownership or administrative permission. Production grant step is pending existing administrator access. Neither the service nor local checkout has a configured administrator connection; the runtime credential correctly cannot grant itself rights. Deploy compatible code before grants to avoid breaking the old release's session capability check. Administrator credential must remain outside the running application's environment.

## H. Validation totals

Final branch validation passed: 333 unit tests; 172 compiled production smoke assertions; 654 real PostgreSQL checks (249 foundation/fallback, 74 sessions, 99 attempts, 107 personal results, 125 guild). Typecheck, immutable ruleset digest and security scans passed. The existing large Phaser bundle warning remains. Synthetic identities and owned disposable PostgreSQL only; no production score fixtures.

## I. Production deployment and empty-table verification

Pre-deployment read-only status on 2026-09-10: schema compatible; players 1, guilds 1, participations 1, game_versions 1, sessions 4, auth_challenges 0, security_events 0. Each of attempt_authorizations, game_attempts, attempt_traces, personal_game_stats, guild_leaderboard_entries, guild_game_records and guild_record_events is 0. Deployment acceptance remains pending. Do not infer acceptance from local results. Live release remains the accepted Phase 4E artifact until an exact committed deployment and post-deploy checks are recorded. All seven production score-table counts must be reconfirmed before acceptance, together with three health endpoints, session gates, disabled APIs, logs and resources.

## J. Security and isolation

No credentials/real identities/traces in evidence. No new secret generated, service/cost/DNS/Discord scope/audience change. No messages posted. Private screenshots are not committed. Runtime receives no event/fact update/delete or projection delete/truncate. Raw internal errors remain outside public responses.

## K. Git and live release

Work branch `codex/phase-4f-guild-leaderboards`. Exact feature/merge/live SHAs pending. Normal merges only; no history rewrite, automatic deployment or documentation-only redeployment.

## L. Remaining limitations

Full-history verification is correctness-first and not load-certified. Changed board revision requires pagination restart. Supported archive catalog changes need a reviewed release. Administrative exclusion is a preview, not permission to delete production records. Destructive privacy/disqualification execution needs a separately reviewed audit/baseline mechanism. No live canary is due for this disabled backend phase.

## M. Recommended Phase 4G

Complete official-score UI and all user-facing result states, then one consolidated Discord canary under the owner policy. Do not implement Phase 4G or announcement delivery in this phase.
