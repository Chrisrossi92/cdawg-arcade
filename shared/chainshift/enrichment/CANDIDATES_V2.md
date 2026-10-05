# Graph v2 local candidate review (spoilers below)

Prior: chainshift-graph-v1 / fnv1a64:dc521a64e4cc01fb.
New: chainshift-graph-v2 / fnv1a64:029bb9393f7bbe48.
Rules unchanged: chainshift-rules-v1. No removals from v1.

The graph optimum is the approved-corpus optimum, never a claim of natural-language optimum. BOOK → CLUB → ROOM is the concrete missing-edge counterexample.

## Previous human playtest pairs

| Pair | v1 optimum | v2 optimum | v2 filter |
|---|---:|---:|---|
| game → house | 3 | 3 | passes |
| book → room | 4 | 2 | outside_experimental_length_range |
| board → food | 6 | 6 | dominant_bottleneck |

GAME → OVER → TIME → OUT → HOUSE is now fully valid (4 shifts); its graph optimum remains 3. BOOK → CLUB → ROOM is valid (2 shifts), so the unchanged experimental 3–6 policy excludes it as a daily candidate. BOARD → FOOD is not specially optimized: its optimum remains 6; see its final filter result above. The old v1 manifest stays valid against v1 only.

Passing pairs: 72 → 254. The ranking rule remains Slice 2: openings + approaches descending, minimum overlap ascending, route count descending, lexical endpoints. That ordering favors destinations such as room with many approaches; the varied shortlist separately uses unique starts and finishes rather than pretending all top-ranked pairs are varied.

## Strongest ranked pairs

| START | FINISH | Optimum | Shortest routes | Openings | Approaches | Exact +0/+1/+2/+3 counts |
|---|---|---:|---:|---:|---:|---|
| ice | room | 3 | 1 | 3 | 6 | 1/3/5/4 |
| time | room | 4 | 1 | 3 | 6 | 1/2/1/6 |
| chicken | house | 5 | 1 | 3 | 5 | 1/3/6/8 |
| screen | room | 5 | 1 | 2 | 6 | 1/4/4/9 |
| play | room | 5 | 2 | 2 | 6 | 2/3/3/9 |
| home | room | 4 | 2 | 2 | 6 | 2/1/6/6 |
| street | room | 4 | 2 | 2 | 6 | 2/3/3/6 |
| road | room | 4 | 2 | 2 | 6 | 2/2/3/5 |
| wall | room | 5 | 1 | 2 | 6 | 1/2/2/7 |
| soup | house | 4 | 1 | 3 | 5 | 1/2/4/4 |

## Varied local playtest shortlist

### ICE → ROOM

Optimal 3; shortest routes 1; openings box, cold, cream; approaches ball, board, game, party, war, wash; exact +0/+1/+2/+3 1/3/5/4; best/mean interior overlap 0.000/0.306; mandatory nodes none; within-bound mandatory none.
- ice → cold → war → room
- ice → box → car → pool → party → game → room
- ice → cold → cream → cheese → ball → room

### SOUP → HOUSE

Optimal 4; shortest routes 1; openings bowl, kitchen, stock; approaches club, light, out, station, tree; exact +0/+1/+2/+3 1/2/4/4; best/mean interior overlap 0.000/0.205; mandatory nodes none; within-bound mandatory none.
- soup → bowl → cut → out → house
- soup → bowl → cut → back → ground → work → station → house
- soup → kitchen → table → lamp → shade → tree → house

### CHICKEN → WORK

Optimal 4; shortest routes 1; openings feed, soup, stock; approaches ground, paper, shift, team; exact +0/+1/+2/+3 1/1/4/1; best/mean interior overlap 0.000/0.180; mandatory nodes none; within-bound mandatory none.
- chicken → feed → back → ground → work
- chicken → soup → bowl → game → day → dream → team → work

### GAME → FOOD

Optimal 5; shortest routes 2; openings day, night, over, play; approaches dog, party; exact +0/+1/+2/+3 2/4/2/4; best/mean interior overlap 0.000/0.272; mandatory nodes none; within-bound mandatory none.
- game → day → light → house → party → food
- game → day → break → point → guard → dog → food
- game → night → club → house → party → food

### LIGHT → TIME

Optimal 5; shortest routes 3; openings house, rain; approaches day, over, play, run; exact +0/+1/+2/+3 3/0/0/7; best/mean interior overlap 0.000/0.319; mandatory nodes none; within-bound mandatory none.
- light → house → party → game → day → time
- light → rain → forest → fire → wall → clock → speed → run → time

### COLD → POINT

Optimal 6; shortest routes 2; openings cream, open, war; approaches break, check, way; exact +0/+1/+2/+3 2/2/2/2; best/mean interior overlap 0.000/0.269; mandatory nodes none; within-bound mandatory none.
- cold → cream → cheese → board → walk → way → point
- cold → open → fire → wall → paper → work → day → break → point

### SHOW → GAME

Optimal 4; shortest routes 1; openings off, room, time; approaches board, card, party; exact +0/+1/+2/+3 1/1/1/2; best/mean interior overlap 0.000/0.071; mandatory nodes none; within-bound mandatory none.
- show → room → charge → card → game
- show → off → road → map → key → board → game

### DAY → CARD

Optimal 4; shortest routes 1; openings break, light, time; approaches charge, report; exact +0/+1/+2/+3 1/0/2/2; best/mean interior overlap 0.000/0.291; mandatory nodes none; within-bound mandatory none.
- day → break → room → charge → card
- day → time → trial → run → book → report → card

### STATION → LINE

Optimal 6; shortest routes 1; openings house, wagon; approaches goal, off, tag; exact +0/+1/+2/+3 1/0/1/3; best/mean interior overlap 0.000/0.320; mandatory nodes none; within-bound mandatory none.
- station → wagon → wheel → chair → lift → off → line
- station → house → party → game → day → time → out → field → goal → line

### FISH → DOG

Optimal 5; shortest routes 1; openings bowl, dinner, taco; approaches guard, watch; exact +0/+1/+2/+3 1/0/2/1; best/mean interior overlap 0.000/0.206; mandatory nodes none; within-bound mandatory none.
- fish → taco → truck → stop → watch → dog
- fish → bowl → game → day → break → point → guard → dog
- fish → dinner → party → food → truck → stop → watch → dog

Promotion cautions (not licensed or ruled invalid by this pass): chicken house, cold work, street dog, day game. These pairs have plausible direct or specialist readings and are withheld from manual fixtures until lexical/familiarity review; their topology results remain in the total and strongest ranking. This is an explicit remaining completeness concern, not a changed diversity policy.
All shortlisted candidates pass the unchanged filter, with complete bounded analysis. Try a range of 3–6-shift puzzles and stop reading solution routes before solving. This is a language playtest set, not a gameplay request or proof of fun.
