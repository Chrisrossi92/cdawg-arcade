# Official attempt and replay foundation — Phase 4D

Historical Phase 4D contract. [Phase 4E personal results](PERSONAL_RESULTS_ARCHITECTURE.md) supersedes the result transaction, reason codes, rejected-trace retention, personal permissions and recovery/read APIs; the immutable replay and timing contract below remains unchanged.

This is a disabled backend foundation, not a shared-score launch. Production practice and the accepted Phase 4C session flow remain available. No leaderboard, statistics, record event, posting, score UI, or historical-score import is implemented here. The [owner operating policy](../AGENTS.md) applies; no intermediate manual Discord playthrough is required.

## Activation boundary

`ARCADE_ATTEMPTS_ENABLED` is server-only, defaults false, and is independent of `OFFICIAL_SCORING_ENABLED`, which remains false. Attempts additionally require enabled sessions, healthy schema version 1, a runtime role with exactly the permitted attempt rights, an enabled guild, and an enabled immutable ruleset matching the compiled digest/revision. Missing gates fail closed. No migration, ruleset insertion, permission grant or guild enablement runs at startup. The production role retains its Phase 4C grants; the existing `balance-official-v1` seed stays nonissuable.

The existing approved database credential can serve the same narrowly scoped application purpose with reviewed grants at a later complete-flow canary. No new credential is necessary or expected for this phase. Production grants and flags must stay unchanged until that canary is ready. Enabling the global official-scoring flag remains unsupported by the persistence configuration in this release.

## Deterministic simulation contract

Browser practice imports the original physics/tuning through shared modules, with its original native math and default behavior. Official v1 uses `shared/balance/official.ts` with the same coefficients and a captured table of time-dependent difficulty/disturbance values. These 18,000 pairs are IEEE-754 doubles generated once with the pinned Node 24.20.0 reference runtime. Native sine/power calls do not occur while advancing an official run.

This separation was necessary: an actual browser matched the 42- and 63-tick reference traces but diverged on the original native-math five-minute trace, failing at tick 1410. With the immutable curve table, browser and server match the complete final-state hashes for all three fixtures, including tick 18,000. This is observed compatibility for the tested browser, not a claim of a complete browser/device matrix. The eventual official client must use `stepOfficialBalance`; it must not submit a practice-clock trace as an official run.

Ruleset `balance-replay-v1` is a distinct definition from the nonissuable foundation seed. Its source digest covers shared physics, tuning, official step function, exact curve bytes, replay validation and definition constants. `scripts/verify-balance-rules.mjs` fails the build if those sources change without updating the reviewed definition. Once issued, never regenerate or alter that version: create a new ruleset/version ID and retain support for any valid outstanding retry window. `scripts/generate-balance-curves.mjs` is a review-only generator, never a deployment/startup step.

A tick is 1/60 second. Inputs are effective direction changes before a zero-based tick, encoded as `[tick, direction]`, where direction is -1, 0 or 1. Edges must strictly increase, change the previous direction, and remain before the claimed terminal tick. Initial direction is zero. Multiple physical edges in one tick must be reduced by the future client to the effective direction actually simulated. Maximum: 18,000 ticks, 4,096 edges, 65,536 canonical UTF-8 evidence bytes. The future client must make an overflow practice-only, never truncate evidence and claim acceptance.

The server starts from the fixed initial state and computes all physics, failure direction and difficulty phase. It accepts only the exact failure tick, or a surviving run at the 18,000-tick cap. It does not accept a submitted numeric score or client-selected initial state. Early stopping, extra ticks after failure, unknown rulesets and malformed evidence cannot become accepted facts. Reported interruptions make the result practice-only with zero authoritative ticks.

## Identity, timing and transactions

Every operation requires an existing Activity-class Secure/HttpOnly session and its CSRF companion. The exact approved Discord Activity Origin and custom request headers are mandatory. Ordinary browser practice cannot issue attempts. Player, guild and session ownership come only from persisted verified session rows; request bodies have no identity selectors.

Issuance requires membership verification within five minutes. The existing session timestamps originate from the application clock; up to five seconds of forward clock skew is tolerated relative to Postgres. More distant future timestamps fail closed. Session idle/absolute expiry and revocation remain authoritative, and locks are followed by expiry rechecks.

The UUID attempt ID is an unpredictable lookup handle, not an independent bearer credential. It is bound to the exact issuing session, player, guild and immutable version. No new nonce secret is needed. A fresh client UUID begin key is unique per player; identical requests recover the original authorization. Reusing it from another session/guild/version conflicts. One open attempt per player/game is serialized across sessions and guilds, with the existing unique database index as a second guard.

