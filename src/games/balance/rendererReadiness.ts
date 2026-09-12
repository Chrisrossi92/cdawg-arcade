export const PREPARATION_TIMEOUT_MS = 15_000;
export const MAX_PREPARATION_TRIES = 3;
/** Attempt-scoped latch: duplicated or obsolete renderer callbacks cannot start a run. */
export class RendererReadiness {
  status: 'idle' | 'preparing' | 'ready' | 'error' = 'idle';
  private generation = 0;
  private deadline = 0;
  tries = 0;
  begin(now: number): number | null {
    if (this.status === 'preparing' || this.status === 'ready' || this.tries >= MAX_PREPARATION_TRIES) return null;
    this.tries++; this.status = 'preparing'; this.deadline = now + PREPARATION_TIMEOUT_MS;
    return ++this.generation;
  }
  current(id: number): boolean { return id === this.generation && this.status !== 'idle' && this.status !== 'error'; }
  ready(id: number, now: number): boolean {
    if (!this.current(id) || this.status !== 'preparing') return false;
    if (now >= this.deadline) { this.status = 'error'; return false; }
    this.status = 'ready'; return true;
  }
  fail(id: number): boolean {
    if (!this.current(id)) return false;
    this.status = 'error'; return true;
  }
  cancel(): void { this.generation++; this.status = 'idle'; this.tries = 0; }
}
/** Observe completed renders, including the interval after the first texture draw.
 * Preparation stalls reset warm-up only; they never touch the simulation clock. */
export class RenderWarmup {
  private last: number | null = null;
  private stable = 0;
  frame(now: number, drawable: boolean): boolean {
    if (!drawable || !Number.isFinite(now)) { this.last = null; this.stable = 0; return false; }
    const delta = this.last === null ? Infinity : now - this.last;
    this.last = now;
    this.stable = delta >= 0 && delta <= 100 ? this.stable + 1 : 0;
    return this.stable >= 2;
  }
}
