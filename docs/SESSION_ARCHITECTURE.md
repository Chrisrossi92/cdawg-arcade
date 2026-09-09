# Arcade sessions — Phase 4C

Implementation is under validation on `codex/phase-4c-server-sessions`. Production remains the accepted Phase 4B release until the deployment gates below pass. Official scoring stays disabled. A verified session does not make a practice result official. Historical prototype session codes and local leaderboards are unrelated to this authorization boundary.

## Authority and Discord capabilities

The server exchanges a code at Discord's OAuth token endpoint, then requests `/api/v10/users/@me` with that transient bearer token. `identify` authorizes the user lookup; the existing `identify guilds` request remains unchanged. No email, member, messaging, or new OAuth scope is requested. No guild list is fetched. [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2).

For instance verification the server calls `GET https://discord.com/api/applications/{application_id}/activity-instances/{instance_id}` using `Authorization: Bot …` from the **same Arcade application**. The hint is never authority. Wrong application/instance, non-guild location, missing guild, absent participant, expired/missing instance and provider failure reject verification. Discord also documents optional signed proxy headers; this implementation does not depend on them or treat unsigned headers as proof. No Gateway connection or posting request is made. The documented endpoint specifies application bot authentication without describing a guild-installation prerequisite; zero intents/permissions and installation requirements remain a live validation gate. [Discord multiplayer guide](https://docs.discord.com/developers/activities/development-guides/multiplayer-experience).

The authoritative instance object supplies `application_id`, `instance_id`, `location.kind`, optional `location.guild_id`, and a `users` array of connected user IDs. The accepted location kind is `gc`; `pc` is rejected. IDs remain decimal strings. Channel/location/launch identifiers and other participants are discarded. The API supplies no guild name, so presentation uses the neutral “Discord server” label. [Application resource](https://docs.discord.com/developers/resources/application).

The installed Embedded App SDK's authorize contract accepts `code_challenge` and `code_challenge_method: S256`, and returns only `code`. Consequently this flow does not claim a returned state comparison. A fresh verifier is encrypted in each challenge, its SHA-256 challenge goes to SDK authorize, and the verifier goes to the server token exchange. SDK authenticate still receives only the transient access token. Current documentation lists web, iOS and Android support for authorization/authentication; desktop/pop-out behavior and **rejection of an incorrect PKCE verifier** require live evidence before enablement. No silent downgrade removes PKCE after a failed exchange. [Embedded SDK reference](https://docs.discord.com/developers/developer-tools/embedded-app-sdk).

## Challenge and session lifecycle

1. Client reads `/api/me` for a current cookie's CSRF companion. An expired cookie is cleared. Disabled/unavailable sessions preserve legacy SDK sign-in and honest practice.
2. `/api/auth/challenges` creates a random UUID, 256-bit browser binding and verifier. Only the binding digest and AES-256-GCM encrypted verifier/context reach Postgres. Encryption uses a random process-local key, deliberately invalidating unfinished challenges after restart.
3. A separate five-minute HttpOnly cookie binds the browser. Encrypted context binds the exact allowed origin and any prior session digest. A newer challenge cancels the prior browser challenge when its cookie is present.
4. `/api/session` atomically consumes a matching unexpired challenge before contacting Discord. A failed exchange cannot reuse it. Finalization atomically deletes the consumed challenge; logout/cancellation during provider work prevents finalization.
5. Successful verification upserts the minimum player, guild and observed participation, then issues a fresh opaque 256-bit cookie. Only its SHA-256 digest and the CSRF companion's digest are persisted.
6. Existing-session reauthentication locks and revokes the prior row. Same-player/guild renewal preserves original authentication time and the eight-hour deadline. A different player or guild revokes the prior session and requires a clean reconnect; no new player's row is created by that rejected transition.
7. Idle validity is 30 minutes. Background `/api/me` checks do not extend it. Renewal requires fresh challenge/OAuth/user/instance verification. Absolute validity is eight hours; at expiry fresh authentication is required.
8. Logout durably revokes and clears both cookies. Repeat logout is safe with the same CSRF proof; anonymous logout clears browser cookies. Restart never clears revocation. No refresh token is retained.

Session rows store no instance or channel ID. Participation is a timestamped observation, not perpetual membership proof. A future score authorization must independently define freshness; it cannot assume the stored observation is current. No Phase 4D authorization logic exists here.

## Cookies, origins and CSRF

Both cookies use `__Host-`, `Secure`, `HttpOnly`, `Path=/`, explicit `SameSite=None; Partitioned`, no Domain and no URL token. Challenge max-age is 300 seconds. Session cookie max-age cannot exceed the absolute deadline; database idle/absolute checks are authoritative.

Discord documents its proxied Activity origin and requires `SameSite=None Partitioned` for iframe cookies; stricter SameSite policies are unsuitable there. Its guidance says the cookie domain must match the full application proxy hostname. **Inference to test:** omission of Domain produces the required host-only scope at the browser-visible proxy hostname while retaining the `__Host-` protection. Partitioning and third-party-cookie restrictions vary by browser/client; local header tests do not establish live compatibility. No insecure cookie or persistent bearer fallback has been approved. [Discord networking](https://docs.discord.com/developers/activities/development-guides/networking).

All mutations require an exact allowed Origin, `X-Arcade-Origin` matching it, `X-Arcade-Request: 1`, JSON and exact request keys. A current cookie additionally requires `X-Arcade-CSRF`, matched in constant time against its persisted digest. CSRF companions are domain-separated hashes of random session material; they cannot recover the cookie and change on rotation. They live only in client memory. Same-origin GET may omit Origin, so `/api/me` requires the custom headers and validates any Origin that is present. Cross-origin browsers must pass exact CORS; wildcard origins and credentialed wildcard responses are prohibited.

CORS alone is not authentication. IP-derived data is only coarse bounded burst control, never identity. Socket-peer and global buckets bound requests; at most ten session operations run concurrently. Provider work has a shared 7.5-second deadline, no redirects, fixed destinations and a 64 KiB response limit. Body limits are 4 KiB. Responses are no-store and contain fixed errors plus a random response-header diagnostic ID, never raw provider/driver errors.

## Endpoint contracts

All requests use the custom headers above. No endpoint accepts an authoritative player/guild selector. OPTIONS validates the exact origin and advertises only the intended headers/methods.

| Endpoint | Body / result | Replay and failure behavior |
| --- | --- | --- |
| `POST /api/auth/challenges` | `{}` → challenge ID, S256 challenge/method, 300-second lifetime | Fresh one-use challenge; existing session requires CSRF |
| `POST /api/session` | Exactly challengeId, code, instanceId → safe session/profile, CSRF, transient access_token | One consume/finalize; no automatic replay |
| `GET /api/me` | No body → verified player/guild, deadlines, CSRF | Read-only; no idle extension; expired cookie cleared |
| `POST /api/session/renew` | Same challenge/code/hint contract | Requires existing valid session; rotates token, preserves absolute deadline |
| `POST /api/logout` | `{}` → signed_out | Durable revocation, challenge cancellation, repeat-safe |
| `POST /api/session/discrepancy` | `{}` → recorded | CSRF-protected; bounded category only, no submitted identity |

Disabled capability returns 503. Invalid origins/CSRF return 403; wrong methods 405; unsupported media 415; oversized bodies 413; malformed fields 400; expired/challenge/account-change cases 401; throttling 429; verification/persistence failure 503. Diagnostic IDs carry no personal data. Existing `/api/token` remains solely the legacy SDK bootstrap; it is never an Arcade session authority.

## Data and operational boundary

Allowed writes: players, guilds, guild_participations, application_sessions, auth_challenges, security_events. A security event contains only a fixed mismatch category, a session digest reference and 24-hour expiry. Challenges expire in five minutes and a one-minute maintenance interval purges them; expired security events are purged too. Expired session rows are removed after a further 24 hours, provided no future attempt authorization references them. Revoked tokens never become valid again. No code, access/refresh token, IP, user agent, arbitrary avatar URL, channel ID or private instance ID is persisted. Only a validated optional avatar hash is retained. User-supplied display text renders through React escaping.

No migration is required: schema version **1** supports this flow unchanged. Production writes require a restricted runtime role. The explicit owner-run `scripts/provision-session-role.mjs` creates a separate login, grants schema usage, read access and only the permitted identity/session mutations. It never resets an existing role. The owner privately replaces the application's connection with that role; the administrator connection remains outside application configuration. Runtime checks reject superuser/role administration/ownership/schema-create and score-table write privileges. A bad role disables sessions while practice/core health remain available.

The independent `ARCADE_SESSIONS_ENABLED` defaults false. It requires explicit official-scoring false, the Arcade bot credential, compatible persistence and restricted privileges. Automatic deployment stays off. No score tables, game rules, local score migration, posting, DNS, VPS or paid infrastructure changes are part of this phase.

## Client behavior

Immediate SDK display can precede verification, but the server-confirmed identity wins when available. A mismatch records a fixed security event without client identity values. Account-change events remove verified UI and request revocation; they never grant authority. Expiry, unavailable verification and disconnect remain practice. Reconnect starts a fresh flow. Cookie/CSRF material never enters localStorage/sessionStorage; local practice scores retain their existing repository.

See [deployment and live matrix](PHASE_4C_SERVER_SESSIONS.md) for pending production gates and [database operations](DATABASE_RUNBOOK.md) for provider boundaries.
