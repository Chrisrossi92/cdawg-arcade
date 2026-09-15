# Soft-launch integration review and rollout order

Accepted main: `7fbc5f54730e719652a1f168ed815715dca00295`. Accepted deployment reference: `dep-dak230uq1p3s73cb18l0`. These references are owner-supplied; main was independently verified on GitHub, and production was not accessed during integration preparation.

The dedicated `codex/soft-launch-integration` branch normally merges reviewed histories `fb8fa515f8113cbdad0e283cd72c5862d38c6883` and `8f83b0c08d301ca5899697c56ca743aa262b9a3d`. Both merges were conflict-free. Visual review additionally corrected one inherited home-screen expanded-help overlap with one CSS rule and added mobile regression assertions; gameplay/server code is unchanged. Fresh combined evidence and limitations are in INTEGRATION_VALIDATION.md; earlier validation documents are historical.

## Completed owner decisions

Creative approval stands. The permanent home is **#cdawg-arcade**, channel **1549149791915737129**, category **Community**. The owner confirms the channel was created and its welcome message posted and pinned. Do not duplicate either. Message ID remains unverified; documentation does not invent one.

The owner confirms native Discord iPhone launch after correction/confirmation in Activities settings. Platform-access certification passes. The prior OS-unavailable investigation is closed. Do not request another iPhone test during preparation. This does not claim physical certification of every gameplay, audio, overlay, thermal, or accessibility behavior.

The Feedback & Bugs thread remains pending. The application invitation icon remains pending unless independently verified. Broader announcement is intentionally pending, with source channel/audience unapproved. Live-audience functionality remains deferred.

`destination.json` is a documentation reference only, not runtime authorization or configuration. Preparation does not authorize Portal saves, Discord messages/threads, changes to audience, production data, Render, DNS, or permissions.

## Recommended final rollout sequence

1. Review the integration SHA, fresh validation, payload impact, and remaining security limitation. Resolve the inherited dependency-advisory assessment before broader exposure: a fresh npm audit was previously blocked by automatic review and needs explicit authorization covering dependency names/versions sent to registry.npmjs.org. Local security scanning is not a replacement for this assessment.
2. Obtain bounded authorization for normal merge into main and deployment of the resulting exact SHA. Recheck main/candidate ancestry, automatic deployment remaining off, rollback artifact availability, and configuration compatibility. Preserve normal merge history; no squash, rebase, force-push, or branch deletion is required.
3. Build and validate the actual resulting merge SHA. Preserve all required automated, disposable PostgreSQL, smoke, reproducibility, renderer/audio/countdown, lifecycle, replay/projection, security, asset, and layout gates. Stop on a failed gate. Do not lower the active 100 ms protection to accommodate test-host stalls.
4. Deploy the exact validated SHA only after authorization. Check metadata, readiness/health, TLS, static assets, authentication/CORS, sanitized logs, and read-only projection/replay consistency. Do not generate synthetic production scores. If required checks fail, use the accepted Release B artifact under authorized rollback scope. There is no schema or dependency migration; application rollback does not restore Portal artwork.
5. In a separately authorized branding session, verify existing artwork first and apply only missing approved assets from PORTAL_UPLOAD_PLAN.md. Preserve prior artwork for rollback. Do not repeat the completed iOS platform correction or change mappings, scopes, discovery, or audience settings.
6. With explicit message/thread authorization, reuse the existing pinned welcome, create its Feedback & Bugs thread, post the approved starter, and record actual IDs. Verify ordinary member access using existing tools; do not silently change permissions. Announcement stays unsent.
7. Reuse the accepted Release B canary and owner-confirmed iPhone platform access. After rollout, establish only remaining native-only release evidence, if necessary, in one consolidated session. Do not request a repeated iPhone launch test during preparation or routine gameplay already covered by automation.
8. Announce last, only after release checks and the feedback route are ready and the exact draft/source audience is authorized. No mass mentions, audience expansion, spectator features, broadcasting, or additional games are implied.

## Current stopping point

Preparation may commit and push the integration candidate after all automated gates pass. It does not merge main, deploy, upload artwork, change settings, create threads, publish announcements, or access production. The next step is review of this candidate, followed by separately authorized rollout actions.
