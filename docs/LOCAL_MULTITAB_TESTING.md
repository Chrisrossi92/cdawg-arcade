# Local Multitab Testing

> Historical prototype documentation: the current application opens directly into single-player Cdawg Balance. Session codes, join/challenge controls, and spectator cheering are not connected to the active interface. The flows below describe retained prototype modules, not current setup instructions.

Use this flow to test the local mock session without Discord, a backend, or WebSockets.

## Setup

Run the dev server:

```bash
npm run dev
```

If you also want the local Discord auth backend running:

```bash
npm run dev:all
```

Open the local URL in two browser tabs.

## Tab A: Player

1. Keep role set to `Player`.
2. Use the session code, for example `local-session`.
3. Click `Start Game`.
4. Play Cdawg Balance normally.

## Tab B: Spectator

1. Open `Context`.
2. Change role to `Spectator`.
3. Use the same session code as Tab A.
4. Click `Join Session`.
5. Open Cdawg Balance.

Expected behavior:

- spectator sees the current player
- spectator sees status and score summaries
- spectator count updates
- spectator can cheer
- player receives spectator cheer reactions
- spectator controls are disabled
- result appears in local session state after game over

## Local Challenges

After a completed run, the player can create a local challenge. The challenge card shows a code.

In a second tab:

1. Paste the challenge code into `Challenge code`.
2. Click `Accept Challenge`.
3. A new local attempt session is created for that user.

No invitation delivery, Discord message, or backend persistence exists yet.

## Future Slash Command Flow

Later, Cdawg Bot can expose a slash command that launches a Discord Activity session. The bot should create or reference a server-side session, then the Activity client should join that session through the realtime transport.
