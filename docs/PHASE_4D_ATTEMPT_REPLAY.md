# Phase 4D — Attempt issuance and deterministic replay

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

Predeployment validation passed: **292 unit tests**, **168 real Postgres foundation/fallback checks**, **74 session checks**, **100 attempt/replay Postgres checks**, and **139 compiled production smoke assertions**. Typecheck, production build, source/artifact security scans and whitespace checks passed. Production rollout evidence is recorded below after exact-commit deployment. The existing Phaser bundle-size warning remains. The official curve data is backend-only in this phase and does not enter the practice frontend bundle.

## Limitations and next boundary

This is acceptance of a disabled backend foundation, not acceptance of shared-score V1. It does not establish the future official client recorder, overflow/result/retry UI, aggregates/events, broad browser/mobile coverage, or production throughput. Modified clients can still synthesize valid traces. Production grants/ruleset/guild/flag activation remain deferred until the complete visible flow is ready. No new secret is currently expected. One consolidated live Discord canary belongs at that later milestone.
