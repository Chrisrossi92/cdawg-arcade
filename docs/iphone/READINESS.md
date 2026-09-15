# CDAWG Arcade iPhone readiness audit

Audit date: 2026-09-14. Candidate base: `fb8fa515f8113cbdad0e283cd72c5862d38c6883`. Branch: `codex/iphone-readiness-audit`.

## Launch diagnosis and Portal scope

Read-only inspection of **Cdawg Arcade**, application `1525643672194908330`, Activities → Settings → Supported Platforms found **Web checked, iOS checked, Android checked**. Reloading the page preserved all three selections without an unsaved-change banner. Phone and tablet orientation displayed Unlocked. No checkbox or setting was changed; OAuth secrets and unrelated configuration were not inspected.

The reported “unavailable on this OS” message is **not explained by a currently disabled iOS setting**. The audit cannot establish the historical setting at the time of that message, client propagation, or the launch context. These remain unproven explanations, not confirmed causes. Exact proposed Portal change: **none**. Do not toggle iOS or Android as a speculative remedy.

Production release `7fbc5f54730e719652a1f168ed815715dca00295` / `dep-dak230uq1p3s73cb18l0` is the owner-provided accepted state; this audit does not redeploy or independently certify its current health.

## Official requirements and application disposition

- [Discord mobile guidance](https://docs.discord.com/developers/activities/development-guides/mobile): platform availability is configured in Activities Settings. Use Discord's four safe-area custom properties before native CSS environment fallbacks. Thermal updates are available through the SDK. This candidate implements the inset hierarchy; no thermal subscription is added. Thermal-aware cosmetic degradation is a post-launch enhancement; the existing active-frame interruption limit still protects scoring during stalls, but is not a thermal control.
- [Discord layout guidance](https://docs.discord.com/developers/activities/development-guides/layout): orientation can be unlocked or constrained, and orientation/layout events describe focused, PIP and grid contexts. Retain Unlocked, use responsive layout and resize handling, and preserve blur/visibility interruption. No SDK orientation lock or new event subscription is needed for the two supported layouts. An overlay that neither hides nor blurs the WebView still needs physical canary observation.
- [Activities architecture](https://docs.discord.com/developers/activities/how-activities-work): the Activity runs in an iframe with SDK messaging. Existing SDK-ready, verified identity, server authority, cancellation and contextual reconnect remain unchanged; mock tests do not authenticate a physical Discord iPhone client.
- [WebKit iPhone layout](https://webkit.org/blog/7929/designing-websites-for-iphone-x/): `viewport-fit=cover` allows edge-to-edge layout and requires inset-aware content. Added to the application HTML. The game retains its existing `touch-action:none` policy; the document no longer globally disables zoom with `user-scalable=no`. Lobby scrolling/zoom is not suppressed. This does not claim unrestricted pinch zoom inside the game shell.
- [WebKit media activation](https://webkit.org/blog/6784/new-video-policies-for-ios/): media activation depends on a direct user gesture; embedding applications can further restrict playback. Existing Start invokes audio preparation synchronously, waits for readiness or explicit muted recovery, and never retries/resumes audio in the middle of a scored run. Synthetic suspended/failed audio tests are not certification of iOS Web Audio.
- [WebKit visual viewport](https://webkit.org/blog/9674/new-webkit-features-in-safari-13/): the visual viewport can change with keyboard/zoom. This app has no gameplay text input; settings use native dialog scrolling and dynamic viewport bounds. OAuth/native keyboard return remains a physical-client limitation, not a new keyboard-observer implementation.
- [Discord design patterns](https://docs.discord.com/developers/activities/design-patterns): retain recognizable navigation, loading/error feedback and accessible controls. Existing reduced-motion preference, semantic buttons, dialog focus handling, help and mute controls remain. Check 44 CSS-pixel interactive targets in fixtures; this is not a comprehensive VoiceOver certification.
- [Discord production guidance](https://docs.discord.com/developers/activities/development-guides/production-readiness): retain content-hashed assets, current network error handling and compatibility boundaries. No new SDK command, service, permission, rate-limit policy or third-party dependency is introduced.

## Repository corrections

1. Load the new shared mobile stylesheet at both initial entry points, so the lobby has safe-area protection before the deferred game chunk loads. Apply Discord-first insets to the body and bounded dialog; size gameplay to the remaining dynamic viewport. Prevent the app-shell minimum height from forcing touch controls below the Arcade navigation row. Non-playing screens remain scrollable.
2. Use `viewport-fit=cover`; remove the document-wide zoom prohibition. Keep gameplay's existing gesture/selection controls and add iOS touch-callout suppression to control buttons.
3. Treat `pagehide` and document `freeze` as existing safe pauses. Remove listeners on teardown. `pageshow`/`resume` do not automatically restart play. No change to scoring, replay, countdown-only gap discard, active 100 ms threshold, authentication, permissions, database, assets, renderer/audio readiness or production settings.

## Validation method and limitations

Use Node 24.20.0. All browser work uses disposable loopback fixtures and synthetic identities; no real score is created. Automated viewport emulation runs Chromium, **not iOS WebKit**. Insets are explicitly injected fixtures, not measured device values. Touch timings are browser-automation round trips, not physical input-to-photon latency. Memory/resource counts are fixture instrumentation, not an iPhone memory/thermal benchmark.

The first draft of the mobile test accidentally included its diagnostic toolbar in layout measurements. Hiding only that test toolbar revealed a real small-screen minimum-height overflow, which was corrected. A later landscape test failed because its touch targeted an offscreen Start button; the corrected fixture scrolls to Start before touch activation. Failed-run summaries and command traces remain in local temporary logs; neither issue was suppressed by weakening safe-area/control assertions.

A landscape touch attempt also paused unexpectedly before the second-finger assertion; its pre-instrumentation trace did not establish a cause. The subsequent instrumented isolated replay passed. The completed matrix must pass without unexpected pauses; this observation is retained as a validation limitation rather than attributed to host pressure without evidence. Desktop navigation initially raced dialog close/scroll completion; the fixture now waits for the native close event to restore identity-button focus, uses settled scrolling and verifies the next button is hittable before touch. Cleanup is measured after existing bounded lobby animation timers settle, not immediately after navigation.

The isolated checkout initially lacked preview dependencies and the ignored host render PNGs. Existing local dependencies/fixtures were copied into the disposable worktree; no production dependency or artwork changed. The host check then passed 25 assertions with exact repacking hashes.

Final measured validation results are recorded in VALIDATION.md.

## Rollback and future physical canary

No production rollback is needed because this branch is not deployed. If separately approved and later deployed, rollback means selecting the prior accepted immutable release; no schema or data migration is involved. Retain platform settings as separately approved, never infer permission to toggle them from a code rollback.

Only after a separately authorized exact candidate deployment, use **one consolidated native-Discord iPhone session**:

1. Launch the correct Cdawg Arcade application; if the OS message persists, capture that message and the client/iOS versions. Confirm identity, lobby, settings/help, portrait and landscape safe areas, zoom/scroll on ordinary screens, and keyboard return if Discord presents one.
2. Start one game with sound from the Start gesture, exercise both fingers, slide/release, open an overlay, rotate, briefly background/lock, and return. Confirm no stuck input, no automatic resume, muted recovery where required, and no inflated official score after interruption.
3. Finish/retry once; check results, personal results, guild board and return to lobby. Confirm clean audio, no duplicate game or attempts, usable controls above the home indicator, and no obvious frame/thermal degradation.

This checklist is a future deployment canary, **not a request to test now**. Calls/notifications, native overlays, real audio routing, VoiceOver and hardware memory/thermal behavior cannot be established by desktop simulation alone.
