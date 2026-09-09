# Production runtime and deployment runbook

## Status and architecture

Phase 3C established the paid Render service `cdawg-arcade-production` at `https://arcade.cdawgbot.xyz`, serving frontend and API from one origin. DNS/TLS and owner-observed Discord desktop acceptance passed. See [Phase 3C deployment evidence](PHASE_3C_PRODUCTION_DEPLOYMENT.md) for the exact accepted revision, rollback result, and operational limitations. Automatic deployment is off; the existing VPS remains untouched. Gameplay and browser-local scores are unchanged; there is no database, application session, shared ranking, or score submission API.

Node is pinned to **24.20.0 LTS** in `.node-version`, `.nvmrc`, `package.json`, and `render.yaml`. Install that runtime before validation. No unrelated dependency version was changed. Review supported security patches during separately scoped dependency maintenance; the Phase 3C evidence records the deployment-time advisory limitations.

Build flow: lockfile installation → full tests → typecheck → Vite `dist` → TypeScript `build/server/*.js` → private `build/release.json` → compiled smoke → optional dev-dependency pruning. The runtime starts with Node, Express, and the compiled backend. It needs neither Vite, tsx, TypeScript source, watch mode, nor a global compiler. Keep `dist`, `build`, `package.json`, and installed production dependencies together. Backend paths resolve relative to compiled modules rather than the working directory.

Render build command:

```sh
npm ci --include=dev && npm test && npm run build:production && npm run smoke:production && npm prune --omit=dev
```

Render start command:

```sh
node build/server/index.js
```

`npm start` is the equivalent local command with the production environment supplied. Existing `dev`, `dev:all`, and `dev:server` commands remain available. Production compilation clears stale backend output and emits no tests, source maps, source TypeScript, or dotenv files. Vite tests and production builds disable dotenv loading and the public-directory copy; the frontend build process receives only an allowlist of public variables. Development still supports the existing ignored local `.env` workflow. Do not copy that file into deployment or use it for smoke tests.

## Variables and sensitivity

Names are listed below; enter actual values privately in Render. `.env.example` contains placeholders only.

| Variable | Use / sensitivity | Rule |
| --- | --- | --- |
| `VITE_DISCORD_CLIENT_ID` | Public, build time | Discord application ID; 17–20 digits; matches backend ID |
| `VITE_API_BASE_URL` | Public, build time | Exactly `/api` |
| `VITE_APP_VERSION` | Public, build time | Optional; defaults to source revision. Full lowercase 40-character SHA or `development-` marker |
| `DISCORD_CLIENT_ID` | Backend configuration, public identifier | Must match the ID recorded in the built manifest |
| `DISCORD_CLIENT_SECRET` | **Secret**, runtime only | Current credential entered privately; never a `VITE_` variable; no placeholder; minimum 16 characters |
| `DISCORD_REDIRECT_URI` | Backend configuration | Exact registered HTTPS OAuth redirect; no userinfo or fragment. Preserve Activity registration; do not borrow another application's callback |
| `ALLOWED_ORIGINS` | Backend configuration | Exactly the approved HTTPS site origin plus `https://<matching-client-id>.discordsays.com`, comma separated |
| `NODE_ENV` | Runtime mode | `production` |
| `PORT` | Runtime bind port | Supplied by Render; required for readiness; integer 1–65535. Takes precedence over `SERVER_PORT` |
| `HOST` | Runtime bind address | Defaults to `0.0.0.0` in production; Render must use that address. Override to loopback for local tests; IP literals only |
| `RELEASE_SHA` | Public release metadata, backend | Optional override; normally use Render's `RENDER_GIT_COMMIT`. Full lowercase source SHA |
| `RENDER_GIT_COMMIT` | Provider release metadata | Render supplies the source SHA at build/runtime |
| `NODE_VERSION` | Provider runtime selection | Pinned version from `render.yaml` |
| `SERVER_PORT` | Development convenience | Local fallback 3001; does not replace production `PORT` readiness requirement |

The blueprint marks owner-entered settings `sync: false`; that does not mean every such setting is secret. Only the Discord client secret is a credential. Do not put values in logs, screenshots, commits, tickets, shell history, or this runbook. `sync: false` values are prompted at initial Blueprint creation; later edits must be made in the dashboard.

Version fields deliberately accept only a source SHA or bounded `development-*` marker, preventing arbitrary configuration from appearing in health output. `development-phase3b` identifies the pre-commit local acceptance build; it is not a deployed revision. For production, leave manual version/SHA overrides unset and verify the two health fields equal the reviewed Render commit. A custom version remains public and must follow the same safe format.

