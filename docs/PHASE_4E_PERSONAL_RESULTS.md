# Phase 4E — Transactional official results and personal statistics

## A. Executive result

**PASS — implemented, normally merged, deployed and verified as a disabled backend foundation.** No owner interruption was required. Official attempt issuance/scoring stay disabled. No public UI, guild leaderboard, record recognition or Phase 4F work is included.

## B. Starting state

Main/origin `3219400d5daa691ce33e1ba1225136ff2af8b9db`; live `73390d0601e300147191ddf526c37b75bf24292b`. Clean synchronized tree. All three health endpoints HTTP 200; schema 1 compatible. Sessions enabled, attempts/scoring/probe disabled, auto-deploy Off. Read-only counts: one player/guild/participation/nonissuable ruleset; four application sessions; no challenges/security events and all seven score tables empty.

## C. Transaction and idempotency design

See [architecture](PERSONAL_RESULTS_ARCHITECTURE.md). One transaction persists immutable terminal fact, accepted trace, personal aggregate and canonical submission digest. Session/player/authorization locks serialize competing submissions. Identical retries return the committed fact without replay/increment; different bodies return 409 `submission_conflict`. A bounded invalid trace consumes its authorization. Status recovery survives restart/lost responses. Only known serialization/deadlock aborts automatically retry, up to three transactions.

## D. Dispositions

Stable codes: accepted, rejected_invalid_trace, rejected_impossible_result, rejected_interrupted, rejected_version, expired, practice_only and conflict (HTTP submission_conflict). Bounded submissions create one terminal metadata fact; accepted only gets trace/statistics. Cancelled practice-only authorization and background expiry need no fact. Invalid transport/authentication and operational failures create no terminal fact. Rejected traces are omitted.

## E. Personal statistics

Per player and ruleset: bigint count/total, derived average, strict-improvement best, first/last timestamps and 20 recent accepted attempts. Equal scores preserve the earlier best. Existing composite keys prevent a foreign player/version/best score or forged authorization guild context. Lifetime personal totals intentionally span the player's legitimate guild contexts without returning guild information. No leaderboard/record writes.

## F. API behavior

Owner-only GET stats/recent/status routes require exact Activity-origin/custom headers and the verified session. POST retains CSRF. No player selectors, trace evidence, raw session IDs, Discord tokens or private guild context. Responses are no-store. Disabled personal routes return `official_results_unavailable`; disabled attempts return `attempts_unavailable`. Status recovery makes foreign/missing attempts indistinguishable.

## G. Failure and recovery

Atomic rollback covers before insert, between fact/trace/statistics, and deferred failure at commit. Unknown commit completion is resolved by durable recovery; retry does not double-count. Expiry during submission rolls back. Reconstruction reports mismatches with aggregate counts only; inconsistent personal totals fail closed. No automatic repair or startup repair exists. Seven-day accepted trace deletion preserves immutable score facts and statistics; rejected traces are omitted. The 24-month lifecycle threshold remains a review, not deletion.

## H. Database migrations and permissions

No migration required: schema 1 already supplies all tables and keys. No production grants or credentials changed. Disposable Postgres tests alone receive the restricted personal INSERT/UPDATE grants, then revoke them. Production remains session-only. No destructive down migration. While score tables stay empty and flags off, the accepted Phase 4D application is the rollback target.

## I. Validation totals

Local tests passed: 313 unit tests, 157 compiled production smoke assertions, 74 real Postgres session checks, 99 attempt checks and 109 personal-result/statistics checks. The full real Postgres foundation/fallback matrix passed 231 checks, including backup/restore, CLI verification and outage behavior. Typecheck, production build, immutable replay digest and security/whitespace checks passed. Tests use deterministic synthetic identities/traces and real owned ephemeral PostgreSQL, never production fixtures. No new manual gameplay check is required because gameplay/login behavior is unchanged. Only the privilege helper adds an explicit personal-write mode used by the disabled attempt capability.

Initial runs exposed local CPU/connection scheduling pressure and two fixture mistakes (a sleep hitting query timeout before session expiry; an anonymous request stopping before the persistence guard). The suite uses two unit workers, a 5,000 ms acquisition limit and 2,000 ms statement limit in the disposable database; deliberate three-second timeout failures remain covered. The expiry fixture pauses after real aggregate SQL and proves rollback; the fallback fixture uses a synthetic cookie. Production limits are unchanged.

## J. Production deployment and empty-table verification

