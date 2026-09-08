import { describe, expect, it } from 'vitest';
import { getCdawgPoseForBalance } from './CdawgRig';

describe('Cdawg rig pose selection', () => {
  it('maps neutral balance to idle', () => {
    expect(getCdawgPoseForBalance(0, 0.1, false)).toBe('idle');
  });

  it('maps lean directions clearly', () => {
    expect(getCdawgPoseForBalance(-7, 0.2, false)).toBe('lean-left');
    expect(getCdawgPoseForBalance(7, 0.2, false)).toBe('lean-right');
  });

  it('escalates through brace, wobble, panic, fall, and impact states', () => {
    expect(getCdawgPoseForBalance(15, 0.4, false)).toBe('brace');
    expect(getCdawgPoseForBalance(9, 0.65, false)).toBe('wobble');
    expect(getCdawgPoseForBalance(9, 0.9, false)).toBe('panic');
    expect(getCdawgPoseForBalance(24, 1, true)).toBe('fall');
    expect(getCdawgPoseForBalance(24, 1, true, true)).toBe('impact');
  });

  it('new-record victory overrides balance pose', () => {
    expect(getCdawgPoseForBalance(20, 1, true, false, true)).toBe('new-record-victory');
  });
});
