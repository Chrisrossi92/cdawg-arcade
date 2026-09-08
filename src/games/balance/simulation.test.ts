import { describe, expect, it } from 'vitest';
import { balanceConfig } from './config';
import {
  calculateBoundedDisturbance,
  calculateDifficulty,
  calculateScoreSeconds,
  createInitialBalanceState,
  getBalanceTuningPhase,
  getMilestoneForScore,
  stepBalanceSimulation,
  type BalanceState,
} from './simulation';

describe('balance simulation', () => {
  it('left and right input affect balance in opposite directions', () => {
    const state = createInitialBalanceState(balanceConfig);
    const left = stepBalanceSimulation(state, 'left', 100, balanceConfig).state;
    const right = stepBalanceSimulation(state, 'right', 100, balanceConfig).state;

    expect(left.angularVelocity).toBeLessThan(right.angularVelocity);
    expect(left.tilt).toBeLessThan(right.tilt);
  });

  it('instability increases without corrective input', () => {
    let state = { ...createInitialBalanceState(balanceConfig), tilt: 14, angularVelocity: 0 };
    const initialTilt = Math.abs(state.tilt);
    for (let i = 0; i < 20; i += 1) {
      state = stepBalanceSimulation(state, 'none', 100, balanceConfig).state;
    }

    expect(Math.abs(state.tilt)).toBeGreaterThan(initialTilt);
  });

  it('difficulty increases over time', () => {
    expect(calculateDifficulty(30_000, balanceConfig)).toBeGreaterThan(calculateDifficulty(1_000, balanceConfig));
  });

  it('smooth difficulty growth keeps the first five seconds forgiving', () => {
    expect(calculateDifficulty(1_000, balanceConfig)).toBe(1);
    expect(calculateDifficulty(5_000, balanceConfig)).toBe(1);
    expect(calculateDifficulty(10_000, balanceConfig)).toBeLessThan(1.45);
    expect(calculateDifficulty(20_000, balanceConfig)).toBeGreaterThan(calculateDifficulty(12_000, balanceConfig));
    expect(calculateDifficulty(30_000, balanceConfig)).toBeGreaterThan(calculateDifficulty(20_000, balanceConfig));
    expect(calculateDifficulty(30_000, balanceConfig)).toBeGreaterThan(3);
    expect(calculateDifficulty(45_000, balanceConfig)).toBeGreaterThan(calculateDifficulty(30_000, balanceConfig));
  });

  it('phase transitions match the internal tuning bands', () => {
    expect(getBalanceTuningPhase(4_000, balanceConfig)).toBe('Warmup');
    expect(getBalanceTuningPhase(11_900, balanceConfig)).toBe('Warmup');
    expect(getBalanceTuningPhase(12_000, balanceConfig)).toBe('Active');
    expect(getBalanceTuningPhase(20_000, balanceConfig)).toBe('Intense');
    expect(getBalanceTuningPhase(45_000, balanceConfig)).toBe('Critical');
  });

  it('disturbance strength remains bounded', () => {
    for (let ms = 0; ms <= 90_000; ms += 250) {
      const disturbance = calculateBoundedDisturbance(ms, calculateDifficulty(ms, balanceConfig), balanceConfig);
      expect(Math.abs(disturbance)).toBeLessThanOrEqual(balanceConfig.disturbanceLimit);
    }
  });

  it('prolonged held input loses correction strength', () => {
    const base: BalanceState = {
      ...createInitialBalanceState(balanceConfig),
      tilt: 12,
      angularVelocity: 0.5,
      survivalMs: 18_000,
      difficultyMultiplier: calculateDifficulty(18_000, balanceConfig),
    };
    const fresh = stepBalanceSimulation({ ...base, previousInput: 'none', heldInputMs: 0 }, 'left', 100, balanceConfig).state;
    const fatigued = stepBalanceSimulation({ ...base, previousInput: 'left', heldInputMs: 2_200 }, 'left', 100, balanceConfig).state;

    expect(fatigued.angularVelocity).toBeGreaterThan(fresh.angularVelocity);
  });

  it('high-difficulty input still has a meaningful effect', () => {
    const base: BalanceState = {
      ...createInitialBalanceState(balanceConfig),
      tilt: 16,
      angularVelocity: 1.1,
      survivalMs: 48_000,
      difficultyMultiplier: calculateDifficulty(48_000, balanceConfig),
      tuningPhase: 'Critical',
    };
    const noInput = stepBalanceSimulation(base, 'none', 100, balanceConfig).state;
    const correctiveInput = stepBalanceSimulation(base, 'left', 100, balanceConfig).state;

    expect(correctiveInput.angularVelocity).toBeLessThan(noInput.angularVelocity - 0.35);
  });

  it('milestone detection fires once per threshold crossing', () => {
    expect(getMilestoneForScore(10, 9.9)).toBe(10);
    expect(getMilestoneForScore(10.4, 10)).toBeNull();
    expect(getMilestoneForScore(45.1, 44.9)).toBe(45);
  });

  it('crossing the failure threshold ends the run', () => {
    const state: BalanceState = {
      ...createInitialBalanceState(balanceConfig),
      tilt: balanceConfig.failureAngle - 0.2,
      angularVelocity: 2,
    };
    const next = stepBalanceSimulation(state, 'right', 100, balanceConfig).state;

    expect(next.failed).toBe(true);
    expect(next.failureDirection).toBe('right');
    expect(next.tuningPhase).toBeTruthy();
  });

  it('score calculation is consistent', () => {
    expect(calculateScoreSeconds(12_340)).toBe(12.3);
    expect(calculateScoreSeconds(12_360)).toBe(12.4);
  });
});
