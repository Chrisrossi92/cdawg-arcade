# Discord Development Setup

## Browser practice

Use installed dependencies with `npm run dev:all` to start the frontend and token backend. Open the printed local URL without Activity parameters. Local practice must work even when the legacy Discord enable flag is true. No secret is needed for browser play.

The game opens directly into Cdawg Balance. Start a run, lose, play again, and open Local results. All scores stay in browser storage and are not shared or guild-scoped. Do not clear storage as part of validation.

## Discord launch prerequisites

Keep actual values only in ignored `.env`. `.env.example` lists the required names with placeholders. Frontend and backend client IDs must agree, and the backend must use the current client secret. Never prefix a secret with `VITE_`.

The existing development workflow uses:

```bash
npm run dev:all
cloudflared tunnel --url http://localhost:5173
```

Use a tunnel only when its destination is already compatible with the application's existing mappings or configuration changes are separately authorized. A new temporary tunnel hostname does not automatically update Discord mappings. Stop only the processes started for the test.

Existing Discord configuration must provide:

- Activities enabled and an available Entry Point launch.
- A root frontend URL mapping and reachable `/api/token` via the Vite proxy or backend mapping.
- The registered OAuth redirect URI used by the backend.
- A real launch from Discord, which supplies `frame_id`, `instance_id`, and `platform` (`desktop` or `mobile`). Preserve the full query string.

The client guards missing/blank/duplicate required parameters and invalid platforms before SDK construction. Configuration alone never fabricates Activity context. The SDK handshake and authenticated user response establish the actual connection; URL parameters are not trusted as player identity.

## Visible states and recovery

- **Local practice:** immediate local identity; gameplay available.
- **Connecting to Discord:** bounded SDK readiness, authorization, exchange, and authentication.
- **Discord connected:** authenticated Discord identity, compact indicator, no recovery banner.
- **Discord unavailable:** safe explanation, retry where meaningful, and Continue in practice.

Incomplete launch information requires relaunching from Discord; its panel does not offer retry. Missing application configuration also requires setup correction. Transient SDK, authorization, exchange, authentication, and timeout failures can be retried. Practice remains available after failure.

SDK loading/readiness, exchange, and authentication each allow 10 seconds; authorization allows 30 seconds. Concurrent clicks share one attempt. Explicit retries run the flow again; cancellation invalidates stale results and aborts the token request. The SDK transport is reused rather than calling `close()`, which sends an Activity-close message to Discord.

## Safe validation

```bash
npm test
npm run typecheck
npm run build
```

Automated tests use fake SDKs, fake timers, and mocked exchanges; live credentials are not required. Browser checks can safely use a partial launch query to exercise relaunch/practice UI. A complete-looking synthetic query outside Discord can test connecting and readiness timeout, but cannot prove Discord authentication. Never add tokens or authorization codes to test URLs, screenshots, or logs.

For a real Activity check, confirm SDK connection, OAuth success, real identity, gameplay, and recovery within Discord. Do not change Developer Portal settings or use a revoked backup credential to work around access problems.

## Phase 1 validation limitation

Local tests, typechecking, build, and browser gameplay/recovery were validated. The backend reported configuration present. Live Discord OAuth and iframe gameplay were not validated: no existing development tunnel was running, and the available browser was signed out of the Developer Portal, so current mappings could not be verified. No tunnel, mapping change, permanent deployment, or external Discord mutation was performed.

Shared rankings, result delivery, production sessions, and permanent hosting remain unimplemented.
