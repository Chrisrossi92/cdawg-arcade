import data from './LOCAL_PUZZLES_V2.json' with {type:'json'};
import {freeze} from '../analysis.js';
import {verifyManifest,type PuzzleManifest} from '../manifest.js';
import {enrichedReferee} from './graph-v2.js';
/** Separate, verified local-review catalog. Historical graph-v1 fixtures are untouched. */
export const localPuzzlesV2:readonly PuzzleManifest[]=Object.freeze(data.map(value=>{
 const manifest=value as PuzzleManifest;
 if(!verifyManifest(enrichedReferee,manifest))throw new Error('stale enriched manifest');
 return freeze(manifest);
}));
