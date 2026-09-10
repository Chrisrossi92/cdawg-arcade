# Phase 4C — Server-verified identity and sessions

## A. Executive result

**PASS WITH LIMITATIONS — production sessions enabled; official scoring disabled.** Final application release: `0fd4c188f29f22f23109e73b2a25dfc35d88edb5`. All three health endpoints return 200, schema is compatible, the restricted login is active, and automatic deployment is Off. The temporary PKCE probe passed against Discord and is now disabled. Desktop/pop-out lifecycle and Chrome web initial verification have live evidence. The remaining client coverage and layout limitations are listed in section L; this is not a claim that every matrix cell was exercised. No Phase 4D functionality was implemented.

## B. Starting state

Authoritative checkout: `Projects/cdawg-arcade`. Starting main and origin/main: `fa4b2f47c131f468affbdc29faac76ccad1f1e0d`. Starting live release: `c98e6bdd0fa4bdcb96332f3b17ec39fec679b74b`. All health checks passed; schema version 1 was compatible; one nonissuable ruleset seed existed and all 13 other application tables were empty. Work used `codex/phase-4c-server-sessions`. No repository/ancestor AGENTS instructions were found.

## C. Verified Discord capabilities

The backend exchanges the SDK authorization code, fetches the Discord user, and uses the Arcade application's bot credential to verify the active Activity instance, guild and participant membership. Successful desktop and Chrome web session establishment exercised these checks without new OAuth scopes, Gateway intents, posting permissions or installation changes. Existing scopes remain `identify guilds`.

The installed SDK forwards S256 challenge parameters. Live server logs recorded one `arcade_pkce_probe` outcome `rejected_then_verified`, and zero unsafe/inconclusive outcomes in the inspected log window. This outcome requires HTTP 400 `invalid_grant` for a deliberately different valid-format verifier, followed by successful exchange of the **same code** with the original verifier and successful user/instance verification. The owner-provided Chrome web screenshot independently shows the resulting verified UI. This is live enforcement evidence, not merely an SDK type declaration or mock.

See [session architecture](SESSION_ARCHITECTURE.md) for primary Discord references and the distinction between documented behavior, inference and observed compatibility.

## D. Authentication and session design

Five-minute, one-use, browser-bound challenges hold encrypted PKCE material. The server consumes each challenge atomically, exchanges the code directly, verifies provider user/guild/participant context, then upserts minimal identity data and issues an opaque session. Only token/CSRF digests are stored. Sessions expire after 30 minutes idle or eight hours absolute; renewal requires fresh verification and rotation. Logout revokes durably. Account changes cannot inherit the prior identity.

Cookies are Secure, HttpOnly, host-only, `Path=/`, `SameSite=None; Partitioned`, with the `__Host-` prefix. Mutations require exact Origin, custom request headers and session-bound CSRF when a session exists. SDK bootstrap receives only the transient access token; it is not the application session. No refresh token is stored. Endpoint contracts and failure behavior are in the architecture document.

## E. Arcade credential

The owner confirmed the Arcade token was unused elsewhere and explicitly approved its reset. All three privileged Gateway intents were off. The owner reset/copied/saved it privately while browser inspection was paused, then confirmed it was saved and no longer visible. Only the environment variable name was inspected. A subsequent bounded server-side call returned credentialAccepted=true and arcadeApplicationMatches=true; no credential or application response contents were reported.

The unrelated CDAWG Bot and VPS were untouched. No new scopes, posting permissions or intents were added. No further secret is currently expected under the approved shared-score design; this is not a guarantee against future rotations or scope changes.

## F. Database effects

Schema remains version **1**; no migration was needed. The owner explicitly approved `arcade_session_runtime`. Its grants allow reads and only the required identity/session/challenge/security mutations, with no schema creation, administration or score writes. Production runtime checks confirmed expectedLogin=true and restricted=true.

The owner privately corrected the full saved internal database URL after an initial malformed value. A same-commit redeployment activated the correction and restored persistence readiness. No credential value was inspected. The web runtime now uses the restricted login, not the original administrator login.

Final read-only counts after probe-off deployment:

| Table | Rows |
| --- | ---: |
| players | 1 |
| guilds | 1 |
| guild_participations | 1 |
| game_versions | 1 nonissuable seed |
| application_sessions | 4, including 2 durably revoked |
| auth_challenges | 0 |
| security_events | 0 |
| attempt_authorizations | 0 |
| game_attempts | 0 |
| attempt_traces | 0 |
| personal_game_stats | 0 |
| guild_leaderboard_entries | 0 |
| guild_game_records | 0 |
| guild_record_events | 0 |

No production synthetic identity or score rows were created. The anonymous HTTP challenge used for validation was cancelled through logout. Revoked rows remained revoked after later application deployments.

## G. UI behavior

Live screenshots show “Verified for this server,” the expected player display, and “Practice · Saved in this browser.” Disconnect changes to “Signed out · Practice” and Local Player; relaunch restores verified identity. Local best remains local. The owner reported successful session-enabled gameplay. Earlier browser practice checks established start, focus pause/resume, local results and clean replay; these were not repeatedly requested.

Screenshots also show partial score-card overlap by the game panel in the pop-out layout. This is recorded as a presentation limitation, not a session failure. No official/shared-score or leaderboard feature is enabled.

## H. Validation

