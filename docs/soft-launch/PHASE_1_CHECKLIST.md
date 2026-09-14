# CDAWG Arcade soft-launch readiness — v1 / Phase 1

Base: accepted main 7fbc5f54730e719652a1f168ed815715dca00295; accepted deployment dep-dak230uq1p3s73cb18l0. The owner accepted the native Release B canary. This phase prepares a local candidate only. Current launch-checklist status is not permission to publish, change an audience or alter provider settings.

## Required before soft launch

| Item | State / evidence / next action |
|---|---|
| Application icon and bot avatar | Canonical v001 tag package prepared. Creative review pending; upload both in one later authorized Portal session. |
| Activity cover/background | Editable masters and deterministic PNG derivatives prepared, including crop specimens. Review then upload later. |
| Player copy and first-time help | Candidate implemented; compact contextual status, settings, nonblocking help, clear official/practice results. Local validation passed; see VALIDATION.md. |
| Lobby/game/results/Again/return | Local compiled practice/official navigation, cancellation and both soaks passed; accepted runtime preserved. |
| Official scoring, leaderboard, replay | No controller/server/rules/database changes. Full local database and browser gates passed; final live checks only during separately approved rollout. |
| Authentication/practice fallback | Contextual reconnect; no healthy reconnect; safe relaunch for unsupported context; practice remains available. No scopes or permission changes. |
| Accessibility/reduced motion | Keyboard dialog trap/Escape/focus return, labels, 44px controls, inline touch/keyboard help, OS and explicit reduced motion. Bounded local checks, not full WCAG certification. |
| Desktop Discord and pop-out | Local compiled Discord-context and 800×600 pop-out layouts. One consolidated native/external-user session after rollout; do not repeat unchanged Phase 4C tests. |
| Narrow/mobile/touch/tablet | 375×667, 390×844, 768×1024 plus desktop fixtures. Device-native behavior remains part of final consolidated acceptance. |
| Performance/payload | Exact bytes/hashes and repeated builds recorded in artifact-manifest.json; Balance stays deferred. |
| Health/readiness | Existing endpoints unchanged. Live gates must pass at a separately authorized exact-SHA rollout. |
| Database consistency/privacy | Ephemeral tests now; read-only production projection/replay checks at rollout. No synthetic production scores. |
| Security | No production diagnostics, query bypass, new secret or dependency. Preserve known advisory limitations; reassess before broader exposure. |
| Feedback route | Required owner decision: nominate an existing suitable feedback channel/contact and its audience. Do not invent a link, create a channel or enable posting. |
| Rollback | Phase 1 rollback is accepted Release B dep-dak230uq1p3s73cb18l0; no schema/config migration. Reverify artifact availability only at rollout. Older disabled-lobby artifact remains historical fallback, not the immediate Phase 1 target. |
| Announcement preparation | Draft factual one-game announcement after creative approval; owner approves audience and posting separately. Nothing sent in this phase. |
| External-user acceptance | One consolidated short session after authorized rollout and branding: invitation/identity, lobby, controls, one official result, leaderboard, Again, return, feedback route. No repeated routine testing now. |
| Creative review | One consolidated review of local lobby/settings/help/copy, icon specimens, cover crops, background, and upload package. Required before merge/deployment/Portal work. |

## Recommended shortly after launch

Review sanitized failure rates and payload/entry latency through existing capabilities; gather feedback through the approved route; broaden assistive-technology/device sampling; refresh the inherited dependency-advisory assessment in a separately reviewed maintenance task. Do not add monitoring services, cost or secrets without approval.

## Intentionally deferred

Live audience/spectator features and richer engagement indicators are deferred, not rejected. Also deferred: WebSockets, Redis, broadcasting, chat announcements, another game, presence/high-score posting, public audience expansion, and optional Shelf video production. No implied rejection of later design work.

## Acceptance boundaries

This checklist is versioned with the candidate. Portal destination labels/specifications are documented in BRAND_PACKAGE.md. Local UI and source inventories are in PLAYER_SURFACE_INVENTORY.md. Exact candidate validation and payload evidence are in the phase validation report. Keep automatic deployment off. A passed local candidate still requires the single creative review before any subsequent merge or rollout authorization.
