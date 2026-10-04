# Chainshift Slice 2 — analysis and local review fixtures

Slice 1 is preserved at commit 9dd0b9f. Graph-v1 remains 293 words / 333 edges,
checksum `fnv1a64:dc521a64e4cc01fb`. Nothing here changes the referee corpus.

## Scope and APIs

- `createAnalysis(referee)` exposes directed BFS shortest certificates, capped
  shortest-route counting, degree/component/health metrics, bounded simple-route
  diversity and explicit candidate reasons. Invalid or inactive edges never participate.
- `createManifest` requires a candidate that passes and returns a deeply frozen,
  deeply readonly local-review manifest. `verifyManifest` checks all snapshot pins and
  recomputes certificates; object-key serialization order is irrelevant. Verification
  is consistency checking, not authentication of an untrusted client's claims.
- `local-puzzles.ts` exports ten verified immutable fixtures; `LOCAL_PUZZLES.json`
  is their reproducible review/export form. Raw parsed JSON is not automatically
  immutable: use the frozen module or verify/recreate before relying on it.
- `dayKey(epochMs)` and `createDailyClock(injectedNow)` use IANA America/New_York
  local midnight through Intl. There are no real-clock reads, hardcoded offsets,
  timers or scheduling jobs. `selectDailyPuzzle` is pure fixture selection and fails
  on duplicate days. Later runs retain the starting manifest, never reselect mid-run.

The fixed October 5–14, 2026 dates are review fixtures, not authorization to publish.
Manifest timestamps are deterministic fixture metadata, not an asserted execution time.
Publication is `local-review`, editorial approval is `pending`. There is no approved
or live daily catalog. Recognizability is explicitly uncertified by topology.

## Bounded methods and transparent thresholds

Health runs BFS for each source: O(V(V+E)), giving all nonidentical reachable ordered
pairs and shortest-length distribution. Weak components use undirected adjacency;
strong components use forward/reverse reachability intersections (polynomial, not
path enumeration). Nodes from disabled-only vocabulary remain visible as isolates.

Shortest-route counts use distance-layer DAG accumulation capped at 1,000. A count
exactly at the cap is distinguished from a count that exceeds it. Diversity enumerates
simple routes up to optimal +3, with reverse-distance pruning, 512 stored routes and
50,000 expansion steps per pair. Truncated analysis is explicitly marked and rejected;
its counts/overlaps are only lower-bound/sample observations. No cyclic walks are counted.

Candidate policy `chainshift-analysis-v1` is experimental: optimal 3–6 shifts, at least
2 useful first moves, 2 useful final approaches, at least 2 routes, a pair whose interior
Jaccard overlap is <=0.5, and no global or within-bound mandatory internal node. Any
internal node present in >=90% of bounded routes rejects. This does not hard-code 3–6
as a permanent product rule. A shorter witness after removing a node proves a bypass;
absence of any witness proves mandatory status. The +3 bound separately distinguishes
long theoretical bypasses from practical nearby alternatives.

Jaccard comparisons cost O(R² * L), bounded by R<=512 stored routes. Internal node
sets measure structural difference, not linguistic/semantic novelty. Opening/final
approach reachability explicitly avoids revisiting START/FINISH. Nearby counts are
exact length buckets (+0,+1,+2,+3), not cumulative totals. Route representative selection
and all tie-breaking use deterministic lexical key order. Tests exercise caps, cycles,
mandatory/dominant nodes and genuinely separate branches.

The report scans every reachable pair in the experimental length range, then ranks
passing pairs by openings + approaches descending, minimum internal overlap ascending,
route count descending and endpoint keys. Results are policy-dependent, not a claim of
fun, familiarity or sufficient publication quality. The report counts overlapping
rejection reasons; they must not be summed to obtain rejected-pair totals.

## Reports and conclusions

- GRAPH_HEALTH.md: degrees, sources/sinks, hubs, weak islands, strong cores and paths.
- CORPUS_GAPS.md: bottleneck counts, category-boundary signals and targeted expansion.
- CANDIDATE_REVIEW.md: strongest and curated candidates, metrics and spoiler routes.

Current verdict: PARTIALLY — usable but needs targeted expansion. Seventy-two ordered
pairs pass the filter, but the passing core repeats common bridge words and does not
establish a varied, fair V1 catalog. The ten fixtures support language playtesting;
no actual gameplay UI exists. Human recognizability/fun remains unverified. Recommended
expansion should create reviewed bypasses, returns and semantic-island connections in
a new graph version. No proposed edges or arbitrary volume target are added here.

## Validation

Use the repository's pinned Node 24.20.0 when available. This execution found Node
20.19.3 on PATH and bundled Node 24.19.0; exact 24.20.0 was not available. Slice 1's
54 tests were rerun before its commit on PATH Node; combined final checks use 24.19.0.
No Node installation or package changes were made.

```
node --import tsx shared/chainshift/reports.ts
node node_modules/vitest/vitest.mjs run shared/chainshift --maxWorkers=2
node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2020 --module NodeNext --moduleResolution NodeNext shared/chainshift/*.ts
npm test
npm run typecheck
npm run build
```

Report tests generate twice inside owned temporary directories and compare all four
artifacts byte-for-byte. DST tests cover spring transition/skipped hour, fall repeated
hour, midnight before/after transitions, ordinary EST/EDT midnight and injected clock
rollover. Full repository HTTP tests require permission to bind temporary local sockets;
restricted-sandbox EPERM is an environment failure, not an application regression.

Final local results under bundled Node 24.19.0: 96 Chainshift tests across 3 files;
580 repository tests across 42 files; repository and explicit shared-module NodeNext
checks passed; frontend production build passed with the inherited >500 kB warning.
After correcting a corpus-gap prose description to name measured technology sinks,
the isolated report reproduction test passed again. No database/service/Discord
checks were required for this pure shared-module slice. Slice 1 files remain byte-for-byte
unchanged. No application code, configuration, schema, dependencies or release gate changed.
