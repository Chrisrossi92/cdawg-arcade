# Phase 4B database foundation evidence

## A. Executive result

**IN PROGRESS: production schema validated; application merge/deployment next.** The explicit migration passed; Phase 4B application rollout remains pending. Official scoring remains disabled and absent from the UI. Chris confirmed the local production page appears and the visible gameplay checks passed, and approved the revised $6.30/month database cost. The prepared form was rechecked unchanged. Chris then explicitly authorized Create Database. Creation succeeded; status became available.

## B. Starting state

Authoritative checkout: `Projects/cdawg-arcade`. Started on clean, synchronized `main` at `e22f433912608363445df489cfc3eeee7ec8b5a4`; work is on `codex/phase-4b-database-foundation`. Preflight production readiness passed at `4c09960c6a5a47508b4bb6e3071f42e28b408337`. Render still identifies that revision as live. No repository or ancestor AGENTS instructions were present.

## C. Database foundation

Pinned `pg` 8.23.0, standard SQL, typed wrapper, transaction-scoped advisory migration lock, checksums and atomic metadata. Fourteen foundation tables plus migration history; only nonissuable version metadata is seeded. Seed: Balance / `balance-official-v1`, 60 Hz, 18,000 ticks, NULL digest, unimplemented validator, issuance false. See [architecture](DATABASE_ARCHITECTURE.md) for enforced and deferred invariants.

## D. Readiness and fallback

Liveness and core readiness never query Postgres. Separate persistence readiness has safe categories, a lazy bounded pool, single-flight probing and ten-second success/failure cache. Compiled tests passed with absent, explicitly disabled, compatible, unreachable and newer-than-supported databases. Stopping an initially healthy test database while the server remained running caused persistence 503 while frontend, liveness and core readiness stayed 200. Visible playthrough during the outage is not yet observed; no gameplay source changed.

## E. Render database gate (form inspected 2026-09-09)

Created after explicit final confirmation; verified configuration:

| Item | Current form / documentation |
| --- | --- |
| Name | `cdawg-arcade-production-db` |
| Workspace | Cdawg's Discord |
| Region | Virginia (US East), same region as application |
| PostgreSQL | 18 (minor version determined after provisioning) |
| Compute | `0.1c-256mb`, 0.1 CPU, 256 MB RAM |
| Compute base | $6/month |
| Storage | 1 GB, **$0.30/month additional**, not included |
| Database total | **$6.30/month**, prorated by the second |
| Autoscaling | Disabled |
| High availability | Disabled; unavailable at this size |
| Monitoring add-on | No Datadog key configured |
| Connections | 100 maximum per current provider documentation; app pool defaults to 5 |
| PITR | Hobby workspace: past 3 days per provider documentation; verify actual UI after creation |
| Logical exports | On demand, retained 7 days per provider documentation |

The form initially defaulted to 15 GB/$10.50 total. It was reduced to the intended 1 GB before review. Chris separately approved the $0.30 increase and then gave explicit final creation confirmation on 2026-09-09. Removed the database-specific broad external source and saved. The Networking section confirms all internet traffic is blocked by PostgreSQL inbound IP rules. Workspace-wide rules were not changed.

