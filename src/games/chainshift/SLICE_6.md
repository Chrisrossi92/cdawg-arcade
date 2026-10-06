# Chainshift V1 Slice 6 — Arcade integration and Discord-ready projections

Local candidate only. No live release, Discord send/edit, push, deployment, scheduler, audience change, or Slice 7 work.

## 1. Starting commit/state

Started at `3a867e1555cd31a0a4405caecf23434b707f35e3` (accepted Slice 5), with a clean working tree on `codex/soft-launch-brand-player-cleanup`. All accepted Chainshift and Balance baselines remain ancestors.

## 2. Files changed

- Gate/build: `config/chainshift-release.ts`, `vite.config.ts`, `src/vite-env.d.ts`, `package.json`.
- Registry/shell: `src/games/registry.ts`, `src/types/game.ts`, `src/arcade/main.tsx`, `ArcadeApp.tsx`, `runtime.ts`, `lobby.css`, new `ChainshiftCard.tsx`, `ChainshiftEntry.tsx`, `chainshift-integration.test.tsx`, and the explicit local fixture entry `chainshift-candidate.tsx`.
- Existing game integration: `src/games/chainshift/Chainshift.tsx`, `RankedChainshift.tsx`, `ranked.ts`, `chainshift.css`. Existing referee, graph, practice repository, scoring, route field, and audio implementation remain intact.
- Server: `server/index.ts`, `server/chainshift/store.ts`, new `projections.ts`, `delivery.ts`, `delivery.test.ts`, `routes.test.ts`.
- Candidate/acceptance: `scripts/chainshift/local-ranked.mjs`, `test-authoritative.mjs`, new `integrated.vite.config.ts`, `browser-integrated-acceptance.mjs`, `check-integrated-isolation.mjs`.
- Documentation: this report and `README.md`.

No migration, dependency/lockfile, Balance game source, live bot, deployment configuration, Discord permission, or publication-certificate changes.

## 3. Release gate

`chainshiftReleased` is source-controlled **false**. Only explicit `chainshift-integration` mode enables the candidate browser entry. The normal Arcade runtime receives false; registry membership cannot grant visibility or navigation. Ordinary lobby cards and direct `#arcade/chainshift` navigation are contained. Unknown destinations safely resolve to the lobby.

Normal server startup now requires **both** `CHAINSHIFT_ARCADE_ENABLED=true` and `CHAINSHIFT_RANKED_ENABLED=true`, plus the existing verified sessions, restricted database readiness, and canary guild eligibility. Neither flag was enabled in live configuration. The local runner explicitly injects its synthetic runtime rather than modifying normal environment settings. All Chainshift endpoints fail closed without a runtime or readiness. Balance/lobby gates retain their accepted settings.

Discord delivery is separately disabled: `liveChainshiftDeliveryEnabled=false`; the model requires explicit local-model authorization and a fake-mode adapter. Even a supplied live-mode adapter is refused before any operation.

## 4. Registry

Chainshift has its own id, title, tagline, route, accent, and candidate availability. Balance retains its existing metadata with an explicit released availability. `availableGames(false)` returns only Balance; candidate metadata carries no puzzle, score, solution, or identity data.

## 5. Lobby card

The gated card uses existing Arcade surfaces, typography, button, card, index, and footer conventions. Copy is “CHAINSHIFT”, “Daily word challenge”, and “Connect the words. Find the shortest route.” Word-link artwork is code-native; no separate mascot or branding was introduced. Its native Play Chainshift button supports keyboard activation. Normal builds retain the original Balance and coming-soon cards.

## 6. Navigation

Lobby → Chainshift → lobby uses the existing history controller and `#arcade/chainshift`. Reload/direct candidate entry, Back/Forward, and invalid/disabled destinations are covered. Path and full launch query are preserved; query parameters do not authenticate a player.

Busy or uncertain ranked actions immediately lock navigation, including browser Back. Retry retains the original request id/revision, then confirms the server state. Confirmed active departure does not cancel, pause, reset, or rewrite a Chainshift attempt: returning rechecks/resumes the database-owned attempt, including time away. Departing active Balance still interrupts only Balance. Chainshift does not trigger Balance best celebrations.

The integrated Back to Arcade control is in the existing game header, avoiding a second navigation row that would squeeze the mobile chain. Returning to the lobby focuses Play Chainshift while preserving its normal keyboard tab stop.

