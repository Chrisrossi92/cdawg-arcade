# Chainshift route diversity and corpus gaps

Graph chainshift-graph-v1; fnv1a64:dc521a64e4cc01fb; rules chainshift-rules-v1.

Analysis policy chainshift-analysis-v1. No graph-v1 edits. All counts use approved enabled edges only.


Evaluated all 4052 reachable 3–6-shift pairs. 72 pass; 3980 fail. Rejection reasons overlap. The length range is an experimental analysis filter, not a frozen product invariant.

- dominant_bottleneck: 3980
- insufficient_approaches: 3594
- insufficient_openings: 3500
- insufficient_strategic_diversity: 2607
- mandatory_bottleneck: 3980

## Most frequent mandatory/within-bound bottlenecks

- game: 1492 evaluated pairs
- day: 818 evaluated pairs
- party: 719 evaluated pairs
- house: 622 evaluated pairs
- room: 605 evaluated pairs
- card: 599 evaluated pairs
- time: 507 evaluated pairs
- light: 483 evaluated pairs
- work: 460 evaluated pairs
- charge: 378 evaluated pairs
- play: 361 evaluated pairs
- ball: 347 evaluated pairs
- board: 276 evaluated pairs
- rain: 247 evaluated pairs
- table: 229 evaluated pairs
- run: 216 evaluated pairs
- book: 169 evaluated pairs
- night: 158 evaluated pairs
- fire: 139 evaluated pairs
- food: 128 evaluated pairs

## Category boundary signals

Shared-node transitions count ordered pairs of adjacent active edges in different categories. This is a topology signal, not an editorial measure of semantic diversity. Sink counts use global outgoing degree.

| Category | Edges | Category words outside main weak component | Category words that are sinks | Cross-category next-edge transitions |
|---|---:|---:|---:|---:|
| compound | 34 | 0 | 10 | 24 |
| household | 27 | 0 | 6 | 23 |
| work-school | 27 | 0 | 6 | 26 |
| food | 34 | 13 | 8 | 9 |
| sports | 21 | 0 | 1 | 18 |
| entertainment | 30 | 0 | 5 | 27 |
| technology | 34 | 0 | 5 | 18 |
| gaming | 27 | 0 | 4 | 29 |
| travel | 24 | 5 | 4 | 6 |
| time-weather | 31 | 0 | 2 | 28 |
| slang | 19 | 2 | 3 | 17 |
| culture | 25 | 16 | 15 | 7 |

## Targeted expansion priorities

- Connect the ice/cream/cheese/cake/mix/tape and chicken/soup/kitchen/sink islands in both directions. Food already has some strong central links; these islands remain isolated.
- Add reviewed onward expressions around the train/station/wagon and travel/agent islands. Travel has dead-end destinations; adding incoming-only edges will not create recovery routes.
- Add alternative exits and entrances around point/guard, line/drive, tag/line, house/party, and room/charge. The current long routes repeatedly funnel through these words.
- Seek independently recognizable links between technology/data/storage and household/food/travel. Technology has sink words base, down, mode, review, and site; add reviewed exits from these strands and independent return paths.
- Cultural/gaming islands around magic/kingdom, iron/man, monster/hunter, and street/fighter need routes back into everyday vocabulary; franchise names alone do not create strategic choice.
- Prioritize 0- and 1-outdegree words with recognizable potential, then verify each addition creates a bypass or return path. Review new edges in graph-v2; do not edit graph-v1 or chase a numerical edge target.

No proposed edge has been approved or added in this slice. Topology cannot certify endpoint familiarity or obscure vocabulary.

Verdict: PARTIALLY — usable but needs targeted expansion. The passing core supports a local playtest set, but its repeated hubs and sparse peripheral vocabulary do not establish a varied V1 daily catalog.
