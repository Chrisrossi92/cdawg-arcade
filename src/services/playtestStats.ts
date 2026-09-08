import type { AttemptRecord } from '../types/game';

export interface PlaytestStats {
  attempts: number;
  average: number;
  median: number;
  best: number;
  buckets: Record<ScoreBucket, number>;
  failureDirections: Record<'left' | 'right' | 'unknown', number>;
  failurePhases: Record<string, number>;
}

export type ScoreBucket = 'under10' | '10to20' | '20to40' | '40to60' | '60plus';

export function getScoreBucket(scoreSeconds: number): ScoreBucket {
  if (scoreSeconds < 10) return 'under10';
  if (scoreSeconds < 20) return '10to20';
  if (scoreSeconds < 40) return '20to40';
  if (scoreSeconds < 60) return '40to60';
  return '60plus';
}

export function calculatePlaytestStats(attempts: AttemptRecord[]): PlaytestStats {
  const scores = attempts.map((attempt) => attempt.scoreSeconds).sort((a, b) => a - b);
  const total = scores.reduce((sum, score) => sum + score, 0);
  const middle = Math.floor(scores.length / 2);
  const median =
    scores.length === 0
      ? 0
      : scores.length % 2 === 0
        ? (scores[middle - 1] + scores[middle]) / 2
        : scores[middle];

  return attempts.reduce<PlaytestStats>(
    (stats, attempt) => {
      stats.buckets[getScoreBucket(attempt.scoreSeconds)] += 1;
      stats.failureDirections[attempt.failureDirection ?? 'unknown'] += 1;
      const phase = attempt.failurePhase ?? 'Unknown';
      stats.failurePhases[phase] = (stats.failurePhases[phase] ?? 0) + 1;
      return stats;
    },
    {
      attempts: attempts.length,
      average: attempts.length ? total / attempts.length : 0,
      median,
      best: scores.length ? scores[scores.length - 1] : 0,
      buckets: { under10: 0, '10to20': 0, '20to40': 0, '40to60': 0, '60plus': 0 },
      failureDirections: { left: 0, right: 0, unknown: 0 },
      failurePhases: {},
    },
  );
}
