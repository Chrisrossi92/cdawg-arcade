# V004 production release — accepted

The owner confirmed the consolidated Discord V004 canary passed: identity, corrected mascot appearance, smooth animation, official result, personal result, guild leaderboard and Play Again. Acceptance is complete; no further manual test is requested.

## Source and deployment

Normal merge and deployed application: `b8f04949721f41fe1c87d50e9037581a2aa16197`. Preserved approved feature: `34be5b5afd2098e855a423ef36eb20f61b29dcff` on `codex/arcade-brand-foundation`. Render exact-source manual deployment: `dep-dahv5euk1f9s73feiat0`, successful in 53.1 seconds. Both merge parents and the exact approved source tree were verified. No squash, rebase, force-push or feature deletion occurred.

The corrected V004 mascot ships in Cdawg Balance. The Arcade identity foundation is merged, but the new lobby remains development-only. The production graph excludes lobby code, brand assets/fonts, Blender sources and reference boards. Preview HTML, source assets and private build paths return 404; the production root remains Balance. No gameplay, timing, deterministic rules, scoring, replay, session, database, credential or service configuration changes were made. Automatic deployment remains Off.

## Automated release validation

- 370 tests, 192 compiled smoke assertions and 681 disposable PostgreSQL checks passed after merge: **1,243 checks**. Render independently repeated 370 tests and 192 smoke assertions.
- All 45 output files reproduced the approved build under identical public dummy inputs. Canonical hashes, 265 runtime frame records, the 145-module bundle boundary and a 446-file source/artifact security scan passed.
- 36 public probes on the permanent origin plus three health/readiness probes on the provider origin passed. Health, core readiness and persistence readiness returned HTTP 200 with the exact deployed SHA; schema is compatible. Trusted-origin CORS and anonymous authentication/session/official-score boundaries behaved as expected.
- All four deployed V004 WebP hashes match the approved artifacts, with `image/webp` and immutable caching. Their combined size is 1,602,752 bytes; sequential single-sample downloads ranged from 213.8 to 271.1ms. Full hashes and paths are in the machine evidence.
- Production browser checks covered practice, focus pause/resume, results, Play Again, desktop, narrow and pop-out-sized layouts without horizontal overflow. Narrow gameplay canvas measured 364×203 pixels. The result render visibly uses V004. These viewport checks are not native Discord pop-out certification.
- Twelve inspected runtime log lines showed successful startup at the exact SHA and orderly previous-instance draining, without observed errors or secret material. No credentials, environment contents or provider secret values were read.

Local exact-asset performance evidence remains applicable: p95 frame interval 16.75ms and p95 scene-update CPU 0.20ms at the two measured gameplay dimensions. No new live GPU instrumentation or broad device/load certification is claimed. The existing large Phaser chunk warning and seven dependency advisories (two moderate, five high) remain separately scoped maintenance items; dependencies were not modified.

## Post-canary read-only consistency

Health, readiness and persistence readiness remain HTTP 200 on `b8f0494`, with compatible schema. Verification ran in an explicit read-only database transaction using existing sanctioned configuration and projection/replay functions. No migration, repair, synthetic official attempt, grant, deletion or data reclassification was performed.

Compared with the pre-canary baseline, application sessions increased from 2 to 3, attempt authorizations from 3 to 4, and result facts from 3 to 4. The additional result is **practice**, `rejected_interrupted`, interruption count 1, authoritative ticks 0. Retained traces remain 2. Both existing accepted runs replay exactly at 42 and 1,385 ticks, including failure direction and phase. Personal and guild entry/record/event projection mismatches are all zero. The restricted runtime role remains valid.

Players, guilds and participation remain 1 each; game versions 2; auth challenges 0; personal-stat groups, guild entries, records, record events and security events each remain 1. The new practice result did not change official aggregates.

Evidence distinction: the owner attested the official-result flow. The supplied screenshot shows a 14.5-second paused-practice result, and the database independently confirms one additional interrupted-practice fact. No newly accepted official score was verified from this canary. This distinction does not alter the owner's acceptance or justify another gameplay request. The private screenshot is not committed.

## Rollback and documentation

The previous accepted application `615898dcc24214206774e551b5bfb935171eefa1`, artifact `dep-dahmqmjm8hqs73cgdbn0`, remains the verified fallback. After deployment its Rollback control was available and the confirmation stated **“No configuration changes since this deploy.”** The confirmation was canceled; no rollback was needed. Follow [the recorded rollback plan](V004_RELEASE_AND_ROLLBACK_PLAN.md) if a later authorized rollback becomes necessary, preserving legitimate player data.

This acceptance record and its JSON evidence are documentation-only work on `codex/v004-release-acceptance`, merged normally into main. The deployed application remains `b8f0494`; the documentation merge must not be redeployed. The documentation merge SHA is available from Git history rather than embedded self-referentially here.

Machine evidence: [release and final consistency validation](mascot-v004-release-validation.json). Historical [pre-merge evidence](MASCOT_V004_PREMERGE.md) records rendering, atlas continuity, exact source hashes and performance methodology.
