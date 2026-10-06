# Chainshift V1 Slice 7 — release rehearsal

## Frozen candidate (before validation)

- Branch: `codex/soft-launch-brand-player-cleanup`.
- HEAD: `499a818d3cdc00ae86ff222d162da8d5f41f7eb7`; working tree clean.
- Graph: `chainshift-graph-v2`; checksum `fnv1a64:029bb9393f7bbe48`.
- Rules: `chainshift-rules-v1`.
- Database: migrations 001 and 002; general compatibility range 1–2, Chainshift readiness requires migration 002, correct checksums, guard triggers and restricted grants.
- Client: `chainshiftReleased=false`; explicit `chainshift-integration` mode only.
- Server: both `CHAINSHIFT_ARCADE_ENABLED=true` and `CHAINSHIFT_RANKED_ENABLED=true`, plus eligible verified session, configured compatible database and readiness. Missing flags are off.
- Delivery: `liveChainshiftDeliveryEnabled=false`; reconciler default off; explicit candidate model accepts only fake adapter. No live adapter/worker wired.
- Local candidate: `npm run dev:chainshift:arcade`; loopback UI 5266, API 5267, synthetic identities and disposable PostgreSQL only. No dotenv/production credentials.
- Validation runtime: pinned Node 24.20.0 unavailable; bundled Node 24.19.0 used via `/Users/christopherrossi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` prepended to PATH. Docker PostgreSQL 18.6.
- No push, deployment, publication, live delivery or audience change is authorized or performed.

## Completion report

### 1. Starting state

Clean accepted Slice 6 commit `499a818d3cdc00ae86ff222d162da8d5f41f7eb7`, branch above. No unrelated changes were incorporated.

### 2. Exact release candidate

Product candidate remains exactly `499a818d3cdc00ae86ff222d162da8d5f41f7eb7`. Slice 7 adds this report and two validation harnesses only. No runtime, corpus, migration, configuration, or feature changes. The containing Slice 7 evidence commit is identified in the final handoff; its parent is the frozen candidate.

### 3. Graph and rules

`chainshift-graph-v2` / `fnv1a64:029bb9393f7bbe48` / `chainshift-rules-v1`. Referee and publication validation require these pins. Mismatched publication/resume fails closed; database publication facts are immutable. Existing tests retain graph-v1/checksum/rules metadata in archived practice results and exclude them from current comparisons. Reviewed enrichment composes a new snapshot rather than redefining v1. The ten accepted local puzzles pass graph/certificate validation; topology does not certify universal phrase recognizability.

### 4. Database state

Clean owned PostgreSQL 18.6 clusters applied `001_foundation.sql` and `002_chainshift.sql`. Reapplying is a no-op. Restricted session runtime passes Chainshift readiness; owner role fails that check intentionally. Missing migration, bad checksum, disabled guard trigger and excessive grants fail readiness. Normal Balance compatibility remains migrations 1–2; Chainshift requires 2.

### 5. Gates

Normal client release false; only explicit integration build exposes Chainshift. Both backend flags must be literal `true`, with verified eligible session, allowed guild, persistence and readiness. Live delivery false. Reconciler default off; explicit fake candidate only, rejecting a live-mode adapter before any call. No adapter, worker or automatic completion posting is wired.

### 6. Defects discovered

No new V1 runtime defect confirmed. Three rehearsal-fixture mistakes were corrected: rollback errors are deliberately sanitized by Database; TLS-disabled connections require a test-only database name; manifests require `chainshift-local-*` IDs. An unconfigured production build correctly rejected missing public configuration; the repository's synthetic production command passed. Initial sandboxed HTTP tests could not bind sockets and were rerun with authorized local-socket access.

A local operational constraint was reproduced: rebuilding server output while the candidate runs temporarily removes migration files consulted by readiness. Ranked requests fail closed, with an honest unavailable state; Recheck recovers after the build. Stop the local candidate before rebuilding. This development artifact dependency does not establish a production deployment defect.

### 7. Fixes and commits

