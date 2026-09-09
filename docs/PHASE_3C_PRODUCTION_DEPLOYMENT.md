# Phase 3C production deployment

Status: PASS WITH LIMITATIONS. Production acceptance, controlled artifact rollback, and the fresh owner-observed post-rollback Discord authentication/Start Game check passed. Dates: September 8–9, 2026 (America/New_York). This record contains no credentials, account/billing identifiers, private provider links, or screenshots.

## Release and merge

- Phase 3B source: `f10b4d971da24c33c56c21b3ef26cd4275f38848`.
- Verified previous main: `aeba4673978584d20c5b235c95a5146d91d2ddaf`. This corrects the conflicting SHA in the task text.
- Normal merge, pushed to main: `4c09960c6a5a47508b4bb6e3071f42e28b408337`.
- Accepted production application release: `4c09960c6a5a47508b4bb6e3071f42e28b408337`.
- Pre-merge and post-merge validation: 162 tests across 18 files, typecheck, full production build, and 71 compiled smoke assertions passed. Credential-pattern scanning covered 105 source/artifact files; this is a bounded scan, not a guarantee against every possible secret. Local verification used dummy configuration, never the ignored local `.env`.

## Hosting and configuration

One isolated paid Render Node web service, `cdawg-arcade-production`, on the smallest approved paid instance (0.5 CPU / 512 MB), Virginia (US East). Base compute is $7/month; Hobby workspace subscription is $0. Included bandwidth/build usage and possible overages were disclosed and approved. No disk, database, environment group, VPS connection, or additional paid add-on. Automatic deployment is off. Node is pinned to 24.20.0.

- Permanent origin: https://arcade.cdawgbot.xyz
- Provider origin: https://cdawg-arcade-production.onrender.com
- Health check: `/api/ready`
- Build: `npm ci --include=dev && npm test && npm run build:production && npm run smoke:production && npm prune --omit=dev`
- Start: `node build/server/index.js`

The service was created manually with the approved production name; the reference `render.yaml` was not applied as a second service. Do not apply it blindly to create a duplicate.

| Classification | Variables |
| --- | --- |
| Public build configuration | `VITE_DISCORD_CLIENT_ID`, `VITE_API_BASE_URL` |
| Optional public version, defaulted to source revision | `VITE_APP_VERSION` |
| Backend public identifier | `DISCORD_CLIENT_ID` |
| Backend configuration | `DISCORD_REDIRECT_URI`, `ALLOWED_ORIGINS`, `NODE_ENV` |
| Runtime secret | `DISCORD_CLIENT_SECRET` |
| Runtime selection | `NODE_VERSION` |
| Provider supplied | `PORT`, `RENDER_GIT_COMMIT` |
| Unset overrides; production defaults used | `HOST`, `RELEASE_SHA` |

Public/backend application IDs match. Allowed origins contain only the permanent site and matching Discord Activity origin. API base is `/api`. The registered OAuth redirect was checked read-only with explicit owner approval and matched the configured value; it was not changed. Chris privately entered and saved the current secret in Render. He explicitly approved personal entry into its unmasked form while all browser inspection was paused, then confirmed it was saved and no longer visible. The assistant did not read `.env`, a secret field, the preservation backup, or the secret value. Readiness and real Discord authentication subsequently passed.

## Provider and custom-origin checks

Provider deployment built the exact accepted commit, passed the full build/test/smoke sequence, and started compiled JavaScript. Health returned 200/alive and readiness 200/ready, with both public revision fields equal to the accepted SHA.

Passed: root HTML with no-cache; immutable hashed JS/CSS; extensionless SPA fallback; unknown API JSON 404; forbidden repository, dotfile, source, build, and server paths; missing asset 404; malformed token JSON rejected with sanitized 400/no-store; disallowed-origin preflight rejected; approved-origin preflight accepted. No real authorization code was used in synthetic API checks. Public assets were checked for server-only variable names and local paths.

Provider browser checks covered Local practice, start/countdown, available controls, deliberate loss, local results, replay, focus interruption/resume in an iframe harness, and a usable 375×667 layout without horizontal overflow. The temporary harness was stopped and removed from browser use. Detailed input/timing coverage also comes from the automated suite and live desktop acceptance below.

Custom-origin validation passed at approximately 02:17 UTC September 9: trusted TLS 1.3, certificate SAN covering exactly the requested hostname, certificate expiry December 8, 2026; HTTP redirects to HTTPS without a loop; health/readiness, HTML, SPA route, and hashed assets all 200. Browser start/countdown, loss, local results and Play Again reset passed on the permanent origin.

## DNS and Discord

