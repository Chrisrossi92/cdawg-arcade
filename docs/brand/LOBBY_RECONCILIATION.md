# Arcade lobby reconciliation — disabled-gate preparation

**PASS WITH LIMITATIONS. Feature preparation only; no feature-to-main merge, deployment, or lobby enablement.**

## Verified Git state and scope

Main and origin/main matched `0f44cb134e7650cffe6dc961e272c16679e71141`. The clean lobby branch and its upstream matched `0df06aede788402238cfa1f263604767588dc849`; it had not changed during the readiness incident. The accepted application is `f98e1c39183709347824f1f1e9fcedbf39cf7baf`, confirmed by the merged readiness acceptance record. This slice uses repository acceptance evidence, not a new production database or Discord session.

The merge base was `758c926e9a733f0c83a904515c4654b2227e7728`: four main-only commits and one lobby-only commit. Main was merged normally into the existing feature. Four conflicts and their conservative resolutions are documented in [the rollout plan](LOBBY_TWO_STEP_ROLLOUT.md). The scene, canvas, renderer lease, managed lifetime, result renderer and readiness latch match accepted main exactly. Only the existing lobby hooks remain around the authoritative game start logic. No physics, clock, scoring/replay, server, session/identity adapter, leaderboard rule, guild restriction, schema, permissions, lockfile or hosting configuration changed.

## Automated validation

| Suite | Passing assertions |
| --- | ---: |
| Unit/integration (34 files) | 422 |
| Disabled compiled production smoke | 192 |
| Enabled compiled production smoke in disposable staging | 216 |
| Owned disposable PostgreSQL suites | 681 |
| V004 atlas records | 265 |
| Brand/font/SVG/provenance/contrast | 104 |
| Raster alpha/dimensions/edge checks | 56 |
| Host image packing/hash validation | 25 |
| GLB assertions, zero Khronos errors/warnings | 16 |
| Enabled/disabled graph and artifact gates | 59 |
| **Total counted assertions** | **2,036** |

Application, readiness harness and lobby harness typechecks pass. The suites include launch-context, authentication/session, personal/guild, source release-gate, navigation/history, clock and deterministic replay fixtures. Full hashes reproduce: 45 ordinary production outputs and 17 enabled outputs. The exact metadata inputs are public dummy values; no local dotenv or production credentials are used.

The existing preparation-only asset validator that asserts the repository still equals the old pre-correction commit is not applicable to this later integration. GLB checks, fixed source hashes, deterministic host repacking, atlas and brand/raster checks establish unchanged assets without regenerating Blender geometry or animation atlases.

An initial unprivileged test attempt could not open local sockets; the authorized local-listener run passed. Two tooling invocations initially used the wrong GLB subdirectory and Python without fontTools; the correct retained source path and existing brand virtual environment passed. A fixture initially assumed countdown blur would continue; the accepted policy intentionally pauses/converts it to practice. The fixture now verifies that policy. Retry testing was synchronized to React's rendered failure state. No application threshold was relaxed to resolve a tooling failure.

## Disabled production comparison

Accepted-main frontend: **3,956,420 bytes**. Reconciled disabled frontend: **3,956,931 bytes**, **+511 bytes (0.013%)**. Forty-two of 45 outputs are byte-identical, including all 36 compiled server files, existing stylesheet, SDK chunk and four V004 atlases.

Changed outputs are `dist/index.html`, the replaced `index-C9c_dHO3.js` → `index-B4zvczJ_.js` entry chunk, and `build/release.json`. They reflect lobby-aware presentation hook scaffolding and audio lifetime bookkeeping in shared components, plus their hashed references. The disabled branch never calls the lobby integration callbacks/disposal path, never imports Arcade code, and retains direct Balance behavior. There are no lobby fonts, SVGs, host images, fixtures, controls, preview/debug entries or routing switches in the disabled graph. Query/hash routes cannot load an absent entry. Server static protections and APIs are byte-identical and pass compiled smoke. No new environment setting is required.

Complete per-file sizes/hashes and enumerated differences: [build validation](lobby-build-validation.json), [main baseline](lobby-baseline.json), [repeated build hashes](lobby-repeatability.json).

## Enabled readiness, failure and lifecycle proof

The final [reconciliation matrix](lobby-reconciliation-browser.json) contains 25 scenarios plus one settled checkpoint. It uses the actual ArcadeApp, runtime, OfficialClient/Controller, BalanceExperience and renderer with an isolated mock transport and host adapter. The production graphs do not import the harness. Events record fixed names and safe timing/state values only.