No product correction required. Added `scripts/chainshift/test-rehearsal.mjs` and `scripts/chainshift/browser-rehearsal.mjs`; this report records the result. Necessary rehearsal-fixture corrections were rerun to completion. No features, conveniences, speculative polish or live integration were added.

### 8. Complete daily scenario

- Morning: database-selected New York day, endpoints, empty board and zero-completion projection agree; no saved routes exposed to an incomplete requester.
- A, integrated browser: deliberate Start; lost accepted-shift response/retry; invalid shift; backtrack; valid ICE → COLD → WAR → ROOM; lobby/history/reload/resume; official three-shift result, 6,013ms. No second ranked Start.
- B, integrated browser: sees A's score but no route before completion; independent ICE → BOX → CAR → POOL → PARTY → ROOM; five shifts, 1,047ms. A remains ahead because shifts precede time. Authorized route comparison opens after B completes.
- C, integrated browser: 20 shifts to PASS; multiple backtracks, absence, navigation and reload; removes 16 links and finishes via PARTY → ROOM. Final five shifts, 44,017ms. Lost completion response initially shows uncertainty, then retry retrieves the immutable result. Reload preserves 44,017ms.
- D, deterministic database persona: 12 simultaneous Starts across two guilds; duplicate accepted, invalid, backtrack and completion requests; stale revision, lost-response model and immutable-result probes. One player/puzzle attempt.
- E, deterministic database persona: no attempt or board row before verified Start; independent ranked entry later available. Browser's unverified host completes separately labeled local practice, then verification retrieves A's original result unchanged. No local score is submitted by the practice component.

Browser A/B/C use real database elapsed time. Exact tie scores use deliberately constructed owner-only fixtures in a disposable transaction; no production facts are altered.

### 9. Concurrency and idempotency

D's 12 starts produce one ID. Each original mutation's response is discarded, then eight concurrent retries reuse its ID/revision/intent across guilds. No duplicate append, double backtrack, duplicate invalid action or improved completion time. Stale revisions conflict; changed intent under an existing ID conflicts in the authoritative suite. Completed attempts reject new mutations and repeat Start returns the same completed attempt. Independent player ownership remains enforced.

### 10. Timing and resume

Database timestamps establish claim/completion and elapsed milliseconds; no client time is accepted. Real database sleeps and browser absence increase active time without resetting claim. Removed links affect final route count only. Completion time stops and stays immutable through retries, reload and another guild. UI interpolation is presentation, not scoring authority.

### 11. Midnight and DST

PostgreSQL's exact `AT TIME ZONE 'America/New_York'` day expression and JS day keys agree at normal midnight, skipped spring hour and both repeated fall-hour instants. SQL tests repeat under UTC, Asia/Tokyo and America/Los_Angeles session timezones. Existing injected winter/summer/DST midnight fixtures also passed.

Rollover publication N+1 is selected for a new player; active B retains N's attempt/pins/start while daily's available puzzle is N+1. B completes N after rollover; result stays on N; deliberate Start then obtains N+1. Historical N remains immutable. Clock injection simulates selection; no host clock or production clock was changed.

### 12. Leaderboards

Real PostgreSQL ordering: shifts ascending, milliseconds ascending. Browser A/B/C renders 3/5/5 shifts, with B ahead of slower C and current-player standing. Deterministic fixtures render ranks `[1,2,2]` for 500/1000/1000ms at three shifts. Exact ties share rank; deterministic player ordering does not claim better performance. Global/guild and current-player rows, completed count, shortest found and fastest only at shortest passed. Desktop and 320px comparison layouts inspected; semantic ordered list and explicit tie explanation remain present. Exact ties are database-tested; no fabricated screenshot is claimed.

### 13. Spoiler penetration

Incomplete E probes daily, own attempt, global/guild leaderboard, forbidden comparison and wrong-owner attempt HTTP responses after other completions. No other route words, certificates or solution arrays appear; errors are bounded and responses `no-store`. Own active route is necessary gameplay data. Before completion, routes endpoint is forbidden and own result projection unavailable. After completion, only the authenticated comparison boundary opens.

