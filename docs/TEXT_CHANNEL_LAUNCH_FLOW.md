# Text Channel Launch Flow

Cdawg Balance V1 should launch from a Discord text channel without spamming ordinary attempts.

## Desired Flow

1. A user invokes `/balance` in a server text channel.
2. Discord posts a compact Cdawg Balance Activity launch card.
3. The user opens the Activity from that card.
4. The Activity authenticates the Discord user and captures guild/channel context.
5. The user plays a single-player Cdawg Balance run.
6. The best score is submitted through the leaderboard boundary.
7. Personal best and guild leaderboard state update inside the Activity.
8. If the run creates a new guild record, a result message may be posted back to the originating text channel.
9. Ordinary attempts do not post messages and do not spam the channel.

## V1 Product Rules

- The authenticated Discord user is always the active player.
- The Activity should not expose session IDs, instance IDs, or internal Discord IDs in normal UI.
- Launch context should be retained internally for later score submission and result-message routing.
- Guild leaderboard scores should be scoped by guild ID.
- Standalone browser mode may use a local mock user and localStorage leaderboard data.

## Not In This Slice

- No bot command implementation.
- No production database.
- No realtime multiplayer.
- No spectators.
- No challenge flow.
- No WebSockets.
- No deployment.

## Future Implementation Notes

When backend work begins, `/balance` should create or reference a launchable Discord Activity entry point. The backend should validate score submissions, compare against guild records, and only post a channel result when the score is a new guild record or another notable milestone.