## 7. Game entry and loading

A gated, lazy `ChainshiftEntry` shares the Arcade suspense/error-boundary architecture with a bounded import timeout. The normal compiled build omits the Chainshift entry and graph. Chainshift mounts React/DOM only; the integrated chunk and its static dependencies contain no Phaser/Balance game import. Browser checks found zero canvases in Chainshift after leaving Balance. Balance remains independently lazy-loaded.

## 8. Host/session integration

The shipping-shaped candidate uses the same `createHostAdapter`, local/Discord host adapters, and single Arcade runtime as the accepted lobby. The local fixture harness implements the host contract with clearly labeled mock identities and a new owned PostgreSQL cluster; it never initializes live Discord.

The game rechecks the existing application cookie session through `ArcadeSessionClient.me()`, verifies both player and current guild against host context, and derives CSRF/identity from that response. Ranked requests use the existing API-base convention and verified player binding. Host display state alone cannot grant ranked play. Account/guild transitions immediately suppress old private data and ignore stale async replies. A lost previously verified session presents explicit recovery/practice choice; it does not silently turn an established ranked experience into practice.

## 9. Entry states

- **Ranked available:** authoritative daily endpoints/day, normal Start, no local review selection.
- **Active:** ranked attempt in progress with Resume; original route/start and continuous elapsed time restored.
- **Completed:** server-verified score/result; no second ranked Start; authorized leaderboard/routes and separate practice.
- **Practice only/chosen:** visible LOCAL PRACTICE, device-only results, local puzzle selector, no official writes.
- **Unavailable/uncertain:** honest unavailable/recheck/retry presentation, retained authoritative attempt, navigation lock where confirmation is unresolved. A transient readiness failure during a local server rebuild was observed and recovered through Recheck Daily without a practice downgrade.

## 10. Leaderboard

Uses the unchanged Slice 5 authoritative endpoint: shifts ascending, authoritative milliseconds ascending, exact ties sharing a rank. Global/current verified guild toggles, current-player identity, and own standing remain available. Practice scores are excluded. No leaderboard response requests/selects completed routes.

## 11. Route comparison

The native dialog requests the route endpoint only after the requesting player is completed. An incomplete fixture saw the prior player’s score but no route controls/data; after its completion it could inspect that player’s route. Server completion enforcement remains intact, including HTTP 403 coverage. Routes wrap within the narrow dialog, without horizontal overflow. Escape/focus return and disclosure controls remain native.

## 12. Daily projection

Internal `ChainshiftStore.dailySummary` authenticates and selects only completed score aggregates, optionally within the current verified guild. It computes total completed players, minimum shifts, and minimum elapsed milliseconds **among that shift count**. It does not select routes, active attempt state, or private identities. The pure projection explicitly allowlists fields rather than spreading inputs.

Example (illustrative facts, not an actual publication):

```json
{
  "kind": "chainshift-daily",
  "puzzleId": "daily-027",
  "day": "2026-10-06",
  "start": "black",
  "finish": "party",
  "completedPlayers": 9,
  "shortestShifts": 4,
  "fastestAtShortestMs": 38000,
  "play": {
    "kind": "activity-launch-unresolved",
    "game": "chainshift",
    "destination": "#arcade/chainshift",
    "label": "Play Today's Chain"
  }
}
```

Compact copy: “CHAINSHIFT · daily-027 / BLACK → PARTY / 9 completed / Shortest found: 4 shifts / Fastest 4-shift completion: 0:38 / Play Today's Chain”. Empty participation uses null score summary fields and omits shortest/fastest copy. Puzzle id is used rather than inventing an editorial sequence number.

## 13. Result projection

`ownResultSummary` requires an authenticated owner’s completed result and selects only final score facts. No completion means no result projection. Example:

```json
{"kind":"chainshift-result","puzzleId":"daily-027","day":"2026-10-06","displayName":"Chris","shifts":4,"elapsedMs":51000}
```

Copy: “Chris completed Chainshift · daily-027 / 4 shifts · 0:51”. No route, private player/session id, or invented rank. Names/markup are escaped in rendered copy. Sharing is optional and no completion invokes it.

## 14. Delivery contract