Safe daily/result projections re-allowlist poisoned objects; fake delivery accepts those safe contracts only. Browser B's incomplete comparison has no route controls. Compiled normal/practice/ranked/integrated bundle checks exclude solution-bearing review artifacts. Console inspection at the end was empty; intentional faults generated local network errors earlier, without credentials or route payload logs. No raw cookies/tokens or production logs were collected.

Known architectural limit: the approved directed phrase graph is in the gated local/practice client, and a determined user can derive graph paths. Practice also exposes its approved minimum after local completion. This is not disclosure of another player's saved route; this architecture does not provide cryptographic puzzle secrecy.

### 14. Database rehearsal

118 authoritative checks plus 352 consolidated checks pass in real disposable PostgreSQL. Restricted grants, mutation transactions, immutable publication/action/result triggers, unique player/puzzle and publication constraints, readiness failures, stale state, sessions, route access and ties exercised. A terminated idle runtime backend is replaced on the next transaction; readiness and completed facts survive reconnect. Full server/container crash was not claimed. Connection refusal is sanitized, cannot fabricate Start/completion and does not fall back to local official facts. All rehearsal clusters clean up through their owned lifecycle.

Existing database suites also passed: 260 foundation/compiled fallback checks, 74 session, 107 personal, 125 guild, 16 canary and 99 Balance attempts; backup/restore passed. Balance authoritative attempt table remains untouched by Chainshift fixtures.

### 15. Session and identity

Valid mocked Activity cookie, CSRF and expected player verified. Wrong player/owner, invalid CSRF, expired/revoked/stale membership sessions and account/guild transitions reject or require re-verification. E's expired session cannot append; a fresh verified session resumes identical facts and claim. A in guild 2 retrieves its same global result and a guild-specific board. Unit security cases cover async identity changes and mismatch against `/api/me`. Uncertain ranked mutations cannot become practice mutations; browser uncertainty disables practice/navigation.

### 16. Arcade navigation

Lobby/game/return focus, browser Back/Forward, refresh, active resume, completed result and practice entry pass. Launch query `frame_id=synthetic&instance_id=rehearsal` survives navigation. Normal disabled direct route normalizes to lobby. An invalid candidate destination shows the safe lobby and keeps the query; hash-only invalid navigation can retain its unknown fragment, without loading an invalid game. Runtime rejects unknown destinations. Balance launches, completes a 0.7s local result and returns; Chainshift does not leave a Phaser canvas running.

### 17. Release containment

25 backend flag combinations include absent, false, true, uppercase and numeric-like values; only both literal true enable the server gate. Ordinary modes reject Chainshift; integration mode allows it. Disabled routes/readiness/drain tests never reach the store. Normal browser/build exposes no Chainshift Play or game data; direct hash is safe. Fake adapter cannot invoke live delivery. Automatic deployment remains off and no live setting was changed.

Future game-only pilot prerequisites, for a separately authorized exact SHA: deliberate reviewed candidate client gate, both backend flags, configured restricted database with migration 002/readiness, supported verified sessions, allowlisted canary guilds and reviewed pinned daily publication. Do not use this mock harness, temporary local origins or unrestricted fixture guild eligibility in production. Keep live delivery off. These prerequisites do not resolve the daily-message launch blocker.

Exact game-only candidate pilot gate configuration, subject to separate authorization:

| Gate | Required state |
|---|---|
| Client build mode | `chainshift-integration` using shipping Arcade entry, not local fixture entry |
| `chainshiftReleased` | `false` remains contained outside that build mode |
| `CHAINSHIFT_ARCADE_ENABLED` | `true` |
| `CHAINSHIFT_RANKED_ENABLED` | `true` |
| `ARCADE_SESSIONS_ENABLED` | `true` |
| `PERSISTENCE_CONFIGURED` | `true`, compatible restricted database, verified TLS |
| Existing Discord identity configuration | Approved application/client secret/bot token and allowed Activity origin present; values not inspected or changed |
| Guild containment | Exactly one `ARCADE_CANARY_GUILD_IDS` entry with no hash, or the approved `ARCADE_CANARY_GUILD_HASH` with no IDs; guild enabled and membership fresh |
| Publication | Reviewed current NY-day immutable puzzle matching exact graph/rules pins |
| Balance flags | Preserve already approved state; do not enable issuance/scoring/leaderboards merely for Chainshift |
| Live Chainshift delivery | `liveChainshiftDeliveryEnabled=false`; no live adapter/worker |
| Fake reconciliation | Explicit test-only candidate model; absent from production startup |

