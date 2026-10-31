# ChainShift daily leaderboard image — local review candidate

Base: `38df1de792b7aefb3e7e6531ff888d58fbc42d30` from the verified October 28 production-release checkout. Implementation is isolated; the base checkout, CDAWG personality bot and production remain untouched. No live score query, Discord action, provider call, migration or privilege change was made.

## Review images

Both are actual 1200×820 PNGs rendered by the candidate with fictional data and visibly marked DESIGN PREVIEW. The Play button remains an existing Discord component below the image; it is not a simulated clickable region inside these PNGs.

- `docs/chainshift-card-preview/chainshift-top5-synthetic-preview.png`: populated/tied board, 18 fictional finishers, Latin/Greek/Cyrillic display-name examples. Library `libfile_43fa5196d6cc81918443f5b21a5c8533`, file `file_00000000920481f6b1196e348f250a36`, version 0.
- `docs/chainshift-card-preview/chainshift-empty-synthetic-preview.png`: zero-finisher invitation. Library `libfile_e2bdc5a203d48191b73be52c84d46af0`, file `file_00000000f0c881f6a97830c45a664856`, version 0.

Visual inspection completed on both PNGs. Images contain no real member information or puzzle answers. The shown timestamp is explicitly the latest confirmed finish, not a claim that a clock-only refresh happened. Unchanged standings produce identical bytes/digests. Empty state has no invented finish timestamp.

## Implemented path

Independent default-OFF `CHAINSHIFT_AUTHORED_LEADERBOARD_CARD_ENABLED` gate augments the existing authored daily worker. The 09:00 America/New_York selection, DST handling, puzzle identity, original Play button, channel, per-day durable message ID and two-minute nonoverlapping reconciliation remain. No additional scheduler, public leaderboard endpoint or member-result notification exists.

The top five and total come from completed authored daily attempts only. Practice is excluded. The exact existing SQL score expression is shared with the in-Activity board; score descending, elapsed time, competition rank and deterministic player-ID display tiebreak match it. No scoring rule changes.

Authored attempts historically lack guild attribution. Publication therefore requires the exact approved guild `1323324192627888339`, a single enabled guild, and an existing participation record uniquely associating every completed participant with that guild. A participant with other-guild participation or missing provenance fails closed and retains the existing post/card; the code never silently relabels a puzzle-wide board as this guild's board. A future multi-guild system would need explicit score-origin support, not loosening this guard.

PNG generation uses one pinned native Node-API dependency (`@resvg/resvg-js` 2.6.2) and bundled OFL-licensed Noto Sans fonts. No AI, remote image service, avatar fetch or system font dependency. Display names use the established public identity sanitizer, safe SVG escaping, bounded grapheme shortening and clipping; there are no private mappings in the image. Full worldwide script/color-emoji font coverage is not claimed.

The same owned daily message is edited with multipart PNG and one attachment entry, replacing rather than appending images. Filename binds the full PNG SHA-256. Payload digest includes image identity/content hash and accessible description, excluding raw byte serialization. Response checks validate owner/channel/nonce/content/button plus image identity and supported returned metadata. The documented embedded-only CDN response is also supported. Existing rate limits, cooldown persistence and uncertain-create recovery/no-duplicate rules remain. A failed refresh leaves the old valid image in place.

## Validation

- 900 tests across all 63 Vitest files passed; includes populated/empty/single/five/more-than-five boards, ties, Unicode/long/injection-like names, deterministic bytes, DST labels, same-board no edit, multipart replacement, bad owner/reference/attachment and provenance rejection.
- New disposable PostgreSQL + fake transport suite: 37 checks. It upgrades an existing static daily post to the card with the same message ID, matches the actual in-Activity board, excludes completed practice, updates changed standings, avoids unchanged edits, persists restart identity and retains the old card on a transient edit failure/provenance failure. External calls and real messages: zero.
- Existing authored-delivery disposable PostgreSQL regression: 32 checks, legacy receipts untouched, zero external calls.
- Typecheck, server build and production-format authored build with public synthetic release metadata passed. Build copies the licensed fonts into the server artifact. Local Node 22.16.0 checks; final production-format build also uses available Node 24.14.1, not a claim of running the exact production Node patch.
- No test sent or edited a real Discord message. Multipart/display behavior is documented and mocked, not live-validated.

Logs: sibling `../chainshift-card-validation-2026-10-31/` outside this candidate. The first unrestricted unit rerun was needed because sandboxed HTTP fixture listeners could not bind; the subsequent full suite passed. No test-only restriction was removed from application code.

## Proposed one deployment approval, after design review — not executed

Deploy the reviewed candidate to the existing Arcade service, verify current baseline/configuration/owned daily-message receipt and single-guild score provenance read-only, then enable only the leaderboard-card gate for the existing #cdawg-arcade daily post. Publish the established public top-five display names, scores and finish times plus finisher count and latest-finish timestamp in that same post, with changes reconciled on the existing two-minute cadence. Upgrade the current day's existing owned post when eligible; no historical backfill, per-player posts, announcements, pings, other channels, generic Activity-card modification, scoring change, new credentials or paid image/model calls. Existing daily schedule and Play button remain.

Stop activation if provenance, receipt identity, permissions or production baseline cannot be reconciled. Existing static invitation remains available with the card gate OFF. Disabling the card gate stops future image generation/updates; it does not delete accepted messages or erase the receipt ledger. Any retained previous valid image remains timestamped rather than falsely current. Do not reset receipts or reissue an uncertain create. No production migration/new database grant is needed for this candidate.