The compiled executable refuses startup unless NODE_ENV is production and never loads dotenv. Invalid bind host/port prevents startup with a generic configuration error. Missing or invalid production credentials, origins, release metadata, missing assets, or a build/backend ID or revision mismatch allows a **diagnostic unready process**: liveness works, readiness returns 503, frontend and token exchange return 503. No required values or exception details appear in responses. Fix the dashboard configuration or build and redeploy; configuration is read at startup. Readiness proves configuration shape and build consistency, not validity of a real Discord credential or OAuth registration.

## Routing, files and caches

- `/api/health`: HTTP 200, `{status: "alive", releaseSha, version}`. Process liveness only.
- `/api/ready`: HTTP 200 `ready` or HTTP 503 `unready`, with the same safe release fields. **Use this for Render health checks.**
- `/api/token`: JSON POST only, plus CORS OPTIONS. Other methods return 405. Unknown `/api/*` paths return JSON 404.
- `/` and extensionless non-API SPA paths serve the HTML shell with `Cache-Control: no-cache`.
- Manifest-listed hashed `/assets/*` files have one-year immutable caching. Missing assets return 404, never HTML.
- Only `dist/index.html` and supported hashed assets can be served. Repository/source/server/build/docs paths, dotfiles, traversal attempts, unknown extensions, and symlinks are rejected. Build hashes are verified at startup; readiness rechecks file existence and safe paths. Treat artifacts as immutable until redeploy.

The private release manifest lives in `build`, outside the public tree. It contains only public build metadata and file hashes. API and error responses use `no-store`. All responses set `nosniff` and a no-referrer policy. No frame-blocking header is added because Discord must embed the app. Render provides TLS and HTTP-to-HTTPS redirection; this process does not infer scheme or redirect destinations from forwarded headers. Leave edge caching at its default unless separately validated; never cache OAuth responses.

## Proxy, request limits and OAuth