This is an inventory, not an activation instruction. No live pilot is authorized by Slice 7.


### 18. Fake Discord rehearsal

Morning 0; first completion 1; competitive 3; improvement from five to three shifts at 4 completions; equal-score additional completion at 5; next day independent identity. One fake daily message per destination/day; same-day changes edit; unchanged repeats no-op. Lost create reply and restarted reconciler reuse operation/receipt identities. Optional result is spoiler-free and explicit-consent/idempotent-key only. A forged route field is stripped. No live SDK/API adapter or credentials are involved.

Restart here means a new reconciler with retained fake storage/adapter receipts. `MemoryDailyMessages` is not process-durable. Real crash durability and cross-process exclusion remain requirements for any future live delivery implementation.

### 19. Discord launch verdict — UNSUPPORTED_CURRENTLY

[Current Discord Activity documentation](https://docs.discord.com/developers/activities/how-activities-work) supports launch via an Entry Point command or an interaction response of type `LAUNCH_ACTIVITY` (12). That platform capability does not establish this repository's desired daily-post CTA. Repository `docs/TEXT_CHANNEL_LAUNCH_FLOW.md` explicitly lists no bot command implementation; the only current invite operation is SDK `openInviteDialog`, which does not implement a daily-message button/handler or target today's Chainshift. Prior accepted Activity launcher evidence proves ordinary Arcade launch, not this CTA.

There is no concrete daily-message launch URL, signed interaction handler, or tested app-to-Chainshift routing handoff. The projection intentionally carries `activity-launch-unresolved`, not a clickable URL. This requires separately scoped product work; Discord-side IDs/settings alone cannot fill the missing implementation. No URL was invented and no command/permission/configuration was changed.

A future implementation must identify the existing application/entry point and installation context; choose a documented launch mechanism; authenticate/validate interaction requests if applicable; bind legitimate launch to Chainshift's current daily view without trusting query identity; preserve scopes/allowed audience; and prove actual desktop/mobile Discord launch in one consolidated authorized pilot. No new secret is requested in Slice 7.

### 20. Desktop, mobile and input

Integrated 1280×900 and 320×568 play/comparison/practice checked. At 390×430, destination occupied y223–267 and input y311–364; no horizontal overflow. Long chain scrolls to current word, destination stays distinct. Enter submissions, retained draft through Settings, focus return and keyboard run passed. IME composition/legacy keyCode 229 protections pass unit cases. Desktop browser viewport emulation cannot prove native phone keyboard, native composition or Discord mobile inset behavior; those are pilot items.

### 21. Accessibility

Native buttons/inputs support keyboard play, backtracking, lobby exit, settings and dialogs. Visible focused comparison heading and restored input/lobby focus inspected. Route lists, current position and destination group have text semantics; ranked/practice are labeled with words. Feedback live region contains accepted/rejected/backtracked/completed feedback, not timer; its text remained unchanged while time advanced. Dialog comparison includes rank/tie rules and native details for routes. This is semantic/browser coverage, not a real screen-reader certification or exhaustive accessibility audit.

### 22. Failure injection

Readiness unavailable before Start shows honest service failure; recovery does not claim success prematurely. Lost response after accepted shift and after completion recovered using the original mutation receipt. D models uncertain accepted, invalid, backtrack and completion responses by discarding successful responses and retrying concurrently. Browser uncertainty locks navigation/practice/input. Stale revision, unavailable database, graph mismatch, expiry/revocation and wrong identity fail safely. Expired active E resumes after reauthentication without another claim. Builds briefly removing readiness artifacts recover via Recheck. No automatic downgrade, reset or fabricated official completion observed.

### 23. Performance and bundle sanity

Normal compiled JS total 2,361,436 bytes; candidate 2,507,888 bytes. Main lobby chunk 240,211 → 241,759 bytes (gzip 74,323 → 74,678): +1,548 raw / +355 gzip. Lazy DOM-only Chainshift entry 144,722 raw / 23,876 gzip; CSS 26,444 bytes. Graph is within that lazy entry, not the ordinary lobby. Candidate's static dependency traversal excludes Phaser/Balance entry. Existing large Phaser chunk warning is inherited.

20-shift browser rendering/scrolling and three-player comparison remained responsive; representative long-route and result semantics also pass existing component tests. No device CPU benchmark, maximum 2048-word rendering SLA or network-performance certification is claimed. No concrete performance regression justified optimization.

### 24. Balance regression

Full repository tests, existing real database suites and immutable Balance digest checks pass. Browser local Balance starts/completes/returns and preserves its practice best. Runtime tests cover departure from active Balance and no interruption of Balance when leaving Chainshift. Accepted Phase 4C account/pop-out acceptance was not repeated.

### 25. Readiness matrix

| Area | Status | Evidence / limit |
|---|---|---|
| Game rules/referee | PASS | Pinned directed graph; invalid shifts, backtracks, completion tests |
| Corpus/puzzle quality | PASS | Accepted ten-fixture review and graph validation unchanged |
| Daily rollover | PASS | SQL/JS DST zones plus old-day completion/new-day Start |
| Ranked ownership | PASS | Global player/puzzle uniqueness, two guilds, wrong owner rejected |
| Timing fairness | PASS | DB claim/completion, absence, immutable milliseconds |
| Concurrency/idempotency | PASS | 12 Starts; eight-way retries per action; stale revision conflicts |
| Database integrity | PASS | Real migrations, grants/triggers, reconnect and regressions |
| Session/identity | PASS_WITH_PILOT_VALIDATION | Mock cookie/security cases pass; actual Discord environment later |
| Leaderboard | PASS | Shifts/time ordering, exact ties, own/guild rows and aggregates |
| Route privacy | PASS | HTTP probes, comparison authorization, projection/bundle allowlists |
| Practice separation | PASS | Local result separate; later verified result unchanged |
| Arcade integration | PASS | Browser history/reload/return and launch-query preservation |
| Release containment | PASS | All defaults off, gate matrix, normal build/direct-route tests |
| Discord projections | PASS | Fake morning/competition/improvement/tie/next-day; no routes |
| Discord delivery | PASS | Fake-only contract rehearsed; live delivery explicitly unavailable |
| Discord launch action | BLOCKED | No implemented legitimate daily-message → Chainshift launch path |
| Desktop UX | PASS | A/B/C daily, uncertainty recovery and comparison inspected |
| Mobile UX | PASS_WITH_PILOT_VALIDATION | Narrow/short viewports pass; native keyboard/insets unproven |
| Accessibility | PASS_WITH_PILOT_VALIDATION | Keyboard, semantics, focus/live-region checks; real reader later |
| Audio/motion | PASS_WITH_PILOT_VALIDATION | Mute/reduced and unavailable-audio tests; native audio later |
| Balance regression | PASS | 751 tests, real DB suites and browser Balance result |
| Operational documentation | PASS | Frozen SHA, commands, gates, boundaries and blockers explicit |

Delivery PASS is strictly the requested fake-delivery scope, not permission or readiness to post publicly.

### 26. Hard blockers

The desired daily Discord post cannot currently launch today's Chainshift through a supported implemented flow. Resolve it in separately authorized post-Slice-7 work before treating this as the requested complete controlled live pilot.

A delivery-enabled pilot additionally requires a real reviewed adapter/worker, durable receipts/exclusion and proven restart semantics, configured allowed destination and legitimate resolved launch action. Those are absent by design in the accepted fake-only baseline. Do not turn on delivery as a configuration-only step. No evidence suggests local gameplay/scoring/data-integrity blockers.

### 27. Pilot-validation items

After blockers and a separate release authorization: actual legitimate Discord launch/session/context, native iOS/Android keyboard/IME/insets, real screen-reader output/focus, audible feedback/audio-unavailable behavior inside Discord. Validate once with the complete flow. Existing accepted Phase 4C coverage remains accepted; broader account/pop-out coverage stays deferred absent new evidence. No owner action is required for this local slice.

### 28. Post-V1 improvements

Optional phrase richness, subjective animation/micro-layout preferences, convenience controls and additional social features remain outside scope. No polish cycle or V1.1 work started. Launch/durable live delivery are release prerequisites if required by the pilot, not optional post-V1 improvements.

### 29. Exact validation commands and results

All successful commands used Node **24.19.0**, with:

```sh
export PATH='/Users/christopherrossi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin':$PATH
npm test
npm run build:server
node scripts/chainshift/test-authoritative.mjs
node scripts/chainshift/test-rehearsal.mjs
DOCKER_HOST=unix:///Users/christopherrossi/.docker/run/docker.sock npm run test:database
npm run test:production
npm run build
npm run build:chainshift
npm run build:chainshift:ranked
npm run build:chainshift:arcade
node scripts/chainshift/check-isolation.mjs --ranked
node scripts/chainshift/check-integrated-isolation.mjs
git diff --check
```

Results: 751 tests / 53 files; 118 authoritative PostgreSQL checks; 352 consolidated rehearsal checks; 681 existing database checks plus backup/restore; typecheck and normal/server/production/practice/ranked/integrated builds; 263 production smoke assertions; both isolation checks and whitespace hygiene passed. `test:production` supplies synthetic public metadata and dummy secret sentinels; plain `build:production` without required public variables intentionally fails configuration validation. Builds are sequential where they share output. Readiness-dependent browser work should run after builds finish.

Browser: invoke `rehearsalAcceptance(tab, viewport)` from `scripts/chainshift/browser-rehearsal.mjs` through documented CUA controls against a fresh candidate, then the explicit C/guild/unverified/disabled-browser checks recorded above. The reusable harness completes 16 assertions; 17 additional browser checks were recorded. CUA-only browser interactions; no hidden state/network/browser-storage mutation.

Local evidence directory: `tmp/chainshift/slice7-evidence/` (ignored): tests/build/database/smoke logs, `database.json`, `browser-report.json`, `bundles.json`, `fake-delivery.txt`, desktop/mobile/uncertain-completion/practice/normal-disabled screenshots. Durable reproducible harnesses and this report are committed; generated outputs stay out of production bundles.

### 30. Ending state

Only Slice 7 validation harnesses/report committed on the existing branch; final commit SHA and verified clean status are recorded in the handoff. Product candidate remains the frozen SHA. Nothing pushed/deployed/published; normal release and live delivery still off. Temporary normal-build preview is stopped; integrated disposable candidate may remain available until Ctrl-C. Test clusters cleaned up; candidate owns its own cluster.

### 31. Exact candidate launch

From `/Users/christopherrossi/Documents/cdawg-arcade`, use the Node PATH above, with local Docker Desktop running:

```sh
npm run dev:chainshift:arcade
```

Open `http://127.0.0.1:5266/#arcade`. UI 5266 proxies API 5267. No environment secrets or production database configuration needed. Mock A/B/C/A2 are local verified fixtures; fixture controls never ship in the normal build. The harness creates and migrates an owned disposable cluster; stop with Ctrl-C to clean it. Each fresh launch resets synthetic competition. Use a fresh cluster for the reusable A/B browser harness. Do not rebuild server output during active rehearsal.

### 32. Recommendation

**READY_AFTER_BLOCKERS**

Local V1 gameplay, fairness, privacy and containment rehearsal passes. The required daily Discord launch is unsupported in the current repository and prevents an honest claim that the complete requested live flow is ready. Resolve separately; do not deploy or broaden scope from this result.

**SLICE_7_BLOCKED**
