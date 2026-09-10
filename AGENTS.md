# Cdwag Arcade operating policy

Owner policy adopted 2026-09-09. Applies to all remaining work.

- Work autonomously within the approved phase. Do not use Chris for routine tests, navigation, observation, transcription, repeated gameplay or confirmations of already authorized reversible work.
- Primary acceptance: automated tests, real ephemeral Postgres, deterministic fixtures, mocked Discord security cases, browser automation, production smoke/health, sanitized logs and read-only counts. Use existing authenticated sessions. Do not repeat unchanged gameplay or Phase 4C acceptance.
- Keep incomplete features disabled. Automatic deployment stays off. Deploy exact committed SHAs with health gates. Perform already authorized nondestructive rollbacks autonomously.
- Pause only for a technically necessary new secret, unavailable account sign-in, new recurring/material cost, destructive or hard-to-reverse action, changes to Discord permissions/scopes/public behavior/DNS/audience, material product decisions, or one final real-user acceptance check that automation cannot establish at a major user-facing milestone.
- Complete independent work first; batch owner actions into one handoff. Explain why automation cannot do them, give an exact step count, aim for under five minutes. Never split one configuration task into multiple confirmation pauses.
- Before requesting a new secret, confirm existing approved credentials cannot serve its narrowly scoped purpose; finish code/tests first; batch creation and provider entry privately; say whether it is expected to be the final new secret for shared-score V1. Never inspect or record private secret entry; resume only after confirmation it is saved and no longer visible.
- Phase 4C is accepted. Broader browser/account-switch coverage and pop-out overlap are deferred unless later evidence makes them release-blocking.
- Phase 4D is attempt issuance and deterministic replay behind disabled flags. Do not request another Discord playthrough until the complete official-score flow and result states are ready for one consolidated canary. No leaderboard, record-event, posting or audience expansion is implied.
