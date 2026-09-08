# Phase 1B live Discord validation

Date: 2026-09-08. Application: Cdawg Arcade. Test candidate: `a42c0207ab65b4939b7b1adee5bfa2afe61231ff` on `codex/phase-1-discord-launch-repair`.

## Result

PASS for the Phase 1 live acceptance gate. No repository defect was observed and no runtime code was changed. Chris confirmed that holding the Left control moved the platform left. Permanent hosting and Phase 2 are excluded.

## Pre-flight and temporary environment

The candidate was clean and matched origin. Both main and origin/main were at `f823fd6d2978d998f2cc1396be5680f9f155447b`, including a fresh remote check before merge.

The documented `npm run dev:all` workflow served the frontend on loopback port 5173 and backend on loopback port 3001. A temporary Cloudflare tunnel forwarded to the frontend; its existing `/api` proxy reached the backend. Local and tunneled frontend and health checks passed. The ignored rotated credential stayed on the backend; its value was never included in evidence.

Chris approved temporarily changing only the root Activity mapping from `built-yeah-scheduling-evident.trycloudflare.com` to `attempts-divorce-bureau-wool.trycloudflare.com`, and restoring the original afterward. No extra API mapping or other application settings were changed. The original endpoint was already unavailable; restoring it preserves the previous configuration, not working hosting.

## Live evidence

- Launched the installed Activity from the Cdawg Discord server's application launcher, with the Activity URL override unchecked. Discord generated its normal game invitation as part of launch.
- Inspected the real embedded frame: both required frame and instance parameters were nonempty, and platform was `desktop`. Parameter values were not recorded.
- The Activity reached the Discord authorization prompt. Chris personally authorized it. The resulting UI showed `Discord connected` and `CDAWG9000`, rather than a local-practice identity.
- This authenticated state is reached only after SDK readiness, authorization, backend token exchange, and SDK authentication with a real user. Successful completion is evidence that these stages passed; token or network payloads were not captured.
- Start Game displayed the countdown and entered the rendered game. A completed run reached loss/results, showing `Final Score · Saved locally` and `New local best`. Play Again started a fresh countdown and game.
- Chris confirmed: “yeah holding the left bar moved it to the left”. This verifies the visible control path; a sustained keyboard hold was not separately verified.
- The results view explicitly stated `Saved in this browser only. Not shared with your server.` The authenticated player remained correctly identified in the HUD.
- Desktop testing at 1200 by 900 displayed the complete Activity UI, controls, and results inside Discord. A very narrow Codex panel leaves little room after Discord's own sidebars; widening the test view was necessary. Earlier Phase 1 standalone responsive checks remain supplementary, not a claim of Discord mobile testing.
- No raw SDK, OAuth, backend, code, token, or secret details appeared in the Activity UI. Captured error checks found no historical `frame_id query param is not defined` exception and no errors attributed to the Arcade frame origin.
- No unsolicited duplicate authorization prompt or duplicate authentication behavior was observed during a launch or gameplay. Automated deduplication coverage also passed; raw authentication traffic was not captured or counted.

## Recovery

The temporary backend was briefly paused for a controlled recovery test. Reloading Discord ended the Activity, and relaunching presented authorization again. Canceling that authorization produced the safe message `Discord authorization did not complete. Retry and allow access, or continue in practice.` Both Retry and Continue in practice were available. The backend was resumed before Retry.

Selecting Retry restored `Discord connected` and the real Discord identity. This validates cancellation recovery, not a backend exchange timeout. Practice fallback was offered but not selected in this live run; its explicit local labeling remains covered by automated tests. The client secret and application configuration were not invalidated.

## Validation and merge procedure

Before recording this evidence, all 102 tests across 16 files passed, typecheck passed, and the production build passed. The build retained its existing large-chunk warning. A candidate credential scan found no findings. The evidence commit is the only addition to the tested candidate.

Merge is authorized only as a normal merge after the passed live gate, with a fresh baseline check, full tests/typecheck/build on the merge result, normal push, and preservation of the Phase 1 branch. Final SHAs and cleanup confirmation are recorded in the completion report.

## Cleanup

After Chris reauthenticated, the approved original root mapping was restored and the Developer Portal confirmed that the edits were saved. The temporary frontend, backend, and Cloudflare tunnel were stopped. No unrelated service was changed. The original mapping still references its previously unavailable temporary endpoint; there is no permanent hosting. The temporary browser viewport override was reset.

## Next scope

Recommend Phase 2 gameplay timing only. No Phase 2 work or permanent deployment was performed.
