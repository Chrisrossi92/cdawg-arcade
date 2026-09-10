# Phase 4C — Server-verified identity and sessions

## A. Executive result

**IN PROGRESS — deployed private canary, not yet accepted.** Sessions are enabled on `eef3ef4`; official scoring and automatic deployment remain disabled. Live authenticated Discord/cookie acceptance and wrong-verifier PKCE enforcement proof remain pending. No Phase 4D work is included.

## B. Starting state

Authoritative checkout: `Projects/cdawg-arcade`. Clean main and freshly fetched origin/main both `fa4b2f47c131f468affbdc29faac76ccad1f1e0d`. All three live health checks passed on `c98e6bdd0fa4bdcb96332f3b17ec39fec679b74b`. Read-only production `db:status` confirmed compatible schema, one game_versions seed and all 13 other tables empty. Working branch: `codex/phase-4c-server-sessions`. No repository/ancestor AGENTS instructions found.

## C. Verified capabilities

See [session architecture](SESSION_ARCHITECTURE.md) for confirmed primary-source behavior, live-test requirements, inference, endpoint contracts, cookie/CSRF model, data minimization and expiry. PKCE enforcement, installation requirements and the live cookie matrix are gates, not assumed passes. Existing OAuth scopes remain identify and guilds.

## D. Authentication and session design

One-use five-minute encrypted challenges; direct user and instance verification; digest-only opaque sessions; Secure HttpOnly host-only partitioned cookies; exact origins/custom headers/session CSRF; 30-minute idle and eight-hour absolute expiry; transactional rotation, revocation and account isolation. Full contracts and trust boundaries are in the architecture document.

## E. Arcade credential

Read-only Arcade Bot inspection passed after owner sign-in: an existing token reset control was present and all three privileged Gateway intents were off. The owner confirmed the Arcade token was not used elsewhere and explicitly approved resetting only that token after the invalidation consequence was explained. Browser inspection stopped before the owner reset/copied/saved it privately. The owner then confirmed “saved and no longer visible.” A subsequent name-only Render check confirmed `DISCORD_ARCADE_BOT_TOKEN` is listed; its value was never read. No posting permissions, intents, scopes, unrelated CDAWG Bot settings or VPS changes were made. A bounded read-only request to Discord’s current-bot-application endpoint returned credentialAccepted=true and arcadeApplicationMatches=true; only these booleans were recorded. Active instance lookup remains a live canary gate.

A bot credential inherently authorizes its application's API identity; this code restricts its use to the fixed instance lookup. Do not promise a token itself lacks every Discord API capability. Do not install a guild bot or grant permissions unless current verification demonstrates necessity and the exact change is approved.

## F. Database effects

The owner explicitly approved creation of `arcade_session_runtime` after automatic approval review requested specific authorization for the production access change. Role creation succeeded transactionally on existing Arcade compute using the reviewed phase implementation. Safe production checks returned roleRestricted=true, scoreWritesBlocked=true and schemaCreationBlocked=true. No application-table writes were made by this setup. The owner privately replaced the saved web-service database credential and confirmed “saved and no longer visible.” Following correction and same-commit redeployment, a read-only runtime check confirmed expectedLogin=true and restricted=true; no secret field was read. A subsequent scoped provider check confirmed automatic deployment Off and health path `/api/ready`. Schema remains version 1; no migration needed. Allowed runtime writes are the six identity/session/security tables. All seven score-related tables remain forbidden. The separate runtime role is mandatory before production session writes; the current administrative URL must be replaced privately, with no admin credential retained by the web process. Local real-Postgres tests verify role restrictions and unchanged score counts.

## G. UI

Verified-for-server state is separate from “Practice · Saved in this browser.” Reconnect, expiry, unavailable verification, account change and disconnect are represented without score claims. Existing gameplay and local score storage remain unchanged.

## H. Validation

Owner-provided Discord desktop screenshot confirms the initial live “Discord connected” and “Verified for this server” UI, expected player display, practice/browser-local labeling and session controls. A fresh read-only database status check after that launch confirms players=1, guilds=1, guild_participations=1, application_sessions=1, game_versions=1, auth_challenges=0, security_events=0 and all seven score tables=0; schema is compatible. The preceding zero-row observation must not be treated as describing this later launch. This establishes the initial server-verification flow, including successful provider user/Activity participant checks in the deployed code; it does not establish cookie return to `/api/me`, reload/logout/pop-out, or rejection of an incorrect PKCE verifier. The screenshot includes unrelated Discord UI and remains uncommitted; only sanitized textual observations are retained.

