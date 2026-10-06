# Chainshift V1 Slice 8 — Discord Activity Launch Bridge

Starting commit: `6e2f12f7a4083b6f973e13b3083f961cb1cc7951`, clean, on `codex/soft-launch-brand-player-cleanup`.

**Local bridge: PASS. Current global entry-point handler audit: PENDING_AUTHORIZATION. Actual Discord click-through: REQUIRES_LIVE_PILOT_VALIDATION.**

No deployment, push, Discord command registration, production configuration change, audience expansion or live daily delivery occurred.

## Existing application inspection

Read-only inspection used the existing signed-in Discord Developer Portal session:

- Application: **Cdawg Arcade**, ID `1525643672194908330` (the Arcade app, not the separate Cdawg Bot application).
- Activities enabled; web, iOS and Android supported platforms checked.
- Existing root mapping: `/` → `arcade.cdawgbot.xyz`; no additional proxy-path mapping present.
- No custom links configured; no interactions endpoint configured.
- Repository has no application-command registration or Gateway interaction handler. Its existing SDK invite operation is `openInviteDialog`.
- The existing accepted ordinary Activity launch evidence remains accepted; no repeat Phase 4C playthrough was requested.

Discord documents automatic creation of a global `PRIMARY_ENTRY_POINT` command when Activities are enabled, normally using handler `DISCORD_LAUNCH_ACTIVITY` (2). This establishes the expected default, **not a verified current API snapshot**: a command could have been changed or deleted afterward. The portal's inspected pages do not expose the command type/handler. [Discord application commands](https://docs.discord.com/developers/docs/interactions/slash-commands).

A read-only global-command audit is implemented in `server/discord/entryPoint.ts` and `scripts/discord/audit-entry-point.mjs`. It makes only `GET /api/v10/applications/{configured application}/commands` with the existing application bot credential, validates global scope/application ownership, and reports bounded command metadata. It never registers, updates or deletes commands. Missing, ambiguous, unknown-handler, malformed, oversized and authentication/network failures are distinguished or sanitized.

Local approved credential keys `DISCORD_CLIENT_ID` and `DISCORD_ARCADE_BOT_TOKEN` are absent; running the audit reports `unavailable` without making a request. No new secret was requested, copied, displayed or created. The existing approved Arcade bot credential should serve this narrow read-only purpose.

An attempt to open the existing Render provider dashboard to use that hosted credential was rejected by automatic approval review: access was outside the stated Discord/repository scope and could expose unrelated private infrastructure or production controls. No dashboard access or workaround followed. The remaining inspection needs explicit authorization limited to the existing `cdawg-arcade` service and this read-only audit. No production setting change is implied.

## Supported mechanism and implementation

