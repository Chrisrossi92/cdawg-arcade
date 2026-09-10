import {DatabaseError,type Database,type SqlConnection} from '../database/pool.js';
// A known rollback may retry. An uncertain connection/commit failure must not.
export async function retryTransaction<T>(db:Database,work:(c:SqlConnection)=>Promise<T>):Promise<T> {
  for(let attempt=0;;attempt++) {
    try {return await db.transaction(work);}
    catch(error) {
      if (!(error instanceof DatabaseError) || error.code!=='transaction_retry' || attempt>=2) throw error;
      await new Promise(resolve=>setTimeout(resolve,5*(attempt+1)));
    }
  }
}
export class ResultAbort extends DatabaseError {
  constructor(readonly reason:'expired_session'|'aggregate_mismatch') {super('cancelled');}
}