The [Render web-service documentation](https://render.com/docs/web-services) establishes TLS termination and HTTP forwarding, but does not define an invariant hop count or trusted ingress CIDR contract. Following [Express proxy guidance](https://expressjs.com/en/guide/behind-proxies/), this runtime explicitly trusts **zero forwarded hops** (`trust proxy: false`). It uses the socket peer for a coarse limiter and ignores X-Forwarded-For/Host/Proto for identity. Do not change to `true`, trust all private networks, assume one hop, or trust the leftmost header value without a separately verified ingress contract.

This intentionally aggregates Render/Discord proxy traffic. The [Discord Activity proxy](https://docs.discord.com/developers/activities/development-guides/networking) can hide individual client IPs. IP is not authenticated player identity, account enforcement, or trusted score ownership. Limits are broad burst protection: 300 token attempts per socket peer per fixed minute, 600 total per process per minute, and 20 simultaneous upstream exchanges. Normal multi-player authentication can share a bucket; exceptionally large simultaneous launches may receive 429 with `Retry-After: 60`.

Storage retains at most 2,048 peer records plus one global record. Each request lazily removes at most 32 expired peer entries; records are ordered by fixed expiration. Idle records remain bounded and are reclaimed on subsequent activity. New peers at capacity are rejected rather than evicting active limits. Malformed or overlong addresses share an `unknown` bucket. Limits reset on restart and are not shared across instances. Future authenticated score APIs require server-established identity, authorization, and probably distributed limits/persistence; none is implemented here.

Token exchange accepts only an uncompressed JSON object containing one `code` string, 4–512 permitted characters, with an 8 KiB body limit. Malformed JSON returns safe 400; oversized bodies return 413; wrong media/encoding returns 415. CORS permits only the configured site and the matching application Activity origin in production, with explicit methods/headers on preflight. Requests without Origin remain possible for non-browser clients; CORS is not authentication.

The upstream is fixed to Discord's OAuth token endpoint with redirects forbidden. Its eight-second abort signal covers headers and body reads; a disconnected client also aborts the exchange. Responses contain only the intended token fields; errors are sanitized. There is no arbitrary target URL, request-body logging, authorization-code logging, or credential logging. Do not enable verbose HTTP body/header logging or dump provider environment settings. Safe application logs contain startup/drain events and release metadata only; plan-specific log retention remains unverified; do not assume long-term access to historical logs.

## Lifecycle

Render normally signals SIGTERM and allows 30 seconds before SIGKILL ([deployment lifecycle](https://render.com/docs/deploys)). SIGTERM and SIGINT mark the service draining, stop listening, close idle connections, and let active work finish. A maximum 12-second deadline destroys remaining connections and exits nonzero; normal drain exits zero. Token upstream timeout is eight seconds; HTTP/header/inactivity limits are ten seconds. Signal listeners are installed only by the executable entrypoint and removed during completion; importing modules does not start a server.

## Local verification without credentials

```sh
npm ci --include=dev
npm test
npm run typecheck
npm run build:client
npm run build:server
npm run test:production
node scripts/scan-production.mjs
```

The last command executes the complete production build with public dummy values and a `development-phase3b` marker, then tests the compiled output in an isolated temporary runtime directory. It replaces local generated build output; it never uses the real Discord credential. For already-built artifacts, `npm run smoke:production` supplies a dummy secret and the manifest's public ID/revision. It starts no external services and calls no Discord endpoint.

Smoke assertions cover root/assets/cache, SPA routing, API 404, forbidden paths, safe malformed token requests, CORS, readiness/configuration/artifact failures, approved health fields, logs, artifact contents, SIGTERM/SIGINT and port closure. Tests separately cover limiter expiry/capacity/spoofing, configuration, token cancellation/timeout/concurrency, symlinks, and normal/forced drain. The smoke fixture omits source and scripts; dependencies come from the installed tree. Run smoke again after pruning dev dependencies to verify runtime independence.

Browser acceptance uses the compiled loopback service with dummy configuration: Local practice, Start Game, countdown, controls, interruption/resume, loss, results, replay, and narrow layout. Repeat real Discord acceptance after material launch, authentication, or deployment changes. Do not treat dummy configuration readiness as live OAuth acceptance.

## Ordered deployment and rollback procedure

1. Review and approve the Phase 3B commit; decide the release branch/commit explicitly. Do not assume the repository's default branch contains this unmerged work. Confirm Node security patch support and the paid Render plan, region, account ownership, log retention, and artifact retention. Target one instance; no disk/database.
2. With deployment authorization, create one paid Node web service using the reviewed commit and descriptor settings. Creation itself triggers a first deploy even when automatic deploys are off. If using a Blueprint, set Blueprint Auto Sync to **No** as well as service `autoDeployTrigger: off`; confirm both dashboard settings. No service is created merely by checking in `render.yaml`.
3. Enter the current Discord secret and required settings privately. Preserve the registered redirect. Verify frontend/backend application IDs agree. Keep Render-provided PORT/revision, HOST all interfaces, and readiness path `/api/ready`. Do not upload local `.env` or reuse revoked credentials.
4. Validate the provider-assigned hostname before DNS: readiness is 200, source revision matches the reviewed commit, browser practice works, caches/API errors/static boundaries behave, restart is clean. Do not invent the hostname. The exact production CORS list excludes the provider hostname, so validate OAuth only after the approved origin is active; browser practice needs no token request.
5. Add the approved custom domain `arcade.cdawgbot.xyz` to the service and only its required DNS record(s). Verify DNS and managed TLS before switching Discord. Preserve other Cdawg records and VPS services unchanged.
6. After hostname acceptance, record the current Discord root mapping as rollback data, then change only the approved Activity root mapping to the custom hostname. `/api` stays same-origin; no separate API service or mapping is required.
7. Perform real Discord acceptance: fresh launch, current identity and OAuth, start/countdown/controls/loss/results/replay, focus/background pause and resume, reload and reconnect. Confirm logs contain no credentials and health still identifies the selected release.
8. Exercise a rollback drill using a previously accepted retained artifact once one exists. Keep the last good revision and environment-setting inventory privately. Verify restoration, health revision, browser play, and Discord launch. For a failed first deployment with no previous artifact, disable/stop the new service and restore the recorded prior mapping/DNS state as approved; the prior tunnel mapping is not a reliable hosted fallback.

Render can restore a [previous deployed artifact](https://render.com/docs/rollbacks), subject to retention. Dashboard rollback disables automatic deployment; verify it remains off. Environment rollback behavior differs for service settings and environment groups, so inspect the effective credential/configuration privately rather than assuming all settings revert. Domain/Discord/DNS changes require their own rollback actions. Keep at least five accepted release records and the latest known good artifact when the selected retention plan allows; verify actual retention before relying on it. Do not rotate credentials merely to test rollback, and never restore revoked credentials.

## Remaining production limits

Managed hosting, health checks, DNS/TLS, and real OAuth on the stable hostname were validated in Phase 3C; consult its evidence for rollback results. Exact trusted ingress topology, plan-specific log/artifact retention, and capacity under shared Discord bursts remain unverified. One instance is not high availability. In-memory limits are process-local; scores remain browser-local. The existing large Phaser bundle warning is unchanged and intentionally outside this phase.

Reference descriptor fields were checked against the [Render Blueprint specification](https://render.com/docs/blueprint-spec); the live service was created manually with the approved production name rather than by applying this file. Do not apply the reference descriptor as a duplicate service. Keep the verified dashboard settings and existing service identity when planning future infrastructure changes. The pinned runtime is the official [Node 24.20.0 LTS release](https://github.com/nodejs/node/releases/tag/v24.20.0).
