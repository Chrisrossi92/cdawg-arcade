# Authentication architecture

The current Phase 4C implementation is documented in [Arcade session architecture](SESSION_ARCHITECTURE.md). The existing SDK bootstrap remains available when server sessions are disabled or unavailable. It exchanges a code through `/api/token`, then passes the transient access token to SDK authenticate. This establishes Discord client display only; it does not authorize backend player/guild operations.

The new challenge-bound flow verifies the user and Activity instance directly with Discord before creating a short-lived opaque Arcade session. No provider token is stored durably or placed in browser storage. A verified session does not change the browser-local/practice status of scores. Production rollout remains gated by credential isolation, restricted database privileges, live PKCE and cookie validation; see [phase evidence](PHASE_4C_SERVER_SESSIONS.md).