Current completed runs: 221 unit tests (including original 184); 140 Postgres/fallback/role checks (including original 123); 74 dedicated real-Postgres session checks; typecheck; production build; 103 compiled smoke assertions. Final runs pass. One earlier disposable migration run hit the existing 500 ms test timeout; a sequential rerun passed. The expanded retention test exposed an ambiguous SQL parameter in discrepancy insertion; explicit casts fixed it and the complete restricted-role suite passed afterward. Synthetic browser harness is local-only under scripts, never the production entry. Browser-observed passes: server-confirmed display, account-change isolation, fresh reauthentication, expiry after the normal check interval, Start/countdown, keyboard input, focus pause/resume, deliberate loss/local results, clean Play Again with preserved local best. Additional observed passes: logout to Local Player, unavailable/disabled verification practice fallback, and readable 375×667 verified layout with session actions, Start Game and both visible controls. These are synthetic local observations, not live Discord or cookie proof.

| Live environment | Cookie set/returned | CSRF | Reload/pop-out | Logout/reauth | Account switch |
| --- | --- | --- | --- | --- | --- |
| Ordinary production browser | Pending; practice requires no verified session | Pending | Pending | Pending | Not applicable without Activity proof |
| Discord web embedded | Pending | Pending | Pending | Pending | Pending if safe second account available |
| Discord desktop | Pending | Pending | Pending | Pending | Pending if available |
| Discord pop-out | Pending | Pending | Pending | Pending | Pending if available |
| Safari/WebKit | Pending availability | Pending | Pending | Pending | Pending |
| Mobile/touch | Only if available without scope expansion | Pending | Pending | Pending | Pending |

Do not read or record cookie values. Demonstrate return through `/api/me` success and safe status/profile UI; test header attributes using synthetic responses. Ordinary browser sessions cannot be fabricated without a real authoritative Activity participant. Cookie failure leaves sessions unavailable; no weakened SameSite/HttpOnly policy or persistent bearer fallback is authorized.

## I. Deployment and rollback procedure

Approved canary batch completed on the same `eef3ef4` artifact: sessions on, sessions off for the rollback drill, then sessions on again. Each deployment became Live; the off-state retained 200 health/readiness/persistence and returned 503 sessions_unavailable from `/api/me`. The restored on-state retains all three health endpoints at 200 with compatible schema and returns 401 expired for anonymous `/api/me`. Runtime booleans confirm sessionsOn=true and scoringOff=true. No code, credentials, schema or historical environment was restored. Read-only counts after restoration are one game_versions seed and zero in all other 13 tables. The temporary HTTP challenge used for validation was cancelled through logout. Final 50 displayed deployment log lines showed no database URL or credential patterns. This proves the feature-flag rollback path, not authenticated-session revocation across restart.

Live HTTP checks passed: missing/wrong Origin rejected, extra submitted identity field rejected, anonymous session rejected, challenge issued with S256 and Secure/HttpOnly/host-only/Path=/SameSite=None/Partitioned/300-second cookie attributes, no-store, and challenge cleanup. These are direct HTTPS checks, not Discord browser cookie transport or proof that Discord enforces PKCE. No OAuth code was used and no synthetic identity/session/score row was created.

Verified corrected checkpoint: the owner privately corrected the full internal connection URL and explicitly approved redeploying only `eef3ef4f0143cb804935879f50ca1fc8d4c43aa3`. The subsequent deployment is Live, all three health endpoints return 200, and schema is compatible. Read-only status reports one nonissuable game_versions seed and zero rows in all 13 other application tables. Runtime sessions/scoring flags are false, automatic deployment is Off, and browser practice start, focus pause/resume, local results and clean replay passed. A boolean-only scan of 56 displayed deployment log lines, including startup/live events, found no database URL or credential patterns; this is limited to those inspected lines. The owner accepted this checkpoint. No new secret is currently expected under the approved shared-score architecture.

