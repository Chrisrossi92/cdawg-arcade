# CDAWG Arcade soft-launch readiness — v1.1 / Phase 1

Base: accepted main 7fbc5f54730e719652a1f168ed815715dca00295; accepted deployment dep-dak230uq1p3s73cb18l0. The owner accepted the native Release B canary. This phase prepares a reviewed integration branch only; see INTEGRATION_VALIDATION.md for fresh combined evidence. Current launch-checklist status is not permission to publish, change an audience or alter provider settings.

## Required before soft launch

| Item | State / evidence / next action |
|---|---|
| Application invitation icon and bot avatar | Canonical v001 tag package prepared. Creative review approved by Chris on 2026-09-14; Application invitation icon remains pending, not independently verified; upload only in a later authorized Portal session. |
| Activity cover/background | Editable masters and deterministic PNG derivatives prepared, including crop specimens. Creative review approved; upload later after authorization. |
| Player copy and first-time help | Candidate implemented; compact contextual status, settings, nonblocking help, clear official/practice results. Local validation passed; see VALIDATION.md. |
| Lobby/game/results/Again/return | Local compiled practice/official navigation, cancellation and both soaks passed; accepted runtime preserved. |
| Official scoring, leaderboard, replay | No controller/server/rules/database changes. Full local database and browser gates passed; final live checks only during separately approved rollout. |
| Authentication/practice fallback | Contextual reconnect; no healthy reconnect; safe relaunch for unsupported context; practice remains available. No scopes or permission changes. |
| Accessibility/reduced motion | Keyboard dialog trap/Escape/focus return, labels, 44px controls, inline touch/keyboard help, OS and explicit reduced motion. Bounded local checks, not full WCAG certification. |
| Desktop Discord and pop-out | Local compiled Discord-context and 800×600 pop-out layouts. One consolidated native/external-user session after rollout; do not repeat unchanged Phase 4C tests. |
| Narrow/mobile/touch/tablet | 375×667, 390×844, 768×1024 plus desktop fixtures. Owner attests native Discord iPhone launch passes at the platform-access level (2026-09-15); no further OS-error diagnosis or iPhone test is requested in this preparation. This is not full native gameplay certification. |
| Performance/payload | Exact bytes/hashes and repeated builds recorded in artifact-manifest.json; Balance stays deferred. |
| Health/readiness | Existing endpoints unchanged. Live gates must pass at a separately authorized exact-SHA rollout. |
| Database consistency/privacy | Ephemeral tests now; read-only production projection/replay checks at rollout. No synthetic production scores. |
| Security | Fresh scoped npm assessment complete (2026-09-15): 11 distinct advisories (6 high, 5 moderate), 10 represented after pruning, 0 publicly reachable vulnerable paths, 0 release blockers. Accepted for this soft launch under current controls; no required pre-launch remediation. See DEPENDENCY_ADVISORY_ASSESSMENT.md. No dependency/config changes. |
| Feedback route | Approved permanent destination: #cdawg-arcade (1549149791915737129), Community. Plan a Feedback & Bugs thread attached to the pinned welcome post. Owner confirms the dedicated channel was created and the welcome message posted and pinned. Feedback & Bugs thread remains pending; no thread creation is performed in this preparation. |
| Rollback | Phase 1 rollback is accepted Release B dep-dak230uq1p3s73cb18l0; no schema/config migration. Reverify artifact availability only at rollout. Older disabled-lobby artifact remains historical fallback, not the immediate Phase 1 target. |
| Announcement preparation | Welcome, announcement and Feedback & Bugs starter drafted in DISCORD_DRAFTS.md. Welcome is already posted and pinned per owner. Broader announcement is intentionally pending; its source channel/audience and publication remain unapproved. |
| External-user acceptance | One consolidated short session after authorized rollout and branding: invitation/identity, lobby, controls, one official result, leaderboard, Again, return, feedback route. No repeated routine testing now. |
| Creative review | Completed: Chris approved icon family, cover/background, identity/settings, first-time help and copy on 2026-09-14. This does not authorize merge, deployment, uploads or messages. |

## Recommended shortly after launch

Review sanitized failure rates and payload/entry latency through existing capabilities; gather feedback through the approved route; broaden assistive-technology/device sampling; complete the separately reviewed patch/minor dependency maintenance and production-pruning cleanup listed in DEPENDENCY_ADVISORY_ASSESSMENT.md, then re-audit. Do not add monitoring services, cost or secrets without approval.

## Intentionally deferred

Live audience/spectator features and richer engagement indicators are deferred, not rejected. Also deferred: WebSockets, Redis, broadcasting, chat announcements, another game, presence/high-score posting, public audience expansion, and optional Shelf video production. No implied rejection of later design work.

## Acceptance boundaries

This checklist is versioned with the candidate. Portal destination labels/specifications are documented in BRAND_PACKAGE.md. Local UI and source inventories are in PLAYER_SURFACE_INVENTORY.md. Exact candidate validation and payload evidence are in the phase validation report. Keep automatic deployment off. Creative review is complete. Subsequent merge, exact-SHA rollout, Portal saves and Discord publication still require consolidated authorization; see ROLLOUT_PLAN.md.

## Owner-attested platform access — 2026-09-15

CDAWG Arcade now launches successfully in the native Discord app on iPhone. iOS support required correction/confirmation in Discord Activities settings. Platform-access certification passes and the prior “not available on this OS” diagnosis is closed. This owner attestation supersedes the earlier audit uncertainty; no fresh Portal inspection is claimed. No additional iPhone testing is requested during preparation. Live-audience functionality remains deferred.
