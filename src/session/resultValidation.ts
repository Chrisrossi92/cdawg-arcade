import type { ResultSubmission } from '../contracts/events';

export function validateResultSubmission(result: ResultSubmission): string[] {
  const errors: string[] = [];
  if (!result.sessionId) errors.push('sessionId is required');
  if (!result.player.id) errors.push('player.id is required');
  if (!result.gameId) errors.push('gameId is required');
  if (!Number.isFinite(result.score) || result.score < 0) errors.push('score must be non-negative');
  if (!Number.isFinite(result.duration) || result.duration < 0) errors.push('duration must be non-negative');
  if (!result.startedAt) errors.push('startedAt is required');
  if (!result.completedAt) errors.push('completedAt is required');
  if (!result.clientVersion) errors.push('clientVersion is required');
  return errors;
}
