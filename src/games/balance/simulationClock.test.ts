import { describe, expect, it } from 'vitest';
import { balanceConfig } from './config';
import { CountdownClock, FIXED_STEP_MS, MAX_STEPS, SimulationClock } from './simulationClock';
import { calculateScoreSeconds, type BalanceConfig } from './simulation';
import { HeldControls, observeInterruptions } from './interruption';

const rates = [30, 60, 90, 120, 144];
const script = [
  { at: 80, direction: 'left' as const }, { at: 170, direction: 'right' as const },
  { at: 260, direction: 'none' as const }, { at: 380, direction: 'left' as const },
  { at: 490, direction: 'right' as const }, { at: 650, direction: 'none' as const },
];
function run(hz: number, scripted = false) {
  const clock = new SimulationClock(balanceConfig); clock.frame(0, balanceConfig);
  if (scripted) for (const edge of script) clock.input(edge.direction, edge.at);
  for (let frame = 1; !clock.state.failed && frame < hz * 10; frame++) clock.frame(frame * 1000 / hz, balanceConfig);
  return clock.state;
}
// A centered, disturbance-free fixture isolates the actual phase clock past 45s.
const phaseConfig: BalanceConfig = { ...balanceConfig, startingTilt: 0, startingVelocity: 0,
  disturbanceBase: 0, disturbanceGrowth: 0, directionalPressureBase: 0, directionalPressureGrowth: 0 };
function transitions(hz: number) {
  const clock = new SimulationClock(phaseConfig); clock.frame(0, phaseConfig);
  const seen: Record<string, number> = { Warmup: 0 };
  for (let frame = 1; frame <= hz * 46; frame++) {
    clock.frame(frame * 1000 / hz, phaseConfig);
    seen[clock.state.tuningPhase] ??= clock.state.survivalMs;
  }
  return seen;
}

