/** Cosmetic only. Owns no clock, input, score, session or simulation state. */
export type Mood = 'idle' | 'lean' | 'wobble' | 'panic';
export type MotionInput = Readonly<{balance: number; finished: boolean; failed: boolean}>;
export type FrameWeight = {name: string; weight: number};
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const smooth = (n: number) => {const t = clamp(n, 0, 1); return t * t * (3 - 2 * t)};
export const BALANCE_SAMPLES = Array.from({length: 49}, (_, i) => i).filter(i => i % 2 === 0 || [3, 5, 43, 45].includes(i));
export const LOSS_MS = 380; // Existing result callback time; never feeds the simulation.
export class MascotMotion {
  lean = 0;
  velocity = 0;
  phase = 0;
  mood: Mood = 'idle';
  finished = false;
  failed = false;
  elapsed = 0;
  side = 1;
  private rate = .7;
  private held: FrameWeight[] = [];
  private candidate: Mood = 'idle';
  private dwell = 0;
  private readonly startAtResult: boolean;
  constructor(result?: {side: number; failed: boolean}) {
    this.startAtResult = !!result;
    if (result) {this.finished = true; this.failed = result.failed; this.side = result.side < 0 ? -1 : 1; this.elapsed = LOSS_MS}
  }
  advance(input: MotionInput, milliseconds: number, reduced = false): FrameWeight[] {
    const dt = clamp(Number.isFinite(milliseconds) ? milliseconds : 0, 0, 50) / 1000;
    if (!this.finished && input.finished) {
      this.held = this.grid(); this.finished = true; this.failed = input.failed;
      this.side = input.balance < 0 ? -1 : 1; this.elapsed = 0;
    }
    if (this.finished) {
      this.elapsed += clamp(Number.isFinite(milliseconds) ? milliseconds : 0, 0, 1000);
      if (reduced) return [{name: this.failed ? `recover-${this.side}-30` : 'result-00', weight: 1}];
      if (!this.failed) {
        if (this.elapsed < 140 && this.held.length) {
          const w = smooth(this.elapsed / 140);
          return [...this.held.map(f => ({...f, weight: f.weight * (1 - w)})), {name: 'result-00', weight: w}];
        }
        return this.sequence('result', Math.min(24, Math.max(0, this.elapsed - 140) / 800 * 24), 25);
      }
      if (this.elapsed < 60 && !this.startAtResult) {
        const w = smooth(this.elapsed / 60);
        return [...this.held.map(f => ({...f, weight: f.weight * (1 - w)})), {name: `fall-${this.side}-00`, weight: w}];
      }
      if (this.elapsed <= LOSS_MS && !this.startAtResult) return this.sequence(`fall-${this.side}`, (this.elapsed - 60) / (LOSS_MS - 60) * 30, 31);
      const recovery = (this.elapsed - LOSS_MS - 100) / 800;
      if (recovery < 1) return this.sequence(`recover-${this.side}`, clamp(recovery, 0, 1) * 30, 31);
      return this.sequence('result', Math.min(24, (recovery - 1) * 24), 25);
    }
    const target = clamp(Number.isFinite(input.balance) ? input.balance : 0, -1, 1);
    const a = Math.abs(target);
    let desired: Mood = a < .07 || (this.mood === 'idle' && a < .14) ? 'idle' : 'lean';
    if (a >= .86) desired = 'panic';
    else if (this.mood === 'panic' && a >= .74) desired = 'panic';
    else if (a >= .60) desired = 'wobble';
    else if (this.mood === 'wobble' && a >= .48) desired = 'wobble';
    else if (a >= .14) desired = 'lean';
    else if (a < .07) desired = 'idle';
    if (desired !== this.candidate) {this.candidate = desired; this.dwell = 0}
    this.dwell += dt;
    if (this.dwell >= .08) this.mood = desired;
    // Exact critically damped spring step. Reversal preserves velocity and phase.
    const omega = reduced ? 12 : 24, displacement = this.lean - target;
    const c = this.velocity + omega * displacement, e = Math.exp(-omega * dt);
    this.lean = clamp(target + (displacement + c * dt) * e, -1, 1);
    this.velocity = (this.velocity - omega * c * dt) * e;
    const targetRate = {idle: .7, lean: .9, wobble: 1.5, panic: 2.1}[this.mood];
    this.rate += (targetRate - this.rate) * (1 - Math.exp(-8 * dt));
    if (!reduced) this.phase = (this.phase + dt * this.rate) % 1;
    return this.grid(reduced);
  }
  private sequence(prefix: string, value: number, count: number): FrameWeight[] {
    const x = clamp(value, 0, count - 1), lo = Math.floor(x), hi = Math.min(count - 1, lo + 1);
    return [{name: `${prefix}-${String(lo).padStart(2, '0')}`, weight: 1 - (x - lo)}, {name: `${prefix}-${String(hi).padStart(2, '0')}`, weight: x - lo}];
  }
  private grid(reduced = false): FrameWeight[] {
    const position = (this.lean + 1) * 24;
    let hi = BALANCE_SAMPLES.findIndex(x => x >= position);
    if (hi < 0) hi = BALANCE_SAMPLES.length - 1;
    const lo = Math.max(0, hi - 1);
    const fraction = hi === lo ? 0 : (position - BALANCE_SAMPLES[lo]) / (BALANCE_SAMPLES[hi] - BALANCE_SAMPLES[lo]);
    const p = reduced ? 0 : this.phase * 4, phase = Math.floor(p), next = (phase + 1) % 4;
    return [
      {name: `balance-${phase}-${String(lo).padStart(2, '0')}`, weight: (1 - fraction) * (1 - (p - phase))},
      {name: `balance-${phase}-${String(hi).padStart(2, '0')}`, weight: fraction * (1 - (p - phase))},
      {name: `balance-${next}-${String(lo).padStart(2, '0')}`, weight: (1 - fraction) * (p - phase)},
      {name: `balance-${next}-${String(hi).padStart(2, '0')}`, weight: fraction * (p - phase)},
    ];
  }
}
