# Phase 2B live Discord gameplay validation

Date: 2026-09-08. Client: Discord web desktop Activity in the Codex in-app browser on macOS. Candidate: `3c5c8d34f35f8bb79f969e3fa14f6b30742c283d`, branch `codex/phase-2-deterministic-gameplay`.

## Result and evidence boundaries

PASS WITH LIMITATIONS. The live merge gate passed following automated browser checks and Chris's manual acceptance of the requested control/focus/background/resume exercise: “everything worked great”. No Phase 2 defect was established and no runtime code or tuning was changed.

This is desktop web validation, not a separate native Discord or touch-device certification. Chris's response is an overall acceptance report, not a per-event trace. Opposing-input priority, pointer-cancel event dispatch, duplicate-listener prevention, exact dropped-time accounting, and the 100-cycle timing result retain their automated regression evidence; those individual events were not instrumented inside Discord.

## Pre-flight and environment

The expected candidate was clean and synchronized with its remote branch. Local and remote main remained at `1a755c6d665bcc7433d065dde4b42a894cae3726`. Applicable timing, prior live-validation evidence, and development setup were inspected. The local `.env` existed and remained ignored/untracked; no values or preservation-backup credentials were read into the report.

Only the documented temporary frontend/backend workflow and a Cloudflare quick tunnel were started. Frontend used loopback port 5173, backend 3001, and tunnel metrics 20241. Local and tunneled frontend and API health returned HTTP 200; health indicated configuration present. The existing frontend API proxy supplied backend routing.

Chris explicitly approved replacing the original root mapping with the fresh temporary tunnel and restoring it afterward. Only that mapping changed; no additional proxy mapping, scopes, installation context, commands, bot permissions, OAuth settings, or permanent infrastructure changed. Temporary hostnames are omitted from this evidence because they are not needed to reproduce the procedure.

## Authentication and gameplay

A fresh Activity was launched through Discord after reloading the previous session. The initial owner-authentication handoff exceeded the existing bounded sign-in timeout. The UI showed the safe timeout message; Retry was used and Chris completed authorization. The Activity subsequently displayed `Discord connected` and `CDAWG9000`. This was a recoverable handoff timeout, not evidence of a Phase 2 authentication defect.

Direct observations:

- Start Game displayed the normal countdown with no survival score awarded.
- A no-input run ended at the expected 0.7 seconds. The final result stayed stable and was labeled saved locally.
- Multiple Play Again actions started fresh runs with score zero.
- Local best remained the existing 0.9 seconds; it was not rewritten by the timing fix.
- The authenticated identity remained intact throughout gameplay and pause checks.
- No raw authentication details or historical SDK/context exception appeared in the Activity UI.
- Clicking Discord's chat visibility control paused the countdown. The compact Paused state appeared with disabled controls; Resume restarted countdown and allowed normal completion.

Chris was asked to try arrows and A/D, hold on-screen controls while moving focus away or minimizing, return and Resume repeatedly, and report stuck input, score gained while paused, immediate loss, excessive pauses, or different channel/view behavior. He reported that everything worked great. This supplies the manual live acceptance for control responsiveness, held-input interruption, background return, normal game feel, and practical pause/resume behavior. No channel/view difference or nuisance pause was reported; no separate per-channel trace was captured.

## Focus and interruption judgment

Automated attempts to click Discord chrome during the very short active run sometimes reached loss before a pause could be confirmed. These attempts are not counted as proof of paused active-play timing. The successful manual check supplements the directly observed countdown interruption and the Phase 2 local iframe/clock tests.

No evidence justified loosening the 100 ms stall threshold. It remains unchanged: exceptional intervals pause and award no simulation time, resume discards accumulated time and stale input, and normal frames run at most six 60 Hz ticks. There was no reported unusable pause frequency during manual normal play. Exact browser event frequency and native mobile pointer cancellation remain client-specific validation limitations.

## Validation and corrections

No code correction was made. The full suite passed again: 122 tests across 17 files, including frontend, backend and authentication regressions. Typecheck and production build passed; the accepted bundle-size warning remains.

The deterministic results remain unchanged at 30, 60, 90, 120 and 144 Hz: no-input failure 700 ms / displayed 0.7 seconds; scripted failure 1050 ms / displayed 1.1 seconds; phase transitions 12, 20 and 45 seconds; zero difference from 60 Hz. A 5000 ms frame adds no score. One hundred interruption cycles retain exactly the accepted 10000 ms of simulation. See `GAMEPLAY_TIMING.md` for fixture definitions and tolerances.

## Cleanup and merge completion

Chris reauthenticated in the Developer Portal. The approved original root mapping was restored, and the portal confirmed the save. Temporary frontend, backend, and tunnel processes exited; ports 5173, 3001 and 20241 were confirmed closed. The temporary viewport override was reset. The original mapping already referenced an unavailable endpoint; restoring it preserves previous configuration and does not provide permanent hosting.

No unrelated services were changed, including CDAWG Bot, GameOps Bridge, Palworld and Valheim. No credentials, authorization codes, tokens, or private environment values are included in evidence. Merge is a normal merge only after the passed gate, with full post-merge tests/typecheck/build and normal push. The Phase 2 branch is preserved; final SHAs are reported in the completion response.

## Smallest next hosting phase (not implemented)

Provide one stable HTTPS Activity origin serving the built frontend and same-origin API route, with the backend credential held server-side. Include process supervision, health checks, basic logs without credentials, and a documented rollback/restart procedure. Obtain owner approval for the final Discord mapping and validate authentication plus focus/resume at that stable origin. Defer shared persistence and trusted score submission until that launch path is reliable.
