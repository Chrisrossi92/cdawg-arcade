import {useRef,useEffect} from 'react';
import {archivedRuns,compareScores,localRuns,type PracticeRun,type PracticeSnapshot} from './practice';
import {formatTime,type LocalPuzzle} from './state';
export function LocalBest({snapshot,puzzle}:{snapshot:PracticeSnapshot;puzzle:LocalPuzzle}){
 const runs=localRuns(snapshot,puzzle);const best=runs[0];
 return best?<p className="local-best-summary"><span>LOCAL BEST</span><strong>{best.shifts} shifts · {formatTime(best.elapsedMs,3)}</strong><small>{runs.length} local practice {runs.length===1?'completion':'completions'} on this browser</small></p>:null;
}
function Route({run}:{run:PracticeRun}){return <ol role="list" className="comparison-route" aria-label="Saved local route">{run.route.map((word,index)=><li role="listitem" key={`${index}-${word}`}><span>{word.toUpperCase()}</span></li>)}</ol>;}
function completionDate(run:PracticeRun){return new Date(run.completedAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}
export function LocalResults({snapshot,puzzle,onClose}:{snapshot:PracticeSnapshot;puzzle:LocalPuzzle;onClose:()=>void}){
 const runs=localRuns(snapshot,puzzle);const archive=archivedRuns(snapshot,puzzle);const title=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{title.current?.focus();},[]);
 return <section className="local-results" aria-labelledby="local-results-title">
  <div className="local-results-heading"><div><p className="eyebrow">THIS BROWSER · PRACTICE ONLY</p><h2 id="local-results-title" ref={title} tabIndex={-1}>LOCAL RESULTS</h2></div><button className="quiet" onClick={onClose}>Close local results</button></div>
  <p className="comparison-rule">Fewest shifts first. Elapsed time breaks ties. Times below show milliseconds. Exact ties share the local best; older completions appear first.</p>
  {runs.length>0?<ol role="list" className="practice-runs" aria-label="Local completions sorted by shifts then time">{runs.map((run,index)=><li role="listitem" key={run.id}>
   <details><summary><span className="practice-score"><strong>{run.shifts} shifts</strong><span>{formatTime(run.elapsedMs,3)}</span></span><span className="run-detail"><small>{compareScores(run,runs[0])===0?'LOCAL BEST':`LOCAL RUN ${index+1}`}</small><time dateTime={new Date(run.completedAt).toISOString()}>{completionDate(run)}</time></span><span className="route-disclosure">View route <span aria-hidden="true">⌄</span></span></summary>
    <Route run={run}/><p className="run-identity">{run.graphVersion} · {run.rulesRevision}<br/>{run.checksum} · Local practice</p>
   </details>
  </li>)}</ol>:<p className="empty-results">No compatible saved completions for this puzzle yet.</p>}
  {archive.length>0&&<details className="archived-results"><summary>{archive.length} archived local {archive.length===1?'result':'results'} · other graph/rules</summary><p>These results keep their original identity and are excluded from the comparison above. Their routes are not checked against the current graph.</p>{archive.map(run=><article key={run.id}><strong>{run.shifts} shifts · {formatTime(run.elapsedMs,3)}</strong><Route run={run}/><p className="run-identity">{run.graphVersion} · {run.rulesRevision}<br/>{run.checksum} · Local practice</p></article>)}</details>}
  <p className="history-policy">Up to 50 completions per puzzle and graph, 500 total: local best plus recent runs. Browser storage can be edited or cleared; these are not verified scores.</p>
 </section>;
}
