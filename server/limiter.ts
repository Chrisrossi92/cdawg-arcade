import { isIP } from 'node:net';

export interface LimitOptions { limit: number; windowMs: number; maxEntries: number; cleanupBudget: number }
// Expiration order equals insertion order: windows never slide on a hit.
export class BoundedLimiter {
  private readonly entries = new Map<string, { count: number; expires: number }>();
  constructor(private readonly options: LimitOptions = { limit: 300, windowMs: 60_000, maxEntries: 2048, cleanupBudget: 32 }) {}
  get size() { return this.entries.size; }
  allow(address: string | undefined, now = Date.now()): boolean {
    this.sweep(now);
    const key = address && address.length <= 64 && isIP(address) ? address : 'unknown';
    let entry = this.entries.get(key);
    if (entry && entry.expires <= now) { this.entries.delete(key); entry = undefined; }
    if (!entry) {
      if (this.entries.size >= this.options.maxEntries) return false;
      entry = { count: 0, expires: now + this.options.windowMs };
      this.entries.set(key, entry);
    }
    if (entry.count >= this.options.limit) return false;
    entry.count++;
    return true;
  }
  sweep(now = Date.now()) {
    let checked = 0;
    for (const [key, entry] of this.entries) {
      if (checked++ >= this.options.cleanupBudget || entry.expires > now) break;
      this.entries.delete(key);
    }
  }
}
