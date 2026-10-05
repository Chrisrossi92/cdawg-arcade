# Chainshift Slice 2B before / after topology

Prior: chainshift-graph-v1 / fnv1a64:dc521a64e4cc01fb.
New: chainshift-graph-v2 / fnv1a64:029bb9393f7bbe48.
Rules unchanged: chainshift-rules-v1. No removals from v1.

| Metric | Graph v1 | Graph v2 |
|---|---:|---:|
| Words | 293 | 334 |
| Active edges | 333 | 435 |
| Weak components | 12 | 4 |
| Largest weak | 257 (87.71%) | 327 (97.90%) |
| Strong components | 241 | 230 |
| Largest strong | 49 (16.72%) | 105 (31.44%) |
| Reachable ordered pairs | 14408/85556 (16.84%) | 33273/111222 (29.92%) |
| Source-only words | 67 | 68 |
| Sink-only words | 65 | 60 |
| Evaluated 3–6-shift pairs | 4052 | 7480 |
| Passing pairs | 72 (1.78%) | 254 (3.40%) |

## Degree-group comparison

| Group | Out v1 | Out v2 | In v1 | In v2 |
|---|---:|---:|---:|---:|
| 0 | 65 (22.18%) | 60 (17.96%) | 67 (22.87%) | 68 (20.36%) |
| 1 | 151 (51.54%) | 168 (50.30%) | 167 (57.00%) | 184 (55.09%) |
| 2+ | 77 (26.28%) | 106 (31.74%) | 59 (20.14%) | 82 (24.55%) |
| 4+ | 9 (3.07%) | 13 (3.89%) | 9 (3.07%) | 15 (4.49%) |

## Filter failure reasons (overlapping)

| Reason | v1 | v2 |
|---|---:|---:|
| dominant_bottleneck | 3980 | 7226 |
| insufficient_approaches | 3594 | 6493 |
| insufficient_openings | 3500 | 5641 |
| insufficient_strategic_diversity | 2607 | 3551 |
| mandatory_bottleneck | 3980 | 7201 |

## Mandatory / within-bound hub dependence

Fractions use all analyzed 3–6-shift pairs, including rejected pairs. Raw counts alone are misleading when the reachable catalog grows.

| Word | v1 pairs / fraction | v2 pairs / fraction |
|---|---:|---:|
| game | 1492 / 36.82% | 2077 / 27.77% |
| day | 818 / 20.19% | 1211 / 16.19% |
| party | 719 / 17.74% | 946 / 12.65% |
| house | 622 / 15.35% | 827 / 11.06% |
| room | 605 / 14.93% | 936 / 12.51% |
| card | 599 / 14.78% | 738 / 9.87% |
| time | 507 / 12.51% | 988 / 13.21% |
| light | 483 / 11.92% | 518 / 6.93% |
| work | 460 / 11.35% | 1015 / 13.57% |
| charge | 378 / 9.33% | 503 / 6.72% |
| ball | 347 / 8.56% | 592 / 7.91% |

## New-word hub inspection

