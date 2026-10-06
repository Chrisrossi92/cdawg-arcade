# Chainshift V1 Slice 9 — Live Daily Delivery and Controlled Pilot Plumbing

**READY_AFTER_DELIVERY_BLOCKERS · SLICE_9_PASS_WITH_PILOT_ITEMS**

Implementation and local/mock acceptance pass. Production delivery remains **OFF**. No live message, deployment, restart, permission change, provider setting change, command registration, new secret or audience expansion occurred.

## 1. Starting commit/state

Started clean at `fb3c1a4e1d7cfa3dc675e9eebae863ae21f52c14` on `codex/soft-launch-brand-player-cleanup`, retaining accepted Slice 7/8 behavior. Existing Arcade application `1525643672194908330` has the verified global `launch` command, `PRIMARY_ENTRY_POINT` (4), `DISCORD_LAUNCH_ACTIVITY` (2). This slice does not modify it.

## 2. Files changed

- New capability/configuration: `server/chainshift/{live-config,discord-delivery,delivery-store,delivery-worker}.ts`.
- New additive schema: `server/database/migrations/003_chainshift_delivery.sql`.
- Runtime/grants/readiness: `server/{index,artifacts}.ts`, `server/database/{pool,config,migrations,cli}.ts`.
- Spoiler-safe copy and preserved fake contract: `server/chainshift/{projections,delivery}.ts`, `config/chainshift-release.ts` (comment only).
- Build/staging plumbing: `scripts/build-production.mjs`, `package.json`.
- Tests: `server/chainshift/{discord-delivery,delivery}.test.ts`, `scripts/chainshift/{test-delivery,test-pilot-build,ephemeral}.mjs`, `scripts/test-database.mjs` (future-schema fixture advances to version 4).
- Documentation: `README.md`, this report.

Balance, gameplay UI, graph/corpus, existing attempt tables, session authority and immutable migrations 001/002 are unchanged.

## 3. Live Discord adapter

`DiscordDailyDelivery` supports only channel validation, create, read/recover and edit. Production uses the existing `DISCORD_ARCADE_BOT_TOKEN` and `DISCORD_CLIENT_ID`. It has no commands, result-posting, deletion, crossposting, arbitrary destination or webhook API.

Requests use Discord API v10 over HTTPS, redirects refused, eight-second request deadlines and bounded response streams. Errors expose only a fixed category; provider bodies, token values and driver details never enter logs. Responses must identify the configured channel, expected message and actual Arcade bot author; webhook/foreign messages cannot be adopted or edited. Mentions are suppressed on create and edit.

## 4. Allowlist

Channel `1549149791915737129` is enforced in configuration, adapter, reconciler and database CHECK constraint. Missing/wrong channels fail closed before posting. The application ID is fixed to the existing Arcade app.

The channel must be ordinary guild text (`type=0`). Its authoritative Discord guild must match the existing `canaryConfig().allowsGuild`; the corresponding database guild must be enabled. Neither browser input nor message facts choose the destination or guild. The adapter does not fall back to another bot/channel if access fails.

## 5. Delivery schema/migration

Migration 003 adds `arcade.chainshift_daily_messages` with:

- channel, New York day, immutable catalog puzzle foreign key and verified guild;
- stable SHA-256 create operation identity and 24-character nonce;
- `prepared`, `uncertain`, `posted` or terminal `blocked` state;
- exact Discord message ID, desired-payload digest, revision and update operation identity;
- successful reconciliation/integrity-check timestamps, dispatch time, failure category/count, durable next-attempt time and guarded creation/update timestamps.

Primary key `(channel_id,day_key)` and unique `(channel_id,puzzle_id)` enforce one logical daily message. Message/operation/nonce identities are unique. A trigger verifies the puzzle/day relationship, guards identities and transitions, and rejects deletion, message-ID replacement, blocked-state reset and revision jumps. Nothing is removed from the competition schema.

## 6. Restricted grants/readiness

