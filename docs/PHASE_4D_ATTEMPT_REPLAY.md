# Phase 4D — Attempt issuance and deterministic replay

**PASS — disabled backend foundation deployed and verified.** Official-score product acceptance remains deferred until the complete visible flow is ready.

## Scope and starting checkpoint

Approved backend foundation behind disabled feature flags. Owner interruptions are governed by [AGENTS.md](../AGENTS.md). No manual Discord test, new secret, configuration transcription or repeated permission request is needed for this phase.

Starting main/origin: `de78fe8335fe42111df410f19126bd155894d283`; accepted live application: `0fd4c188f29f22f23109e73b2a25dfc35d88edb5`. Working tree was clean. All three health endpoints returned 200; schema version 1 was compatible. Baseline counts: one player, guild, participation and nonissuable ruleset; four sessions; zero challenges/security events and all seven score tables empty. Sessions on, official scoring/probe off; automatic deployment Off and health path `/api/ready` verified.

## Implementation

- Persisted the owner's standing operating policy for future phases.
- Added session-owned, idempotent attempt issuance, cancellation and terminal replay submission.
- Added strict evidence bounds, server timing, session/CSRF/ownership checks, expiry, concurrency serialization, atomic result/trace writes, retention and independent privilege checks.
- Added a distinct immutable official ruleset and shared official simulation with captured tick curves. Existing practice behavior/tuning remains unchanged.
- Kept the default-off attempt flag, existing nonissuable production seed and production role grants. No schema migration or production feature enablement.
- No UI flow, leaderboard, statistics, guild record events, Discord posting or historical-score upload.

See [architecture and contracts](ATTEMPT_REPLAY_ARCHITECTURE.md) for limits, timing, integrity model, future activation gates and rollback boundary.

## Validation evidence

Automated validation covers the existing unit/session tests plus replay reference fixtures, 100 seeded traces, the full five-minute cap, malformed evidence, Origin/CSRF, ownership, durable retries, conflicting races, revocation, expiry, missing/incorrect rulesets, interrupted practice-only results, rollback on a trace-write failure, trace cleanup, privilege boundaries and unchanged aggregate/event tables. Real Postgres fixtures use the owned ephemeral cluster, never production credentials or synthetic production rows.

Actual browser fixture results: 42 ticks, 63 ticks and 18,000 ticks all match the server's complete final-state hashes. The native-math long trace initially diverged at tick 1410; the versioned official curve table fixed it. Tests also prohibit native sine/power use while advancing an official run. The existing practice frame-rate/reference tests remain part of the full suite. No owner gameplay check was requested.

Predeployment validation passed: **292 unit tests**, **168 real Postgres foundation/fallback checks**, **74 session checks**, **100 attempt/replay Postgres checks**, and **139 compiled production smoke assertions**. Typecheck, production build, source/artifact security scans and whitespace checks passed. Production rollout evidence follows. The existing Phaser bundle-size warning remains. The official curve data is backend-only in this phase and does not enter the practice frontend bundle.

## Limitations and next boundary

This is acceptance of a disabled backend foundation, not acceptance of shared-score V1. It does not establish the future official client recorder, overflow/result/retry UI, aggregates/events, broad browser/mobile coverage, or production throughput. Modified clients can still synthesize valid traces. Production grants/ruleset/guild/flag activation remain deferred until the complete visible flow is ready. No new secret is currently expected. One consolidated live Discord canary belongs at that later milestone.

## Production acceptance — 2026-09-09

Implementation commit: `a72cba8`. Normal merge and deployed release: `73390d0601e300147191ddf526c37b75bf24292b`. The merged tree matched the fully validated phase tree, source/artifact scans passed again, and main was pushed before manual exact-commit deployment. Render built and deployed successfully; its compiled smoke success was observed in the displayed build log window.

Postdeployment checks:

- `/api/health`, `/api/ready`, `/api/persistence/ready`: HTTP 200 and exact release above; schema compatible.
- All three attempt routes: HTTP 503 `attempts_unavailable` with the correct Activity Origin/custom headers.
- Existing anonymous `/api/me`: HTTP 401 `expired`, confirming the enabled session path remains available.
- Fresh running-instance booleans: releaseMatches=true, sessionsOn=true, scoringOff=true, probeOff=true, attemptsOff=true. No environment variable was added or changed. The absent attempt flag uses its false default.
- Fresh read-only privilege guard: sessionOnly=true. Production grants remain unchanged; no attempt-write rights were added.
- Browser automation observed Start Game, Local Player and Local practice at the production URL. No unchanged manual gameplay was requested.
- Automatic deployment remains Off; health check remains `/api/ready`.
- Pattern-only scan of 41 displayed application-log lines found no database URL, recognized credential token/private-key pattern or sensitive variable assignment. The earlier displayed 50-line deployment window also had no matched credential pattern. This is bounded evidence, not a claim about all historical logs or every possible secret format.

Final read-only counts exactly match the starting baseline:

| Category/table | Rows |
| --- | ---: |
| players | 1 |
| guilds | 1 |
| guild_participations | 1 |
| game_versions | 1 existing nonissuable seed |
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

No production synthetic data, migration, credential, permission, DNS, Discord, audience or billing change occurred. Baseline cost remains $13.30/month before overages. No rollout regression occurred, so rollback was unnecessary. The safe rollback artifact remains `0fd4c188f29f22f23109e73b2a25dfc35d88edb5`, with current credentials and schema preserved. No repeat live rollback drill was needed for this disabled foundation.

The local browser fixture server was stopped after its complete-state comparisons passed. Final evidence is committed on the phase branch and normally merged/pushed to main as documentation only; the live application stays on `73390d0` without another deployment. No force push or history rewriting was used. No owner action was required during implementation, testing or rollout.