Covered: cold/warm V004 cache, 5-second image-processing delay, 100/250/1000/5000ms preparation stalls, lobby/preparation/countdown/active visibility and focus events, active 250ms stall, reduced motion, Play Again, missing textures, 15-second timeout, three-attempt retry limit, canceled preparation, rapid return, identity loss, expired session, stats/leaderboard failure and practice isolation. No automatic official request precedes drawable/warmed V004. No first character frame is legacy. First gameplay clocks start at zero ticks/accumulator. Every completed fixture remains 42 ticks; the five intentionally interrupted cases remain practice.

Cold sample: preparation 9905.2ms → ready 10297.8ms → attempt 10299.0ms → countdown 10307.2ms. Warm: preparation 14080.8ms → ready 14384.7ms → attempt 14385.0ms → countdown 14388.7ms. Thus observed preparation costs were approximately 393ms cold and 304ms warm on loopback. These timestamps are local harness time, not production telemetry. Canceled or failed preparations issue no attempt.

The separate [53-cycle soak](lobby-reconciliation-soak.json) passed with exactly 24 issuances, 20 deliberate cancellations, four accepted submissions, zero spontaneous pauses/resumes and one host authentication request/subscription. It covers repeated lobby→game→lobby, 20 countdown exits and Play Again. At every settled checkpoint listeners returned to 17; final timers, intervals, pending animation frames, audio contexts and canvases were zero. Heap samples rose with loading, peaked around 32.3MB, then fell to 20.3MB versus 21.6MB initially; no monotonic per-cycle growth appeared. This is bounded evidence, not universal leak certification. The readiness matrix independently finished with 17 listeners, zero active resources, one host subscription and exactly 17 issuances/submissions (12 accepted, five deliberately interrupted).

A separate [rapid preparation cancellation test](lobby-reconciliation-rapid.json) enters, starts and leaves in two batches of ten while a 1500ms image-processing delay remains pending. It issues zero attempts/submissions and returns listeners/resources to baseline. Heap temporarily reached 31.7/33.2MB after the batches and returned to roughly 13.7MB in later samples without forced collection. Resource counts stayed bounded; the longer settled soak provides independent trend evidence.

The real browser-local entry is additionally tested via [four viewport flows](lobby-reconciliation-layout.json): 1280×900, 800×600, 390×844 and 375×667. No horizontal overflow; gameplay controls remain in-frame and at least 44px high. Smallest viewport controls end at y=659. Tests cover keyboard events, focus traversal, synthetic touch with pointer capture stubbed in the harness, actual game/result/return flow and persistent reduced motion. Synthetic events are not native mobile or Discord pop-out certification. Browser Back preserves launch query/context and rejects uncertain-result departure in unit tests; it never restarts SDK initialization.

## Payload and timing

Enabled output totals **4,095,068 bytes**. Conservative initial lobby group: **359,397 bytes**, **173,867 bytes gzip**. Lazy game chunk: **1,958,840 bytes**, with unchanged gameplay atlases **1,602,752 bytes** deferred to game entry. The three host expressions total 62,314 bytes; fonts total 30,812 bytes. Build-graph analysis establishes these boundaries; the fault-injection harness eagerly imports Phaser for hooks, so its initial-resource list is not an application payload measurement.

[Frame timing sample](lobby-reconciliation-performance.json): 600 page/host-loop intervals p50 16.7ms, p95 17.6ms, max 83.3ms. Two 42-frame gameplay samples had p95 18.9/17.3ms and maximum 20.7/27.9ms. This short warm-HTTP local sample includes a fresh renderer followed by another renderer; its fixture labels “cold/warm” do not imply two new network caches. Host/animation art is unchanged. No device-wide 60fps, GPU-memory or long-duration capacity certification is claimed.

## Security, data boundaries and next release

Bounded source/staged/artifact pattern scans pass (540 files before the final evidence additions); no private environment values were read. Both graphs exclude debug/fixture/absolute-personal-path material. Personal and guild authority remain in unchanged server code; practice cannot obtain official summaries. No production database access or writes, synthetic production attempt, new SDK permission, credential, environment, Discord, DNS, Render or automatic-deployment change occurred in this slice. Existing dependency advisories remain separately scoped maintenance.

[Two-step rollout and rollback](LOBBY_TWO_STEP_ROLLOUT.md) defines A: foundation merged/deployed with gate false and accepted `f98e1c3` artifact retained; B: a separately approved minimal source-gate enablement with one consolidated Discord canary and one-operation rollback to accepted A. No B commit is created here. Retention/configuration compatibility must be reverified at each future release.

**Next authorization:** normal feature-to-main merge and controlled Release A deployment of the final reconciled feature commit, with the lobby gate still disabled. No new creative review or readiness canary is needed unless new automated evidence exposes a Discord-specific uncertainty. Final feature SHA is reported in the handoff rather than embedded self-referentially in this commit.