Runtime receives SELECT/INSERT plus column-only UPDATE on delivery state fields. It receives no DELETE, TRUNCATE, DDL, identity/timestamp rewrite, REFERENCES or TRIGGER rights. PUBLIC table/function rights are revoked.

`deliveryReady` checks migration checksums/table compatibility, migration 3, enabled guard trigger, existing Chainshift/session/Balance restrictions and exact delivery grants; absent or excessive rights fail closed. Schema versions 1/2 remain supported for existing non-delivery behavior; live delivery requires 3.

New explicit administrator commands: `db:grant-chainshift-delivery`, `db:verify-chainshift-delivery`, `db:publish-chainshift-pilot`. Grant/publication require delivery disabled. Publication also requires gameplay/ranked disabled, an operator-reviewed valid manifest and a day matching both PostgreSQL's current New York date and the explicit pilot day. Repeated identical publication is harmless; conflicting/stale/invalid publications fail. It does not generate puzzles or change editorial approval. These commands were exercised only in owned disposable PostgreSQL.

## 7. Durable receipt model

Create intent is committed **before** the external POST. The session advisory lock uses autocommit queries, not a transaction held open across HTTP. A lost reply, lost connection or process death therefore cannot roll back the dispatch marker.

A known message ID is stored before reconciliation acknowledgement. Desired content is acknowledged only after validated Discord output. Lost edit responses retain the same message ID and are retried with the desired payload. No process-memory map is the authority for message identity.

## 8. Reconciliation architecture

The existing Node web runtime starts one small worker only after the independent delivery configuration and a verified pilot game artifact permit it. No additional Render service, cron, queue, process or paid infrastructure is introduced.

Ticks run two minutes after the previous tick finishes, never overlap locally, and stop on terminal failure or pilot expiration. Shutdown stops scheduling and awaits current work within the existing service shutdown deadline. A forced process exit remains safe because the dispatch marker is durable.

Ordinary unchanged ticks make no Discord call. A sparse ten-minute integrity probe detects deleted messages and repairs a late/stale ambiguous edit. Score count, shortest-found or fastest-at-shortest changes edit the existing message at the bounded cadence.

`CHAINSHIFT_DAILY_SCOPE=pilot` (default) requires one explicit `CHAINSHIFT_DAILY_PILOT_DAY` and expires outside that date. Separately configured `daily` scope supports automatic catalog-backed day rollover and requires the pilot-day setting absent. Continuous scope is capability only and is **not authorized for this pilot**. New-day puzzles must already exist in the authoritative catalog; the worker never generates or publishes them.

## 9. Idempotency/concurrency

A channel-wide PostgreSQL advisory lock serializes workers across processes, restarts and days; busy workers skip. Stable nonce plus `enforce_nonce=true` supplements durable intent. Discord's nonce uniqueness lasts only a few minutes, so the system does **not** rely on it for indefinite retry safety. [Discord message API](https://docs.discord.com/developers/resources/message).

An uncertain create is never POSTed again. Recovery reads bounded channel history and requires the original nonce, Arcade bot ownership and channel. Duplicate candidates, malformed data, incomplete history, absent nonce or no match leave publication held; they never authorize a replacement. This deliberately sacrifices availability when the outcome cannot be proven. A crash after marking intent but before actually sending likewise remains held. A definitive create 429 rejection is the only automatic transition that permits another create attempt, after its durable cooldown.

Different day/puzzle identities create one new logical message; repeated score changes and restarts never change a known daily message ID. Periodic integrity checking corrects an externally delayed stale edit without relying solely on the database's last desired digest.

## 10. Failures/rate limits

- 429: honor Retry-After/body delay and exhausted-bucket reset headers; persist a channel-wide cooldown. Invalid extreme delays fail closed.
- POST timeout/network/5xx/malformed reply: retain `uncertain`; search for the original later, with no second POST.
- Edit timeout/5xx/lost reply: retain ID and retry that message; backoff is durable.
- 401/403, invalid channel/configuration or 404: terminal `blocked`; worker stops.
- Manually deleted message: block that day permanently when detected, preserving its receipt. No automatic replacement or receipt deletion.
- Database/readiness failure: no posting; sanitized unavailable result and bounded cadence.

