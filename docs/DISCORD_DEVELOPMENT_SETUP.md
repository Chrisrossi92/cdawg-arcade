# Discord Development Setup

These steps must be completed manually in Discord Developer Portal and your local terminal.

## 1. Configure Environment

Create `.env` from `.env.example` and fill:

- `VITE_DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `ALLOWED_ORIGINS`

Do not prefix the client secret with `VITE_`.

## 2. Start Local Services

```bash
npm run dev:all
```

The backend serves:

- `GET /api/health`
- `POST /api/token`

## 3. Expose Through HTTPS Tunnel

Use a temporary tunnel such as cloudflared:

```bash
cloudflared tunnel --url http://localhost:5173
```

If the backend is not reached through the Vite `/api` proxy, expose or map `/api` to the backend route as well.

## 4. Discord Developer Portal

In the Developer Portal:

1. Enable Developer Mode in Discord.
2. Open your application.
3. Under OAuth2, add the redirect URI used by `DISCORD_REDIRECT_URI`.
4. Under Activities, open URL Mappings.
5. Add the root frontend Activity URL Mapping for `/`.
6. Add or verify an `/api` Activity URL Mapping to the backend route or Vite proxy.
7. Enable Activities.
8. Use the default Entry Point command or configure a development Launch command.
9. Launch the Activity from a development server through the App Launcher.

## What Should Work

- SDK readiness
- authorization prompt
- backend code exchange
- SDK authentication
- real Discord user display
- guild/channel/activity instance context where Discord provides it
- participant count where supported
- Cdawg Balance gameplay in the iframe

## Still Mocked

- realtime game-state server
- authoritative scores
- persistent guild leaderboards
- challenge delivery
- bot result posts
- production infrastructure
