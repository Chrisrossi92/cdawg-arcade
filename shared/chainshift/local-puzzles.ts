import {seedReferee} from './seed.js';
import {createManifest} from './manifest.js';
/** Fixed local review dates, not a production daily catalog or editorial publication. */
export const PLAYTEST_PAIRS = Object.freeze([
  ['game','house'], ['game','work'], ['book','room'], ['blue','point'], ['card','work'],
  ['play','point'], ['power','house'], ['cold','work'], ['board','food'], ['home','room'],
].map(pair=>Object.freeze(pair)));
export const localPuzzles = Object.freeze(PLAYTEST_PAIRS.map(([start,finish],i)=>createManifest(seedReferee,{
  id:`chainshift-local-${String(i+1).padStart(3,'0')}`,number:i+1,day:`2026-10-${String(i+5).padStart(2,'0')}`,
  start,finish,generatedAt:'2026-10-04T00:00:00.000Z',
})));
