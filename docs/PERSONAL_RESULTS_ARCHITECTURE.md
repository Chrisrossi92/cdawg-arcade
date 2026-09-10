# Official results and personal statistics

Phase 4E extends the disabled Phase 4D backend. It does not enable official play or add a frontend claim that a score was saved. Practice, session login and immutable replay rules are unchanged.

## Transaction and durable identity

The server locks session, player, authorization, then guild in the existing order. It checks cookie session/CSRF, server-derived player and guild, original issuing session, version, authorization state and database-clock deadlines. Player locking serializes aggregate changes, including submissions through separate sessions/guilds. A bounded valid evidence body is normalized by the existing parser; bounded invalid JSON uses sorted keys. SHA-256 of the canonical body is the durable submission identity. Request diagnostics are unrelated random IDs.

Within one transaction the server replays, verifies existing personal aggregates, inserts one immutable `game_attempts` fact, stores accepted trace evidence, updates accepted-only personal statistics and writes the authorization's digest/outcome. It rechecks session expiration after writes. Only a successful COMMIT returns a saved result. Any error rolls back fact, trace, statistics and digest together. There is no separately acknowledged durable-receipt queue: a failure before commit leaves an unconsumed authorization; uncertain commit completion is recovered from durable state.

Existing primary/unique keys prevent a second fact per authorization. An identical canonical retry returns the stored immutable result without replay or aggregate mutation. Different content returns HTTP 409 `submission_conflict`. A rejected bounded submission consumes the authorization too; users cannot edit it until it passes. Mutation retries require the original live session and remain bounded by the existing retry deadline. Owner-only status recovery also works after application restart or a new verified session in the same guild and is not limited to that retry window. Unknown and foreign authorizations have the same 404 body.

Only PostgreSQL serialization/deadlock abort categories (40001/40P01) retry the whole transaction automatically, at most three transactions with 5/10 ms backoff. Connection, timeout and unknown COMMIT errors do not automatically retry. A fresh status read or identical caller retry resolves uncertain completion without double counting.

## Stable dispositions

| Outcome/reason | Stored disposition | Persistence |
| --- | --- | --- |
| `accepted` | accepted | One fact, seven-day trace, personal aggregate increment |
| `rejected_invalid_trace` | rejected | One bounded metadata/digest fact; no trace or aggregate change |
| `rejected_impossible_result` | rejected | Same; includes impossible timing and nonterminal/inconsistent replay |
| `rejected_interrupted` | practice | Same; interrupted runs are never official |
| `rejected_version` | rejected | Same; unsupported or disabled ruleset/eligibility |
| `expired` | expired | A late bounded submission stores one fact; background expiry alone changes only authorization state |
| `practice_only` | cancellation status | Cancellation terminates only the authorization; no game fact |
| conflicting submission | HTTP 409 `submission_conflict` | No additional writes; original result remains authoritative |

Invalid JSON transport, excessive size/depth, malformed envelope, bad authentication/CSRF/origin, foreign ownership and operational failures create no terminal fact. They are not replay verdicts. Invalid traffic is bounded by issuance limits, one open authorization per player/game, request limits and a four-request in-process concurrency cap. Rejected evidence is never retained; only fixed-shape metadata and a digest remain. Public reasons are constrained code unions; raw replay/SQL/driver detail is never returned.

## Personal calculations and integrity

Personal lifetime statistics are keyed by `(player_id, version_id)`, across that player's authorized guild contexts. Count and total ticks are PostgreSQL bigint; APIs serialize them as decimal strings to avoid JavaScript integer loss. Average ticks and seconds are derived from integer totals, with six decimal places at this 60 Hz ruleset. Best uses a strictly higher tick count; equal/lower results still add count/ticks and update last accepted time. First/last timestamps use min/max. Accepted timestamps are monotonic per player/version, retaining PostgreSQL microsecond precision internally so reconstruction preserves the original equal-score winner.

