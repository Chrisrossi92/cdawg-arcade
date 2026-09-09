# Phase 4B database foundation evidence

## A. Executive result

**BLOCKED at production gates; repository implementation validated.** No paid database has been created, no production migration has run, and Phase 4B has not been merged or deployed. Official scoring remains disabled and absent from the UI. The current form exceeds the approved expected cost; owner approval and local browser acceptance remain outstanding.

## B. Starting state

Authoritative checkout: `Projects/cdawg-arcade`. Started on clean, synchronized `main` at `e22f433912608363445df489cfc3eeee7ec8b5a4`; work is on `codex/phase-4b-database-foundation`. Preflight production readiness passed at `4c09960c6a5a47508b4bb6e3071f42e28b408337`. Render still identifies that revision as live. No repository or ancestor AGENTS instructions were present.

## C. Database foundation

Pinned `pg` 8.23.0, standard SQL, typed wrapper, transaction-scoped advisory migration lock, checksums and atomic metadata. Fourteen foundation tables plus migration history; only nonissuable version metadata is seeded. Seed: Balance / `balance-official-v1`, 60 Hz, 18,000 ticks, NULL digest, unimplemented validator, issuance false. See [architecture](DATABASE_ARCHITECTURE.md) for enforced and deferred invariants.

## D. Readiness and fallback

Liveness and core readiness never query Postgres. Separate persistence readiness has safe categories, a lazy bounded pool, single-flight probing and ten-second success/failure cache. Compiled tests passed with absent, explicitly disabled, compatible, unreachable and newer-than-supported databases. Stopping an initially healthy test database while the server remained running caused persistence 503 while frontend, liveness and core readiness stayed 200. Visible playthrough during the outage is not yet observed; no gameplay source changed.

## E. Render database gate (form inspected 2026-09-09)

Prepared but **not submitted**:

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

The form initially defaulted to 15 GB/$10.50 total. It was reduced to the intended 1 GB before review. No billable action was taken. User instructions require separate approval for the $0.30 increase. Public access must be disabled after creation; the provider documents an initially broad external allowlist.

Sources: [connection limits and external access](https://render.com/docs/postgresql-creating-connecting), [recovery and backups](https://render.com/docs/postgresql-backups), [recovery instance billing](https://render.com/tutorials/postgres-on-render/backups-and-pitr). Recovery creates a new billable database; no recovery instance is authorized or created.

## F. Configuration

Introduced server-only names: `DATABASE_URL`, `PERSISTENCE_CONFIGURED`, `OFFICIAL_SCORING_ENABLED`, `DATABASE_TLS_MODE`, `DATABASE_POOL_MAX`, `DATABASE_CONNECT_TIMEOUT_MS`, `DATABASE_STATEMENT_TIMEOUT_MS`. Schema bounds are code constants rather than an environment override. No production environment change has been made. Owner-only secret entry protocol is documented; no secret or existing `.env` was read.

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
- Local visible browser acceptance **pending**: the browser client returned `ERR_BLOCKED_BY_CLIENT` for the dedicated loopback test tab. Owner has been asked to allow/open the local page. No substitute browser/tunnel was used to bypass the block.
- Production Discord acceptance for this phase **not yet performed**; the previously accepted Phase 3C release remains live.

A broad existing-tab listing was rejected by automatic approval review as potentially exposing unrelated session metadata. Work continued using a dedicated local test tab and a narrowly scoped Arcade Render tab; no unrelated tab contents were inspected.

## H–I. Deployment, rollback and data verification

Production migration, merge, deployment and postdeployment row-count checks remain pending. There are no new production data rows because no database has been provisioned. Local seed-only row counts remain unchanged after compiled frontend/core requests. No application rollback or provider recovery was executed this phase. Render rollback may restore historical environment values; document rather than execute if secret/configuration restoration is ambiguous. No destructive down migration exists.

## J–L. Isolation, Git and cost

No direct browser database access, DNS/Discord Developer Portal/VPS changes, unrelated service changes or screenshots committed. Work remains on the phase branch; main and the accepted production release are unchanged. The branch validation commit contains the implementation and this evidence. Exact commit and origin synchronization are reported after commit/push.

Current expected baseline is application $7 + database $6.30 = **$13.30/month before overages**, subject to new approval. The earlier $13 assumption omitted database storage. No extra add-on, recovery resource or subscription upgrade is authorized.

## M–N. Outstanding gates and next phase

Resolve local browser access; finish start/countdown, keyboard/visible controls, pause/resume, loss/results/replay and narrow-layout acceptance. Obtain separate approval for the increased current price and final billable creation confirmation only after all precreation gates pass. Then create/configure/migrate, validate schema, merge normally, validate main, manually deploy exact commit and complete production acceptance, safe recovery/rollback evidence and zero-data checks.

Future Phase 4C should implement server-verified identity and Arcade sessions only, including a restricted runtime role before future write capabilities. No Phase 4C implementation has begun.
