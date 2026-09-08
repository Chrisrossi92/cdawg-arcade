import { describe, expect, it } from 'vitest';
import { calculatePlaytestStats, getScoreBucket } from './playtestStats';
import type { AttemptRecord } from '../types/game';

describe('playtest stats', () => {
  it('calculates score buckets', () => {
    expect(getScoreBucket(9.9)).toBe('under10');
    expect(getScoreBucket(10)).toBe('10to20');
    expect(getScoreBucket(20)).toBe('20to40');
    expect(getScoreBucket(40)).toBe('40to60');
    expect(getScoreBucket(60)).toBe('60plus');
  });

  it('summarizes attempts and failure phase data', () => {
    const attempts: AttemptRecord[] = [
      { id: '1', scoreSeconds: 8, createdAt: '', failureDirection: 'left', failurePhase: 'Warmup' },
      { id: '2', scoreSeconds: 15, createdAt: '', failureDirection: 'right', failurePhase: 'Active' },
      { id: '3', scoreSeconds: 35, createdAt: '', failureDirection: 'right', failurePhase: 'Intense' },
      { id: '4', scoreSeconds: 65, createdAt: '', failureDirection: 'left', failurePhase: 'Critical' },
    ];

    const stats = calculatePlaytestStats(attempts);

    expect(stats.attempts).toBe(4);
    expect(stats.average).toBe(30.75);
    expect(stats.median).toBe(25);
    expect(stats.best).toBe(65);
    expect(stats.buckets.under10).toBe(1);
    expect(stats.buckets['10to20']).toBe(1);
    expect(stats.buckets['20to40']).toBe(1);
    expect(stats.buckets['60plus']).toBe(1);
    expect(stats.failureDirections.left).toBe(2);
    expect(stats.failureDirections.right).toBe(2);
    expect(stats.failurePhases.Critical).toBe(1);
  });
});