`ChainshiftDelivery` models create daily, update an identified daily message, and explicitly consented result publication with operation keys. A future adapter must suppress mentions and resolve a truthful Activity launch action. There is **no live adapter, HTTP send/edit implementation, credential lookup, completion callback, or bot integration**. Only `FakeChainshiftDelivery` and `MemoryDailyMessages` are provided for this model; fake message ids are visibly synthetic.

## 15. Daily idempotency/reconciliation model

The identity is a digest of game, configured destination key, and day. Puzzle metadata changes on the same day still reconcile the same message. A receipt retains message id, content digest, and monotonically increasing revision. Reconciliation is serialized by repository contract; unchanged facts do nothing. Participation/shortest/fastest updates edit the same message. Revision-qualified operation keys also handle returning to a prior summary after guild participation changes.

Stable create keys model lost create replies/receipts; the reconciler recovers the existing fake id and reconciles current facts. Tests cover concurrent duplicates, new engine with retained repository/adapter state, lost reply retry, changed summaries, repeated content, separate destinations, and next day. The in-memory implementation is **not process-durable production storage**. Before live delivery, a durable cross-process repository and a proven Discord-side uncertain-send recovery mechanism must satisfy these contracts; neither is claimed as implemented here. There is no scheduler/worker.

## 16. Discord launch findings

The accepted architecture establishes a Discord Activity through its installed application launcher; the adapter exposes authenticated `openInviteDialog` for the existing Activity. The accepted launch report documents launcher/invitation behavior. Neither source establishes a verified daily-post button/deep link selecting Chainshift and joining an authoritative Activity session.

Accordingly the projection action is explicitly `activity-launch-unresolved` with only game/in-app destination metadata. No Discord deep link or ordinary browser URL is represented as a verified ranked launch. The future launch action remains a release decision/verification task.

## 17. Spoiler audit

- Registry/lobby contain only game metadata/copy, no puzzle analysis.
- Ranked puzzle payload remains the safe Slice 5 publication projection: endpoints, day, graph/rules identity; no certificates/solutions.
- Leaderboards select safe completed score/name facts and never include route fields.
- Daily aggregate SQL and result SQL select completed facts only; projection allowlists discard poisoned extra route/certificate/private fields.
- Daily/result copy contains no intermediate route words or graph solution data.
- Other-player routes require the requester’s completion, server-side; client does not fetch that endpoint earlier.
- Compiled normal build excludes gameplay/fixture markers and graph. Integrated and isolated candidate artifacts exclude solution-bearing review reports/certificates. Vite manifest checks verify lazy entry and Phaser-free dependencies.
- Errors remain sanitized codes/copy; no new private server logging was introduced. Expected synthetic lost-response errors are distinguished from normal preview errors.

Approved limitations: the candidate’s local practice referee ships the approved phrase graph and practice minimums. A determined practice user can analyze that graph; this slice does not claim a secrecy boundary against graph analysis. Local Vite is a developer server, not a public hardened release artifact. Review files are not imported or emitted by the browser builds. Existing owned route payloads still contain the player’s own route so they can play/resume.

## 18. Accessibility/mobile

Preserved keyboard/IME handling, continuous timer, destination anchor, expanding scroll field, locked links, audio/mute, reduced motion, focus and live-region behavior. Arcade reduced-motion preference also reaches the game’s behavior, not just CSS. Ranked/practice labeling is textual at narrow sizes. The integrated exit has a visible arrow and accessible Back to Arcade label; it disables during uncertain actions. Comparison now uses border-box sizing and wrapping scores/routes.

Verified actual dimensions: 1280×900 desktop; 320×568 mobile; 390×430 keyboard-height simulation. In the 20-shift ranked route at 320×568, current word was approximately y238–293 within the y218–293 route scroller; destination y319–371, input y436–489. At 390×430, current word y150–205 within y123–205, destination y223–267 and input y311–364. No horizontal overflow. Compact practice also retained its full current word/destination. Physical phone keyboard/IME and subjective sound perception retain the accepted baseline’s limits; no fresh live Discord playthrough was required.

## 19. Browser acceptance

CUA exercised the Arcade shell with a disposable authoritative service: gated lobby/card; ranked availability/Start; valid and invalid moves; backtrack; lost committed response; disabled exit/browser Back; same-action retry; confirmed active departure; history Back/Forward; reload/resume; completion; immutable official result/no second Start; leaderboard before completion without routes; post-completion comparison; fewer shifts outranking a faster longer route; deliberate practice and keyboard play; return/lobby focus; Balance start and practice completion; direct normal-build containment; a long third-player route; mute/reduced-motion; account and guild transition; same result in a second guild and guild-only comparison.

