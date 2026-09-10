# Guild leaderboards and record events

Phase 4F backend only. No UI, notifications, Discord messages or local-score import.

## Identity, rulesets and ordering

A verified cookie Activity session supplies player and guild. The read transaction checks unrevoked/unexpired session and enabled guild. Request-supplied guild/player selectors are rejected. The code-owned supported ruleset catalog defaults to the immutable Balance replay ruleset; future archives must be explicitly registered, never selected merely because an arbitrary database row exists. Disabled issuance makes a supported board read-only, independently of whether board reads are enabled. Unsupported rulesets fail safely and scores never mix between versions.

The existing composite primary key gives one entry per guild/version/player. Composite accepted-fact foreign keys bind ownership, guild, version, authoritative ticks and accepted disposition. Only strictly higher ticks replace an entry. Equal/lower results retain its original best attempt and acceptance time.

Every ordering uses ticks DESC, best acceptance time ASC, internal player UUID ASC. Default page size is 25; maximum is 100. Rank is the one-based row number across the whole guild/version board, with the caller's entry and `inPage` returned separately. Current record is separate from the caller's best.

Cursors are canonical base64url encodings with an accepted-best anchor and a context digest. The server validates shape/size, ruleset, session-derived guild, board revision, and anchor membership, then retrieves the complete ordering tuple from the database. It does not trust client-supplied score/time/identity values. The digest is context binding, not a secret signature; changing it cannot bypass server authorization or anchor validation. Any accepted result changes the revision and invalidates outstanding cursors: restart pagination on `invalid_cursor`. Static-revision pagination has no gaps or duplicates; no promise of snapshot continuation across concurrent changes. PostgreSQL microseconds remain intact in SQL comparisons even though display timestamps use ISO milliseconds.

Names come from the latest server-verified player row, normalized, stripped of control/bidi characters, limited to 80 Unicode code points and HTML-escaped. Future UI must treat the result as text with the defined escaping contract, never arbitrary markup. Equal names are disambiguated by a stable 80-bit guild-scoped pseudonymous `playerTag`, derived from internal random UUIDs. Tags differ across guilds. No raw Discord IDs, session IDs, database IDs, avatars or arbitrary image URLs are returned.

## Transaction and concurrency

Mutation lock order is session, player, authorization, guild eligibility SHARE lock, personal statistics, player's guild entry, guild/version record. Missing personal/entry rows are protected by the player lock. The record placeholder is inserted with ON CONFLICT and locked before assigning acceptance time or inserting the immutable fact. No external request occurs while holding it.

Acceptance time is at least the current database clock, the player's previous accepted time plus one microsecond, and this guild/version's previous accepted time plus one microsecond. The record lock remains held through commit. This serializes accepted history within each guild/version, including non-record results. It avoids timestamps assigned before waiting that could disagree with committed record order.

One transaction validates replay, creates the immutable accepted fact and bounded trace, increments personal statistics, updates guild best only on strict improvement, and compares the locked record. First accepted positive score establishes sequence 1; strictly higher scores increment by one and insert exactly one immutable event. Equal/lower scores do neither. Events identify new and previous accepted attempts/ticks and occurrence time. A null previous record distinguishes initial records. Unique guild/version/sequence and unique record attempt prohibit duplicates; immutable triggers prohibit fact/event updates.

Recognized serialization/deadlock failures use Phase 4E's bounded retry; other failures are not blindly replayed. Failure before event insert or at deferred commit rolls back fact, personal/guild projections, record, trace and authorization response together. Repeated identical submission returns the same prior response; conflicting evidence remains a conflict. After uncertain commit, status lookup recovers the committed result.

The stable response is persisted relationally: the immutable result, evidence digest and record event carry its values. `personalBest` and `guildBest` derive from earlier immutable accepted facts, while `newGuildRecord` and `recordSequence` derive from the immutable event. Subsequent improved scores do not rewrite these historical statuses. No mutable current rank is embedded in this response. Current rank is available through the board API. Explicit future privacy removal may intentionally end historical result recovery; it must not silently rewrite an apparently immutable response.

## Reads and limits

`GET /api/guild/balance/leaderboard` requires exact approved Activity origin/custom headers and an unambiguous secure session cookie. OPTIONS is read-only. Other methods, arbitrary selectors, invalid sizes and malformed/cross-context cursors fail safely. All responses use no-store. Generic unavailable responses hide database and projection diagnostics. Per-address, global and concurrent request bounds supplement database query/pool timeouts.

