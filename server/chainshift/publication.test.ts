import {it,expect} from 'vitest';
import {localPuzzlesV2} from '../../shared/chainshift/enrichment/local-puzzles-v2';
import {safePuzzle,validPublication} from './publication';
const m=localPuzzlesV2[0];
const row={puzzle_id:m.id,day_key:m.day,start_word:m.start.key,finish_word:m.finish.key,graph_version:m.graphVersion,graph_checksum:m.checksum,rules_revision:m.rulesRevision,publication_state:'local-candidate',certificate:m};
it('accepts only the immutable validated pinned local-candidate publication',()=>expect(validPublication(row)).toBe(true));
it.each(['graph_version','graph_checksum','rules_revision','puzzle_id','day_key','start_word','finish_word','publication_state'])('fails closed when %s differs',key=>expect(validPublication({...row,[key]:'mismatch'})).toBe(false));
it('rejects a solution certificate or editorial state that differs from validated generation',()=>{expect(validPublication({...row,certificate:{...m,shortestCertificate:{shifts:1,route:['ice','room']}}})).toBe(false);expect(validPublication({...row,certificate:{...m,editorialApproval:'approved'}})).toBe(false);expect(validPublication({...row,certificate:null})).toBe(false);});
it('returns only endpoints and pinned identities, never generation/solution artifacts',()=>{const p=safePuzzle(row);expect(Object.keys(p).sort()).toEqual(['checksum','day','finish','graphVersion','id','rulesRevision','start']);expect(JSON.stringify(p)).not.toMatch(/cold|war|certificate|solution|minimum|diversity|review/);});
