# Phase 4B production database foundation

## A. Executive result

**DEPLOYED; final owner Discord acceptance pending.** The paid database exists, schema migration passed, and Phase 4B was merged normally and manually deployed. Official scoring remains disabled, with no official APIs or UI. Browser practice and all three health checks pass. No production gameplay rows were created by the completed browser checks.

Accepted technical deployment: `c98e6bdd0fa4bdcb96332f3b17ec39fec679b74b`. The remaining gate is Chris's fresh Discord authentication/practice/results/replay/focus-change check and a final row-count check after it. This document does not claim that gate passed.

## B. Starting state

- Authoritative checkout: `Projects/cdawg-arcade`.
- Initial branch: clean, synchronized `main` at `e22f433912608363445df489cfc3eeee7ec8b5a4`.
- Working branch: `codex/phase-4b-database-foundation`.
- Prior accepted live release: `4c09960c6a5a47508b4bb6e3071f42e28b408337`; readiness passed before work and during failed builds.
- No repository or ancestor AGENTS instructions were present.

## C. Foundation

Pinned `pg` 8.23.0; standard SQL; typed connection/transaction wrapper; bounded pool/timeouts; sanitized errors; explicit shutdown. No ORM, gameplay changes, normal gameplay write paths, application-session implementation, or automatic startup migrations.

Fourteen foundation tables plus migration metadata use UUIDs, bounded decimal snowflakes, `timestamptz`, integer ticks, ownership foreign keys, uniqueness/check constraints, immutable terminal facts, and deliberate restrict/cascade rules. See [architecture](DATABASE_ARCHITECTURE.md) for exact invariants and deferred write-path responsibilities.

Migration history is checksummed and contiguous. A transaction-scoped advisory lock serializes migration; all SQL and metadata commit together. SQL failure and timeout interruption roll back without false success. No destructive down migration exists.

The only seed is Balance / `balance-official-v1`, 60 Hz, 18,000 ticks / 300 seconds, NULL simulation digest, validator `unimplemented`, issuance false. Production read-only verification confirmed it remains nonissuable. Future official issuance needs a reviewed real validator definition; no digest was fabricated. The 24-month inactivity threshold is review only; no automatic deletion is implemented. Historical local scores are never imported.

## D. Readiness and fallback

| Endpoint | Production result |
| --- | --- |
| `/api/health` | 200, alive, exact deployed revision |
| `/api/ready` | 200, ready, exact deployed revision; remains Render health check |
| `/api/persistence/ready` | 200, available, compatible, exact deployed revision |

Public response keys were checked: status, releaseSha, version; persistence also schema. No connection details, SQL, driver errors or paths appear. Core health/static/OAuth paths never query Postgres. Persistence probes are lazy, single-flight and cached for ten seconds, including failures.

Real disposable-Postgres tests stopped an initially healthy database while the compiled server remained running: persistence became 503, while frontend, liveness and core readiness remained 200. Absent, disabled, unreachable and incompatible configurations also passed. The live production database was not deliberately stopped. Browser-visible outage gameplay was not separately observed; the compiled fallback tests and unchanged gameplay code establish the tested boundary.

## E. Render database

| Setting | Verified result |
| --- | --- |
| Name | `cdawg-arcade-production-db` |
| Workspace | Cdawg's Discord |
| Region | Virginia (US East), same as application |
| PostgreSQL | 18.6, verified through a safe version query |
| Compute | `0.1c-256mb`, 0.1 CPU / 256 MB RAM |
| Compute cost | $6/month |
| Storage | 1 GB, $0.30/month additional |
| Database total | $6.30/month, prorated by the second |
| Storage autoscaling | Disabled |
| High availability / monitoring add-on | Not enabled |
| Status | Available |
| Storage observation | 8.32% of 1 GB used at acceptance check |
| Connections | Provider-documented maximum 100; application pool 5 |
| PITR | Three-day Hobby window; initialization complete, restore control enabled |
| Logical exports | Retained at least seven days, export control enabled |