Production accepted on 2026-09-09. Exact deployed merge: `677e71b71dee7254df1f2d8b52e83bd9da512bb8`. The phase branch was committed/pushed first; no migration or grant was required; main was normally merged, fully revalidated and pushed before manual exact-commit deployment. Render reported Live on that commit and its displayed build window included the 157-assertion compiled smoke success.

Postdeployment evidence:

- All three health endpoints returned HTTP 200 with the exact release; persistence schema compatible.
- All three attempt mutations returned 503 `attempts_unavailable`; all three personal reads returned 503 `official_results_unavailable`. All six were no-store. Correct Activity headers were supplied; no session or score was created by these checks.
- Existing anonymous `/api/me` returned 401 `expired`; the practice page remained HTTP 200. Login/gameplay source was unchanged; 74 session Postgres tests and existing automated gameplay fixtures passed on the merged tree. No repeated manual Discord test was requested.
- Fresh running-instance booleans all passed: exact release, sessions enabled, attempts/scoring/PKCE probe disabled, existing ruleset nonissuable, session-only restricted role.
- Read-only `verify-personal` returned consistent: zero expected groups, zero stored groups, zero mismatches. No repair ran.
- The 26 displayed application-log lines contained no database URL, recognized credential/private-key pattern, sensitive assignment, or tested runtime-failure pattern. The earlier 50-line build window had no matched credential/failure pattern. These are bounded scans, not certification of all historical logs or every secret format.
- The selected recent 30-minute Render charts showed one instance, memory below approximately 25% of the 512 MB limit (the new instance below the preceding instance's level), and no visible sustained CPU pressure against the 0.5 CPU limit. This idle/disabled-path observation is not a production load test or throughput claim.
- Automatic deployment remained Off, the health gate remained `/api/ready`, and the dashboard's live commit matched the release.

Exact read-only counts after the production endpoint checks matched the starting baseline:

| Table | Rows |
| --- | ---: |
| players | 1 |
| guilds | 1 |
| guild_participations | 1 |
| game_versions | 1 nonissuable seed |
| application_sessions | 4 |
| auth_challenges | 0 |
| security_events | 0 |
| attempt_authorizations | 0 |
| game_attempts | 0 |
| attempt_traces | 0 |
| personal_game_stats | 0 |
| guild_leaderboard_entries | 0 |
| guild_game_records | 0 |
| guild_record_events | 0 |

**No official production attempt or score row was created.** No production environment variable, database permission, schema, secret, cost, DNS, Discord configuration or audience changed. No regression required rollback, so no extra live rollback drill was performed. The accepted `73390d0` artifact remains the reversible application rollback target while flags remain off and score tables empty. No down migration is needed.

## K. Security

Parameterized data queries; bounded evidence, replay/request concurrency and retries; exact origins/CSRF; database-backed identity ownership; no raw errors, traces or request bodies logged. Integer statistics avoid client overflow. Production feature flags and database privileges prevent enablement from frontend configuration alone. Public health reveals no counts or identities. No new secret, cost, permission, DNS, audience or Discord change.

## L. Git and live release

Phase branch: `codex/phase-4e-personal-official-results`. Implementation commit: `ec4a12cfea6c5e8b7a18fbeb376ca34ed0541197`. Normal merge and live application: `677e71b71dee7254df1f2d8b52e83bd9da512bb8`. The merge tree matched the phase tree; all 313 unit, 157 smoke, 231 foundation/fallback, 74 session, 99 attempt and 109 personal-result checks passed again on main before push/deployment. Security and whitespace checks also passed. Final evidence is committed/pushed on the phase branch and normally merged into main as documentation only; the live application remains on `677e71b`. No force push, rebase, squash or history rewriting. Automatic deployment stays Off; no documentation-only redeployment.

## M. Remaining limitations

Backend foundation only. No public official-score UI or production official write has been authorized. No production throughput certification; reconstruction currently scans one player's accepted history under bounded timeouts. Valid traces may still be synthesized by modified clients. Process-local rate/concurrency limits are not distributed. Full client recorder/result/recovery UI and one consolidated live canary belong to the completed user-facing milestone. Earlier account-switch/browser and pop-out-layout limitations remain deferred. Existing large Phaser bundle warning remains.

## N. Recommended Phase 4F

Guild leaderboard and record events only, behind disabled feature flags, with atomic ties/ordering/idempotency and real Postgres concurrency tests. No Discord announcements or public enablement is implied. Phase 4F has not been implemented.
