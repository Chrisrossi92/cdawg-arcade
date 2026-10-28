# Prepared authored daily process — NOT LIVE

Live remains c77b84e52ebf35edb124a4591f72263a7dc33cd5. No reserve publication,
migration, deployment, delivery enablement, announcement or recording upload is authorized by this preparation.

## Proposed owner decision

One spoiler-free post daily in CDAWG's Fantasy World's #cdawg-arcade
(guild 1323324192627888339, channel 1549149791915737129), at 09:00 America/New_York.
The worker checks every two minutes and catches up once for the current day after a restart.
No backlog posts, mentions, separate result posts or reminder messages. Puzzles still roll over
at midnight New York; 09:00 is the invitation time, not the unlock time.
The supported link button is "Play Today's Chain":
https://discord.com/activities/1525643672194908330?custom_id=chainshift-today-v1
This existing navigation hint opens ChainShift; authenticated server date selects the daily.

Exact sample (date substituted server-side):

⛓️ **Today's ChainShift · 2026-11-05**
Five missing words. One chain. How quickly can you connect them?
Finish for 500 points; speed and fewer assists earn up to 1,000.
Play today's daily below—and compare scores without sharing answers!

## Prepared implementation

`CHAINSHIFT_AUTHORED_DAILY_DELIVERY_ENABLED` defaults off and requires the explicit
`CHAINSHIFT_AUTHORED_DAILY_CHANNEL_ID` above, the authored game, valid session and artifact gates,
existing bot configuration and enabled-guild allowlist. Legacy ranked/delivery remain false.
The new migration 005 adds `chainshift_authored_daily_messages`, linked only to authored daily
publications. It preserves old puzzle and receipt tables. It reuses the proven channel lock,
nonce enforcement and durable prepared/uncertain/posted/blocked transitions.
New narrowly scoped runtime grants require approval: SELECT/INSERT on this ledger and UPDATE
on receipt state columns only; no identity edits, DELETE, TRUNCATE or table-wide UPDATE.

Before 09:00: no delivery. Missing current daily: no post and a sanitized `empty_queue` operator
result. Failed readiness: no post. Rate limits defer. Ambiguous sends recover by nonce with GET;
they never blindly POST again. Missing/deleted/foreign messages block that date instead of
recreating spam. Static invitation text has no completion counter, so solves cause no edits.
A blocked date is an operator issue; next-day behavior retains the shared cooldown, then checks
the new date. The old delivery flag cannot be used for this game.

## Private reserve proposal

30 additional unique seven-word daily chains, dated November 5–December 4, 2026 New York.
The combined server-only pack has 45 entries: 37 daily / eight practice. Original 15 entries
and October 29–November 4 dates remain unchanged. Demo stays practice-only.
Candidate SHA256 commitment:
7d854e9d87951a3bf41625b70a24621f7dedf8b54cf18b6cf1155fee1ab4b6fd
The private pack and ordered adjacency review ledger must never enter this public repository.
48 of 180 new adjacency occurrences reuse accepted seed/enrichment editorial evidence;
132 are new editorial-reviewed candidates. This is not human calibration or exhaustive
linguistic validation. Four pairs recur twice, but no full chain repeats; maximum word
frequency is five across 30 chains. Ambiguous alternate guesses keep the game's existing
kind feedback and automatic hint rule.

Keep at least 30 ready future dailies as an operating target; refill at 14 remaining
(count current day if still playable). Review the next 14 dates for gaps, not just row count.
A weekly private reserve check and low-reserve notification are proposed operating steps;
no scheduled task or owner notification has been created. A refill is an authored, reviewed,
hash-pinned batch, not paid broad dictionary classification. Replenishment still needs future
batch approval; 30 more puzzles do not create an unlimited generator.

## Bundled rollout approval still required

Approve exact candidate SHA after local review, additive migration005 on the existing Render
production database, the new restricted receipt grants, private pack replacement plus atomic
publication of the 30 new daily rows, and the above 09:00/no-mentions daily behavior.
Keep existing game, Balance, guild, OAuth scopes and legacy flags unchanged. Preview/mocked
runs are not imported into standings. Automatic deployment stays off.
The proposed introduction is a separate one-time message approval, including attachment and
exact channel; nothing is implicitly sent. Recording capture permission is separate/pending.

Rollback: disable only the new authored delivery gate to stop posts; use a schema-5-compatible
binary and preserve receipts/results/content. After migration005, do not deploy c77 unchanged
because its schema maximum is four. A schema-5-compatible disabled candidate is the rollback
binary. For content-only incidents disable authored gameplay, preserve rows, repair with a
reviewed compatible candidate. Never delete results or downgrade schema.
