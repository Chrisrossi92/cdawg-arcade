# Lobby integration Phase 1 validation

**PASS WITH LIMITATIONS — disabled local candidate, no release.**

## Git and production isolation

- Starting local and remote main: `758c926e9a733f0c83a904515c4654b2227e7728`, clean and synchronized.
- Work branch: `codex/arcade-lobby-integration`. The final branch commit is reported with the handoff; no main merge, PR or deployment is authorized here.
- Public health, readiness and persistence readiness returned HTTP 200 on accepted V004 `b8f04949721f41fe1c87d50e9037581a2aa16197`, with compatible schema. No production credentials or database connection were used.
- Server, shared deterministic rules, migration/schema files, lockfile and Render descriptor are unchanged. No environment file was read. No Discord, DNS, hosting, database permission or service setting was changed.
- The ordinary production graph contains no Arcade lobby source, brand fonts, host images, prototype, fixture or test controls. Query/hash navigation cannot activate an absent entry. All four accepted V004 gameplay atlas hashes remain unchanged.

## Automated evidence

| Suite | Result |
| --- | --- |
| Unit/integration, including launch/session/auth boundaries and new runtime/card/audio/renderer cases | 411 tests / 33 files passed |
| Compiled ordinary-production smoke | 192 assertions passed |
| Real disposable PostgreSQL suites | 681 checks passed, including ownership, replay, concurrency, rollback, projections and backup/restore |
| Existing brand/font/provenance/contrast validation | 104 checks passed |
| Existing raster/alpha/SVG-edge validation | 56 checks passed |
| New aligned host asset/hash/packing validation | 25 checks passed |
| Enabled/disabled module-graph and artifact isolation | 59 checks passed |
| TypeScript | Application and isolated browser tooling passed |
| Rebuild | All 45 production files and 17 enabled files reproduced byte-for-byte |
| Security | Source, untracked candidate, staged files and generated production outputs passed the repository pattern scan; enabled artifacts separately checked for fixtures/private material |

The seven counted suites total **1,528 checks**. Repeated passes are not added to that total. Additional browser observations and three public health probes are reported separately. Database checks used only the runner-owned disposable cluster; they are not claims of a new production data audit. Existing dependency advisories were not remediated; dependencies and their lockfile are unchanged.

## Integration coverage

The real entry connects existing host/session/result/leaderboard modules. Browser practice renders Local Player and the actual local repository best. Verified official availability, other-server restriction, unavailable sessions, empty stats, unavailable guild board, authentication error and retry/practice paths were checked through injected existing interfaces. The isolated fixture page is clearly labeled and absent from both application builds. Existing 681 PostgreSQL checks cover server-side authority and projection consistency independently of those UI fixtures.

Runtime tests exercise 300 navigation cycles with one authentication lifecycle, no lobby-issued attempts, one cancellation on active departure, preparation/checking/unconfirmed navigation locks, rapid-start protection, one accepted-best celebration, stale-data clearing and query-preserving browser history. The original official controller/client and deterministic simulation are unchanged.

Keyboard activation entered the real integrated game; Tab from Less motion reached the skip link. A real browser-local practice run completed after Resume, saved 0.7s, and returned that best to the lobby. Results exposed Play Again, Back to Arcade and local results. Official result, personal summary and guild summary were exercised through the real controller in the isolated browser soak, with server replay/projection behavior tested separately in disposable PostgreSQL. No new Discord canary is requested in this phase.

## Browser soak and performance

`lobby-browser-soak.json` records 53 lobby/game round trips: 20 canceled countdowns, three completed-run visits (four runs with Play Again), and 30 additional round trips. There were exactly 24 attempt issuances, 20 cancellations and four submissions: three accepted fixture results plus one correctly interrupted practice result after Resume. Authentication count remained one, host subscription count one, and no page errors were observed.

An initial soak exposed Phaser's retained visibility listeners. The enabled-only ownership adapter fixed that leak. Final listener count was 17 at every settled checkpoint, matching the initial 17. Timers, intervals, animation-frame requests, audio contexts and canvases returned to zero. The two temporary host timers during an alternate expression expired normally. Approximate heap grew with the lazy game module/cache load, peaked around 48.4 MB in sampled settled states, and fell to 36.6 MB at the final checkpoint (34.8 MB at collection); no linear per-navigation resource growth remained. This is a bounded local soak, not proof of leak freedom on every device.

The original successful soak measured 600 lobby frame intervals: median 16.7ms, p95 17.7ms, maximum 200ms during concurrent local work. The final optimized-host sample (motion on) measured 600 intervals: median 16.7ms, p95 18.3ms, maximum 18.7ms, recorded separately in `lobby-browser-performance.json`. A cold/stalled gameplay frame triggered the unchanged protective pause; Resume correctly preserved practice classification. No timing thresholds were relaxed to make the test pass.

Responsive iframe viewports tested the actual integrated entry at 1280×900, 800×600, 390×844 and 375×667, without horizontal overflow or missing images. Final small-screen game controls ended at y=659 within a 667px viewport. Game and lobby targets were at least 44px high. Reduced-motion preference crossed game/lobby navigation and produced 0s host transitions. The lobby card class and connection-state styles are isolated from the lazily loaded gameplay stylesheet; return-navigation geometry is compared before and after that stylesheet loads. These are browser viewport tests, not native Discord mobile/pop-out certification. See `lobby-browser-layout.json`.

The local cold transition into the game was approximately 343ms in the final viewport sample (100ms measurement polling resolution; loopback, cached dependencies). Network/device conditions vary. Gameplay-only chunks and atlases were absent from initial lobby resource observations. The existing game warm-up begins only after selection.

## Bundle and assets

Exact final bytes/hashes are in `lobby-build-validation.json`; values are uncompressed unless specified. Baseline ordinary frontend was 3,955,937 bytes. Disabled frontend is 3,956,515 bytes: **+578 bytes (0.015%)** for presentation/lifecycle scaffolding. 42 of the 45 baseline output files remain identical, including compiled server, existing stylesheet, SDK chunk and all V004 atlases. The changed files are the main frontend chunk, HTML reference and release manifest.

Enabled output is approximately 4.10 MB including the existing lazy game and SDK. The conservative initial lobby group is approximately 359 KB (about 174 KB gzip), including the success image even though it is requested only when shown. The game chunk is approximately 1.96 MB and remains deferred. The two fonts total 30,812 bytes; the external horizontal SVG is 9,760 bytes. Inline small Notched Tags are included in the entry chunk. All three fixed-camera V004 host expressions together are **62,314 bytes**, with identical 512×512 canvases and one common crop. The gameplay atlas set remains **1,602,752 bytes**, unchanged.

Ordinary production does not ship those lobby costs. The large Phaser chunk warning remains; no new router/runtime dependency was introduced.

## Handoff and limitations

The single integrated local preview is `http://127.0.0.1:5195/`. It uses real application adapters and the browser-local repository; it does not impersonate Discord. The explicit local builder uses a public dummy client ID, so live Discord authentication is not certified by this preview. Real identity/session boundaries are covered by existing adapter/security tests and disposable server tests. Live production behavior remains the accepted V004 release.

The next step is one consolidated review of this complete local integration. Keep the release gate false until separate release approval. Enable/disable instructions, lifecycle details, test tooling and the artifact-based rollback plan are in `ARCADE_LOBBY_INTEGRATION.md`. No additional mascot canary, routine gameplay repetition or dashboard action is needed now.