Server-issued time precedes countdown. Earliest accepted receipt is issuance plus 2,400 ms countdown plus completed ticks/60. First submission has a 330-second window; identical terminal retries have a 930-second deadline from issuance. No client timestamp is trusted. Timing includes network/countdown overhead; the cap leaves 27.6 seconds beyond countdown and play. Reconnect/rotation cannot transfer an authorization to a new session. An abandoned open authorization blocks a new one until cancellation by its still-valid owning session or deadline expiry; future UI must explain practice/retry behavior.

The transaction locks session, player, authorization, then guild in a consistent order. Ruleset metadata is read-only and immutable; its eligibility toggle is checked at operation time. For configuration cutovers, disable attempts and drain/redeploy before changing ruleset eligibility. The role is not given ruleset write permission just to obtain a row lock.

For a first terminal submission, replay result, trace, submission digest and authorization state commit atomically. Database errors roll back all of them. Concurrent identical submissions return one stored result; a different canonical trace conflicts. Completed identical retries do not replay or write again, even after trace cleanup or application restart. Current valid session/CSRF and the retry deadline still apply. Valid nonaccepted outcomes also consume the authorization. Malformed request schemas do not create a fact.

## API

All bodies are exact schemas, JSON only, uncompressed. Responses are no-store with a random diagnostic header and fixed errors. No request body, cookie, provider token, raw SQL or driver error is logged.

| Route | Body | Result |
| --- | --- | --- |
| `POST /api/balance/attempts` | `beginKey`, `rulesetId` | Bound authorization, ruleset digest/revision, tick cap and server deadlines |
| `POST /api/balance/attempts/submit` | `attemptId`, `evidence` | Terminal disposition, validated ticks, fixed reason |
| `POST /api/balance/attempts/cancel` | `attemptId` | Idempotent cancelled state while open/cancelled |

Evidence contains exactly `rulesetId`, `ticks`, `interruptions`, `inputs`. UUIDs and bounds are checked. Unknown extra body/query fields are rejected. Statuses: 400 invalid input, 401 expired session, 403 Origin/CSRF, 404 inaccessible attempt, 405 method, 409 conflict/stale verification/retry expiry, 413 body size, 415 media, 429 limit, 503 unavailable. No endpoint reads another player's result by an arbitrary ID.

Bodies have a 68 KiB HTTP ceiling and a stricter canonical trace ceiling. Four operations may be active per process, with 120 requests per socket/minute and 600 globally/minute. These socket limits are coarse and may group clients behind Render; they are not identity. A player may issue at most 20 new authorizations/minute, checked under the player lock. The runtime checks schema and privileges before operations. Rate/CPU/connection limits should be revisited with measured canary traffic, not broadened preemptively.

## Writes and retention

Only `attempt_authorizations`, `game_attempts`, and `attempt_traces` are added to the write path. Authorization rows may be inserted/updated; immutable result rows only inserted; trace rows inserted/deleted. No writes to personal statistics, leaderboards, guild records/events, ruleset definitions or schema are granted. Existing session operations retain their own minimal identity/session rights.

Traces contain canonical bounded inputs and protocol metadata, not user-supplied profiles, clocks, URLs, OAuth material or device identifiers. Raw traces expire after seven days; the cleanup interval is active only with attempts enabled and a healthy restricted role. Result facts and evidence digests remain durable. No automatic destructive deletion of accepted facts/identity is introduced. A separate privacy/retention implementation is still needed before broader launch.

The schema's disposition `accepted` means this replay passed validation. In Phase 4D it creates no official statistics, rank or record claim. Future official-flow work must add aggregate/event updates to the same successful-submission transaction before enabling the complete product. Do not silently backfill a public leaderboard from this disabled foundation's test records; all current acceptance fixtures are ephemeral.

## Integrity limits and rollout

Replay detects corruption, impossible submitted outcomes for the supplied trace, version mismatches, duplicate/conflicting requests and observable interruptions. A modified client can fabricate a valid input trace, automate controls, hide interruptions, or wait out the minimum receipt time. This is casual integrity, not proof that a human played or perfect anti-cheat. The five-minute fixture deliberately demonstrates that a generated trace can be valid.

Phase 4D production rollout deploys an exact tested commit with attempts/scoring/probe off and sessions on. Verify health, schema, disabled attempt responses, session capability, sanitized logs and unchanged score counts. No new secret, database mutation, audience, DNS, permission, billing or Discord change is part of this rollout. Roll back to the accepted Phase 4C artifact if health/session behavior regresses; no down migration or old credential restoration is needed.

Only when the complete official-score flow and visible result states are ready should reviewed role grants, a registered ruleset, approved guild availability and flags be activated for one consolidated Discord canary. Phase 4C's deferred browser/account-switch and pop-out layout limitations are not reopened here.
