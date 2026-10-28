import {it,expect} from 'vitest';
import {authoredCatalog,authoredCatalogApproved,verifyPrivatePack} from './catalog';
it('keeps local demo fixtures unapproved and rejects substituted or malformed publication packs',()=>{
 expect(authoredCatalogApproved).toBe(false);
 expect(()=>verifyPrivatePack({rules:'chainshift-authored-v1',puzzles:authoredCatalog})).toThrow();
 expect(()=>verifyPrivatePack({rules:'chainshift-authored-v2',puzzles:authoredCatalog})).toThrow();
 const bad=structuredClone(authoredCatalog);bad[0].words[1]='INCORRECT';
 expect(()=>verifyPrivatePack({rules:'chainshift-authored-v2',puzzles:bad})).toThrow();
});