Final merged-code validation passed: **233 unit tests**, **140 real Postgres/fallback/role checks**, **74 dedicated real Postgres session checks**, **103 compiled production smoke assertions**, typecheck, production frontend/backend build, and source/staged/artifact secret scans. Original tests remain included. Tests used synthetic data and an owned disposable Postgres cluster, never production credentials. The existing large Phaser bundle warning remains.

Live HTTP checks passed: anonymous session rejection, missing/wrong Origin rejection, strict body rejection, challenge issuance, cookie attributes, no-store and logout cleanup. Full CSRF, rotation, account isolation, expiry and failure scenarios additionally have automated coverage.

| Environment | Observed result | Limits |
| --- | --- | --- |
| Ordinary production browser | Practice, pause/resume, results/replay; anonymous auth boundaries and challenge cleanup pass | No fabricated verified session outside an Activity |
| Discord desktop embedded | Verified UI; owner-reported minute/reload continuity; logout and fresh authentication | Authenticated `/api/me` response was not captured directly |
| Discord pop-out | Verified and signed-out UI; owner-confirmed lifecycle; durable revoked/fresh rows | Partial score-card overlap; no separate network trace |
| Discord web in Chrome | Fresh verified UI with live paired PKCE probe success | Separate web reload/logout/account-switch sequence not independently recorded |
| Safari/WebKit | Not validated | No claim of support from this run |
| Mobile/touch | Not validated | No device-specific claim |
| Second Discord account | Not validated live | Account isolation covered by automated tests |

Desktop/pop-out cookie return and CSRF are supported by successful logout plus durable revocation. Challenge binding returned successfully in desktop and web authorization flows. Cookie values were never inspected. Do not treat these observations as a complete cross-browser network trace.

## I. Deployment and rollback

Implementation merge `eef3ef4f0143cb804935879f50ca1fc8d4c43aa3` was validated and deployed first with sessions/scoring off. The malformed saved database URL failed closed; after the owner corrected it privately, an explicitly approved same-commit deployment restored all health checks.

The approved canary batch enabled sessions, disabled them for a same-artifact rollback drill, then restored them. The off-state returned 503 sessions_unavailable while all three health endpoints stayed 200. The on-state rejected anonymous `/api/me` with 401 expired. Schema and identity records were preserved; no historical credentials were restored.

The separately approved probe merge `0fd4c188f29f22f23109e73b2a25dfc35d88edb5` passed full validation and was deployed with the probe on. After live PKCE proof, the same commit was redeployed with the probe off. Final runtime booleans: sessionsOn=true, scoringOff=true, probeOff=true. Render reports Live, health path is `/api/ready`, automatic deployment is Off, and all three public health endpoints return 200 for this release. Final anonymous `/api/me` returns 401 expired.

Rollback remains: disable sessions first and redeploy; preserve schema/identity records and scoring-off state. Restore an older artifact only if necessary and without restoring obsolete credentials. The completed drill proves the feature-flag rollback path; it was not a destructive database rollback.

Baseline cost remains $13.30/month before overages. No new paid infrastructure, DNS, VPS or unrelated Discord changes occurred.

## J. Security and evidence handling

The temporary probe is disabled. It has no public endpoint or UI, no new secret, and no effect on ordinary exchanges when off. It fails closed for unsafe/inconclusive results and attempts revocation only of a token unexpectedly issued by its own negative test. It preserves the existing provider deadline, body cap and fixed destinations. Only fixed diagnostic categories are logged.

Boolean-only scans of inspected deployment log windows, including 50 lines from the final deployment, found no database URL or credential patterns. This is limited to inspected logs and pattern coverage, not a guarantee over all historical logs. No screenshots are committed because they include unrelated private UI. Evidence contains no real user IDs, session values, OAuth codes, private instance IDs or database URLs.

During role setup, the browser terminal echoed password input despite the server-side hidden setting. Inspection remained paused; the owner was instructed to cancel and discard that password. The replacement used a native masked Mac dialog and RSA-OAEP/SHA-256 transfer to the server. The assistant did not inspect plaintext. The temporary private key, matching checkout, helper and encrypted transfer file were removed. Do not reuse browser-terminal password entry.

## K. Git state

Implementation commit: `7e7152da81c25c89a1b665e103b6ba1669ca7f33`. Initial implementation merge: `eef3ef4f0143cb804935879f50ca1fc8d4c43aa3`. Probe implementation: `065c8d42da37ad29c32cfd136faa3a769246d47b`. Final application/live merge: `0fd4c188f29f22f23109e73b2a25dfc35d88edb5`.

Final evidence is committed on the phase branch and normally merged into main after documentation validation. The documentation-only merge does not require deployment; the live application remains the release above. No force-push, rebase or squash was used. Automatic-review interruptions were resolved through destination evidence or explicit owner approval, not alternative execution paths.

## L. Remaining limitations

Safari/mobile and live second-account switching are untested. Chrome web has initial verification and PKCE evidence, not an independently recorded full lifecycle matrix. Authenticated `/api/me` success is inferred from observed client continuity rather than a captured response. Pop-out score-card overlap remains. None of these limitations is silently labeled as an observed pass. Capacity, provider retention and broader browser coverage remain outside the completed canary evidence.

## M. Recommended Phase 4D

Official attempt issuance and replay validation only, with the remaining client/identity checks included before shared-score acceptance. Do not enable official scoring merely because a session is verified. No Phase 4D implementation was performed.
