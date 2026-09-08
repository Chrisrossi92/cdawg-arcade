import { createInitialBalanceState, stepBalanceSimulation, type BalanceConfig, type BalanceInputDirection, type BalanceState } from './simulation';

export const FIXED_STEP_MS = 1000 / 60;
export const MAX_FRAME_MS = 100;
export const MAX_STEPS = 6;
const EPSILON = 1e-7;

/** Render-independent clock. Input edges use the same monotonic time as frames. */
export class SimulationClock {
  state: BalanceState;
  paused = false;
  private lastTime: number | null = null;
  private cursor = 0;
  private accumulator = 0;
  private direction: BalanceInputDirection = 'none';
  private events: { at: number; direction: BalanceInputDirection }[] = [];
  constructor(config: BalanceConfig) { this.state = createInitialBalanceState(config); }
  input(direction: BalanceInputDirection, at: number): void {
    if (!this.paused && !this.state.failed && Number.isFinite(at)) this.events.push({ at, direction });
  }
  clearInput(): void {
    this.direction = 'none'; this.events = [];
    this.state = { ...this.state, previousInput: 'none', heldInputMs: 0, releaseKick: 0 };
  }
  pause(): void {
    this.paused = true; this.lastTime = null; this.accumulator = 0; this.clearInput();
  }
  resume(): void { this.paused = false; this.lastTime = null; this.accumulator = 0; this.clearInput(); }
  frame(now: number, config: BalanceConfig): { steps: number; interrupted: boolean } {
    if (this.paused || this.state.failed) return { steps: 0, interrupted: false };
    if (!Number.isFinite(now)) { this.pause(); return { steps: 0, interrupted: true }; }
    if (this.lastTime === null) {
      this.lastTime = now; this.cursor = now;
      return { steps: 0, interrupted: false };
    }
    const delta = now - this.lastTime;
    this.lastTime = now;
    // Reject the whole exceptional frame, including any old fractional remainder.
    if (delta < 0 || delta > MAX_FRAME_MS + EPSILON) {
      this.pause(); return { steps: 0, interrupted: true };
    }
    this.accumulator += delta;
    let steps = 0;
    while (this.accumulator + EPSILON >= FIXED_STEP_MS && steps < MAX_STEPS && !this.state.failed) {
      this.cursor += FIXED_STEP_MS;
      while (this.events.length && this.events[0].at <= this.cursor + EPSILON) this.direction = this.events.shift()!.direction;
      this.state = stepBalanceSimulation(this.state, this.direction, FIXED_STEP_MS, config).state;
      this.accumulator = Math.max(0, this.accumulator - FIXED_STEP_MS);
      steps++;
    }
    return { steps, interrupted: false };
  }
}

/** Countdown is presentation time, never survival time. Restarts after an interruption. */
export class CountdownClock {
  elapsed = 0;
  private last: number | null = null;
  frame(now: number): 'counting' | 'ready' | 'interrupted' {
    if (this.last === null) { this.last = now; return 'counting'; }
    const delta = now - this.last; this.last = now;
    if (!Number.isFinite(delta) || delta < 0 || delta > MAX_FRAME_MS + EPSILON) return 'interrupted';
    this.elapsed += delta;
    return this.elapsed + EPSILON >= 2400 ? 'ready' : 'counting';
  }
  get digit(): number { return Math.max(1, 3 - Math.floor((this.elapsed + EPSILON) / 800)); }
}