The final compact header’s uncertainty lock was separately verified after its responsive correction. Normal direct `#arcade/chainshift` returned to the original lobby with no Chainshift card. Fresh final preview console checks are included in local evidence. Evidence/harness reports live under ignored `tmp/chainshift/slice6-evidence/`; those files are not runtime/build data.

## 20. Validation

Validated with available bundled Node **24.19.0**; repository engine pins 24.20.0, which is not installed on this machine. No dependencies were installed.

- `npm test`: **751 tests / 53 files passed**, including the final Balance-departure regression.
- `npm run typecheck`: passed, also run by production builds.
- `npm run test:chainshift:authoritative`: **118 real ephemeral PostgreSQL checks**, including authoritative aggregate/result privacy and exact ties.
- `npm run test:database`: **260 foundation/fallback + 74 sessions + 107 personal results + 125 guild + 16 canary + 99 attempts**; backup/restore passed. No production database used.
- `npm run build:server`, `build:chainshift`, `build:chainshift:ranked`, `build:chainshift:arcade`: passed.
- `npm run test:production`: production build and **263 smoke assertions** passed with dummy configuration only.
- `node scripts/chainshift/check-isolation.mjs --ranked`: passed.
- `node scripts/chainshift/check-integrated-isolation.mjs`: passed.
- Browser acceptance and `git diff --check`: passed after corrections.

Existing Phaser import/chunk-size warnings remain in Balance builds; Chainshift has no Phaser dependency. Socket-based tests were run with the required local execution permission, and all database workflows used fresh owned clusters. An initial sandbox-only full test run failed on prohibited socket binding and was rerun successfully with local socket access.

## 21. No live Discord sends/edits

Explicitly confirmed: no Discord message creation/editing, player-result posting, live bot changes, new credentials, permissions/scopes, live playthrough, or daily delivery. The fake-only model refuses live-mode adapters.

## 22. No push/deployment

Explicitly confirmed: no push, deployment, production database/configuration changes, live gate enabling, scheduler, or audience expansion. Automatic deployment stays off.

## 23. Remaining release risks for Slice 7

A truthful Discord Activity launch action, durable destination/message receipts and uncertain-send recovery, approved daily publication provenance, live delivery permissions/configuration, release/audience authorization, and one consolidated major-milestone canary remain future work. Mock sessions cannot certify actual Discord account transitions or network/proxy latency. Server elapsed time includes inbound network/queue/database latency; no latency compensation is claimed. These are reported boundaries, not implemented Slice 7 work.

## 24. Ending commit/state

The local Slice 6 commit containing this report is the ending candidate; the final handoff supplies its exact SHA. Working-tree cleanliness is checked after committing. All accepted baselines remain unchanged ancestors. Local screenshots/builds/clusters are ignored artifacts, not shipped files.

## 25. Exact launch instructions

From this repository:

```bash
cd /Users/christopherrossi/Documents/cdawg-arcade
npm run dev:chainshift:arcade
```

If using the validated bundled runtime on this machine:

```bash
PATH=/Users/christopherrossi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run dev:chainshift:arcade
```

Open **http://127.0.0.1:5266/**; direct candidate destination is **http://127.0.0.1:5266/#arcade/chainshift**. The loopback authoritative API is 5267. Mock accounts A/B/C use guild 1; A2 is the same A player in guild 2. Balance deliberately uses practice in the fixture harness. The fixture bar is local-only; Simulate lost action response arms one synthetic mutation reply loss.

The runner creates an owned disposable PostgreSQL cluster, publishes the same accepted ICE → ROOM fixture for the database’s New York day, and creates synthetic sessions. It does not read dotenv, production credentials, or caller database URLs. Stop with Ctrl-C to clean up that owned cluster. Restart gives a fresh synthetic competition. If this candidate is already running, use its link rather than starting a second process on those ports.

For a shipping-shaped candidate build without the fixture host: `npm run build:chainshift:arcade`. Ordinary `npm run build:production` remains disabled for Chainshift. Do not deploy either artifact in this slice.

**SLICE_6_PASS**