A read-only repeatable-read transaction covers authorization, reconstruction verification, page, own rank and record. No query can modify rows. Full reconstruction currently makes integrity fail closed at the cost of scanning accepted history for this board. This is a deliberately bounded V1 foundation, not a large-board performance certification. Before large-volume launch, benchmark and choose a separately reviewed incremental integrity strategy; do not silently remove the check.

## Reconstruction and administration

`npm run db:verify-guild` is explicit SELECT-only administration. It compares expected player best, current record and every transition against stored entries/records/events; output is counts/status only. Missing, contradictory and foreign projections fail verification. It never repairs on startup or read.

Reconstruction uses ALL immutable accepted attempts, ordered by acceptance time, player UUID and attempt UUID, not just final best rows. Running maxima identify genuine strict transitions, with row-number sequences and prior-record references. Without accepted history, historical transitions cannot reliably be reconstructed. Trace expiry does not remove accepted facts and does not change projections.

`previewExclusion` is internal administrative/test-only planning. It recomputes projected entry count and current-record ticks excluding explicitly selected internal players, marked `administrative_preview`, with zero competitive events. Fixtures cover record-holder exclusion falling back to a lower eligible score, removing the only player, and anonymizing a display name without changing ownership/rank/events.

No destructive repair executor or public moderation endpoint ships here. A later approved deletion/disqualification procedure must: disable affected issuance/reads; lock the same board; establish the policy scope; preview and verify rebuilt personal/guild projections; anonymize or remove identity as required; maintain a separate restricted administrative audit with reason, scope and before/after verification; and resume only after reconciliation. Administrative record recalculation must never call competitive event creation. Existing competitive events remain historical facts unless a separately authorized privacy purge requires removing identifying references; an audit/reconstruction baseline must distinguish that deliberate removal from corruption. Do not renumber historical competitive events to manufacture a new celebration. A migration and explicit audit/baseline policy will be needed before destructive repairs execute. Twenty-four months remains review-only, not automatic deletion.

## Feature flags, grants and rollback

`ARCADE_LEADERBOARDS_ENABLED` defaults false and gates board reads separately. Sessions stay enabled; attempts, official scoring and leaderboards stay disabled for this phase. Granting permissions does not mount a write route. No environment flag is automatically enabled by code or migration.

Schema 1 already supplies the required tables, indexes, composite constraints and immutability triggers; no schema migration is needed. `npm run db:grant-results` is an explicit administrative command, never called at startup. It checks compatible schema, disabled scoring/attempt/board flags, and a nonadministrative existing runtime target. It creates no role/password and grants only:

| Tables | Additional runtime rights |
| --- | --- |
| All seven score tables | SELECT |
| attempt_authorizations, personal_game_stats, guild_leaderboard_entries, guild_game_records | INSERT, UPDATE |
| game_attempts, attempt_traces, guild_record_events | INSERT |
| attempt_traces | DELETE for existing bounded retention |

No new sequence rights are needed: IDs are UUIDs and record sequence is updated under the row lock. No table ownership, schema creation, migration, role management, event/fact UPDATE or DELETE, projection DELETE, or TRUNCATE is granted. The runtime guard accepts either the existing session-only capability or the exact reviewed result capability while routes are disabled; incomplete/excessive capabilities fail closed. The administrator credential must be used only in a separate short-lived administrative process, never substituted into the running service's restricted DATABASE_URL.

Deployment ordering exception: the accepted Phase 4E application rejects score-write grants even with feature flags off. Therefore preserve sessions by deploying the tested compatible Phase 4F artifact with the existing restricted role FIRST, then applying the reviewed grants through the separate administrator process. No schema change is needed before deployment. Verify both states, flags, health and empty counts. Never apply grants first to the old live artifact merely to follow a nominal sequence.

After grants, the Phase 4F artifact with all score flags off is the preferred rollback posture. To restore the older Phase 4E artifact, first explicitly revoke only these newly added write privileges, verify session-only capability, then deploy the older SHA; preserve all SELECT/identity/session rights, schema and data. No credential restoration or destructive down migration is needed. Do not run a live rollback drill just to repeat established flag behavior.

## Delivery boundary

Events contain no channel, message content, Discord message ID, delivery state, bot credential or mention targets. This phase has no dispatcher or worker. Any future announcement phase must explicitly approve a destination, permissions, delivery policy and starting sequence/time. Historical rows must not automatically backfill merely because they lack delivery state.
