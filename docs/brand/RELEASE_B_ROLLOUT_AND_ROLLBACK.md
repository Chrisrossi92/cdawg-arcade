# Release B rollout and rollback — plan only

Release B preparation is currently BLOCKED; see RELEASE_B_PREPARATION.md. No rollout is authorized or executed by this document.

## Preconditions for future release

Resolve the browser stall gate without relaxing the 100ms interruption policy. Complete all readiness, authentication, failure/retry, navigation, cold/warm, >=50-cycle lifecycle, responsive/accessibility and exact-artifact gates. Keep the final candidate clean/synchronized. Obtain explicit owner authorization naming its exact final commit.

Use the accepted Release A baseline `8931dab8e1282f61baed8c2dd170019d5180c32e`, retained Render artifact `dep-dajgkgdg1s2s73amhggg`, as Release B's immediate rollback. `f98e1c3` is the older retained Release A rollback, not the default B rollback.

## Future release steps

1. Fetch, verify approved feature SHA, clean/synchronized main and feature, source gate true, minimal reviewed diff and conflict-free merge.
2. Merge normally with --no-ff, preserve feature branch, push main. No squash/rebase/force push.
3. Run the complete suite against that exact merged tree; build with unchanged provider public metadata. Record all hashes.
4. Require repeated valid TLS/health/readiness checks from permanent and provider origins. Verify Release A still live and its artifact retained/configuration-compatible.
5. In the existing Render service use Manual Deploy → Deploy a specific commit → exact merge SHA. Automatic deployment stays Off. Change no settings, environment, permissions, DNS or Discord mappings.
6. Verify exact deployed artifact/source; root lobby and game navigation; V004 readiness before attempt/countdown; no legacy frame/startup pause; genuine interruptions; bounded authentication; correct identity; official/practice separation; replay/projections; results/return/Play Again; layouts; static hashes/cache/CORS/protected routes; sanitized logs and unchanged configuration.
7. Only after automated production checks pass, request one consolidated Discord canary: identity in lobby, Balance entry/readiness, one official run, saved/personal/guild summaries, Back to Arcade and re-entry. No incremental creative review.
8. After acceptance, perform authorized read-only consistency checks and normally merge documentation without redeploying if documentation-only.

## Rollback triggers and exact target

Stop rollout for authentication/identity errors, wrong score data, navigation failure, duplicate attempt/submission, V004 readiness regression, official replay/projection mismatch, guild authorization regression, serious layout/performance failure, unhealthy endpoints, wrong deployed hash, or any unexpected configuration requirement.

Use Render's existing rollback link for `dep-dajgkgdg1s2s73amhggg`. Confirm its source is `8931dab8e1282f61baed8c2dd170019d5180c32e` and confirmation reports no incompatible configuration changes. Execute only the authorized rollback; do not change environment, Discord or data. Verify both origins report that SHA, exact Release A frontend hashes, direct-to-Balance root, no lobby assets/routes, health/readiness and approved consistency checks. Retain legitimate data; no schema restore/migration/repair.

If configuration compatibility is not established, stop and request one consolidated necessary decision. Do not improvise provider edits. Source restoration is a separate reviewed normal revert of the verified B merge using its first parent; never force-reset published main or delete preserved branches.
