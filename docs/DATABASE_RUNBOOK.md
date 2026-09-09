# Database operations

## Local verification

Use pinned Node 24.20.0. Run `npm ci --include=dev`, `npm test`, `npm run build:production`, `npm run smoke:production`, then `npm run test:database` with the existing documented dummy public build variables. Database tests require either a full local PostgreSQL installation (`pg_config --bindir` including `postgres`), or an installed, running Docker engine. `ARCADE_TEST_PG_BIN` may select a full local installation. Client-only libpq is insufficient; the runner falls back to Docker.

The Docker fallback uses the official `postgres:18.6` image, a random container name, a disposable-test label, temporary in-memory data storage, anonymous image access, and a randomly selected loopback-only port. Initial image download requires network access. No host data volume or production URL is accepted. The local-cluster option creates a fresh temporary cluster with a marker. Both generate an `arcade_test_*` database internally, isolate all fixtures, and clean up their owned resources. Never point tests at a production URL. Test shutdown stops the database to exercise a live outage.

Tests cover clean/no-op/concurrent/failed/interrupted migration, checksum and compatibility categories, ownership and aggregate references, ticks, duplicate outcomes/events, immutable facts, pool bounds, timeouts and shutdown, logical dump/restore, CLI redaction, compiled fallback modes and continued core service during outage. Unit tests separately cover probe caching and zero probe calls when absent/disabled. Browser practice acceptance remains a separate visible UI check.

## Explicit migrations

Build the backend first. Supply connection configuration through the deployment platform's private environment; never place a URL in a command, source file, chat, report, screenshot or terminal output. The CLI does not load `.env`.

- `npm run db:status`: safe schema category and per-table row counts when compatible; no row contents.
- `npm run db:migrate`: applies pending checked-in SQL and prints safe status/counts.

Run only the exact reviewed artifact. Each migration is checksummed. History must be contiguous and match the artifact. A transaction-scoped advisory lock serializes migrators; all pending migrations and their metadata commit together. Timeout, connection failure or invalid SQL rolls back; a failure cannot claim successful application. Both commands exit nonzero on failure/incompatibility without raw driver output. Resolve a failure by investigating controlled provider status and reviewed code, not by enabling verbose credential/SQL logging.

Do not edit an applied SQL file. Add a new numbered migration and explicitly update supported schema bounds after compatibility tests. No automatic down command exists. Transaction-unsafe operations such as concurrent index creation require a separately designed migration mechanism; do not insert them into this transaction runner. Do not restore or drop production tables to repair an application deployment.

The default 2-second statement and 5-second lock limits suit this empty foundation. A lock contender may time out safely and be retried after the active migrator completes. Large future migrations need an explicitly reviewed operational timeout and rollout plan.

## Readiness contract

`/api/health` is liveness. `/api/ready` is core frontend/API readiness and stays Render's health check. Neither queries Postgres. `/api/persistence/ready` is separate, returns 200 only for `compatible`, and otherwise 503 with a safe category: `absent`, `disabled`, `invalid_configuration`, `unreachable`, `empty`, `too_old`, `too_new`, `checksum_mismatch`, `incomplete`, or `closed` while draining. Only `status`, `schema`, `releaseSha`, and `version` are public.

Probes are lazy, single-flight and cached for 10 seconds after completion, including failures. No per-request pool is created. Compatibility checks validate migration history/checksums and required relation existence; this is not a complete schema-drift audit. Operator edits to live schema are prohibited. Database failure does not change core readiness, OAuth handling or practice. Leave official scoring false in all foundation environments.

## Render creation and deployment gates

1. Complete repository tests, browser checks, safe scans; commit and push the phase branch.
2. Inspect the current Render form for `cdawg-arcade-production-db`, workspace Cdawg's Discord, Virginia, smallest paid plan, version, RAM/CPU, storage, exact price, connection limit and recovery capability. Expected base: $6/month, 256 MB and 1 GB. Present details and obtain final confirmation before billable creation. Do not add HA, disk, extra recovery resources or unrelated services.
3. Keep the database dedicated to Arcade. Restrict external access; prefer only the same-workspace/region internal connection. Check the provider form for any public-network default before acceptance.
4. Owner enters the private URL only into `cdawg-arcade-production` as secret `DATABASE_URL`. Set `PERSISTENCE_CONFIGURED=true`, `OFFICIAL_SCORING_ENABLED=false`, and explicit internal transport mode. Keep the five-connection pool and bounded timeouts unless evidence requires an approved change. Never create a shared environment group.
5. If entry is unmasked, stop all browser inspection before owner entry. Resume only after confirmation that it is saved and no longer visible. Never inspect existing secret values, copy the URL, or dump the full settings page.
6. Use an explicit controlled one-off command with the reviewed branch artifact and inherited private environment to apply migration before application rollout. Confirm compatible schema and exactly one nonissuable version row; all other tables empty. Do not alter the live process's checkout to run a migration.
7. Only after database validation, merge normally into main, rerun full validation, push, manually deploy the exact main commit. Keep automatic deployment off and `/api/ready` as the health check.
8. Verify all three health endpoints, browser practice, owner-observed Discord authentication/identity and a complete practice run with results/replay, sanitized logs, resource use, unchanged Local Best labeling and absence of official claims. Run `db:status` again to prove no normal production data rows were created.

If the provider cannot run the branch migration safely without first deploying it, stop before changing the requested ordering and present the concrete alternative. Do not claim migration or deployment acceptance from a local test.

## Recovery and rollback

Local tests create a logical custom-format backup with `pg_dump`, restore into a separate disposable test database with `pg_restore`, and check schema plus accepted test facts. This validates tooling, not provider disaster recovery.

Inspect actual paid-plan backup/PITR retention after creation and record it in deployment evidence. Provider restore may create a separately billable database: document procedure and do not initiate it without separate cost approval. Never restore over live production. Future drills must use an isolated target, validate schema/accepted facts and deletion tombstones, reconcile post-snapshot accepted scores, and switch traffic only after review. A documented provider restore limitation is acceptable for this phase.

The prior application ignores the new server-only variables. Schema remains additive when rolling application code back. Leave data and migration history intact and official scoring false. Render artifact rollback can also restore the target deployment's environment: if any secret/configuration restoration is ambiguous, document the limitation rather than execute. A safe drill must record the target/configuration, verify practice on the prior code, then restore the accepted Phase 4B release, both readiness checks and row counts. No destructive database rollback is authorized.

Current creation-form review: compute $6/month plus 1 GB storage $0.30/month = database $6.30/month; application $7/month makes $13.30/month before overages. The earlier assumption of included storage was incorrect. Chris approved the increase on 2026-09-09. Explicit final confirmation was received and the database was created on 2026-09-09. No extra recovery instance or paid add-on is approved. Record exact provider terms at the creation gate and again after provisioning.