- car: 2 outgoing, 2 incoming; 130 mandatory-pair appearances.
- art: 2 outgoing, 1 incoming; 28 mandatory-pair appearances.
- cut: 2 outgoing, 1 incoming; 47 mandatory-pair appearances.
- plant: 2 outgoing, 1 incoming; 56 mandatory-pair appearances.
- pool: 2 outgoing, 1 incoming; 81 mandatory-pair appearances.
- pot: 2 outgoing, 1 incoming; 23 mandatory-pair appearances.
- garden: 2 outgoing, 0 incoming; 0 mandatory-pair appearances.
- horse: 2 outgoing, 0 incoming; 0 mandatory-pair appearances.
- master: 2 outgoing, 0 incoming; 0 mandatory-pair appearances.
- hole: 1 outgoing, 2 incoming; 18 mandatory-pair appearances.
- pop: 1 outgoing, 2 incoming; 44 mandatory-pair appearances.
- bench: 1 outgoing, 1 incoming; 68 mandatory-pair appearances.
- boy: 1 outgoing, 1 incoming; 11 mandatory-pair appearances.
- chair: 1 outgoing, 1 incoming; 39 mandatory-pair appearances.
- corn: 1 outgoing, 1 incoming; 52 mandatory-pair appearances.
- dish: 1 outgoing, 1 incoming; 27 mandatory-pair appearances.
- feed: 1 outgoing, 1 incoming; 0 mandatory-pair appearances.
- lift: 1 outgoing, 1 incoming; 54 mandatory-pair appearances.
- mark: 1 outgoing, 1 incoming; 36 mandatory-pair appearances.
- music: 1 outgoing, 1 incoming; 33 mandatory-pair appearances.
- pack: 1 outgoing, 1 incoming; 30 mandatory-pair appearances.
- park: 1 outgoing, 1 incoming; 122 mandatory-pair appearances.
- pipe: 1 outgoing, 1 incoming; 11 mandatory-pair appearances.
- punch: 1 outgoing, 1 incoming; 14 mandatory-pair appearances.
- rat: 1 outgoing, 1 incoming; 27 mandatory-pair appearances.
- record: 1 outgoing, 1 incoming; 12 mandatory-pair appearances.
- side: 1 outgoing, 1 incoming; 73 mandatory-pair appearances.
- soda: 1 outgoing, 1 incoming; 0 mandatory-pair appearances.
- town: 1 outgoing, 1 incoming; 46 mandatory-pair appearances.
- wash: 1 outgoing, 1 incoming; 0 mandatory-pair appearances.
- watch: 1 outgoing, 1 incoming; 22 mandatory-pair appearances.
- wheel: 1 outgoing, 1 incoming; 46 mandatory-pair appearances.
- cup: 1 outgoing, 0 incoming; 0 mandatory-pair appearances.
- dryer: 1 outgoing, 0 incoming; 0 mandatory-pair appearances.
- pan: 1 outgoing, 0 incoming; 0 mandatory-pair appearances.
- burger: 0 outgoing, 1 incoming; 0 mandatory-pair appearances.
- hose: 0 outgoing, 1 incoming; 0 mandatory-pair appearances.
- luck: 0 outgoing, 1 incoming; 0 mandatory-pair appearances.
- mat: 0 outgoing, 1 incoming; 0 mandatory-pair appearances.
- puff: 0 outgoing, 1 incoming; 0 mandatory-pair appearances.
- washer: 0 outgoing, 1 incoming; 0 mandatory-pair appearances.

## Source / sink changes

Old sources gaining incoming edges: back, bread, class, cold, race.
Old sinks gaining outgoing edges: bag, bowl, down, gate, man, over, place, sheet, trick, truck, wagon.
New source-only words: cup, dryer, garden, horse, master, pan.
New sink-only words: burger, hose, luck, mat, puff, washer.

## Remaining weak islands

- call, egg, roll
- agent, travel
- beans, cool

## Recorded bounded iteration

Unpublished draft: 431 edges / 333 words; fnv1a64:51c0b1d95c31e0db; 259 passing pairs; strong core 105.
Final review removed station break and added sheet music, music box, show room, day time, power line. Exclude niche broadcast jargon; use independently corroborated everyday music terms to give the existing sink sheet an onward route. Chicken stock was additionally corroborated in Collins COBUILD collocations; final provenance uses Collins rather than the initial Reverso entry. Independent dictionary corroboration confirmed showroom, daytime and powerline; these obvious direct compounds replace artificial multi-shift difficulty and are excluded by the unchanged daily filter.
Neither draft identity nor old manifests were published or rewritten. Graph v1 and all historical reports/manifests remain byte-for-byte unchanged.

READY_FOR_SLICE_3: navigation improved with unchanged experimental filters. This is readiness for local gameplay development and human playtesting, not certification of a complete, fun or publishable daily catalog. Sources/sinks and hub dependence remain; no further corpus expansion is included here.