Initial disabled rollout: normal main merge `eef3ef4f0143cb804935879f50ca1fc8d4c43aa3` passed the full validation again and was pushed and manually deployed after explicit owner approval. Render reported Live. Public health and readiness returned 200 for that exact release; persistence readiness returned 503. Runtime structural checks showed the saved database value was nonempty but not parseable as a URL; no credential contents were read. Sessions and official scoring are both false, the Arcade credential is present, auto-deploy remains Off, and health-check path remains `/api/ready`. Correct-origin `/api/me` and challenge requests return 503 sessions_unavailable. Do not enable the canary until the privately corrected connection passes runtime readiness and restricted-role checks.

Checkpoint: prior live release `c98e6bdd0fa4bdcb96332f3b17ec39fec679b74b`, schema 1, sessions absent/disabled, official scoring false, auto-deploy off, no bot credential added by this phase. Cost remains $13.30/month before overages.

1. Finish implementation/security review, tests, browser checks and safe scans; commit/push phase branch before external configuration.
2. Complete read-only Arcade credential investigation. Obtain exact reset/create approval if needed; owner enters it privately. No new OAuth scopes or posting permission.
3. On existing service compute, run reviewed role provisioning only with owner-supplied private runtime password. Role creation is transactional and fails if the role already exists. Owner replaces only the Arcade DATABASE_URL with the restricted login, preserving the private host/database and verifying hidden saved state. No administrator URL remains in web environment; retain migration access privately through the provider.
4. Merge normally, rerun full validation, push main, manually deploy exact reviewed commit with ARCADE_SESSIONS_ENABLED=false and OFFICIAL_SCORING_ENABLED=false. Keep auto-deploy off. Validate practice and all health checks.
5. Enable sessions only for the controlled owner canary; verify wrong-PKCE-verifier rejection and successful correct flow, actual user/guild/participant checks and full cookie matrix before acceptance. No synthetic production identity or score rows.
6. Check safe logs and permitted table counts; score tables must remain empty. Do not print real identities, instances, tokens or URLs into evidence.
7. If identity isolation/cookie security fails, disable sessions first. Preserve schema/identity data and practice. Restore a prior artifact only after confirming its effective configuration will not restore uncertain credentials. A same-commit off/on drill can validate the feature boundary without historical environment restoration. Record the executed drill and final flags; do not label a documented procedure as passed.

## J. Security

The browser terminal visibly echoed password input despite the server-side hidden-input setting. Inspection remained paused; the owner was instructed to cancel, close the tab and discard that password. The completed replacement used a native masked Mac dialog, local RSA-OAEP/SHA-256 encryption with a temporary server public key, and server-only decryption immediately before the reviewed provisioner. No plaintext password was displayed to the assistant or saved by the helper. The temporary server private key, matching checkout, local helper and encrypted transfer file were removed after success. Do not retry browser-terminal password entry.

Credentials, codes, cookies and provider tokens are excluded from source, artifacts, logs, screenshots and this evidence. Challenge replay/concurrency, CSRF rotation, absolute expiry, durable logout/restart and allowed-table boundaries are covered by local tests. Local security review covered fixed upstream targets, bounded concurrency/deadlines, startup/drain and restricted-role maintenance gates, cancellation, cookie/CSRF isolation and logout/reconnect races. Live cookie/PKCE proof remains pending. No screenshots committed.

## K. Git state

Implementation and validation evidence are prepared for commit/push on the requested phase branch. Implementation commit `7e7152da81c25c89a1b665e103b6ba1669ca7f33` was pushed to the verified existing GitHub origin; working tree and tracking branch were synchronized. The first push was blocked by automatic approval review pending destination verification; after the exact existing repository destination and explicit phase-brief authorization were established, the same push succeeded. Automatic review subsequently rejected the implementation merge twice because it did not accept the pasted Phase 4C brief as expanding the earlier Phase 4B documentation-only approval. The owner then explicitly approved the implementation merge, validation, push and disabled deployment; the same normal merge workflow succeeded. Main and origin/main reached `eef3ef4f0143cb804935879f50ca1fc8d4c43aa3`, now live. Production acceptance remains pending the connection correction and live gates. Final phase/main/live SHAs will be recorded on completion; no rebase, squash or force-push.

## L. Remaining gates

Local browser/tests/scans are complete. Remaining gates: live Activity instance verification; live PKCE/cookie/client matrix; production deployment, row counts and safe rollback drill. Production acceptance must not be inferred from mocked fixtures.

## M. Recommended Phase 4D

Official attempt issuance and replay validation only, after Phase 4C acceptance. Do not implement it here.
