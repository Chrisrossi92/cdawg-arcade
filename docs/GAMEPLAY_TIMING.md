# Balance simulation timing and interruption policy

Phase 2, 2026-09-08. Reference baseline: `1a755c6d665bcc7433d065dde4b42a894cae3726`.

## Clock and reference feel

Previously, acceleration, damping and release-kick decay ran once per render frame. Motion used at most 50 ms, but survival and hold duration advanced by the entire supplied delta. Thus device refresh rate changed outcomes, and a 5000 ms frame could award five seconds while moving only 50 ms.

`SimulationClock` now accumulates monotonic frame intervals and advances the existing physics coefficients only in **1000/60 ms ticks**. The coefficients, difficulty bands, disturbances, hold fatigue and release kick retain their 60 Hz reference meaning; tuning constants are unchanged. The physics primitive rejects non-fixed intervals. Survival time comes from completed simulation ticks, never directly from wall time. Monotonic time only schedules accepted work and input edges. Rendering occurs once per Phaser update, independently of tick count; there is no interpolation.

- Maximum accepted render interval: **100 ms**.
- Maximum catch-up work: **6 ticks per frame**; a sub-tick remainder carries forward.
- A negative, nonfinite, or greater-than-100-ms interval pauses the game. The entire interval and old fractional remainder are discarded, awarding zero ticks and zero score. There is no backlog or automatic catch-up on return.
- Resume clears the accumulator and input. Its first frame establishes a new time origin and performs zero physics steps.
- Timestamped input edges are consumed at the next fixed tick boundary, even when several ticks run in one render frame. Identical delivered input timelines therefore produce identical tick sequences. Browser/OS event delivery latency is outside this guarantee.
- Score retains existing nearest-tenth rounding. Failure freezes survival time; the existing 380 ms cosmetic impact delay and result-screen duration cannot change it.
- Countdown remains three 800 ms stages (2400 ms total), tracked separately with animation frames and the same stall cutoff. Interruption pauses it; Resume restarts the full countdown. Countdown never awards survival time.

## Interruption and controls

Document hidden and window/iframe blur both immediately clear controls and pause an active countdown or run. Returning focus or visibility never auto-resumes. A compact Paused panel with a Resume button preserves the current run. Local iframe testing verified that clicking outside the frame pauses it and clicking Resume restores it. This intentionally treats moving into Discord chrome as an interruption: it costs one Resume click, and does not reset gameplay or authentication. Actual Discord focus-event frequency remains unverified in Phase 2.

Pointer cancellation clears all held input without otherwise pausing a visible game. Buttons capture each pointer so releases outside their bounds are delivered; cancellation/lost capture releases controls. Keyboard arrows and A/D share one held-control collection with pointers. The most recently pressed distinct control wins; releasing it restores an earlier held control. Key repeats do not steal priority. Releases are identified by physical key code, avoiding stuck keys when letter case changes. Pause, replay, component cleanup, and scene shutdown clear input, fatigue and pending release kick. Resume requires a fresh press.

The scene is preserved during a pause. Component cleanup removes interruption/key listeners, cancels countdown frames, and destroys Phaser; scene shutdown removes its resize subscription. Scene creation does not override a pause that arrives during mounting. Repeated pause/resume events do not create new loops.

## Quantitative validation

All schedules use identical starting conditions and timestamped input edges. Script: Left at 80 ms, Right at 170 ms, release at 260 ms, Left at 380 ms, Right at 490 ms, release at 650 ms. The phase-transition fixture starts centered with disturbances disabled so it survives long enough to observe every band; production tuning is unchanged.

| Render Hz | No-input failure | Displayed score | Scripted failure / display | Active / Intense / Critical | Difference from 60 Hz |
|---|---|---|---|---|---|
| 30 | 700 ms | 0.7 s | 1050 ms / 1.1 s | 12 / 20 / 45 s | 0 ms |
| 60 | 700 ms | 0.7 s | 1050 ms / 1.1 s | 12 / 20 / 45 s | 0 ms |
| 90 | 700 ms | 0.7 s | 1050 ms / 1.1 s | 12 / 20 / 45 s | 0 ms |
| 120 | 700 ms | 0.7 s | 1050 ms / 1.1 s | 12 / 20 / 45 s | 0 ms |
| 144 | 700 ms | 0.7 s | 1050 ms / 1.1 s | 12 / 20 / 45 s | 0 ms |

The test compares complete final simulation states, not only rounded scores. Failure-time tolerance is less than 1e-7 ms (floating-point arithmetic allowance); observed differences are zero, including displayed tenths. Transition observation is allowed one fixed tick because a render may report multiple ticks together; all tested schedules observed the exact thresholds. An irregular 7/33/19/80/11/50 ms schedule with incrementally delivered input edges also matches the scripted reference exactly.

A 5000 ms delayed frame produces zero steps and no additional score, enters paused state, and clears held input. A 100 ms frame advances exactly six ticks. One hundred cycles of 100 ms simulated time followed by interruptions yield exactly 10000 ms simulated time, independent of the excluded background intervals. Tests cover partial remainder disposal, first-frame reset, replay, frozen final score, countdown, opposing input, pointer cancellation, blur/visibility handling, and listener cleanup/remount.

## Browser evidence and limits

Local browser checks covered start/countdown, deliberate loss, results, multiple Play Again runs, keyboard arrows and A/D, pointer button interaction, and a 375 by 667 game frame. A temporary local iframe wrapper verified pause during countdown and active gameplay when focus moved to the parent. Score stayed at 0.2 seconds through an interruption and resumed without a jump; controls remained available afterward. The paused presentation fit the narrow frame. The temporary wrapper was removed after validation.

Full suite: **122 tests across 17 files**, including frontend and backend; typecheck and production build passed. The pre-existing bundle-size warning is unchanged in scope. Frame-rate schedules, stalled frames, hidden events and pointer cancellation were exercised automatically; actual hardware refresh-rate throttling, native background-tab behavior and touch-device pointer cancellation were not separately measured. No debug controls enter the production build.

No Phase 2 Discord remapping or live OAuth run was performed: it would require another owner-approved mapping change. Host/authentication code is untouched. Local iframe focus checks supplement, but do not replace, a future real Discord check.

## Storage compatibility and future validation

Existing browser-local scores are neither deleted nor rewritten. They carry no simulation-version marker, so pre-fix best scores cannot be distinguished from fixed-clock scores. Results remain local practice and are not trusted competitive records.

A future server submission design should version the simulation/tuning, record fixed tick count, initial conditions, ordered tick-indexed input edges, and interruption counts/durations/reasons. The server should replay inputs and either reject interrupted competitive runs or enforce an explicit pause policy. Repeated pauses currently allow extra thinking time and are suitable only for local practice. No submission or storage migration is implemented here.

Remaining timing risks: devices with frequent >100 ms stalls may pause often; raw browser input delivery can differ across devices; very narrow Discord chrome can leave too little room for the game; native background/Discord focus behavior needs deployment-environment confirmation. The short existing no-input lifetime is intentionally retained rather than retuned.

Permanent hosting should precede shared persistence: the old temporary endpoint is unavailable, and a stable staging/Activity origin is needed to validate iframe focus and interruption behavior repeatedly before adding trusted score submission. Neither hosting nor persistence is part of this phase.
