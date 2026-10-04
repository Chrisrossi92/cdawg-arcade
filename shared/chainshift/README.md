# Chainshift Slice 1

Pure TypeScript rules and an original editorial seed. No runtime application integration,
network, database, browser API, clock, puzzle generation, or AI referee is present.
Import `seedReferee` from `seed.ts` for lookup/adjacency and immutable identity metadata.
`lookupEdge` returns canonical connection metadata or null. Invalid input never matches.

## Frozen language and scoring contract

American English; PG-13 ceiling. Input accepts ASCII alphabetic words only, trims
surrounding whitespace and folds ASCII case. Apostrophes, hyphens, internal spaces,
accents, digits, Unicode lookalikes and punctuation are unsupported in revision v1.
No stemming, conjugation, plural conversion, reverse edges, fuzzy matching or aliases.
Proper terms use the same lookup keys with separate display forms. Each edge must be
an established direct expression or joined compound, not a mere association or a
phrase with missing filler words. No self edges are allowed.

The eventual score is the number of edges in the completed final route. Removed
edges do not count; exploration costs elapsed time. This slice implements no scoring
function, timer or backtracking state.

## Editorial authority and limitations

The seed is hand-curated for this implementation, with explicit seed-editorial
provenance on every entry; it does not claim owner approval or external dictionary
certification. No third-party dataset was copied. Categories describe editorial
neighborhoods, not exclusive linguistic classes. All initial entries are classified G.
Machine checks ensure classification is present and within the ceiling; they cannot
prove commonness, cultural accessibility or PG-13 suitability. Human review remains
necessary before publication. A `pending`, `rejected` or disabled edge is never active.

Review all entries in SEED_REVIEW.md. Corpus gaps are expected: this is an exercise
seed, not a comprehensive English dictionary. Single-word vocabulary restrictions
exclude some legitimate contractions and hyphenated forms. Idiomatic filler is never
silently omitted: PIECE → CAKE is absent. LEVEL → PLAYING was excluded because the
recognizable expression requires “field.” HOUSE → PARTY does not authorize its reverse.

## Snapshot/version procedure

`chainshift-graph-v1` and `chainshift-rules-v1` define the first snapshot. Preserve
published snapshots; create a new version/module when adding or editing entries.
Never replace a graph pinned by a published puzzle. Future puzzle manifests must pin
and compare graph version, rules revision and checksum, not just the version string.

The checksum is FNV-1a 64 over canonical JSON with explicitly ordered fields and
sorted directed keys. Edge input order has no effect; display/provenance/status and
version changes do. It is a reproducibility checksum, **not a cryptographic trust or
anti-tampering boundary**. Runtime security will rely on the authoritative server's
approved snapshot, not a client's claimed checksum. If a cryptographic commitment is
later needed, add a versioned digest scheme rather than silently changing this one.

`createReferee` validates and copies the corpus, freezes edge objects/arrays and keeps
its private index inaccessible. Later source mutations cannot change that referee.
Canonicalization/checksum helpers should be used on validated corpora.

## Local checks and review generation

```
node node_modules/vitest/vitest.mjs run shared/chainshift/rules.test.ts --maxWorkers=2
node --import tsx shared/chainshift/review.ts > shared/chainshift/SEED_REVIEW.md
node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2020 --module NodeNext --moduleResolution NodeNext shared/chainshift/*.ts
```

The report reproduction test guards the checked-in review surface. Slice 2 should
measure reachability, bottlenecks and route diversity before making puzzle-quality
claims. No such analysis or daily selection is implemented here.
