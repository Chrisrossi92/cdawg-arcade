# Chainshift candidate review (contains solutions)

Graph chainshift-graph-v1; fnv1a64:dc521a64e4cc01fb; rules chainshift-rules-v1.

Analysis policy chainshift-analysis-v1. No graph-v1 edits. All counts use approved enabled edges only.


Local review only. Topological acceptance is not editorial approval or a claim of fun. Do not open representative routes before manual solving.

Found 72 passing ordered pairs. Strongest means deterministic ordering by openings + approaches (descending), best-pair overlap (ascending), route count (descending), then endpoint keys.

| START | FINISH | Optimum | Shortest routes | Openings | Approaches | Exact optimum / +1 / +2 / +3 route counts | Best / mean internal overlap |
|---|---|---:|---:|---:|---:|---|---|
| home | room | 6 | 4 | 2 | 4 | 4 / 3 / 2 / 1 | 0.000 / 0.310 |
| book | work | 6 | 2 | 2 | 4 | 2 / 4 / 1 / 0 | 0.000 / 0.237 |
| run | room | 5 | 3 | 2 | 4 | 3 / 2 / 1 / 1 | 0.000 / 0.315 |
| book | room | 4 | 3 | 2 | 4 | 3 / 2 / 1 / 0 | 0.000 / 0.303 |
| light | work | 6 | 3 | 2 | 4 | 3 / 1 / 0 / 2 | 0.000 / 0.278 |
| card | work | 4 | 2 | 2 | 4 | 2 / 2 / 0 / 0 | 0.000 / 0.089 |
| play | point | 5 | 1 | 3 | 3 | 1 / 0 / 2 / 1 | 0.000 / 0.121 |
| game | work | 3 | 2 | 3 | 3 | 2 / 1 / 0 / 0 | 0.000 / 0.000 |
| board | food | 6 | 3 | 3 | 2 | 3 / 1 / 0 / 5 | 0.000 / 0.284 |
| power | house | 5 | 2 | 2 | 3 | 2 / 0 / 2 / 4 | 0.000 / 0.229 |

## Curated local fixtures

### 1: GAME → HOUSE

Optimal 3; shortest routes 2; viable openings day, night, play; final approaches club, light.
Exact optimum/+1/+2/+3: 2/0/0/2; 4 bounded simple routes; complete: true; mandatory nodes: none; within-bound mandatory: none; max node prevalence 0.750.
- game → day → light → house
- game → night → club → house

### 2: GAME → WORK

Optimal 3; shortest routes 2; viable openings day, night, play; final approaches ground, shift, team.
Exact optimum/+1/+2/+3: 2/1/0/0; 3 bounded simple routes; complete: true; mandatory nodes: none; within-bound mandatory: none; max node prevalence 0.333.
- game → night → shift → work
- game → day → dream → team → work

### 3: BOOK → ROOM

Optimal 4; shortest routes 3; viable openings club, report; final approaches ball, game, party, stock.
Exact optimum/+1/+2/+3: 3/2/1/0; 6 bounded simple routes; complete: true; mandatory nodes: none; within-bound mandatory: none; max node prevalence 0.667.
- book → club → house → party → room
- book → club → house → party → game → ball → room
- book → report → card → stock → room

### 4: BLUE → POINT

Optimal 4; shortest routes 1; viable openings fish, moon; final approaches break, check, way.
Exact optimum/+1/+2/+3: 1/1/0/1; 3 bounded simple routes; complete: true; mandatory nodes: none; within-bound mandatory: none; max node prevalence 0.667.
- blue → moon → walk → way → point
- blue → fish → dinner → party → game → day → break → point
- blue → moon → light → rain → check → point

### 5: CARD → WORK

Optimal 4; shortest routes 2; viable openings game, stock; final approaches ground, paper, shift, team.
Exact optimum/+1/+2/+3: 2/2/0/0; 4 bounded simple routes; complete: true; mandatory nodes: none; within-bound mandatory: none; max node prevalence 0.750.
- card → game → night → shift → work
- card → game → day → dream → team → work
- card → stock → market → research → paper → work

### 6: PLAY → POINT

Optimal 5; shortest routes 1; viable openings ground, list, time; final approaches break, check, way.
Exact optimum/+1/+2/+3: 1/0/2/1; 4 bounded simple routes; complete: true; mandatory nodes: none; within-bound mandatory: none; max node prevalence 0.500.
- play → ground → work → day → break → point
- play → list → price → tag → line → drive → way → point

### 7: POWER → HOUSE

Optimal 5; shortest routes 2; viable openings ball, up; final approaches club, light, tree.
Exact optimum/+1/+2/+3: 2/0/2/4; 8 bounded simple routes; complete: true; mandatory nodes: none; within-bound mandatory: none; max node prevalence 0.750.
- power → ball → game → day → light → house
- power → up → time → table → lamp → shade → tree → house

### 8: COLD → WORK

Optimal 5; shortest routes 1; viable openings open, war; final approaches ground, paper, shift.
Exact optimum/+1/+2/+3: 1/0/0/2; 3 bounded simple routes; complete: true; mandatory nodes: none; within-bound mandatory: none; max node prevalence 0.667.
- cold → open → fire → wall → paper → work
- cold → war → room → charge → card → game → night → shift → work

### 9: BOARD → FOOD

Optimal 6; shortest routes 3; viable openings game, room, walk; final approaches dog, party.
Exact optimum/+1/+2/+3: 3/1/0/5; 9 bounded simple routes; complete: true; mandatory nodes: none; within-bound mandatory: none; max node prevalence 0.889.
- board → game → day → light → house → party → food
- board → walk → way → point → guard → dog → food

### 10: HOME → ROOM

Optimal 6; shortest routes 4; viable openings run, work; final approaches ball, game, party, stock.
Exact optimum/+1/+2/+3: 4/3/2/1; 10 bounded simple routes; complete: true; mandatory nodes: none; within-bound mandatory: none; max node prevalence 0.700.
- home → run → book → club → house → party → room
- home → run → book → report → card → game → ball → room
- home → work → day → light → house → party → room

## Manual playtest set

- Easier/highly connected: GAME → HOUSE (3 shifts).
- Medium: BOOK → ROOM (4 shifts).
- Harder, topology-fair: BOARD → FOOD (6 shifts); phrase familiarity still needs review.
- Distinct strategies: PLAY → POINT (5 shifts); its optimal and longer route use different interiors.

These are suggested manual language exercises, not a request for Chris to repeat Arcade acceptance or interact with a new UI. No gameplay UI exists.

## Enumeration and interpretation

Routes are directed simple paths, bounded at optimum +3. Each pair allows at most 512 stored routes and 50,000 DFS expansions. Enumeration stops conservatively and the candidate fails if truncated. Reverse-distance pruning avoids impossible branches. Shortest-route DAG counts saturate at 1,000 with an explicit exceeded-cap flag.
Opening/final-approach counts use reachability within the bound while forbidding return to START or early arrival at FINISH. Mandatory nodes are verified by removal, both without a length bound and within the useful-route bound. Dominance is node prevalence in bounded routes; >=90% rejects. Internal overlap is Jaccard similarity of interior-node sets. A passing pair needs two openings, two final approaches and a route pair with overlap <=0.5; any mandatory node rejects. These are transparent experimental thresholds, not recognizability guarantees.
Exact +k counts are reported separately, rather than cumulatively. Repeated or cyclic walks are excluded: they cannot improve final-route shift count. Nearby alternate solutions and low internal overlap are structural signals; they do not prove semantic-region novelty.
