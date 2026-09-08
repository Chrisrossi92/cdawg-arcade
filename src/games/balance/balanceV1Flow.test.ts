import { describe, expect, it } from 'vitest';
import { getCompactDockedLayoutClasses, getInitialBalancePhase, getPhaseAfterRunResult } from './balanceV1Flow';

describe('Balance V1 state flow', () => {
  it('starts on the home phase', () => {
    expect(getInitialBalancePhase()).toBe('home');
  });

  it('moves completed runs to results', () => {
    expect(getPhaseAfterRunResult({ scoreSeconds: 12, isPersonalBest: true, endedAt: 'now' })).toBe('results');
  });

  it('keeps compact docked layout class names stable', () => {
    expect(getCompactDockedLayoutClasses('playing')).toContain('layout-docked-safe');
    expect(getCompactDockedLayoutClasses('playing')).toContain('phase-playing');
  });
});
