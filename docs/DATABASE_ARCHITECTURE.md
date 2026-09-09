# Persistence foundation (Phase 4B)

Status: database provisioned, schema migrated, application deployed, and owner Discord acceptance plus final zero-data verification passed. See [validation evidence](PHASE_4B_DATABASE_FOUNDATION.md). This phase adds no official scoring, application sessions, score submission, replay validator, leaderboard UI, or Discord posting. Existing browser practice and Local Best remain unchanged. Historical local scores are never imported automatically.

## Boundary and driver

Only Express imports `server/database`. The browser never receives a database URL, opens a Postgres connection, or writes a persistence record. `pg` is pinned in the lockfile; the wrapper provides typed results, transactions, sanitized error categories, and explicit pool closure. SQL values use parameters. Identifiers used by migration/status tooling come only from checked-in manifests; migration SQL is trusted version-controlled code.

Persistence is lazy: configuration alone does not connect. `/api/health`, `/api/ready`, static assets, OAuth exchange, and practice never call the pool. Only the separate persistence check and explicit administrative commands access it. No migration runs during ordinary web startup. Normal gameplay cannot write player, guild, session, attempt, aggregate, or event records.

| Configuration | Behavior |
| --- | --- |
| No database URL | Core practice works; persistence reports `absent` |
| URL without explicit opt-in, or opt-in false | No pool; `disabled` |
| Opt-in true, official flag false | Readiness probes only; no feature activation |
| Official flag true | Unsupported in this phase; `invalid_configuration`, no official features |
| Invalid configuration, failed connection, incompatible schema | Persistence unavailable; core practice independent |

A future private canary requires separately reviewed application code and authorization. There is deliberately no canary switch that enables unfinished functionality today.

## Connection configuration

`DATABASE_URL` is secret and server-only; never use a VITE prefix. Logs, public readiness and CLI diagnostics never include it, a hostname, username, SQL, or raw driver error. `.env.example` contains placeholders only. Configuration is read on startup.

| Name | Default / contract |
| --- | --- |
| `PERSISTENCE_CONFIGURED` | Absent/false: no connection; exact `true` explicitly opts in |
| `OFFICIAL_SCORING_ENABLED` | Absent/false only; remains disabled |
| `DATABASE_TLS_MODE` | `verify-full`: TLS with certificate verification |
| `DATABASE_POOL_MAX` | 5, allowed 1–10 per web process |
| `DATABASE_CONNECT_TIMEOUT_MS` | 1500, allowed 100–5000 |
| `DATABASE_STATEMENT_TIMEOUT_MS` | 2000, allowed 100–10000 |

Query timeout is statement timeout plus 500 ms; idle transactions are limited to 5 seconds, idle pool clients to 10 seconds. Runtime shutdown closes the lazy pool within the existing process drain deadline. Pool limits multiply by number of processes; reserve capacity for migrations and provider operations.

For Render's internal URL only, use `DATABASE_TLS_MODE=render-internal`. It requires the provider's `RENDER=true` environment and an internal `dpg-…-a` hostname with no domain suffix. This is explicit private-network transport, not verified TLS. Other production hosts require verified TLS. URL query options are rejected to prevent hidden TLS/driver overrides. `disable` is accepted only for loopback and unmistakably named `arcade_test_*` databases. See [Render connection guidance](https://render.com/docs/postgresql-creating-connecting) and [private versus external connections](https://render.com/tutorials/postgres-on-render/connection-strings).

Supported schema minimum and maximum are code constants, both **1**. There is no environment override that can misrepresent compatibility.

## Schema and invariants

All internal identifiers are UUIDs, Discord snowflakes are bounded decimal strings (never JS numbers), timestamps use `timestamptz`, and duration uses integer ticks. Bounded text with checks avoids rigid database enums. No real user/guild data is seeded.

| Table | Foundation invariant / intended access |
| --- | --- |
| `players` | Unique Discord ID, bounded profile fields; inactivity review index |
| `guilds` | Unique Discord ID; disabled by default |
| `guild_participations` | Composite player/guild key; guild membership lookup index |
| `game_versions` | Immutable ruleset definition, 60 Hz, cap at 18,000 ticks |
| `application_sessions` | Unique hashed token, participation ownership, expiry and owner indexes; schema only |
| `auth_challenges` | Unique binding digest, bounded encrypted verifier, expiry index; schema only |
| `attempt_authorizations` | Idempotent begin key per player, one open attempt per player/game, optional session ownership |
| `game_attempts` | One terminal result per authorization; composite ownership/version FK; accepted results require positive bounded ticks, zero interruptions and evidence |
| `attempt_traces` | Bounded encoded evidence, expiry index; deleted with its attempt |
| `personal_game_stats` | Best reference must match accepted attempt's player, version, and tick count |
| `guild_leaderboard_entries` | Best reference must also match guild; rank index supports ordered reads |
| `guild_game_records` | Accepted record must belong to guild/version; absent record requires zero sequence |
| `guild_record_events` | Unique accepted record attempt and guild/version sequence; previous record ownership and strict improvement checked |
| `security_events` | Bounded event/reason categories, explicit expiry; no raw request payload column |
| `schema_migrations` | Contiguous versions, exact filename and SHA-256 checksum, applied timestamp |

Parent deletions restrict by default. Trace deletion alone cascades from an explicitly deleted attempt. Attempts and record events reject updates, including nonaccepted terminal outcomes. Administrative owners can alter schema, so these constraints do not replace least-privilege application roles or audited privacy operations. Public schema/table/function privileges are revoked. The initial provider credential is administrative; before enabling future writes, introduce a separate restricted runtime role and retain migration privileges only for explicit administration.

The only seed is `balance-official-v1`, game key `balance`, 60 Hz, 18,000 ticks / 300 seconds, NULL simulation digest, validator `unimplemented`, issuance false. It cannot be enabled as-is, and its rules are immutable. A future reviewed migration must replace this unreferenced nonissuable placeholder with a correctly derived definition (or introduce a new distinct ruleset); never fabricate a digest or mutate a used definition. No production attempt may reference the placeholder. Test-only fixtures exercise constraints without implementing issuance.

## Intentionally deferred

Ownership references are enforced now. Transactional counter updates, monotonic record sequencing, tie ordering, validated acceptance timestamps, ruleset/validator matching, issuance eligibility, session revocation/idle policy, encrypted-context semantics, challenge consumption, authorization state transitions, and deletion workflows require their future write paths and tests. The schema alone does not validate gameplay evidence or authorize a user. Accepted facts may be deleted only by a future explicit privacy/retention operation; no scheduled deletion exists.

The 24-month inactivity threshold triggers review, not automatic deletion. Future restore drills must reapply deletion tombstones and reconcile immutable accepted facts before any restored database receives traffic. Interrupted runs will be practice-only; this phase does not change gameplay.