Chris approved the increase from the earlier included-storage assumption, then separately authorized the billable creation. No recovery instance, paid job, add-on or workspace upgrade was created.

Database-specific external access is **blocked and verified after page reload**. The initial removal required a separate confirmation dialog; the first on-page warning alone did not prove persistence. Final validation caught that, the confirmation was completed, and a fresh page showed no database IP sources plus the explicit internet-blocked warning. Workspace-wide rules were untouched. The app's private persistence readiness stayed 200 after this restriction.

Sources: [connections and limits](https://render.com/docs/postgresql-creating-connecting), [recovery](https://render.com/docs/postgresql-backups). Recovery creates another billable database; it was not initiated.

## F. Configuration and secret handling

Server-only names: `DATABASE_URL`, `PERSISTENCE_CONFIGURED`, `OFFICIAL_SCORING_ENABLED`, `DATABASE_TLS_MODE`, `DATABASE_POOL_MAX`, `DATABASE_CONNECT_TIMEOUT_MS`, `DATABASE_STATEMENT_TIMEOUT_MS`. Schema support bounds are code constants, not an environment override.

Production explicitly has persistence configured, official scoring false, Render private transport, and a pool of five. Timeout defaults remain bounded. The private transport mode requires Render's environment marker and an internal hostname; external connections require verified TLS.

Chris personally entered/corrected the URL. Browser inspection stopped during entry and resumed only after confirmation that it was saved and hidden. Neither the URL nor existing credential values were read or reported. Runtime checks returned only safe booleans. No `.env`, preservation backup, shared environment group or frontend database variable was used.

Initial malformed URL values were rejected before connection or migration. Configuration-only restarts applied saved settings to the prior accepted artifact. After successful URL correction, two application builds stopped at the public configuration guard because the frontend Discord application ID setting was invalid. The public ID was corrected to match the working backend, allowed to finish loading in Render's editor, and verified saved through an expected-value boolean. No secret values were printed and no invalid build reached traffic.

## G. Validation

- **184 unit tests / 19 files**, including the original 162, passed on the branch, merged main, and Render.
- **123 real ephemeral Postgres checks** passed on the branch and main using PostgreSQL 18.6 in an owned loopback-only disposable Docker cluster.
- Migration install/no-op/checksum/concurrency/failure/interruption, compatibility categories, ownership, ticks, interruption constraints, duplicate terminal outcomes, aggregate references and record uniqueness passed.
- Pool bounds, timeout/error sanitation, shutdown, transaction rollback, readiness cache/coalescing and disabled-probe behavior passed.
- Local custom-format `pg_dump` / `pg_restore` into a separate disposable database passed, including restored schema and accepted test facts.
- Typecheck, frontend/backend/production builds passed locally and on Render.
- **88 compiled production smoke assertions** passed locally and on Render; all fallback matrices passed locally.
- Source/staged SQL/docs and generated artifact scans passed: no credential-pattern findings or secret sentinels; frontend excludes database/private configuration names. CLI/HTTP/runtime output checks passed.
- Owner reported local production page visible and requested visible gameplay checks passed before database creation. Earlier automatic browser access was blocked; no alternate tunnel/browser bypass was used.
- Production browser: Local practice, Local Player, Local Best 0.7s; Start Game/countdown; terminal result at 0.7s with “Saved locally”; existing Local Best remained 0.7s; Play Again began a fresh countdown. No direct local-storage access or reset was performed.
- Official session/attempt/leaderboard routes tested returned 404. No official score claim was rendered.
- Production Discord acceptance for this exact release remains **pending owner report**.
- Runtime logs show normal listening/draining and release metadata, without database/credential/raw technical error output in the inspected window.
- Application CPU/memory charts were below allocated limits: low steady utilization with brief deployment/migration spikes; no saturation/OOM evidence. This is a short acceptance observation, not a load test.

Existing large-frontend-bundle warning and dependency audit findings remain as documented in prior deployment work; no unrelated dependency remediation was attempted. Render's pruned dependency audit reported 7 advisories (2 moderate, 5 high).

## H. Deployment and rollback

The migration ran from exact reviewed branch commit `0d7606c564a71711e7f647aaf528d7dce96004da`, in a separate temporary checkout on existing service compute. Locked dependencies were installed without lifecycle scripts; only the backend was compiled. The explicit migration and schema-status commands completed successfully. Temporary checkout/logs were removed; the live checkout was never modified. No separately billed one-off job was created.

After compatible schema and zero-data checks, the phase branch was merged normally into main as `c98e6bdd0fa4bdcb96332f3b17ec39fec679b74b`. Full validation passed, main was pushed, and that exact commit was manually deployed. Successful deployment was observed on 2026-09-09 at 4:54 PM EDT. Automatic deployment is **Off** and health path remains `/api/ready`.

The earlier failed builds preserved the previous live release. No destructive database action occurred. Artifact rollback drill is documented rather than executed because Render may restore historical environment configuration, including the newly added database credential. The prior code was observed healthy with the new server-only variables during configuration-only restarts, demonstrating that compatibility boundary. Restore the exact accepted Phase 4B artifact with reviewed current configuration if a future rollback is performed; never drop tables or run down migrations.

Provider recovery was inspected but not executed because it creates an additional billable database. Future restore drills require separate approval, an isolated target, accepted-fact reconciliation and reapplication of deletion tombstones before traffic. No live database was overwritten.

## I. Production data verification

After migration and again after production browser gameplay:

- `game_versions`: exactly 1 nonissuable application-owned seed.
- All 13 other foundation tables: **0 rows** — players, guilds, guild_participations, application_sessions, auth_challenges, attempt_authorizations, game_attempts, attempt_traces, personal_game_stats, guild_leaderboard_entries, guild_game_records, guild_record_events, security_events.

A final count check after owner Discord acceptance remains pending. Migration metadata is administrative history, not a gameplay record.

## J. Security and isolation

No connection strings, credential values, account IDs or sensitive provider identifiers are stored in this evidence. No screenshots were committed. The browser never accesses Postgres directly. DNS, Discord Developer Portal, Arcade bot credentials, VPS and unrelated services were untouched. Database inbound-rule edits were scoped to this database.

A broad tab-list attempt was rejected by automatic approval review; work used scoped tabs afterward. The initial DB credential is administrative. Before future authenticated write functionality, establish separate least-privilege runtime and migration roles; public database privileges are already revoked. There are no production write repositories in this phase.

## K. Git state

- Implementation commit: `8b16678340d36ab32192852d54fe423ec78fc9c5`.
- Phase branch tip at merge: `23871c6` (successful migration evidence).
- Main merge and deployed artifact: `c98e6bdd0fa4bdcb96332f3b17ec39fec679b74b`.
- Later evidence-only commits do not change deployed application code. Final main SHA and origin/working-tree verification are reported after documentation commit.
- No squash, rebase, force-push or history rewrite.

## L. Cost

Application $7/month + database $6.30/month = **$13.30/month before overages**. Hobby workspace subscription remains $0. Storage is additional, not included in the $6 compute price. Autoscaling/HA/add-ons are off. Recovery would create additional cost and was not started. Builds used the existing service's included build usage; no paid one-off job or extra compute resource was provisioned.

## M. Remaining limitations

Owner Discord acceptance and the subsequent final row check are outstanding. Provider PITR restore is not exercised; logical restore passed locally. Artifact rollback is not exercised because of environment-restoration ambiguity. Short resource observations do not establish sustained capacity. Schema compatibility checks history/checksums and required relations, not every possible manual schema mutation. All session/score validation/write logic remains intentionally deferred.

## N. Recommended Phase 4C

Server-verified identity and Arcade sessions only, with restricted runtime privileges and tests for server-owned identity/guild/session boundaries. No Phase 4C implementation has begun. Official issuance, score submission, replay validation, shared statistics/leaderboards and announcements remain out of scope.