describe('render-independent simulation', () => {
  it.each(rates)('%i Hz matches the complete 60 Hz no-input and scripted outcomes', hz => {
    for (const scripted of [false, true]) {
      const result = run(hz, scripted), reference = run(60, scripted);
      expect(result.failed).toBe(true);
      expect(Math.abs(result.survivalMs - reference.survivalMs)).toBeLessThan(1e-7);
      expect(result).toEqual(reference);
      expect(calculateScoreSeconds(result.survivalMs)).toBe(calculateScoreSeconds(reference.survivalMs));
    }
  });
  it.each(rates)('%i Hz crosses difficulty bands within one fixed tick', hz => {
    const times = transitions(hz);
    for (const [phase, expected] of [['Active',12000], ['Intense',20000], ['Critical',45000]] as const) {
      expect(times[phase]).toBeGreaterThanOrEqual(expected - 1e-7);
      expect(times[phase] - expected).toBeLessThanOrEqual(FIXED_STEP_MS + 1e-7);
    }
    // Observation can lag by a render frame; transition in simulation is exact.
    expect(times.Critical).toBeCloseTo(45000, 6);
  });
  it('rejects a 5000 ms frame, clearing input and awarding no survival', () => {
    const c = new SimulationClock(balanceConfig); c.frame(0,balanceConfig); c.input('left',0);
    c.frame(16.667,balanceConfig); const before = c.state.survivalMs;
    expect(c.frame(5016.667,balanceConfig)).toEqual({steps:0,interrupted:true});
    expect(c.state.survivalMs).toBe(before); expect(c.paused).toBe(true);
    expect(c.state.previousInput).toBe('none'); expect(c.state.heldInputMs).toBe(0);
  });
  it('bounds catch-up and excludes rejected time and fractional leftovers', () => {
    const c = new SimulationClock(phaseConfig); c.frame(0,phaseConfig);
    expect(c.frame(100,phaseConfig).steps).toBe(MAX_STEPS);
    expect(c.state.survivalMs).toBeCloseTo(100,8);
    c.frame(108,phaseConfig); c.frame(1000,phaseConfig);
    expect(c.state.survivalMs).toBeCloseTo(100,8);
    c.resume(); c.frame(9000,phaseConfig); c.frame(9008,phaseConfig);
    expect(c.state.survivalMs).toBeCloseTo(100,8);
  });
  it('hidden time and repeated resume cycles cannot add drift or stale held input', () => {
    const c = new SimulationClock(phaseConfig); let now = 0;
    for (let cycle=0;cycle<100;cycle++) {
      c.resume(); c.frame(now,phaseConfig); c.frame(now+100,phaseConfig);
      c.input('left',now+101); c.pause(); c.pause();
      now += 5000; c.frame(now,phaseConfig);
      expect(c.state.previousInput).toBe('none'); expect(c.state.heldInputMs).toBe(0);
      expect(c.state.survivalMs).toBeCloseTo((cycle+1)*100,7);
    }
    expect(c.state.tilt).toBe(0);
  });
  it('final failure freezes score and replay gets a fresh clock', () => {
    const c = new SimulationClock(balanceConfig); c.frame(0,balanceConfig);
    for(let t=FIXED_STEP_MS;t<2000;t+=FIXED_STEP_MS)c.frame(t,balanceConfig);
    const result = c.state; expect(result.failed).toBe(true);
    c.input('left',2000); c.frame(7000,balanceConfig); expect(c.state).toBe(result);
    const replay = new SimulationClock(balanceConfig); replay.frame(7000,balanceConfig);
    expect(replay.state.survivalMs).toBe(0); expect(replay.state.previousInput).toBe('none');
    expect(replay.state.failed).toBe(false);
  });
  it('countdown consumes 2400 ms independently of survival and rejects stalls', () => {
    for (const hz of rates) {
      const countdown = new CountdownClock(), c = new SimulationClock(balanceConfig);
      countdown.frame(0); let result = 'counting'; let f=0;
      while(result==='counting')result=countdown.frame(++f*1000/hz);
      expect(result).toBe('ready'); expect(Math.abs(f*1000/hz-2400)).toBeLessThanOrEqual(1000/hz+1e-7);
      expect(c.state.survivalMs).toBe(0);
    }
    const countdown = new CountdownClock(); countdown.frame(0);
    expect(countdown.frame(5000)).toBe('interrupted'); expect(countdown.elapsed).toBe(0);
  });
  it('preserves the calibrated 60 Hz reference outcomes', () => {
    expect(run(60).survivalMs).toBe(700);
    expect(run(60,true).survivalMs).toBe(1050);
  });
  it('jitter and incremental input delivery preserve the same scripted result', () => {
    const c = new SimulationClock(balanceConfig); c.frame(0,balanceConfig);
    let now=0, edge=0, frame=0;
    const deltas=[7,33,19,80,11,50];
    while(!c.state.failed && now<10000) {
      now += deltas[frame++ % deltas.length];
      while(edge<script.length && script[edge].at<=now) {
        c.input(script[edge].direction,script[edge].at); edge++;
      }
      expect(c.frame(now,balanceConfig).steps).toBeLessThanOrEqual(MAX_STEPS);
    }
    expect(c.state).toEqual(run(60,true));
  });
  it('substep frames accumulate without awarding fractional score time', () => {
    const c=new SimulationClock(phaseConfig); c.frame(0,phaseConfig);
    c.frame(5,phaseConfig); c.frame(10,phaseConfig); c.frame(15,phaseConfig);
    expect(c.state.survivalMs).toBe(0);
    c.frame(20,phaseConfig); expect(c.state.survivalMs).toBe(FIXED_STEP_MS);
  });

});

describe('interruption and input lifecycle', () => {
  it('latest opposing press wins; repeat does not steal priority; releasing restores held control', () => {
    const keys = new HeldControls(); keys.press('key:ArrowLeft','left'); keys.press('pointer:2','right');
    keys.press('key:ArrowLeft','left'); expect(keys.direction).toBe('right');
    keys.release('pointer:2'); expect(keys.direction).toBe('left');
    keys.release('key:ArrowLeft'); expect(keys.direction).toBe('none');
  });
  it('visibility, blur and pointer cancellation clear real held state; cleanup prevents duplicate listeners', () => {
    const win = new EventTarget(), doc = Object.assign(new EventTarget(),{hidden:false});
    const keys = new HeldControls(); let pauses=0;
    const clock = new SimulationClock(balanceConfig);
    const clear=()=>{keys.clear();clock.clearInput();};
    const pause=()=>{pauses++;clear();clock.pause();};
    for(let mount=0;mount<3;mount++) {
      const stop=observeInterruptions(win,doc,pause,clear);
      keys.press('pointer:1','left'); win.dispatchEvent(new Event('pointercancel')); expect(keys.direction).toBe('none');
      keys.press('key:KeyD','right'); win.dispatchEvent(new Event('blur')); expect(keys.direction).toBe('none');
      keys.press('key:KeyA','left'); doc.hidden=true; doc.dispatchEvent(new Event('visibilitychange')); expect(keys.direction).toBe('none');
      doc.hidden=false; doc.dispatchEvent(new Event('visibilitychange')); expect(clock.paused).toBe(true);
      stop(); win.dispatchEvent(new Event('blur'));
    }
    expect(pauses).toBe(6);
  });
});
