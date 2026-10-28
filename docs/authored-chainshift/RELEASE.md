# Authored Chainshift v2

Five hidden words, visible endpoints, free initial letters. A valid wrong guess reveals one letter and charges one assist; a manual reveal costs the same. Repeated wrong words and replayed requests do not add a charge. A final letter reveal solves that slot.

Completed score: 500 + max(0, 500 - floor(server elapsed seconds) - 50 × assists). Unfinished attempts award zero. Standings sort score descending, authoritative milliseconds ascending, with exact equal results sharing rank. Daily and practice attempts, historical route results, and local previews remain separate.

## Private content

The public repository contains the already exposed BOOK–FLOOR demo and synthetic test identities only. Production loads `CHAINSHIFT_AUTHORED_PACK_B64` privately at runtime. The 15-chain reviewed pack must match the public SHA256 commitment in `content-policy.ts`; missing content fails readiness. This is game content, not a credential. Never commit its value, the private pair review ledger, sealed research, or historical development branches to this public repository.

The reviewed pack has seven daily chains and eight practices. Every chain contains seven words and six checked adjacent expressions. The owner-played demo is practice only. The first daily is authored-002; then 003 through 008. The proposed dates are October 29 through November 4, 2026, in America/New_York. Publisher knowledge is unavoidable; previews remain local and are not imported as scores. This pack is a starter release, not an unlimited daily supply.

## Rollout

1. Keep automatic deployment off. Build and deploy exact committed app-only SHAs. Preserve the existing Arcade application, sessions, enabled guild, Balance configuration, and credential scopes.
2. Stage the new code with authored build/runtime and all legacy Chainshift build/ranked/delivery gates off. Use migration 004 only on the existing schema-3 database. It adds three dedicated tables and integrity guards; existing results are unchanged.
3. Use existing administrator access for migration/publication. Runtime access is restricted to SELECT on the three new tables, INSERT on attempts/actions, and UPDATE(state) on attempts. Obtain action-time approval before granting this new persistent access. Never add administrator credentials to the runtime environment.
4. Privately configure the pinned content, generate the exact publication metadata with `db:authored-plan`, and publish through `db:publish-authored` with gates off. Verify with the restricted runtime role.
5. Rebuild the same SHA with `CHAINSHIFT_AUTHORED_BUILD=true`, `CHAINSHIFT_PILOT_BUILD=false`. Enable `CHAINSHIFT_AUTHORED_ENABLED` and `CHAINSHIFT_ARCADE_ENABLED`; legacy ranked/delivery remain false. Verify health/readiness, existing Activity identity, practice gameplay, daily date, and isolated standings. No announcement or tags are part of rollout.

Rollback disables authored gates and uses the same schema-4-compatible binary with an ordinary disabled build. Preserve all rows and the private content; do not downgrade to a schema-3-only binary after migration 004.
