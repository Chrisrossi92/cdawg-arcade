import {enrichedReferee} from '../../shared/chainshift/enrichment/graph-v2.js';
import {verifyManifest,type PuzzleManifest} from '../../shared/chainshift/manifest.js';
import type {SqlConnection} from '../database/pool.js';
import type {DailyPuzzle} from '../../shared/chainshift/competition.js';
export function validPublication(row:Record<string,any>):boolean {
 const m=row.certificate as PuzzleManifest;
 return row.publication_state==='local-candidate'&&!!m&&row.puzzle_id===m.id&&String(row.day_key).slice(0,10)===m.day&&row.start_word===m.start?.key&&row.finish_word===m.finish?.key&&row.graph_version===m.graphVersion&&row.graph_checksum===m.checksum&&row.rules_revision===m.rulesRevision&&verifyManifest(enrichedReferee,m);
}
export function safePuzzle(row:Record<string,any>):DailyPuzzle {
 return {id:row.puzzle_id,day:row.certificate.day,start:{...row.certificate.start},finish:{...row.certificate.finish},graphVersion:row.graph_version,checksum:row.graph_checksum,rulesRevision:row.rules_revision};
}
/** Administration only; runtime has no publication grants. Never marks editorial review approved. */
export async function publishLocalCandidate(c:SqlConnection,manifest:PuzzleManifest){
 if(!verifyManifest(enrichedReferee,manifest))throw new Error('invalid publication certificate');
 await c.query(`INSERT INTO arcade.chainshift_puzzles(puzzle_id,day_key,start_word,finish_word,graph_version,graph_checksum,rules_revision,publication_state,certificate)
 VALUES($1,$2,$3,$4,$5,$6,$7,'local-candidate',$8)`,[manifest.id,manifest.day,manifest.start.key,manifest.finish.key,manifest.graphVersion,manifest.checksum,manifest.rulesRevision,JSON.stringify(manifest)]);
}