Discord explicitly documents Activity links with a `custom_id` and exposes incoming data as SDK `customId`. This permits a fixed navigation hint without an app-handled entry point or a new bot interaction system. The chosen bridge does **not require adding an `APP_HANDLER` command**; the current handler still needs the audit above before claiming live configuration verified. [Discord growth and referrals](https://docs.discord.com/developers/activities/development-guides/growth-and-referrals).

Future daily message link:

```text
https://discord.com/activities/1525643672194908330?custom_id=chainshift-today-v1
```

This is the documented Discord Activity mechanism, not a website URL, iframe URL override, invented invitation, hash-only link, or launch of the separate bot. No portal custom-link record/image, new OAuth scope, new permission, new secret, command mutation or interactions endpoint is introduced.

- `shared/chainshift/activity-launch.ts` generates only the documented HTTPS Activity URL from a validated application ID supplied by trusted configuration. It has one fixed marker and no user, guild, puzzle, date, score, attempt or route fields.
- `DiscordHostAdapter` obtains the allowlisted hint from SDK `customId`. It exposes that navigation hint only after the existing server session establishment and SDK authentication succeed. Raw search fields do not establish the hint in production; the installed SDK supports `customId`.
- `bindNavigation` applies the hint once per document binding, after verified Discord session state. It waits through uncertainty, respects release gates, does not override an explicit navigation/history choice, preserves launch parameters, and uses the normal Arcade route. Returning to the lobby or a repeated context event cannot reroute the user again. Reload of the original launch URL may reapply its navigation intent; it never creates an attempt.
- `ChainshiftEntry` still rechecks `/api/me` and current account/guild before rendering ranked play. `RankedChainshift` still requests `/api/chainshift/daily`. The handoff only selects a screen; it cannot grant ranking, start an attempt or supply referee data.
- `dailyActivityMessage(authoritativeFacts, configuredApplicationId)` is a pure future-adapter renderer: spoiler-safe daily content plus a Discord link button, with mentions suppressed. It rebuilds the safe facts and ignores forged incoming `play`, identity, guild and route fields. It does not send a message. The neutral reconciliation projection stays unresolved until a configured renderer is supplied, avoiding fabricated binding in unconfigured test/delivery models.
- The local fixture host simulates SDK `customId` only in its explicitly isolated candidate entry. Ordinary builds do not import that harness.

Slice 7's unsupported-launch conclusion is superseded at the code/documented-mechanism level by this bridge. It is not superseded by a live-launch claim: this code is not deployed, the current global command handler is unverified, and an actual Discord click-through remains future controlled validation.

## Authority and existing attempt rules

All handoff data is navigation-only and may be user-controlled. The marker is public, not a credential. Only its exact allowlisted string is recognized; arbitrary JSON, altered markers, URLs and marker-plus-payload strings are ignored.

Player, session, eligible guild and membership remain server-verified using the existing cookie/CSRF/instance flow. Browser query identity, `puzzle_id`, `ranked`, route and guild hints are not forwarded as authority. The application ID used to generate outbound links comes from configuration, not incoming message facts or browser input.

Today's puzzle remains selected by the server's authoritative `clock_timestamp() AT TIME ZONE 'America/New_York'` and immutable catalog. Graph `chainshift-graph-v2`, `fnv1a64:029bb9393f7bbe48`, rules `chainshift-rules-v1`, migration 002 and referee behavior are unchanged. A link saved from an older day opens the current daily view. An already-active old-day attempt retains its original puzzle and timer under Slice 5's existing rollover policy. No new catalog or puzzle is created by the link.

Deliberate Start remains required. Unique player+puzzle attempts, cross-guild identity, authoritative timing, immutable completion, replay/idempotency and route privacy are unchanged and revalidated in real ephemeral PostgreSQL.

## Request coverage

| Request | Result |
|---|---|
| 1. Inspect app/entry-point/repo setup | Portal inspected read-only; no repo registration/interaction handler found |
| 2. Default global command or app handler | Expected default documented; actual type/handler audit pending. Chosen documented link needs no new app handler |
| 3. Smallest future daily-post mechanism | Fixed Activity URL and pure spoiler-safe link-button renderer implemented |
| 4. Existing Arcade Activity, supported mechanism | URL targets inspected Arcade application through Discord Activity links; no live launch claimed |
| 5. Authenticated routing to Chainshift | SDK hint after server verification; once-only normal Arcade navigation, then `/api/me`/daily checks |
| 6. Normal Arcade launch preserved | No marker / malformed marker remains lobby; explicit navigation/history wins |
| 7. No user-supplied authority | Poisoned identity/guild/puzzle/ranked/route fields ignored; exact marker selects screen only |
| 8. Server-side current NY puzzle | Existing authoritative daily endpoint/catalog unchanged and tested |
| 9. One attempt/player/puzzle | 118 authoritative + 352 consolidated PostgreSQL checks pass |
| 10. Desktop/mobile mock-first | SDK mocks for both platforms and real integrated browser viewport checks pass |
| 11. Live daily delivery disabled | Source flag false; no sender/adapter/worker wired; fake model containment tests pass |
| 12. No deployment/config changes | Portal read-only; no command/config mutations; no push/deploy |

## Validation evidence

Node 24.20.0 pinned but unavailable; used bundled **24.19.0** with:

```sh
export PATH='/Users/christopherrossi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin':$PATH
npm test
npm run typecheck
npm run build:server
npm run build
npm run build:chainshift:arcade
npm run test:production
node scripts/chainshift/check-isolation.mjs --ranked
node scripts/chainshift/check-integrated-isolation.mjs
node scripts/chainshift/test-authoritative.mjs
node scripts/chainshift/test-rehearsal.mjs
git diff --check
```

- **787 tests / 56 files** passed (36 added cases beyond Slice 7); final focused suite **100 tests / 6 files** passed after the payload type refinement.
- New cases cover exact/poisoned markers, URL configuration validation, SDK-before/after verification on desktop/mobile, failed session establishment, query-only spoofing, gates, once-only navigation, explicit user/history choices, disposed bindings, safe future daily payload, and the read-only command audit (including foreign/guild-scoped data).
- Typecheck, server/normal/integrated candidate/production builds passed; production smoke **269 assertions**, synthetic configuration only.
- Both bundle isolation checks passed: normal gameplay disabled, no solution-bearing reports/fixtures, lazy DOM-only candidate without Phaser imports.
- **118 authoritative + 352 consolidated PostgreSQL checks** passed using disposable PostgreSQL 18.6, including New York midnight/DST, global ownership, two guilds, immutable completion, retries, sessions, privacy, readiness and reconnect.
- Existing Balance tests/immutable digest and production smoke passed. No Balance/database schema changes; Slice 7's comprehensive database regression acceptance remains applicable.

CUA-only integrated browser acceptance:

1. Desktop-shaped fixed marker plus poisoned query identity/guild/puzzle/ranked/route reached the actual server-selected ranked daily; Start remained available (no automatic claim).
2. Return to lobby plus repeated fixture verification stayed in lobby (no reroute loop).
3. Mobile-shaped marker at 320×568 reached ranked daily without horizontal overflow.
4. Deliberate Start, accepted COLD shift and refresh resumed the same server-owned route/time.
5. Normal launch stayed lobby despite an active attempt; malformed marker stayed lobby.
6. Ordinary disabled build ignored the marker and direct Chainshift hash, safely showing normal lobby.
7. Independent verified B handoff showed its own available daily.

These use a fixture host for SDK-shaped handoff plus real synthetic cookie sessions/authoritative PostgreSQL; production SDK lifecycle is covered separately by mocks. No actual native Discord link click, phone keyboard/IME, or production auth request is claimed. Browser console final inspection was empty.

Ignored evidence: `tmp/chainshift/slice8-evidence/` contains tests/build/production/database logs, `browser.json`, and portal-mapping, desktop/mobile, normal, disabled and final-handoff screenshots. No secret values or credential-entry captures were collected.

## Local candidate and remaining handoff

```sh
npm run dev:chainshift:arcade
```

Uses a fresh owned local PostgreSQL cluster and synthetic sessions; no production credentials. Open a mock-shaped handoff at:

```text
http://127.0.0.1:5266/?frame_id=synthetic&instance_id=bridge&platform=desktop&custom_id=chainshift-today-v1
```

Use `platform=mobile` and narrow viewport for the mobile-shaped fixture. Without `custom_id`, the ordinary lobby opens. Do not mistake these local URLs for Discord launch URLs. Stop with Ctrl-C to clean the cluster; rebuilding server files while running can temporarily fail readiness, as documented in Slice 7.

Read-only audit after separate provider authorization, using the existing approved runtime credential:

```sh
node scripts/discord/audit-entry-point.mjs
```

Build first if running in a local authorized credential environment. The script needs existing `DISCORD_CLIENT_ID` and `DISCORD_ARCADE_BOT_TOKEN`; do not paste secrets into chat, logs or browser fields. Output is only status and public command metadata. Running newly added code in a hosted service requires an approved read-only execution path; do not deploy this slice just to perform the audit.

One remaining owner action is authorization for read-only access to the existing `cdawg-arcade` Render service solely to audit the current global command using its existing credential, without viewing/copying secrets or changing settings. Automatic approval review blocked that expanded access; routine local work is finished. No new secret or Discord setting change is requested.

Later, separately authorize a controlled real Discord desktop/mobile click-through against an exact deployed candidate and reviewed gates; verify the marker reaches SDK `customId`, established session, today's daily, ordinary launch and existing active-attempt resume. Keep live daily delivery off. If the audit identifies a missing/app-handled command that needs modification, report it for a separate configuration decision rather than registering or editing automatically.

Ending evidence commit and clean status are recorded in the final handoff. Normal Chainshift release remains `false`; `liveChainshiftDeliveryEnabled=false`; automatic deployment stays off.
