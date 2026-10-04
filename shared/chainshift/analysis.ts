import {normalizeWord, type createReferee} from './rules.js';
export type Referee = ReturnType<typeof createReferee>;
export type Identity = Referee['identity'];
export function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const order = (a:string,b:string) => a < b ? -1 : a > b ? 1 : 0;
export const ANALYSIS_POLICY = freeze({revision:'chainshift-analysis-v1', minShifts:3, maxShifts:6,
  extraShifts:3, shortestCountCap:1000, routeCap:512, expansionCap:50000,
  minOpenings:2, minApproaches:2, maxDominance:0.9, maxBestPairOverlap:0.5});
export function createAnalysis(referee: Referee) {
  const edges = referee.snapshot.edges.filter(e=>e.enabled && e.approval==='approved');
  // Retain inactive-only vocabulary to report isolated nodes, but never traverse inactive edges.
  const nodes=[...new Set(referee.snapshot.edges.flatMap(e=>[e.from,e.to]))].sort(order);
  const out=new Map(nodes.map(n=>[n,[] as string[]])), incoming=new Map(nodes.map(n=>[n,[] as string[]]));
  edges.forEach(e=>{out.get(e.from)!.push(e.to);incoming.get(e.to)!.push(e.from);});
  for(const map of [out,incoming])for(const list of map.values())list.sort(order);
  function distances(start:string, reverse=false, banned:ReadonlySet<string>=new Set()) {
    const result=new Map<string,number>();
    if(!out.has(start)||banned.has(start))return result;
    const queue=[start];result.set(start,0);
    for(let i=0;i<queue.length;i++)for(const next of (reverse?incoming:out).get(queue[i])!) {
      if(!result.has(next)&&!banned.has(next)){result.set(next,result.get(queue[i])!+1);queue.push(next);}
    }
    return result;
  }
  function shortest(from:unknown,to:unknown,banned:ReadonlySet<string>=new Set()) {
    const a=normalizeWord(from), b=normalizeWord(to);
    if(!a||!b||!out.has(a)||!out.has(b)||banned.has(a)||banned.has(b))return null;
    const queue=[a], previous=new Map<string,string|null>([[a,null]]);
    for(let i=0;i<queue.length&&!previous.has(b);i++)for(const next of out.get(queue[i])!)if(!previous.has(next)&&!banned.has(next)) {previous.set(next,queue[i]);queue.push(next);}
    if(!previous.has(b))return null;
    const route:string[]=[];let current:string|null=b;
    while(current!==null){route.push(current);current=previous.get(current)!;}
    route.reverse();return freeze({shifts:route.length-1,route});
  }
  function shortestCount(a:string,b:string,cap:number) {
    if(!Number.isSafeInteger(cap)||cap<1)throw new Error('invalid route count cap');
    const d=distances(a), target=d.get(b);if(target===undefined)return {count:0,capped:false};
    const counts=new Map([[a,1]]);
    for(const n of [...d.keys()].sort((x,y)=>d.get(x)!-d.get(y)!||order(x,y))) {
      for(const next of out.get(n)!)if(d.get(next)===d.get(n)!+1)counts.set(next,Math.min(cap+1,(counts.get(next)??0)+(counts.get(n)??0)));
    }
    const count=counts.get(b)??0;return {count:Math.min(cap,count),capped:count>cap};
  }
  function components(strong:boolean) {
    const seen=new Set<string>(), result:string[][]=[];
    for(const n of nodes)if(!seen.has(n)) {
      const forward=distances(n), reverse=distances(n,true);
      const group=strong?[...forward.keys()].filter(x=>reverse.has(x)):(()=>{
        const queue=[n], visited=new Set([n]);
        for(let i=0;i<queue.length;i++)for(const x of [...out.get(queue[i])!,...incoming.get(queue[i])!])if(!visited.has(x)){visited.add(x);queue.push(x);}
        return queue;
      })();
      group.forEach(x=>seen.add(x));result.push(group.sort(order));
    }
    return result.sort((a,b)=>b.length-a.length||order(a[0],b[0]));
  }
  function health() {
    const degree=nodes.map(word=>({word,incoming:incoming.get(word)!.length,outgoing:out.get(word)!.length}));
    const histogram=(kind:'incoming'|'outgoing')=>Object.fromEntries([...new Set(degree.map(d=>d[kind]))].sort((a,b)=>a-b).map(k=>[k,degree.filter(d=>d[kind]===k).length]));
    const weak=components(false),strong=components(true), shortestLengths:Record<string,number>={'1':0,'2':0,'3':0,'4':0,'5':0,'6':0,'7+':0};
    let reachable=0,sum=0,max=0;
    for(const a of nodes)for(const [b,d] of distances(a))if(a!==b){reachable++;sum+=d;max=Math.max(max,d);shortestLengths[d>=7?'7+':String(d)]++;}
    const isolated=degree.filter(d=>!d.incoming&&!d.outgoing).map(d=>d.word);
    return freeze({identity:referee.identity,nodeCount:nodes.length,edgeCount:edges.length,degree,
      incomingDistribution:histogram('incoming'),outgoingDistribution:histogram('outgoing'),isolated,
      sources:degree.filter(d=>!d.incoming&&d.outgoing).map(d=>d.word),sinks:degree.filter(d=>d.incoming&&!d.outgoing).map(d=>d.word),
      outgoingHubs:[...degree].sort((a,b)=>b.outgoing-a.outgoing||order(a.word,b.word)).slice(0,12),
      incomingHubs:[...degree].sort((a,b)=>b.incoming-a.incoming||order(a.word,b.word)).slice(0,12),
      weakComponents:weak,strongComponents:strong,
      largestWeakPercent:weak.length?weak[0].length/nodes.length*100:0,largestStrongPercent:strong.length?strong[0].length/nodes.length*100:0,
      reachablePairs:reachable,possiblePairs:nodes.length*(nodes.length-1),shortestLengths,
      meanShortest:reachable?sum/reachable:0,maxShortest:max,deadEndPercent:nodes.length?degree.filter(d=>!d.outgoing).length/nodes.length*100:0});
  }
  function diversity(from:unknown,to:unknown,options:Partial<Pick<typeof ANALYSIS_POLICY,'extraShifts'|'routeCap'|'expansionCap'|'shortestCountCap'>>={}) {
    const policy={...ANALYSIS_POLICY,...options};
    for(const [k,v] of Object.entries(options))if(!Number.isSafeInteger(v)||v<(k==='extraShifts'?0:1)||v>(k==='extraShifts'?10:100000))throw new Error('invalid analysis bound');
    const a=normalizeWord(from),b=normalizeWord(to), witness=shortest(a,b);
    if(!a||!b||!witness)return null;
    const bound=witness.shifts+policy.extraShifts, reverse=distances(b,true),routes:string[][]=[];
    let expansions=0,truncated=false;
    // Simple routes only: cycles never improve final-route shift count.
    const path=[a], visited=new Set([a]);
    function walk(n:string) {
      if(++expansions>policy.expansionCap){truncated=true;return;}
      if(n===b){if(routes.length>=policy.routeCap){truncated=true;return;}routes.push([...path]);return;}
      if(path.length-1>=bound)return;
      for(const next of out.get(n)!) {
        if(visited.has(next)||(reverse.get(next)??Infinity)+path.length>bound)continue;
        path.push(next);visited.add(next);walk(next);visited.delete(next);path.pop();if(truncated)return;
      }
    }
    walk(a);
    const openings=out.get(a)!.filter(n=>{const d=distances(n,false,new Set([a])).get(b);return d!==undefined&&d+1<=bound;});
    const approaches=incoming.get(b)!.filter(n=>{const d=distances(a,false,new Set([b])).get(n);return d!==undefined&&d+1<=bound;});
    const mandatory=witness.route.slice(1,-1).filter(n=>shortest(a,b,new Set([n]))===null);
    const boundedMandatory=witness.route.slice(1,-1).filter(n=>(shortest(a,b,new Set([n]))?.shifts??Infinity)>bound);
    const frequencies=new Map<string,number>();routes.forEach(r=>r.slice(1,-1).forEach(n=>frequencies.set(n,(frequencies.get(n)??0)+1)));
    const dominant=[...frequencies].map(([word,count])=>({word,count,fraction:count/routes.length})).sort((x,y)=>y.count-x.count||order(x.word,y.word));
    let minOverlap=1,totalOverlap=0,pairs=0,bestPair:number[]=[];
    for(let i=0;i<routes.length;i++)for(let j=i+1;j<routes.length;j++) {
      const x=new Set(routes[i].slice(1,-1)),y=new Set(routes[j].slice(1,-1));
      const union=new Set([...x,...y]).size,intersection=[...x].filter(n=>y.has(n)).length,overlap=union?intersection/union:0;
      totalOverlap+=overlap;pairs++;if(overlap<minOverlap){minOverlap=overlap;bestPair=[i,j];}
    }
    const counts=Object.fromEntries(Array.from({length:policy.extraShifts+1},(_,extra)=>[extra,routes.filter(r=>r.length-1===witness.shifts+extra).length]));
    return freeze({from:a,to:b,shortest:witness,shortestRoutes:shortestCount(a,b,policy.shortestCountCap),bound,openings,approaches,
      countsByExtraShift:counts,routeCount:routes.length,truncated,expansions,mandatory,boundedMandatory,dominant,
      minInternalOverlap:minOverlap,meanInternalOverlap:pairs?totalOverlap/pairs:1,
      representativeRoutes:[witness.route,...bestPair.map(i=>routes[i])].filter((r,i,list)=>list.findIndex(x=>x.join('\0')===r.join('\0'))===i),
      policy});
  }
  function evaluate(from:unknown,to:unknown,expected:Identity=referee.identity) {
    const a=normalizeWord(from),b=normalizeWord(to),reasons:string[]=[];
    if(expected.graphVersion!==referee.identity.graphVersion||expected.checksum!==referee.identity.checksum||expected.rulesRevision!==referee.identity.rulesRevision)reasons.push('snapshot_mismatch');
    if(!a||!b||!out.has(a)||!out.has(b))reasons.push('unsupported_endpoint');
    if(a===b)reasons.push('identical_endpoints');
    if(referee.isValidShift(a,b))reasons.push('direct_connection');
    const route=shortest(a,b);if(!route)reasons.push('unreachable');
    // Skip costly diversity for endpoints that cannot be daily candidates.
    if(reasons.length)return freeze({accepted:false,reasons,metrics:null});
    const metrics=diversity(a,b)!;
    if(route!.shifts<ANALYSIS_POLICY.minShifts||route!.shifts>ANALYSIS_POLICY.maxShifts)reasons.push('outside_experimental_length_range');
    if(metrics.truncated)reasons.push('analysis_incomplete');
    if(metrics.openings.length<ANALYSIS_POLICY.minOpenings)reasons.push('insufficient_openings');
    if(metrics.approaches.length<ANALYSIS_POLICY.minApproaches)reasons.push('insufficient_approaches');
    if(metrics.mandatory.length||metrics.boundedMandatory.length)reasons.push('mandatory_bottleneck');
    if(metrics.dominant.some(n=>n.fraction>=ANALYSIS_POLICY.maxDominance))reasons.push('dominant_bottleneck');
    if(metrics.routeCount<2||metrics.minInternalOverlap>ANALYSIS_POLICY.maxBestPairOverlap)reasons.push('insufficient_strategic_diversity');
    return freeze({accepted:reasons.length===0,reasons,metrics});
  }
  return Object.freeze({identity:referee.identity,nodes:Object.freeze(nodes),shortest,shortestCount,health,diversity,evaluate});
}
