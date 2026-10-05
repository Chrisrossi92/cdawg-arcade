import {createAnalysis,freeze,type Referee} from '../analysis.js';
/** Same Slice 2 policy, complete 3–6 scan; no changed thresholds. */
export function summarize(referee:Referee) {
 const analysis=createAnalysis(referee),health=analysis.health();
 let considered=0;const failures:Record<string,number>={},mandatory=new Map<string,number>(),prevalence=new Map<string,number>();
 const passing:NonNullable<ReturnType<typeof analysis.evaluate>['metrics']>[]=[];
 for(const from of analysis.nodes)for(const to of analysis.nodes){
  const path=analysis.shortest(from,to);if(!path||path.shifts<3||path.shifts>6)continue;
  considered++;const result=analysis.evaluate(from,to);
  if(result.accepted)passing.push(result.metrics!);else result.reasons.forEach(r=>failures[r]=(failures[r]??0)+1);
  for(const n of new Set([...(result.metrics?.mandatory??[]),...(result.metrics?.boundedMandatory??[])]))mandatory.set(n,(mandatory.get(n)??0)+1);
  for(const n of result.metrics?.dominant??[])if(n.fraction>=.9)prevalence.set(n.word,(prevalence.get(n.word)??0)+1);
 }
 passing.sort((a,b)=>b.openings.length+b.approaches.length-a.openings.length-a.approaches.length||a.minInternalOverlap-b.minInternalOverlap||b.routeCount-a.routeCount||(a.from<b.from?-1:a.from>b.from?1:0)||(a.to<b.to?-1:a.to>b.to?1:0));
 const promotionCautions=['chicken house','cold work','street dog','day game'];
 const seenStarts=new Set<string>(),seenFinishes=new Set<string>(),diverse:typeof passing=[];
 for(const m of passing)if(!promotionCautions.includes(`${m.from} ${m.to}`)&&!seenStarts.has(m.from)&&!seenFinishes.has(m.to)){diverse.push(m);seenStarts.add(m.from);seenFinishes.add(m.to);if(diverse.length===10)break;}
 const hubs=(values:Map<string,number>)=>[...values].map(([word,pairs])=>({word,pairs,percent:considered?pairs/considered*100:0})).sort((a,b)=>b.pairs-a.pairs||(a.word<b.word?-1:1));
 return freeze({health,considered,passingCount:passing.length,failures,mandatoryHubs:hubs(mandatory),dominantHubs:hubs(prevalence),strongest:passing.slice(0,10),diverse,promotionCautions});
}
