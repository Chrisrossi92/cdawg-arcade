# Session Architecture

> Historical prototype documentation: the current application opens directly into single-player Cdawg Balance. Session codes, join/challenge controls, and spectator cheering are not connected to the active interface. The flows below describe retained prototype modules, not current setup instructions.

Cdawg Arcade now has a local-first session architecture that can later be replaced by a realtime backend.

## What Is Real

- Host adapter interface for local and Discord environments.
- Local host adapter with editable user, guild, channel, activity instance, and role.
- Discord host adapter that dynamically imports the Embedded App SDK only when Discord context is detected.
- Local backend token exchange for Discord Activity authentication.
- Typed contracts for cheers, results, challenges, and leaderboard queries.
- Local session transport with session creation, join/leave, state updates, cheers, results, challenges, and leaderboard queries.
- BroadcastChannel support for multiple browser tabs when available.

## What Is Mocked

- Discord authentication can be exercised through the local backend, but production token persistence and durable sessions are still mocked.
- Discord user/guild/channel context is derived from query params or local defaults.
- Result validation is local and structural.
- Leaderboards are localStorage-backed.
- Challenges are local-only codes.
- Spectator game state is a lightweight approximation, not synchronized Phaser physics.

## Session Lifecycle

1. A host context is created through the selected adapter.
2. A player creates or joins a local session code.
3. Spectators join the same session code.
4. The player starts the run and publishes throttled state summaries.
5. Spectators receive score, phase, tilt, danger, and cheer count updates.
6. On game over, the player submits a typed result.
7. The local transport marks the session completed and updates the local leaderboard.

For Play Again, the current model starts a new attempt inside the same session code. This keeps spectator tabs attached.

## Future Replacement

A production realtime server should implement the same transport responsibilities:

- session membership
- player state summaries
- cheer events
- challenge state
- result submission
- leaderboard reads

Production Discord OAuth sessions and score validation should live behind a hardened backend API, not in the client.
