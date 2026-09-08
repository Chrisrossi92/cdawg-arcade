# Discord Activity Future

This prototype now includes a Discord-ready adapter boundary and a local backend for Discord authorization-code exchange. It does not implement production token persistence, bot launch commands, authoritative score writes, persistent leaderboards, or realtime game networking.

## Planned Integration Areas

## Discord Activity Client

The Discord Embedded App SDK dependency is isolated in `src/platform/discord`. The adapter waits for SDK readiness, calls `commands.authorize`, exchanges the authorization code through `/api/token`, then calls `commands.authenticate`.

## Bot Slash-Command Launcher

Cdawg Bot can later expose slash commands such as `/arcade balance` or `/challenge`. Those commands should create or link to a Discord Activity session, not run game logic in the bot.

## Realtime Session Server

The current local transport uses BroadcastChannel when available plus an in-memory fallback. A future realtime service should replace that transport contract for active session state:

- Current game id
- Player id
- Spectator ids
- Run phase
- Cheer events
- Challenge metadata

The Phaser game should remain client-authoritative for feel, with server-side score validation added around reported results.

## Spectator Synchronization

The current session transport publishes lightweight player summaries and cheer events. Replace it with a realtime implementation that preserves the same transport-agnostic contracts. Cheers should never pause gameplay.

## Cheer Events

Future cheer events should include:

- Sender id
- Reaction type
- Created timestamp
- Session id

Rate limits should prevent spam while preserving the live arcade feel.

## Challenge Sessions

The mock challenge card should become a session record with:

- Challenger id
- Opponent id or invite code
- Game id
- Target score
- Expiration
- Completion state

## Server Leaderboards

LocalStorage should be replaced by an API-backed score repository. Leaderboards should support personal bests, server bests, recent attempts, and challenge-specific rankings.

## Posting Results Back To Discord

After score validation, the bot or activity backend can post a compact result card to the originating channel. The card should include score, personal-best state, server rank movement, and challenge actions.

## Basic Score Validation

Initial validation can be pragmatic:

- Score duration must match run start and end timestamps.
- Reported score must fit known game config limits.
- Client simulation version must be included.
- Suspicious attempts can be excluded from server leaderboards.

Stronger validation can be added later if competitive abuse becomes a real issue.
