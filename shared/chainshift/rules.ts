/** Pure, browser/server compatible rules. No implicit aliases or morphology. */
export const RULES = Object.freeze({
  revision: 'chainshift-rules-v1', language: 'en-US', contentCeiling: 'PG-13',
  wordPattern: '^[a-z]+$', score: 'completed-final-route-edges',
  backtrackedEdgesCount: false, explorationCost: 'elapsed-time',
} as const);
export const CATEGORIES = ['compound', 'household', 'work-school', 'food', 'sports',
  'entertainment', 'technology', 'gaming', 'travel', 'time-weather', 'slang', 'culture'] as const;
export type Category = typeof CATEGORIES[number];
export interface Edge {
  readonly from: string; readonly to: string;
  readonly fromDisplay: string; readonly toDisplay: string; readonly phrase: string;
  readonly category: Category; readonly rating: 'G' | 'PG' | 'PG-13';
  readonly approval: 'approved' | 'pending' | 'rejected'; readonly enabled: boolean;
  readonly editorialSource: string;
}
export interface Corpus { readonly version: string; readonly rulesRevision: string; readonly edges: readonly Edge[]; }
export function normalizeWord(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  return /^[A-Za-z]+$/.test(trimmed) ? trimmed.toLowerCase() : null;
}
/** Structural checks do not establish commonness or content safety: editorial review does. */
export function validateCorpus(corpus: Corpus): readonly string[] {
  const errors: string[] = [], seen = new Set<string>();
  if (!/^chainshift-graph-v[1-9][0-9]*$/.test(corpus.version)) errors.push('invalid graph version');
  if (corpus.rulesRevision !== RULES.revision) errors.push('unsupported rules revision');
  if (!corpus.edges.length) errors.push('empty corpus');
  for (const [i, e] of corpus.edges.entries()) {
    const fail = (s: string) => errors.push(`edge ${i}: ${s}`);
    if (!e.from || normalizeWord(e.from) !== e.from || !e.to || normalizeWord(e.to) !== e.to) fail('noncanonical keys');
    if (normalizeWord(e.fromDisplay) !== e.from || normalizeWord(e.toDisplay) !== e.to) fail('display mismatch');
    if (e.from === e.to) fail('self edge forbidden');
    const key = `${e.from}\0${e.to}`;
    if (seen.has(key)) fail('duplicate directed edge'); seen.add(key);
    if (!(CATEGORIES as readonly string[]).includes(e.category)) fail('invalid category');
    if (!['G', 'PG', 'PG-13'].includes(e.rating)) fail('invalid content rating');
    if (!['approved', 'pending', 'rejected'].includes(e.approval)) fail('invalid approval');
    if (typeof e.enabled !== 'boolean') fail('missing enabled state');
    if (typeof e.editorialSource !== 'string' || !e.editorialSource.trim()) fail('missing editorial source');
    // Allows joined compounds (bluefish) and direct pairs, never missing filler words.
    const label = typeof e.phrase === 'string' ? e.phrase.toLowerCase() : '';
    if (label !== `${e.from} ${e.to}` && label !== `${e.from}${e.to}`) fail('phrase is not a direct pair or compound');
  }
  return Object.freeze(errors);
}
export function canonicalCorpus(corpus: Corpus): string {
  const edges = [...corpus.edges].sort((a,b) => a.from < b.from ? -1 : a.from > b.from ? 1 : a.to < b.to ? -1 : a.to > b.to ? 1 : 0);
  return JSON.stringify([corpus.version, corpus.rulesRevision, edges.map(e => [e.from,e.to,e.fromDisplay,e.toDisplay,e.phrase,e.category,e.rating,e.approval,e.enabled,e.editorialSource])]);
}
/** FNV-1a 64-bit checksum, not a cryptographic security commitment. UTF-16 code units,
 * explicitly serialized metadata and code-point ordering make it runtime independent. */
export function graphChecksum(corpus: Corpus): string {
  let hash = 0xcbf29ce484222325n;
  const text = canonicalCorpus(corpus);
  for (let i = 0; i < text.length; i++) hash = BigInt.asUintN(64, (hash ^ BigInt(text.charCodeAt(i))) * 0x100000001b3n);
  return `fnv1a64:${hash.toString(16).padStart(16,'0')}`;
}
export function createReferee(corpus: Corpus) {
  const errors = validateCorpus(corpus);
  if (errors.length) throw new Error(errors.join('\n'));
  const edges = Object.freeze(corpus.edges.map(e => Object.freeze({...e})));
  const snapshot = Object.freeze({...corpus, edges});
  const active = edges.filter(e => e.approval === 'approved' && e.enabled);
  const sorted = [...active].sort((a,b) => a.from < b.from ? -1 : a.from > b.from ? 1 : a.to < b.to ? -1 : a.to > b.to ? 1 : 0);
  const index = new Map(sorted.map(e => [`${e.from}\0${e.to}`,e]));
  const lookupEdge = (from: unknown, to: unknown): Readonly<Edge> | null => {
    const a = normalizeWord(from), b = normalizeWord(to);
    return a && b ? index.get(`${a}\0${b}`) ?? null : null;
  };
  const adjacent = (word: unknown, direction: 'from'|'to') => {
    const key = normalizeWord(word);
    return Object.freeze(sorted.filter(e => e[direction] === key));
  };
  return Object.freeze({ snapshot,
    identity: Object.freeze({graphVersion: snapshot.version, rulesRevision: snapshot.rulesRevision, checksum: graphChecksum(snapshot)}),
    lookupEdge, isValidShift: (from: unknown,to: unknown) => lookupEdge(from,to) !== null,
    outgoing: (word: unknown) => adjacent(word,'from'), incoming: (word: unknown) => adjacent(word,'to'),
  });
}