Sources: [connection limits and external access](https://render.com/docs/postgresql-creating-connecting), [recovery and backups](https://render.com/docs/postgresql-backups), [recovery instance billing](https://render.com/tutorials/postgres-on-render/backups-and-pitr). Recovery creates a new billable database; no recovery instance is authorized or created.

## F. Configuration

Introduced server-only names: `DATABASE_URL`, `PERSISTENCE_CONFIGURED`, `OFFICIAL_SCORING_ENABLED`, `DATABASE_TLS_MODE`, `DATABASE_POOL_MAX`, `DATABASE_CONNECT_TIMEOUT_MS`, `DATABASE_STATEMENT_TIMEOUT_MS`. Schema bounds are code constants rather than an environment override. Saved only `PERSISTENCE_CONFIGURED=true`, `OFFICIAL_SCORING_ENABLED=false`, and `DATABASE_TLS_MODE=render-internal` on the Arcade service. No deploy was triggered. A blank `DATABASE_URL` row is prepared for private owner entry; browser inspection is paused before entry. Owner-only secret entry protocol is documented; no secret or existing `.env` was read.

## G. Validation

- **184 unit tests / 19 files pass**, including all original 162 tests.
- **123 real ephemeral Postgres checks pass**, Docker official PostgreSQL 18.6, loopback-only disposable cluster and temporary data; no supplied production URL accepted.
- Clean install, repeat no-op, checksum mismatch, concurrent serialization, SQL failure rollback and timeout-interrupted rollback pass.
- Empty, too-old, too-new, incomplete and compatible schema distinctions pass.
- Ownership, tick bounds, interruptions, duplicate terminal outcomes, immutable facts, aggregate ownership and record-event uniqueness pass.
- Pool limit/shutdown, statement timeout/recovery and transaction rollback pass.
- Logical custom-format dump/restore into a separate disposable database passes, including restored accepted test facts and schema compatibility.
- Typecheck, frontend build and compiled backend/production build pass.
- **88 compiled production smoke assertions pass**, including artifact checks with dummy OAuth/database-secret sentinels.
- Compiled fallback matrices and actual database-stop test pass; status/log output is sanitized. Normal frontend/core requests do not change fixture table counts.
- Staged source, SQL, documentation and generated artifact scans passed: 21 staged files, zero credential-pattern findings; frontend excludes database configuration names and secret sentinels. CLI, HTTP and log redaction checks passed. No private values are included in evidence.
- Local visible browser acceptance **PASS, owner-reported on 2026-09-09**: Chris confirmed the local production page appears and the requested visible gameplay checks passed. Earlier automated access returned `ERR_BLOCKED_BY_CLIENT`; no substitute browser/tunnel was used to bypass that block. This acceptance is owner observation, not an automated browser playthrough.
- Production Discord acceptance for this phase **not yet performed**; the previously accepted Phase 3C release remains live.

A broad existing-tab listing was rejected by automatic approval review as potentially exposing unrelated session metadata. Work continued using a dedicated local test tab and a narrowly scoped Arcade Render tab; no unrelated tab contents were inspected.

## H–I. Deployment, rollback and data verification

Production migration, merge, deployment and postdeployment row-count checks remain pending. No application data write paths have been deployed. The database exists; explicit post-migration zero-row verification remains pending. Local seed-only row counts remain unchanged after compiled frontend/core requests. No application rollback or provider recovery was executed this phase. Render rollback may restore historical environment values; document rather than execute if secret/configuration restoration is ambiguous. No destructive down migration exists.

## J–L. Isolation, Git and cost

No direct browser database access, DNS/Discord Developer Portal/VPS changes, unrelated service changes or screenshots committed. Work remains on the phase branch; main and the accepted production release are unchanged. The branch validation commit contains the implementation and this evidence. Exact commit and origin synchronization are reported after commit/push.

Current expected baseline is application $7 + database $6.30 = **$13.30/month before overages**, approved by Chris on 2026-09-09. The earlier $13 assumption omitted database storage. No extra add-on, recovery resource or subscription upgrade is authorized.

## M–N. Outstanding gates and next phase

Local visible gameplay acceptance and the revised price are now owner-approved. Implementation commit `8b16678340d36ab32192852d54fe423ec78fc9c5` was pushed and verified synchronized. Final confirmation was received and creation completed. Await owner confirmation that the private database URL is saved and no longer visible. Then create/configure/migrate, validate schema, merge normally, validate main, manually deploy exact commit and complete production acceptance, safe recovery/rollback evidence and zero-data checks.

Future Phase 4C should implement server-verified identity and Arcade sessions only, including a restricted runtime role before future write capabilities. No Phase 4C implementation has begun.

## Provisioning and recovery observation

The new database reports available in Virginia on PostgreSQL 18; the minor version remains unverified. Its Recovery page confirms a three-day PITR window and exports retained for at least seven days. PITR initialization is still in progress (provider says up to ten minutes for new databases); neither restore nor export was triggered. No extra billable job, add-on or recovery database was created. Render one-off jobs are separately billed, so a controlled command on existing compute is preferred; do not create a paid job without approval.

## Private connection validation

Chris confirmed the URL was saved and hidden. A names-only editor check confirmed the expected variables. A configuration-only Save and deploy applied the saved environment to the existing accepted artifact; HTTPS core readiness remained healthy at `4c09960c6a5a47508b4bb6e3071f42e28b408337`. No Phase 4B application code has been deployed.

A controlled migration command cloned reviewed commit `8093dede38f00f7a4bccdf197ab182bece398375` into a separate temporary directory on existing service compute, installed locked dependencies without lifecycle scripts, compiled only the backend, and invoked the explicit migration CLI. It exited with the sanitized `database_command_failed` diagnostic. A separate boolean-only check showed the saved `DATABASE_URL` could not be parsed as a URL. Configuration validation therefore stopped before a database connection or schema mutation. Temporary checkout and installation logs were removed by the command’s cleanup trap. No paid one-off job was created.

Owner correction of the private URL is required. The environment editor and database Info tab are prepared; all browser inspection is paused until the corrected value is saved and no longer visible. Existing credential values, connection strings and raw driver errors were not read or reported.

### Second owner correction check

After a further owner save/deploy and confirmation that the value was hidden, a new service instance still reported an unparseable URL. Boolean-only diagnostics established that the value is present but lacks a Postgres URL prefix; trimming whitespace or removing enclosing quotes does not produce a valid Postgres URL. No part of the value was printed. Migration was not retried. The exact database Info row was inspected for control metadata only: its Internal Database URL remains a password field with enabled Show secret and Copy controls. Neither control was activated by the agent. Owner is asked to copy that complete URL and privately verify its protocol prefix before saving. Production core readiness still passes on the accepted Phase 3C revision.

## Successful migration gate

The next owner correction passed all boolean-only configuration checks: parseable private URL, internal hostname, no URL options, Render runtime marker, private transport selected, persistence configured, and official scoring disabled. No value was exposed.

Reviewed branch commit `0d7606c564a71711e7f647aaf528d7dce96004da` was cloned into an isolated temporary checkout on existing Render application compute. The explicit migration and status commands completed successfully; the completion marker was observed. Status reports `compatible`. Row counts: game_versions 1; players, guilds, guild_participations, application_sessions, auth_challenges, attempt_authorizations, game_attempts, attempt_traces, personal_game_stats, guild_leaderboard_entries, guild_game_records, guild_record_events and security_events all 0. The live checkout was not modified, temporary files were cleaned up, and no separately billed job was created.

Recovery initialization completed: Restore database and Create export controls are enabled. Three-day PITR and at-least-seven-day export retention are displayed. No restore/export was initiated. Application artifact rollback is documented rather than executed because Render can restore historical environment configuration; the earlier release predates the private database credential. Database contents will remain intact.