Only the Arcade record was proposed: CNAME `arcade` → `cdawg-arcade-production.onrender.com`, TTL Automatic. Initial scoped zone inspection found no Arcade conflict. Chris saved it personally after the exact record was presented. Public DNS subsequently returned that CNAME, with about 1,800 seconds TTL. Render reports domain Verified and Certificate Issued. No other DNS writes were performed by the assistant. Subsequent Namecheap access was blocked by automatic review because the browser-origin grant was broader than the authorized zone; public DNS verification did not require account access.

Chris confirmed the prior root mapping, approved the replacement, and personally saved only `/` → `arcade.cdawgbot.xyz`. Same-origin `/api` needs no separate mapping. Exact prior/rollback mapping: `/` → `built-yeah-scheduling-evident.trycloudflare.com`. This old tunnel is rollback configuration evidence, not a dependable hosted fallback. OAuth registration, scopes, permissions, installation settings, and entry point were not changed.

Desktop acceptance is owner-observed, not independent assistant inspection: Chris confirmed launch from the intended channel, invitation card and pop-out, Discord connected, correct authenticated identity, accurate local-best labeling, and no TLS, SDK context, OAuth or raw technical error. He then confirmed keyboard and visible controls, gameplay/loss, local results, Play Again, and focus pause/resume. Browser-origin review blocked assistant Discord access; no alternate surface was used to bypass it. Owner screenshots remain private and uncommitted.

## Operational observations

One instance; memory chart below 10% of 512 MB and CPU near zero after startup during initial smoke. Initial client request samples were approximately 0.10–0.26 seconds; these are not sustained-load percentiles. No unplanned restart was observed, but an exact restart counter was not established. Provider percentile metrics require a higher plan and were not purchased.

A 24-hour application log view after desktop launch contained the expected listening event at the accepted SHA; no sensitive-value markers were detected in the inspected visible logs. No request bodies, tokens, authorization codes or secret values were emitted in the reviewed output. This is bounded visible-log inspection, not a historical security audit. Application logs intentionally do not record OAuth request payloads.

## Rollback drill

The artifact drill passed: redeploy the exact accepted commit as a controlled candidate, then use Dashboard Rollback to restore the original accepted artifact. Both deployments reported live. The rollback confirmation explicitly stated "No configuration changes since this deploy." Only the initial successful deployment existed before the drill. The candidate and restored artifact both use the same exact accepted commit; no environment settings or secrets were changed. After restoration, health, readiness, revision metadata, HTTP frontend and browser Local practice passed. Automatic deployment was rechecked Off. Chris then confirmed a fresh Discord launch, connected status, correct identity, and Start Game after restoration. The post-rollback visible runtime logs contained the expected listening events at the accepted SHA with no sensitive-value markers detected. Disk settings showed no attached disk. Configuration checkpoint: original production configuration entered during initial service creation, no subsequent environment edits or environment groups. No provider configuration-version identifier was exposed or copied; this descriptive checkpoint is separate from code identity.

Render documents that service-specific environment variables, start command, health check, instance count, and build artifact match the rollback target, while custom domains retain current configuration. Rollback does not overwrite current service settings. Therefore only artifacts created with the current confirmed-working secret are eligible. Never roll back to an artifact with uncertain or revoked credentials. See https://render.com/docs/rollbacks.

## Limitations and follow-up

- Scores are browser-local; there is no shared ranking, authenticated score API or persistence.
- Limits are process-local and aggregate proxied clients; one instance is not high availability.
- The existing large Phaser bundle warning remains.
- Desktop Discord checks were owner-observed. Native mobile/touch gameplay has not been validated; narrow browser layout is not a substitute.
- Exact restart totals, sustained-load capacity, plan-specific log retention and artifact-retention count remain unverified; do not rely on an assumed number of retained rollback artifacts.
- Dependency audit after production pruning reported seven findings (five high, two moderate). Build/development tools retained as production dependencies account for several findings; they are not executed by the compiled request server. The `qs` findings were reviewed against the default simple Express query parser and absence of URL-encoded parsing in routes. No reachable advisory path was established in current routes, but that is not proof of no risk. No dependency upgrade or audit autofix was made. Schedule a separate dependency maintenance review.
- No credentials were committed or exposed by the assistant. VPS, unrelated services, and product functionality were not changed.

## Repository versus deployment

This evidence and the runbook corrections form a documentation-only commit on main. The accepted application SHA above remains deployed; the documentation commit is deliberately not deployed because application code and runtime configuration are unchanged. Automatic deployment remains off. The final handoff reports the documentation commit SHA and verifies a clean working tree and synchronization with origin/main. Documentation checks cover diff whitespace, local links, and bounded credential/private-provider-metadata patterns; the application suite already passed at the deployed SHA.

Next recommended work is a design-only shared-persistence phase: define server-verified identity, score trust/validation boundaries, a minimal score schema, retention, privacy and cost before choosing storage. Do not treat client scores or client-supplied identity as trusted. No persistence is implemented here.
