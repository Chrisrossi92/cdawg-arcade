# Authentication Architecture

This slice adds a development Discord Activity authentication path without putting secrets in the frontend.

## Flow

1. Discord launches the Activity iframe.
2. `DiscordHostAdapter` constructs the Embedded App SDK with `VITE_DISCORD_CLIENT_ID`.
3. The adapter waits for `discordSdk.ready()`.
4. The app requests authorization with `commands.authorize`.
5. The frontend sends only the returned authorization code to `/api/token`.
6. The local backend exchanges the code with Discord using `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_REDIRECT_URI`.
7. The backend returns the access token to the Activity client.
8. The Activity calls `commands.authenticate`.
9. The adapter normalizes the authenticated Discord user and context into `HostContext`.

## Security Controls

- `DISCORD_CLIENT_SECRET` is backend-only.
- No token is written to localStorage or sessionStorage.
- `/api/token` validates request shape.
- `/api/token` uses JSON responses and safe error codes.
- Authorization codes and tokens are not logged.
- Express JSON body size is limited.
- A small per-IP rate limit protects the token route.
- CORS is restricted through `ALLOWED_ORIGINS`.
- Missing backend variables are named at startup but values are never printed.

## Still Development Only

This backend does not persist tokens, validate production scores, write public leaderboards, or provide realtime gameplay sync. It is a smoke-test bridge for Discord SDK authentication.