The existing accepted-best composite foreign key enforces the same player, ruleset, ticks and accepted disposition. The immutable fact's composite foreign key enforces the issuing authorization's player/guild/version, whose session foreign key enforces its authenticated guild context. Personal statistics deliberately have no single guild key: a player's legitimate accepted fact from another guild contributes to their lifetime total, without exposing that guild. Guild-scoped best constraints belong to Phase 4F's separate tables. No foreign player or incompatible version can supply a personal best.

`npm run db:verify-personal` (compiled command: `node build/server/database/cli.js verify-personal`) performs SELECT-only reconstruction from immutable accepted facts. It compares count, total, best fact/ticks and first/last times in one SQL snapshot. Output is schema compatibility plus counts of expected groups, stored groups and mismatches, never identity values. Exit 0 means consistent, 2 means mismatch, 1 means configuration/database/schema failure. No repair command or startup repair exists. Repair would require separate reviewed operator work; synthetic fixture restoration is test-only.

Accepted submission and stats reads fail safely with `aggregate_mismatch` if their player/version is inconsistent, instead of extending or presenting bad totals. Reads use a read-only repeatable snapshot. This conservative reconstruction scans that player's accepted history; it has a statement timeout and needs capacity evaluation before public enablement. It is not a throughput certification.

## Owner-only HTTP contracts

All paths require the exact configured Activity origin, matching `X-Arcade-Origin`, `X-Arcade-Request: 1`, and a valid Activity cookie session. Same-origin GET may omit the browser's Origin header; the required custom header still enforces a preflight barrier for foreign sites. If Origin is supplied, it must match. POST retains CSRF protection. No query selectors or GET request bodies are accepted. All responses are `Cache-Control: no-store`.

- `GET /api/me/balance/stats`: supported `rulesetId`, `officialAvailable`, string `acceptedCount`, `totalTicks`, `averageTicks`, `averageSeconds`, nullable `best { attemptId, ticks, seconds }`, `firstAcceptedAt`, `lastAcceptedAt`.
- `GET /api/me/balance/attempts`: `rulesetId`, up to 20 recent accepted `attempts { attemptId, ticks, acceptedAt, disposition }`, newest first. No other player's ID is accepted. No guild IDs/context are returned.
- `GET /api/me/balance/attempts/:attemptId`: same-player/same-guild/current-ruleset committed result `{ attemptId, disposition, ticks, reason }` or authorization `{ attemptId, state, outcome }`. The opaque attempt ID is necessary for retry/recovery; raw session/database identity keys and evidence are not exposed.
- Existing POST issuance/submit/cancel contracts remain; conflicting canonical submission now has the explicit stable `submission_conflict` code.

With the runtime unavailable/disabled, all personal paths return 503 `official_results_unavailable`; attempt mutation paths return 503 `attempts_unavailable`. Request origin/method checks may reject earlier. A false frontend flag cannot enable these endpoints: server configuration, compatible database, restricted runtime grants and supported version/guild eligibility are required. In this phase the global official-score switch remains off; `officialAvailable` describes backend attempt eligibility when that internal runtime exists, not a public-score product promise.

## Retention, privileges and rollback

Accepted traces expire seven days after their recorded fact. The existing bounded scheduled design runs `AttemptStore.purge()` on the existing process timer only when the attempt runtime is enabled and ready: delete expired traces and mark overdue open authorizations expired. No paid worker or production scheduler was created. Rejected/practice/expired traces are omitted. Trace deletion leaves fact, digest, retry outcome and personal statistics intact. Metadata follows the approved lifecycle; 24 months is a review threshold, not automatic deletion.

Schema version 1 already provides all required tables, immutable-fact triggers and keys. There is no migration or production grant change. Only the disposable test role receives INSERT/UPDATE on personal statistics in addition to the earlier attempt permissions; DELETE/TRUNCATE/REFERENCES/TRIGGER and guild leaderboard/record writes remain forbidden. The session-only production role remains valid when attempts are disabled.

Application rollback to the accepted Phase 4D artifact is reversible while attempts/scoring stay disabled and score tables remain empty. Never run a destructive down migration. A future rollback after enabling official writes must preserve the Phase 4E aggregate transaction or stop issuance first; Phase 4D does not maintain personal aggregates. No future enablement or Phase 4F implementation is implied.
