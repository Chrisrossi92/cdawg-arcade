# Chainshift Slice 2B — bounded corpus enrichment

Start: clean `c053eb339ba382c4cec21110eb193112406637a6`, branch
`codex/soft-launch-brand-player-cleanup`. Recorded Slice 2 health and 72 passing pairs
were confirmed before modification. Only this new directory is added.

## Frozen snapshots and review

- Prior graph: chainshift-graph-v1 / fnv1a64:dc521a64e4cc01fb.
- New graph: chainshift-graph-v2 / fnv1a64:029bb9393f7bbe48.
- Rules: chainshift-rules-v1, unchanged.
- Reviewed 113 formal candidate additions; approved 102; rejected/deferred/nonselected
  11; introduced 41 words. Zero v1 edge removals or edits.
- New total: 334 words / 435 approved active directed edges, all additions G-rated.

`graph-v2.ts` composes an immutable copy of v1 plus explicit approved additions.
`review-data.json` records each decision, purpose, independent dictionary evidence,
checked date and (where available) exact Wiktionary revision/permalink and HTML hash.
No definitions/example sentences are copied. Source URLs are provenance strings;
refereeing never fetches them. Dictionary existence corroborates lexical usage but
is not sufficient by itself: regional, specialist and historically narrow candidates
were rejected even when attested. Rejection can mean nonselection, not invalid English.

External evidence was read during editorial work only. Offline report/test regeneration
never contacts a network or AI service. Existing v1 identity, files, reports and local
fixtures remain unchanged and historically verifiable. Published puzzles must remain
pinned to their original graph; nothing here migrates them.

## Bounded iteration and caveats

The first 98-edge draft passed 259 endpoint pairs. Final familiarity review removed
station break, added sheet music/music box and corrected provenance for chicken stock.
Shortlist review then added independently corroborated showroom/daytime/powerline,
preventing artificial multi-shift difficulty. Final count is 254 passing pairs. A lower
count than the draft is not a reason to restore narrower language or hide direct routes.
The draft is explicitly unpublished; its identity and changes are recorded in iteration.json
and reconstructed by a test, not exported as an approved referee.

All analyses use the unchanged Slice 2 experimental policy. Final reachability is
29.92% (16.84% before), and the largest strong component is 105 words (49 before).
Source count increases 67→68 because six new source-only words offset five repaired
old sources. Eleven old sinks gain outgoing edges; six new sinks leave the total 65→60.
No new word has more than three outgoing edges. Existing game remains the leading
mandatory bridge, but its normalized pair prevalence falls 36.82%→27.77%.

Passing topology does not establish recognizability or fun. The graph optimum remains
corpus-relative: BOOK → CLUB → ROOM now proves a 2-shift route, replacing v1's 4.
GAME → OVER → TIME → OUT → HOUSE is valid, while the optimum stays 3. BOARD → FOOD
stays 6 and now fails the dominant-bottleneck check; it was not tuned into acceptance.

Ten separately pinned v2 local-review manifests use distinct IDs and fixed October
15–24, 2026 fixture dates, not a live daily schedule. `local-puzzles-v2.ts` verifies and
deeply freezes their JSON. Old v1 fixtures are neither rewritten nor selected against v2.
Timestamp fields are deterministic fixture metadata, not assertions of actual execution.

The strongest topology ranking is reported in full. A separate manual shortlist prefers
unique starts and finishes and explicitly withholds chicken house, cold work, street dog
and day game pending direct-term/register review. These caution pairs remain included
in aggregate topology counts; they are not implicitly approved or declared invalid.
This is an acknowledged completeness gap, not a modified candidate filter.

## Artifacts

- ENRICHMENT_REVIEW.md: every approved addition and rejected/deferred candidate.
- TOPOLOGY_COMPARISON.md: complete before/after counts, distributions, failures and hubs.
- CANDIDATES_V2.md: prior human pairs, ranked candidates and varied manual review set;
  includes spoilers, so stop before representative solutions when solving.
- LOCAL_PUZZLES_V2.json: separately pinned local-review fixtures.
- METRICS_V2.json: machine-readable reproducible analysis certificates.

Recommendation: READY_FOR_SLICE_3 for local gameplay development and playtesting.
Remaining graph gaps do not justify another general expansion pass now; gather UI
playtest evidence before future reviewed graph versions. This is not publication,
ranked-score, Discord, deployment or audience authorization. Slice 3 is not begun.

## Validation record

Executed with available bundled Node 24.19.0; exact pinned Node 24.20.0 remains
unavailable. No packages, configuration, database, service or account was changed.

```
node --import tsx shared/chainshift/enrichment/reports-v2.ts
node node_modules/vitest/vitest.mjs run shared/chainshift --maxWorkers=2
node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --resolveJsonModule --target ES2020 --module NodeNext --moduleResolution NodeNext shared/chainshift/*.ts shared/chainshift/enrichment/*.ts
npm test
npm run typecheck
npm run build
```

Results: 130 Chainshift tests; 614 repository tests across 43 files; repository and
explicit shared-module NodeNext checks passed; production frontend build passed with
the inherited >500 kB chunk warning. Full tests used temporary local socket permissions.
The first full run had one existing guild preflight socket reset while the build ran;
the full rerun without the concurrent build passed, with no code changes. Report tests
reproduce all v1/v2 artifacts in isolated owned temporary directories, twice, offline.
