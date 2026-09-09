# Cdawg Arcade

Cdawg Arcade is a local browser prototype for short, mobile-friendly arcade games that can later launch as Discord Activities. The current active experience opens directly into one playable game: Cdawg Balance.

## Run Locally

For browser practice, open the plain local URL. It immediately shows Local practice and never initializes the Discord SDK, even if the legacy `VITE_DISCORD_ENABLED` flag is true. No Discord credential is required. Scores remain in this browser only.

```bash
npm install
npm run dev
```

For Discord Activity testing, configure the frontend and backend variables below, launch through Discord with valid Activity URL mappings, and use the current backend client secret. Mode selection uses launch context, not the legacy enable flag. Run the Vite client and local backend together:

```bash
npm run dev:all
```

Validation commands:

```bash
npm run typecheck
npm test
npm run build
```

## What Is Built

- Vite, React, TypeScript, Phaser 3, plain CSS, and Vitest.
- Direct Cdawg Balance start screen; no active arcade lobby.
- Countdown, active gameplay, game over, browser-local personal best, play again, and a local leaderboard.
- Web Audio manager with local generated cues and music/SFX toggles.
- LocalStorage score persistence through a repository interface.
- A small game registry for future games.
- Host adapter boundary for local browser and Discord Activity modes.
- Historical local session/challenge/cheer modules remain in source but are not connected to the active interface. Older multitab/session documents describe that inactive prototype.
- Local Express backend for Discord authorization-code exchange.

## Gameplay

Cdawg stands on a rocking platform. Hold Left or Right using touch, pointer, Arrow keys, or A/D to counter the tilt. Delayed or wrong input lets angular velocity build until Cdawg falls.

Core tuning lives in `src/games/balance/config.ts`:

- Failure angle: 34 degrees
- Starting tilt: 6 degrees
- Input acceleration: 0.82
- Gravity acceleration: 0.34
- Damping: 0.9
- Difficulty growth: 0.032 per second
- Max difficulty multiplier: 3.2
- Max angular velocity: 2.8

The score is seconds survived, rounded to one decimal place.

## Project Structure

```text
src/app                 React application shell
src/components          Reserved for reusable UI components
src/games               Game registry and future game slots
src/games/balance       Cdawg Balance scene, simulation, config, tests
src/services            Audio, score persistence, spectators
src/styles              Global responsive UI styles
src/types               Shared app and game types
docs                    Product vision and Discord future notes
```

## Prototype Limits

Shared rankings, channel result delivery, and permanent hosting are not yet implemented. There is no database service, production token persistence, bot integration, production score API, or WebSocket server. Discord SDK initialization and auth are isolated behind an adapter and local backend. Current scores are stored in this browser and are not separated by Discord user or guild. Historical challenges and spectators remain inactive local prototypes.

## Environment

Copy `.env.example` to ignored `.env` when local configuration is needed. Replace placeholders before use. Keep real credentials only in local environment files or the eventual hosting secret store.

```dotenv
VITE_DISCORD_CLIENT_ID=replace-with-discord-application-client-id
VITE_DISCORD_ENABLED=replace-with-false-for-browser-or-true-for-discord
VITE_APP_VERSION=replace-with-local-app-version-label
VITE_API_BASE_URL=replace-with-api-base-path
DISCORD_CLIENT_ID=replace-with-discord-application-client-id
DISCORD_CLIENT_SECRET=replace-with-new-discord-client-secret
DISCORD_REDIRECT_URI=replace-with-registered-discord-oauth-redirect-uri
SERVER_PORT=replace-with-local-backend-port
ALLOWED_ORIGINS=replace-with-comma-separated-allowed-browser-origins
```

For the existing local proxy, the API base path is `/api` and the backend port is `3001`. Allowed browser origins must match the actual Vite URLs. The redirect URI must match the Discord application's registered configuration; frontend and backend client IDs must match. `VITE_APP_VERSION` is a local version label; the backend also supports optional `APP_VERSION` as a fallback.

No secrets are required for standalone practice. Discord authentication requires backend-only `DISCORD_CLIENT_SECRET`; never prefix it with `VITE_`. Do not commit environment files or preservation backups. The public template contains no usable credentials.

## Recommended Next Slice

Phase 2 should make simulation timing fair across frame rates and interruptions. Shared score writes and deployment remain later work.

## Connection and recovery

Discord launches must include one nonempty `frame_id`, one nonempty `instance_id`, and one `platform` equal to `desktop` or `mobile`. These values are supplied by Discord; do not invent or strip them in a tunnel or redirect. Partial, empty, duplicate, and invalid platform parameters produce a relaunch/practice message before the SDK is constructed.

A compact indicator shows Local practice, Connecting to Discord, Discord connected, or Discord unavailable. Connected sessions show the authenticated Discord name. All results remain browser-local, including when connected; Local practice results is a storage label, not a claim about the authenticated user's identity.

Connection failures offer Retry Discord connection and Continue in practice. An incomplete launch instead requires relaunching from Discord; retry cannot restore missing context. Practice remains playable during and after failures. No score data is migrated or erased.

SDK loading/readiness, token exchange, and SDK authentication each have a 10-second limit; authorization allows 30 seconds for consent. Retry starts a new bounded flow and ignores stale completions. SDK transport is retained because its close method would close the entire Activity. See `docs/DISCORD_DEVELOPMENT_SETUP.md` for validation and external limitations.

## Production preparation

The compiled single-service runtime and Render reference configuration are prepared; no production deployment exists yet. See [Production runbook](docs/PRODUCTION_RUNBOOK.md) for configuration, validation, deployment gates, and rollback. `npm run test:production` builds and smoke-tests the compiled runtime using dummy configuration without reading local `.env` files. Production startup is `npm start` with `NODE_ENV=production` and the documented runtime variables.
