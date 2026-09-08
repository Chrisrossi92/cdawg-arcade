import { describe, expect, it } from 'vitest';
import { MemoryScoreRepository, sortLeaderboardEntries } from './scoreRepository';

describe('score repository', () => {
  it('personal best updates only when beaten', () => {
    const repository = new MemoryScoreRepository();

    expect(repository.recordAttempt(12).isPersonalBest).toBe(true);
    expect(repository.getPersonalBest()).toBe(12);
    expect(repository.recordAttempt(8).isPersonalBest).toBe(false);
    expect(repository.getPersonalBest()).toBe(12);
    expect(repository.recordAttempt(13.4).isPersonalBest).toBe(true);
    expect(repository.getPersonalBest()).toBe(13.4);
  });

  it('leaderboard sorting is descending by survival time', () => {
    const sorted = sortLeaderboardEntries([
      { playerName: 'C', bestSeconds: 4 },
      { playerName: 'A', bestSeconds: 20 },
      { playerName: 'B', bestSeconds: 12 },
    ]);

    expect(sorted.map((entry) => entry.playerName)).toEqual(['A', 'B', 'C']);
  });

  it('records failure phase and direction metadata', () => {
    const repository = new MemoryScoreRepository();

    repository.recordAttempt(18.2, { failureDirection: 'left', failurePhase: 'Active' });
    const [attempt] = repository.getRecentAttempts();

    expect(attempt.failureDirection).toBe('left');
    expect(attempt.failurePhase).toBe('Active');
  });

  it('exposes the V1 leaderboard service boundary without fake rivals', () => {
    const repository = new MemoryScoreRepository();
    repository.submitScore(21.4);

    expect(repository.getPersonalStats().personalBest).toBe(21.4);
    expect(repository.getPersonalStats().attempts).toBe(1);
    expect(repository.getGuildLeaderboard()).toEqual([{ playerName: 'Local Player', bestSeconds: 21.4, isLocalPlayer: true }]);
  });
});
