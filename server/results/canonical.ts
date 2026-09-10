// Invalid but bounded JSON gets a durable digest, never raw diagnostic storage.
// Excessive nesting/size is transport abuse and does not create a terminal row.
export function canonicalInvalid(value:unknown):string | null {
  let nodes=0;
  function visit(v:unknown,depth:number):string {
    if (++nodes>16000 || depth>16) throw Error();
    if (v===null || typeof v==='boolean' || typeof v==='string') return JSON.stringify(v);
    if (typeof v==='number' && Number.isFinite(v)) return JSON.stringify(v);
    if (Array.isArray(v)) return '['+v.map(x=>visit(x,depth+1)).join(',')+']';
    if (typeof v==='object' && v) return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+visit((v as Record<string,unknown>)[k],depth+1)).join(',')+'}';
    throw Error();
  }
  try {const text=visit(value,0);return Buffer.byteLength(text)<=65536?text:null;}catch{return null;}
}
