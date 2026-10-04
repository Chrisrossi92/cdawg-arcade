export const DAILY_TIME_ZONE = 'America/New_York';
/** Epoch input is injected; no wall-clock reads or fixed EST/EDT offsets. */
export function dayKey(epochMs: number): string {
  if (!Number.isFinite(epochMs)) throw new Error('invalid instant');
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:DAILY_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(epochMs));
  const get=(type:string)=>parts.find(p=>p.type===type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function createDailyClock(now:()=>number) { return Object.freeze({dayKey:()=>dayKey(now())}); }
// Later runs retain the starting manifest/day identity; rollover does not reassign runs.
