# Phase 4G acceptance evidence

## A. Executive result

Implementation and branch automated validation complete. Production enablement and the one owner canary are NOT yet accepted. See [experience and rollout design](OFFICIAL_SCORE_EXPERIENCE.md).

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

Single-guild explicit server configuration with hashed identifier supported. Session/issuance/submission/board boundaries fail closed. Existing placeholder remains immutable; explicit additive canonical version activation requires separate administrator access. Not yet activated in production.

## I. Automated and visual checks

Current completed runs: 362 unit tests, 670 real Postgres checks (249 foundation/fallback, 74 sessions, 99 attempts, 107 personal, 125 guild, 16 canary), and 180 compiled smoke assertions. Final merged-main totals pending. Five frame-rate trace fixtures and the 18,000-tick golden cap pass. Existing suites retained; synthetic eligibility is explicitly injected in tests.

Browser automation exercised an integrated fixture from Start through accepted result, leaderboard and Play Again. Ten state fixtures verified checking, accepted, rejected, interrupted, unconfirmed, empty, own-rank-outside, other-guild, unavailable and practice wording. Desktop layout checks found/fixed the fixed-grid overlap; desktop rectangles no longer overlap. 375×667 iframe screenshots were inspected for eligible, accepted and populated/outside-rank layouts; no horizontal clipping observed. These are development fixtures, not live Discord evidence. The integrated interruption fixture paused, resumed, and finished with “Practice result · This run was paused”. Preparing-state and account-switch fixtures also passed: authorization pending stayed distinct, and switching accounts cleared official eligibility while keeping local history.

## J. Owner canary

Not requested yet. One consolidated under-five-minute run only after enabled production gates pass. No intermediate manual gameplay.

## K. Production invariants

No Phase 4G production score rows created. Fresh disabled deployment counts and post-canary invariant checks pending.

## L. Security/privacy/isolation

No source hardcoded production guild, raw IDs in UI/evidence, new credentials, costs, scopes, DNS or public rollout. No trace storage/logs, synthetic production data or Discord messages.

## M. Deployment/rollback/Git

Branch `codex/phase-4g-official-score-experience`. Commit/merge/live SHA pending. Exact manual deploy, automatic deployment off, preserve accepted data during flag/code rollback. No documentation-only redeploy.

## N. Remaining limitations

Administrator-only version activation still requires existing administrator access; runtime grants intentionally cannot perform it. The prior encrypted handoff was removed. No secret should be recovered or persisted in the running service. Five-minute fixtures and narrow viewport coverage do not constitute mobile/device load certification. Rebuild and destructive moderation remain separately controlled as in Phase 4F.

## O. Next step

Finish disabled deployment, controlled activation and single-guild enablement, then one consolidated owner canary. Observe and polish before separately authorized announcement delivery. Do not implement delivery.
