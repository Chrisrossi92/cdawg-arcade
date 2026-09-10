# Official score experience and private canary

## User experience

Ordinary browsers and other guilds remain practice-only. An eligible verified account sees a compact explanation: “Server records start with new verified runs. Your existing scores stay in this browser as practice history.” Its optional acknowledgment is browser-local and contains no identity or trace. Historical Local Best always belongs to the browser, never to the newly verified account. Nothing imports or relabels old local history.

Start Game requests authorization before starting countdown or labeling a run official. Duplicate Start is suppressed. Failed issuance leaves an immediate explicit practice option; an old local run can never be promoted by creating a later authorization. Reconnect uses the existing Discord flow. No persistent recovery banner covers active gameplay.

The result shows Checking, then Official score saved only after the committed server response or idempotent status recovery. PB and server-record celebration comes only from true server metadata. The official score has millisecond display precision to distinguish 60 Hz tick differences; the smaller local result/history stays separate. Personal best, attempt count, average and recent runs use authenticated personal APIs. The top-25 board highlights the caller; outside-top-25 rank appears before the list. Duplicate names receive a pseudonymous disambiguator, never a raw Discord ID.

## Trace and recovery

Official SimulationClock steps use the immutable precomputed-curve simulator, not native transcendental functions. Effective directions are sampled immediately before each fixed simulation tick. The existing latest-distinct-press input resolver combines keyboard/pointer input; traces contain only direction changes and tick indexes. Evidence uses the existing strict four-field protocol (`rulesetId`, `ticks`, `interruptions`, `inputs`); the authorization binds attempt identity and the server stores the existing encoding version. No unrecognized metadata is added.

Boundaries: 18,000 ticks, 4,096 effective edges, below 65,536 evidence bytes. Overflow disqualifies instead of truncating into a qualifying trace. The five-minute golden trace and multiple render rates replay to identical server results. Pause/blur/hidden/stall clears held controls and marks interruption. The run can continue as practice and submits the established interrupted/practice terminal disposition, never a qualifying run.

Pending evidence exists only in memory. No key names, raw timestamps, trace logs or localStorage traces. Stable outcome, retry expiry, disconnect/account change, or choosing practice clears transient evidence. Reload discards evidence and does not resume the old authorization; an outstanding authorization may cause temporary practice fallback until it expires. This is deliberately conservative.

An ambiguous submission preserves the visible local score and offers Retry. Recovery first asks the authenticated attempt-status endpoint; if no terminal result can be recovered, it resubmits the identical evidence and attempt. It never generates a new authorization for that old score. Requests time out after ten seconds; retry evidence expires at the server-issued deadline. Play Again does not wait indefinitely. Session/account changes invalidate pending callbacks and clear official statistics/result identity.

## Controls and isolation

Server-only independent flags: ARCADE_SESSIONS_ENABLED, ARCADE_ATTEMPTS_ENABLED, OFFICIAL_SCORING_ENABLED, ARCADE_LEADERBOARDS_ENABLED. Sessions no longer depend on official scoring being false. Issuance requires attempts plus scoring; board reads have their independent flag. Incomplete configurations remain practice-only.

Production canary eligibility uses an explicit ARCADE_CANARY_GUILD_HASH (SHA-256 of the already server-verified guild ID). The hash is an identifier, not an authentication secret. No source hardcodes a production guild. The optional ARCADE_CANARY_GUILD_IDS form supports synthetic tests/operator compatibility, but specifying both or more than one guild fails closed. Eligibility is checked in session context, authenticated score reads, issuance, submission and board reads. A valid cookie for another guild still cannot enter the score path. Browser sessions never qualify.

Resolve the candidate from existing verified participation evidence and match the accepted guild checkpoint. Never create synthetic production identities. Do not print raw guild/session/instance IDs, credentials or traces. Production health contains no canary identity or counts. Successful issuance reports only a bounded `official_issuance` durationMs event and Server-Timing header; this measures server issuance latency, not the full client round trip.

## Immutable ruleset activation

The original `balance-official-v1` seed is an unimplemented, nonissuable placeholder and cannot have its immutable semantics rewritten. The fully specified Phase 4D `balance-replay-v1` is the proper additive official version. Its existing digest includes canonical physics/configuration/curves/protocol/validator source; its validator revision, 60 Hz rate and 18,000 cap remain unchanged.

`npm run db:activate-canary` is explicit administrator-only work. With score flags off and exactly one verified canary configured, it inserts the proper version if absent, checks every immutable field, locks version/guild, activates issuance and records a sanitized ruleset_activation administrative event. Repeating activation is idempotent. It never runs at web startup and never grants the web role version-write rights. No new schema migration is needed.

The restricted runtime cannot execute this administration. Existing administrator access is required in a separate short-lived process. The Phase 4F private handoff was intentionally destroyed; do not recover its deleted secret, broaden runtime rights, or retain administrator credentials in the application environment to avoid this boundary.

## Rollout and rollback

Deploy exact merged SHA with sessions on and attempts/scoring/board reads off. Verify three health endpoints, practice assets, session boundary, all seven empty score tables, projections, restricted capability, logs and resource use. Resolve/store the intended single-guild hash. Apply the audited activation with existing administrator access. Only then enable the complete three-flag canary set and restart/deploy the same artifact. No other guild becomes eligible.

Before the one consolidated owner canary, finish all automated checks and production-safe anonymous/disabled/eligibility probes. Do not create synthetic production attempts. The owner performs one qualifying run and views its result and board; a second completed run is not needed.

If integrity is uncertain, disable issuance first, then scoring/boards as needed; retain sessions/practice. Preserve accepted facts, traces, statistics, entries, record and event. Do not delete canary data or mutate immutable rulesets during rollback. The Phase 4F artifact supports the already staged runtime grants; it can be restored with score flags off. The older Phase 4E artifact requires the documented grant-aware rollback and is not the preferred target.

## Boundaries

Development fixture entrypoints are separate from App and excluded from production artifacts; production smoke checks reject their URLs. Synthetic fixture names and data never reach production. Layout checks cover desktop and a 375×667 embedded viewport, not full mobile certification. Existing bundle size warnings remain; optimization is outside scope.

There is no Discord posting path, channel selection, delivery state, notification worker or historical event backfill. Observe and polish the canary before any separately authorized announcement work.
