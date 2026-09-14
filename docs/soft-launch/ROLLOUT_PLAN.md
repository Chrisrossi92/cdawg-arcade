# Soft-launch final review and rollout order — v1

Creative approval received 2026-09-14 for runtime candidate 75a0d8d58552cda3af75ca81656a7ee06ee33507 (tooling commit 09c545db084e07a0091c7276a82a367418e64785). Current accepted main is 7fbc5f54730e719652a1f168ed815715dca00295; accepted deployment reference is dep-dak230uq1p3s73cb18l0. This follow-up changes documentation only. Historical validation results remain historical; no live production verification is claimed here.

## Destination decision

The permanent community home is **#cdawg-arcade**, channel **1549149791915737129**, category **Community**. Launch the Arcade there, discuss scores, and gather the community there. The proposed **Feedback & Bugs** thread is attached to the pinned soft-launch welcome post. This replaces the idea of using #conference-room for feedback.

`destination.json` is a non-secret documentation reference. Channel IDs remain strings. It is not imported into application code, an environment variable, an authorization allowlist, a bot command registration, or a webhook target. No channel move, category change, permissions change, posting action, or database change is implied. The provided category/name are owner-supplied, not freshly inspected Discord state.

## Pre-merge review

The approved candidate changes player presentation and canonical derivative branding, plus local browser diagnostics and tests. Only the approved UI files change application source; protected gameplay/physics, composite readiness, countdown-gap behavior, zero-tick start, active 100 ms interruption policy, official-attempt/replay/session/database code, canonical V004 assets and hosting configuration remain unchanged against accepted main. No dependency changes or production diagnostic gate were introduced.

The source/asset validator and upload hashes are checked again for this follow-up. A clean ancestor relationship establishes that main can be merged without a content conflict; no merge is performed. The doc-only follow-up must remain byte-identical to the approved candidate outside docs/soft-launch. Exact reviewed commit and Git verification are recorded in FINAL_REVIEW.json.

The accepted application validation is 484 tests, 681 PostgreSQL checks, both build modes, reproducibility, browser matrices/soaks and the successful final headed rerun; see VALIDATION.md and validation-summary.json. Do not rerun unchanged gameplay solely for this documentation change. Required post-merge and rollout checks still run against the resulting exact SHA during the authorized release phase.

No new application blocker was found by the final scope review. The inherited seven dependency advisories and blocked fresh registry audit remain an unresolved pre-exposure security item. A merge-ready local review is not a claim that every production release gate has been freshly passed.

## Controlled rollout sequence

1. **Consolidated authorization.** Approve normal merge, controlled deployment of its resulting exact SHA after gates, the four named Portal uploads, and publication/pinning/thread creation of the exact drafts. Specify the announcement source channel and audience, or leave that announcement unsent. No mass mentions are proposed. Creative approval already stands and is not requested again.
2. **Release preflight and merge.** Recheck clean/synchronized candidate and main, scope, original artifact availability and configuration compatibility. Resolve the security assessment before broader exposure: a fresh npm production-dependency audit would send dependency names/versions to registry.npmjs.org and requires narrowly scoped authorization after the previous automatic rejection; do not bypass it. Review the inherited advisories and any new result. Merge normally only within approved scope, without squash/rebase/force-push/branch deletion.
3. **Exact merged build and gates.** Build the actual merge SHA, record release metadata/hashes, check unchanged V004 assets and deferred Balance payload, and run established automated, ephemeral PostgreSQL, both-mode smoke, readiness/countdown, lifecycle, replay/projection, asset, accessibility, security and reproducibility gates. A failed required gate stops deployment. Correctly handled real blur/active-gap interruptions are documented protection events; do not hide unexpected foreground countdown pauses.
4. **Controlled application deployment.** Deploy only the verified exact SHA through the existing Render process, automatic deployment still off. Verify both origins, TLS, metadata, readiness/health, static assets, authentication/CORS, sanitized logs and read-only production projection/replay consistency. Do not create test scores or alter production data. Use the accepted Release B artifact for an authorized nondestructive rollback if required post-deployment gates fail. No settings, permissions, credentials, costs or mappings change.
5. **Branding session.** Execute the five-step PORTAL_UPLOAD_PLAN.md after the deployment gates pass, using the four exact approved PNGs. Save prior artwork separately because application rollback does not restore Portal art. No application metadata, discovery or audience configuration changes.
6. **Prepare the channel for members.** With the explicit publication authorization from step 1, post the welcome in #cdawg-arcade, pin that same message, create Feedback & Bugs from it, and post its starter. Record actual message/thread IDs in the documentation reference; do not invent them. Verify the existing Apps launcher and ordinary member access read-only. If launch/thread permissions are unavailable, pause that portion rather than change permissions. These actions are intentionally not performed now.
7. **One consolidated native acceptance, only for what automation cannot establish.** Check actual Discord artwork/crops and launch from the permanent channel as an ordinary intended member, settings/help, one official result, leaderboard, Play Again, return to lobby and access to the feedback thread in one short session. Reuse automated evidence and the already accepted Release B canary; no repeated routine gameplay. A native official run is owner/user acceptance, never a synthetic production score. Do not ask for this session before all independent automated/provider work is ready.
8. **Announce last.** Once acceptance passes and the welcome/thread are usable, publish the approved short announcement only in the explicitly selected source channel/audience. Route members to #cdawg-arcade. Stop at the soft launch; no further game, presence, audience expansion, or broadcasting work.

## Who can complete what

| Work | Codex can complete | Owner involvement |
|---|---|---|
| Documentation, drafts, local review, checks, branch commit/push | Now, within this phase | None; complete |
| Normal merge, exact-SHA gates/deploy and permitted rollback | After consolidated rollout authorization, using existing tools/access | One authorization; no routine testing |
| Fresh external dependency audit | Only after resolving previous automatic-review restriction with explicit destination/payload scope | Include narrow authorization in the same handoff; not run now |
| Four Portal uploads | After authorization, via an existing authenticated session if upload controls are supported | Sign-in/2FA only if unavailable; otherwise no manual upload required. If tools cannot operate the controls, one five-step session from PORTAL_UPLOAD_PLAN.md |
| Welcome/pin, thread/starter, announcement | After exact publication authorization, if existing permissions and tooling suffice | Choose announcement source/audience in the same handoff; no new permissions assumed |
| Actual native member presentation/access | Automate what existing sessions establish; reuse prior acceptance | At most one consolidated short canary for remaining native-only evidence, no routine repeated play |

No owner action is required to complete this preparation. The next authorization can approve the bounded sequence and name the announcement channel in one reply. Do not bundle an unapproved audience or permission change into that reply by assumption. If future provider sign-in or an unsupported upload requires manual action, finish independent work and present one combined handoff, targeting under five minutes of hands-on steps.

## Remaining checklist

Completed: creative approval; permanent destination decision; exact asset plan; three publication drafts; local candidate validation and final scope review. Pending: fresh security assessment/disposition, explicit release/publication authorization, announcement source/audience, merge/exact-SHA post-merge gates, deployment/live health and read-only integrity checks, Portal uploads, welcome/pin/thread creation, one native-only acceptance session if needed, then announcement. Live audience/spectator features and richer engagement indicators remain deferred, not rejected.
