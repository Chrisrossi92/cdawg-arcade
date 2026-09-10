# Phase 4G acceptance evidence

## A. Executive result

Implementation, merged-main validation, controlled ruleset activation and enabled single-guild production gates are complete. The consolidated owner canary and post-run verification PASS. Phase 4G is accepted for the existing single-guild private audience. See [experience and rollout design](OFFICIAL_SCORE_EXPERIENCE.md).

## B. Starting state

Main `ef06bc5`; accepted production `b0dc390`. Sessions healthy; attempts/scoring/boards disabled; seven score tables empty; exact runtime grants applied. No credential change or new cost planned.

## C. Official/practice UX

First-run explanation, browser-local history label, authorization-gated countdown, safe practice fallback, committed result states and compact statistics/board UI implemented. No historical upload.

## D. Attempt and trace integration

Canonical effective tick transitions feed the existing deterministic replay protocol. Official clock uses precomputed curves, bounded edges and five-minute cap. Interruptions disqualify and preserve playable practice.

## E. Submission and recovery

Checking state precedes commit; exact retry/status recovery handles ambiguous responses. Transient evidence is memory-only and expires/clears on terminal result or account/context change. No false server-record celebration.

## F. Personal statistics

Authenticated PB/count/average and secondary recent attempts remain separate from historical browser history.

## G. Guild leaderboard and records

Top 25, precision, current-user highlight, outside-page own rank, empty/unavailable/loading and refresh states. Only committed record metadata drives celebration. No delivery.

## H. Canary and ruleset

Single-guild explicit server configuration with hashed identifier supported. Session/issuance/submission/board boundaries fail closed. Existing placeholder remains immutable; explicit additive canonical version activation requires separate administrator access. Activated additively in production through the explicit administrator transaction: balance-replay-v1, immutable semantics unchanged, exactly one intended guild, one ruleset_activation audit event. The original placeholder remains unchanged.

## I. Automated and visual checks

Current completed runs: 362 unit tests, 681 real Postgres checks (260 foundation/fallback, 74 sessions, 99 attempts, 107 personal, 125 guild, 16 canary), and 180 compiled smoke assertions. The enabled compiled-server regression also verifies persistence, required restricted grants, and authenticated route gates with the full scoring flag set. Five frame-rate trace fixtures and the 18,000-tick golden cap pass. Existing suites retained; synthetic eligibility is explicitly injected in tests.

Browser automation exercised an integrated fixture from Start through accepted result, leaderboard and Play Again. Ten state fixtures verified checking, accepted, rejected, interrupted, unconfirmed, empty, own-rank-outside, other-guild, unavailable and practice wording. Desktop layout checks found/fixed the fixed-grid overlap; desktop rectangles no longer overlap. 375×667 iframe screenshots were inspected for eligible, accepted and populated/outside-rank layouts; no horizontal clipping observed. These are development fixtures, not live Discord evidence. The integrated interruption fixture paused, resumed, and finished with “Practice result · This run was paused”. Preparing-state and account-switch fixtures also passed: authorization pending stayed distinct, and switching accounts cleared official eligibility while keeping local history.

## J. Owner canary

Owner reported “ok it all worked” after the consolidated Discord checklist on 2026-09-10. Supplied screenshots show eligible first-run explanation, a saved 23.083-second result with new personal best/server record, and a later saved 0.700-second result with the 23.083-second best/record unchanged and rank #1. The requested Play Again check resulted in a second genuine completed run; this explains two accepted facts rather than the originally anticipated one. No additional owner test was requested. Leaderboard and controls success are owner-attested; screenshots show result/rank but not a standalone board view. Private Discord screenshots remain outside Git.

## K. Production invariants

Both genuine accepted runs were replayed read-only inside the service: 1,385 ticks and 42 ticks, each exactly matching stored authoritative ticks. Personal reconstruction reports one expected/stored group and zero mismatches. Guild reconstruction reports one entry, one record, one record event and zero board/record/event mismatches. The lower second result created no second record event. This is genuine owner activity, not synthetic production test data.

Post-run counts: players 1; guilds 1; participations 1; versions 2; application sessions 5; auth challenges 0; attempt authorizations 2; game attempts 2 (both accepted); retained traces 2; personal stats 1; guild leaderboard entries 1; guild records 1; guild record events 1; security events 1 (ruleset activation).

All three health endpoints returned 200 with compatible schema and the expected live SHA; all 12 public boundary checks passed. Enabled-runtime verification confirms the single eligible guild, other-guild denial, browser practice, exact restricted rights and unchanged canonical version. Sampled logs (50 lines) contained no credential patterns or runtime failures. Server issuance durations were 49 ms and 9 ms (server-side only, not full client latency). Post-run memory graph remained below 20% of the 512 MB limit in the observed window. No data repairs, deletions or rollback were needed.

## L. Security/privacy/isolation

No source hardcoded production guild, raw IDs in UI/evidence, new credentials, costs, scopes, DNS or public rollout. No client trace persistence or raw trace logs. Accepted evidence retains the established seven-day server retention policy. No synthetic production data or Discord messages.

## M. Deployment/rollback/Git

Branch `codex/phase-4g-official-score-experience`. Implementation commits 936a6eb and d7604a8; normal merges b07c84f and 7cd6db0. Live release 7cd6db0f89e984ff477f26a5af9155512617d4ff. All 1,223 checks passed on final merged main (362 unit, 681 real Postgres, 180 smoke), with typecheck, immutable digest, security scan and diff checks. Exact manual deploy, automatic deployment off, preserve accepted data during flag/code rollback. No documentation-only redeploy.

## N. Remaining limitations

Administrator activation used the existing credential through a masked local dialog and one-use encrypted transfer. Plaintext was never saved, printed, or placed in the runtime environment. The receiver removed its private key and transfer directory; local handoff files were removed and removal verified. No credential or password changed. Five-minute fixtures and narrow viewport coverage do not constitute mobile/device load certification. Rebuild and destructive moderation remain separately controlled as in Phase 4F.

## O. Next step

Keep the accepted single-guild canary active. Observe and polish before separately authorizing announcement delivery or public rollout; neither is implemented. No further owner gameplay is required for Phase 4G. The compact Discord viewport requires scrolling for some result/actions, as shown in the supplied screenshots; broader device/layout certification remains deferred.

Operational note: two pre-canary restarts retained disabled flags because edits to masked provider fields retained their prior values. Loading only the three nonsecret flag values before editing, blurring, saving and rereading confirmed true values before the successful restart. Activation ran exactly once. No credential changed and no administrator credential remains in the service. All deployments used the exact committed application SHA; final acceptance documentation is merged normally without redeployment.

## Enabled pre-canary baseline

Players 1; guilds 1; participations 1; versions 2 (original placeholder plus canonical version); sessions 4; auth challenges 0; security events 1 (activation). Attempt authorizations, game attempts, traces, personal stats, guild entries, guild records and guild record events each 0. Automatic deployment remains off; exact live application 7cd6db0 is unchanged. No Discord message or delivery occurred. This baseline was recorded before the accepted owner canary; final counts are in section K.
