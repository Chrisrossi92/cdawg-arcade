# Player-surface audit — accepted Release B → Phase 1 candidate

Classification: **A** always useful to players; **C** useful contextually; **D** owner/developer diagnostic; **R** redundant/removable. Inventory covers accepted source UI, dynamic expressions and compiled fixtures. Context fixtures are test-only and are excluded from ordinary builds. No live account or production data was inspected in this phase.

| Surface / visible control or phrase before | Class | Candidate presentation / context |
|---|---|---|
| CDAWG ARCADE identity, tagline, welcome, mascot | A | Preserved approved identity/artwork. |
| Games, Your results, Skip to games, Back to games | A | Preserved navigation and keyboard skip target. |
| Player name / Verified player / Practice available | A/C | Compact identity button with Official play, Connected, Practice or contextual connection status. |
| Top-level Less motion checkbox | C | In identity settings in the lobby; OS preference remains respected everywhere. |
| Discord connected + Verified for this server + Official play · This server | R | One compact status near identity; no prominent healthy connection strip. |
| Reconnect while already healthy | R | Absent for a healthy connection. |
| Disconnect and practice | C | In settings; same existing action. |
| Connecting to Discord / Verifying server session | C | Connecting…; visible practice escape remains. |
| Session expired / Different account / Verification unavailable | C | Short reconnect explanations, with existing reconnect/practice actions. |
| Raw initializationStatus / SDK-oriented error explanation | D/R | Never rendered to players; safe context-based relaunch/connection copy. |
| Invalid context / configuration recovery | C | Reopen in Discord or use practice; ineffective retry omitted. |
| Retry Discord connection / Continue in practice | C | Reconnect / Continue in practice, only when meaningful. |
| Model Getting your place ready / shared-score loading | C | Contextual progress retained; no redundant healthy status paragraph. |
| Balance Play / Play practice / Getting ready / Unavailable | A/C | Preserved state-dependent primary action. |
| Card error / Retry connection | C | Preserved error recovery. |
| VERIFIED RUNS · THIS SERVER / BROWSER PRACTICE ONLY | R/C | OFFICIAL SCORES / PRACTICE · THIS DEVICE. |
| Coming soon cards / disabled Coming soon buttons | C | Preserved honest future-game placeholders. |
| Verified-account and local-storage explanation under cards | R | Short server-leaderboard or device-practice explanation. |
| YOUR OFFICIAL BEST / YOUR BROWSER BEST | A/C | YOUR OFFICIAL BEST / YOUR PRACTICE BEST. |
| Accepted runs / shared results / GUILD LEADERBOARD | R/C | Official runs / results / SERVER LEADERBOARD. |
| Refresh official results / Refresh leaderboard | C | Refresh results / Refresh leaderboard retained. |
| Summary empty, loading, unavailable and own rank | C | Retained honest states; shorter language. |
| Getting Balance ready / load failure / Reload Arcade / Back to Arcade | C | Preserved cancellation and load-recovery controls. |
| Balance title and compact Score / Player HUD | A | Preserved. |
| Historical Local Best | R/C | Personal best when official best is available; otherwise explicitly Practice best. No database/source calculation changes. |
| Music and SFX always visible in game header | C | Settings dialog; preferences preserved, disabled throughout preparation/countdown/play. |
| One attempt. Hold the line. Keep Cdawg standing. | A/R | Hold the line. Keep Cdawg standing. |
| Missing first-time instructions beyond arrow hint | C | Nonblocking How to play details first visit; collapsed on return and reopenable. Keyboard and touch instructions. |
| Start Game / Play practice now / View Leaderboard | A/C | Preserved actions and eligibility. |
| One-time verified-run/history migration notice / Got it | R | Removed obsolete migration explanation; no score migration performed. |
| Practice · Saved in this browser / New verified runs available | R/C | Practice / Official play. |
| Checking your run / preparing official run / unconfirmed Retry | C | Preserved progress and retry; “Score not confirmed” replaces submission jargon. |
| Renderer/audio getting-ready status | C | Preserved readiness path and cancellation. |
| Retry / Retry sound / Play without sound / Back | C | Preserved bounded recovery, no automatic bypass. |
| Sound unavailable for this run | C | Preserved truthful degraded-audio notice. |
| Countdown digits / official run label | A/C | Digits unchanged; compact Official run label. |
| Left / Right / Use arrows or A/D | A | Preserved control semantics, pointer cancellation and key behavior. |
| Paused / score on hold / practice-only interruption explanation / Resume | C | Preserved intentional interruption and recovery information. |
| Official score saved / personal best / server record / rank | A/C | Same values; shorter personal/server result labels. |
| Local result duplicated below accepted official result | R | Hidden when accepted official result is displayed; practice result remains explicit otherwise. |
| New local best / local best remains | C | New practice best / Practice best; never passed off as official. |
| Local results button | C | Practice results. Same underlying local history. |
| Back to Arcade / Play Again / View Leaderboard after result | A/C | Preserved action, lock and confirmation behavior. |
| Retry submission / Refresh shared scores | C | Existing retry preserved; Refresh scores shortened. |
| Server leaderboard intro about validation/account | R | Your server. Your best runs. |
| Tick-precision/tie explanation | R/C | Tied scores keep the earlier record. Exact sorting/precision unchanged. |
| Your official statistics / Recent official runs / Refresh / Back to game | C | Your results / remaining actions preserved. |
| Duplicate-name public player tag | C | Preserved only where needed for disambiguation. No raw session/Discord identifiers introduced. |
| Local leaderboard: rank, player, score, local-practice label, back | C | Preserved private device-history view; no cross-player ranking invented. |
| Dev toggle / phase / input / tuning phase / tilt / angular velocity / difficulty / held input / disturbance / survival | D | Explicit local development diagnostic view only; absent in production, regardless of query parameters. |
| Gravity/Input/Damping/Growth/Disturb/Fail-angle sliders; Reset; Copy JSON | D | Removed operational tuning controls. Diagnostics cannot alter game configuration. |
| Playtest attempts/average/median/best/buckets/fall counts/tuning-phase counts | D | Existing local-only read-only diagnostics retained behind development gate. |
| Discord State / initialization status / User diagnostic panel | D | Development gate only; absent in production. No new owner authorization scheme or secret. |
| Fixture scenario dropdown, metrics, rapid/reconciliation/soak/viewport controls | D | Separate compiled local harness only, never a production import. |

Recovery controls remain visible outside settings on connection failure or connecting states. Native dialog focus trapping/Escape/return, labels and touch targets are validated locally. Runtime changes are limited to presentation, optional preferences/help and removal of the diagnostic tuning surface; simulation, clock, readiness, official controller, transport, server and database modules are immutable relative to the accepted base.

Final recovery audit: authentication errors use the visible connection recovery surface; the game card does not duplicate that retry. Unsupported configuration/context offers safe practice plus reopening guidance. Verifying settings shows a single practice action. Score-refresh recovery remains available when applicable.