Retry delay is at least one minute and exponential up to one hour for ordinary failures; recovery no-match starts at five minutes. HTTP responses are bounded to 256 KiB; recovery scans at most five pages of 100 messages. A partial search never proves absence. After all attempts become terminal/uncertain, manual read-only diagnosis is required; deleting/resetting receipts is not a recovery strategy. [Discord rate limits](https://docs.discord.com/developers/topics/rate-limits).

## 11. Daily projection

One database statement selects the current New York puzzle and aggregates only authoritative completed attempts. The immutable publication certificate is checked internally, then only safe endpoints/day/catalog number/count/shortest/fastest-at-shortest reach the projection. Exact ties change count without inventing another standing.

Catalog number renders as `⛓️ **CHAINSHIFT #027**`; zero completions renders honest `0 completed`, without optimum/fastest claims. Internal puzzle identifiers, routes, intermediate words, identities, certificates, graph solutions and debugging fields are not in the message. Optional result sharing retains its existing fake/consent contract; no automatic individual posting exists.

## 12. Activity launch

The link button retains Slice 8's documented URL:

```text
https://discord.com/activities/1525643672194908330?custom_id=chainshift-today-v1
```

This launches the existing Discord Activity; it is not a browser ranked URL. SDK intent routes only after verified session establishment; the authenticated app resolves today's puzzle server-side. No puzzle/player/guild/ranked authority is handed through the message/query. Normal Arcade launches and one-attempt ownership remain unchanged. No native Discord click-through is claimed. [Discord Activity growth/referrals](https://docs.discord.com/developers/activities/development-guides/growth-and-referrals).

## 13. Production read-only audit

On 2026-10-06, the existing signed-in Chrome Render session was used only for `cdawg-arcade-production` (`srv-dagb3blbedkc73fr3de0`). Runtime commands used existing credentials internally and emitted only booleans, schema version numbers and HTTP status. No environment/secret values or unrelated resources were inspected.

| Necessary prerequisite | Observed result |
|---|---|
| Existing Arcade bot credential | Present; application ID matches existing Arcade |
| Existing Node/Render runtime | Verified; web shell available on the existing service, no new topology required |
| Sessions | Enabled |
| Game / ranked / live delivery | All off |
| Database configuration | Configured; actual role is restricted `arcade_session_runtime` |
| Production migrations | `[1]`; Chainshift/delivery tables absent |
| Approved channel access | `GET /channels/1549149791915737129` returned **403** |
| Channel guild/type and posting/history permissions | **Unverified** because channel access was denied |
| Own-message edits / real Activity CTA | Require controlled live validation |

This proves the current credential cannot access that channel as configured; it does not prove whether a particular role/overwrite or bot installation detail is responsible. No alternate credential, bot, provider resource, channel, permission or secret was explored. The already verified global command handler remains accepted.

## 14. Local/mock acceptance

Real disposable PostgreSQL 18.6 plus fake transport demonstrated all eight requested steps: morning zero-completion create, new connection/reconciler restart, same-day no duplicate, first completion edit, better-score edit, lost-response recovery without duplicate, day rollover and wrong-channel rejection.

**103 checks** additionally cover missing/excessive grants, trigger disablement, restricted SQL, day/identity uniqueness, timestamp/message guards, simultaneous reconcilers, durable rate limits, lost edit, stale edit repair, deletion, pilot expiration, continuous rollover and real death of an owned fixture process after its committed dispatch marker. The new process recovers the durable uncertain state without posting again. Reviewed publication CLI checks include first/repeated/conflicting/stale/flag-enabled cases. No production credential is read by these runners.

## 15. Validation commands/results

Pinned Node 24.20.0 remains unavailable locally; used bundled **24.19.0**, as in prior accepted rehearsal. Commands used the bundled Node directory on PATH.

```sh
npm test
npm run typecheck
npm run build:server
npm run build:chainshift:arcade
npm run test:production
node scripts/chainshift/test-pilot-build.mjs
node scripts/chainshift/test-delivery.mjs
node scripts/chainshift/test-authoritative.mjs
node scripts/chainshift/test-rehearsal.mjs
node scripts/test-database.mjs
node scripts/chainshift/check-isolation.mjs --ranked
node scripts/chainshift/check-integrated-isolation.mjs
git diff --check
```

- **845 tests / 57 files** passed; final focused adapter/projection checks passed after response-body cleanup.
- Typecheck/server/integrated candidate builds passed; immutable Balance digest verified.
- Normal compiled production smoke: **283 assertions**. Pilot-shaped build smoke: **292 assertions**, public synthetic settings only. Normal output was restored afterward; `chainshiftPilot=false` in the final local normal artifact.
- New durable delivery: **103 real PostgreSQL checks**.
- Existing Chainshift authority/rehearsal: **118 + 352 = 470 checks**.
- Existing broader database suites: **74 session + 107 personal + 125 guild + 16 canary + 99 attempt + 260 foundation/runtime = 681 checks**, backup/restore included.
- Both bundle isolation checks passed; no solution/review artifacts or fixture harness in the shipping candidate; normal build excludes Chainshift gameplay. Normal client/backend secret isolation remains intact.
- Existing SDK desktop/mobile-shaped launch mocks and gate/navigation tests pass. Unchanged accepted gameplay/browser tests were not repeated, and no live Discord playthrough occurred.

An initial sandboxed full test run could not bind its local mock listeners; it was rerun with authorized local listener access and passed. Local fixture setup corrections were confined to owned test data. Ignored sanitized evidence/logs are under `tmp/chainshift/slice9-evidence/`.

## 16. Exact controlled-live activation plan — NOT EXECUTED

First obtain one separate explicit owner authorization covering the exact ending SHA, reviewed dated puzzle, minimum channel-access fix, additive database staging, pilot deployment and one-day delivery. None of this implementation is that authorization. Keep automatic deployment off and use only the existing service/server/channel.

1. **Resolve access privately within the approved destination.** Verify channel `1549149791915737129` belongs to the already allowlisted server and is guild text. For the existing Arcade bot only, review the minimum effective permissions: View Channel, Send Messages and Read Message History. Own-message editing needs no Manage Messages grant. Do not add scopes, intents, another bot, new channel or broader server permission. Re-run the narrow read-only guild/permission audit; stop if it still fails. Any actual permission change needs the explicit authorization above.
2. **Stage compatibility with every Chainshift gate off.** Deploy the exact ending SHA as a normal build (`CHAINSHIFT_PILOT_BUILD=false`), health-gate the exact release, then use the existing approved administrative migration mechanism privately to run `npm run db:migrate`, `npm run db:grant-chainshift`, `npm run db:grant-chainshift-delivery`. This applies missing migration 002 then 003. The audited runtime role cannot administer schema; availability of the retained administration mechanism is a prerequisite, not a request to invent a secret or grant runtime DDL. Set the reviewed authoritative New York pilot date in that administrative context and run `npm run db:publish-chainshift-pilot -- /absolute/path/to/reviewed-manifest.json`. The CLI refuses stale/conflicting puzzles. Verify canary guild enabled and run `npm run db:verify-chainshift-delivery` in the **restricted runtime** context.
3. **Deploy the reviewed pilot artifact, still without delivery.** Build/deploy the same exact ending SHA with `CHAINSHIFT_PILOT_BUILD=true`, `CHAINSHIFT_ARCADE_ENABLED=true`, `CHAINSHIFT_RANKED_ENABLED=true`, and `CHAINSHIFT_DAILY_DELIVERY_ENABLED=false`. Preserve existing app/canary/session configuration. Verify exact SHA `/api/health` and `/api/ready`, persistence readiness, restricted delivery readiness, authoritative daily publication and established session. No message may appear during this stage. The pilot build contains the real existing SDK/Arcade entry, not the local mock host.
4. **One deliberately authorized live gate.** Only after those gates pass and the explicit controlled-post authorization is in force, configure `CHAINSHIFT_DAILY_CHANNEL_ID=1549149791915737129`, `CHAINSHIFT_DAILY_SCOPE=pilot`, `CHAINSHIFT_DAILY_PILOT_DAY=<the PostgreSQL New York date>`, and finally `CHAINSHIFT_DAILY_DELIVERY_ENABLED=true` on the same exact SHA. Do not select `daily` scope. First worker tick creates at most the one approved message; record its durable message ID and compare compact spoiler-safe content/CTA. If the outcome is uncertain, stop and diagnose that intent—never create another post to test recovery.
5. **Consolidated controlled acceptance, then disable.** Open the CTA inside desktop Discord; verify Activity/session/today's Chainshift. Make one eligible controlled completion and observe an edit of the **same** message within the two-minute cadence. Reconcile/restart safely and read-only confirm one daily receipt/message identity. Check the same account's resume/results on mobile where practical, without claiming a second attempt; normal Activity launch still enters the lobby. Capture only sanitized outcomes. Disable delivery immediately afterward as below unless continued operation receives separate authorization.

The remaining human involvement should be batched: one concrete authorization/review, existing private admin/sign-in handoff only if unavailable, and one consolidated native Discord/mobile acceptance. Automation performs staging, routine checks and observation. Native phone click-through and an unavailable administration login cannot be established by local mocks; no repeated unchanged Phase 4C gameplay is requested. No new bot secret is expected: the existing credential is reused. No request to create a new secret has been made.

## 17. Exact disable/rollback steps — NOT EXECUTED

1. Set `CHAINSHIFT_DAILY_DELIVERY_ENABLED=false` and apply the authorized same-SHA runtime rollout; drain the old worker and health-gate the resulting release. The configured worker is absent afterward. Read-only verify disabled configuration and that the stored message/revision is stable. A known message/receipt remains; disabling does not delete it.
2. If game availability also needs rollback, set `CHAINSHIFT_ARCADE_ENABLED=false`, `CHAINSHIFT_RANKED_ENABLED=false`, `CHAINSHIFT_PILOT_BUILD=false`, then rebuild/deploy the **same schema-3-compatible SHA** as the normal artifact. Verify normal Arcade, Balance and health/session gates. A prior binary capped at schema 1/2 is not a safe automatic rollback after migration 3.
3. Preserve all additive tables, attempts and receipts. Do not drop schemas, delete/reset a receipt, recreate a manually deleted daily post, widen permissions or switch bots as rollback. Any replacement/removal or schema downgrade requires a separately reviewed decision. No ongoing `daily` scope is implied by one successful pilot.

## 18. Remaining pilot prerequisites

**403 channel access** is the observed delivery blocker. Approved guild/type and effective posting/history permissions remain unverified; real own-message editing and Activity desktop/mobile CTA remain live acceptance items.

Production is still schema 1, so exact-SHA staging, migrations 002/003, restricted grants and a reviewed current-day publication are required. The existing administrative access path was not broadened/inspected during the narrow runtime audit. Pilot activation must stop if that path is unavailable, readiness fails or the date/catalog changes before activation. No production changes have been pre-approved by this report.

## 19. Delivery remains OFF

Normal source release gate is false, legacy fake-contract default is false, runtime delivery defaults false, ordinary artifact has `chainshiftPilot=false`, and the read-only production audit found gameplay/ranked/delivery off. Tests use fake transports or local HTTP mocks; the only real Discord requests in this slice were approved **GET** channel audits. No real create/edit call, deployment or production database write occurred.

## 20. Ending commit/state

Implementation/report are committed locally; exact ending SHA and clean-tree verification are supplied in the final handoff. Nothing is pushed or deployed. Use that exact SHA for any later separately authorized pilot; do not deploy an arbitrary branch tip.

**READY_AFTER_DELIVERY_BLOCKERS**

**SLICE_9_PASS_WITH_PILOT_ITEMS**
