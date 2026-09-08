import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArcadeUser, ResultSubmission } from '../contracts/events';
import { LocalSessionTransport } from './LocalSessionTransport';
import { validateResultSubmission } from './resultValidation';
import { shouldPublishPlayerState } from './statePublication';

const player: ArcadeUser = { id: 'player-1', displayName: 'Player One' };
const spectator: ArcadeUser = { id: 'viewer-1', displayName: 'Viewer One' };

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  length = 0;
  clear(): void {
    this.values.clear();
    this.length = 0;
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.values.delete(key);
    this.length = this.values.size;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
    this.length = this.values.size;
  }
}

function makeResult(sessionId: string, score = 22.4): ResultSubmission {
  return {
    sessionId,
    player,
    gameId: 'cdawg-balance',
    score,
    duration: score,
    startedAt: '2026-07-11T00:00:00.000Z',
    completedAt: '2026-07-11T00:00:22.400Z',
    clientVersion: 'test',
    localValidationMetadata: { cheerCount: 0 },
  };
}

describe('LocalSessionTransport', () => {
  beforeEach(() => {
    vi.stubGlobal('BroadcastChannel', undefined);
  });

  it('creates sessions and lets the player join without becoming a spectator', () => {
    const transport = new LocalSessionTransport(new MemoryStorage());
    const session = transport.createSession({ sessionId: 'S1', gameId: 'cdawg-balance', hostUser: player, activePlayer: player });
    const joined = transport.joinSession(session.sessionId, player, 'player');

    expect(joined.activePlayer.id).toBe(player.id);
    expect(joined.spectators).toHaveLength(0);
  });

  it('adds and removes spectators', () => {
    const transport = new LocalSessionTransport(new MemoryStorage());
    transport.createSession({ sessionId: 'S2', gameId: 'cdawg-balance', hostUser: player, activePlayer: player });
    const joined = transport.joinSession('S2', spectator, 'spectator');
    const left = transport.leaveSession('S2', spectator.id);

    expect(joined.spectators).toHaveLength(1);
    expect(left?.spectators).toHaveLength(0);
  });

  it('does not let spectator join replace the active player', () => {
    const transport = new LocalSessionTransport(new MemoryStorage());
    transport.createSession({ sessionId: 'S3', gameId: 'cdawg-balance', hostUser: player, activePlayer: player });
    const session = transport.joinSession('S3', spectator, 'spectator');

    expect(session.activePlayer.id).toBe(player.id);
  });

  it('publishes state updates to subscribers and uses fallback without BroadcastChannel', () => {
    const transport = new LocalSessionTransport(new MemoryStorage());
    transport.createSession({ sessionId: 'S4', gameId: 'cdawg-balance', hostUser: player, activePlayer: player });
    const updates: string[] = [];
    transport.subscribe('S4', (session) => updates.push(session.status));

    transport.publishPlayerState({
      sessionId: 'S4',
      score: 3,
      tiltPercent: 0.2,
      danger: false,
      gamePhase: 'playing',
      playerStatus: 'playing',
      updatedAt: '2026-07-11T00:00:03.000Z',
    });

    expect(updates).toContain('playing');
  });

  it('rate limits cheer spam from the same user', () => {
    const transport = new LocalSessionTransport(new MemoryStorage());
    transport.createSession({ sessionId: 'S5', gameId: 'cdawg-balance', hostUser: player, activePlayer: player });
    const first = transport.publishCheer({ eventId: 'c1', sessionId: 'S5', sender: spectator, reactionType: "LET'S GO", timestamp: '2026-07-11T00:00:00.000Z' });
    const second = transport.publishCheer({ eventId: 'c2', sessionId: 'S5', sender: spectator, reactionType: "LET'S GO", timestamp: '2026-07-11T00:00:00.500Z' });

    expect(first.cheerCount).toBe(1);
    expect(second.cheerCount).toBe(1);
  });

  it('validates and submits results while updating local leaderboard', () => {
    const storage = new MemoryStorage();
    const transport = new LocalSessionTransport(storage);
    transport.createSession({ sessionId: 'S6', gameId: 'cdawg-balance', hostUser: player, activePlayer: player });
    const completed = transport.submitResult(makeResult('S6'));
    const leaderboard = transport.queryLeaderboard({ gameId: 'cdawg-balance', period: 'all-time', limit: 5 });

    expect(validateResultSubmission(makeResult('S6'))).toEqual([]);
    expect(completed.status).toBe('completed');
    expect(leaderboard[0].score).toBe(22.4);
  });

  it('creates and accepts challenges', () => {
    const transport = new LocalSessionTransport(new MemoryStorage());
    const challenge = transport.createChallenge({ challenger: player, challengedUser: spectator, gameId: 'cdawg-balance', initiatingScore: 18 });
    const accepted = transport.respondToChallenge(challenge.challengeId, 'accepted', spectator);

    expect(challenge.status).toBe('pending');
    expect(accepted.status).toBe('accepted');
  });

  it('checks player state publication throttling', () => {
    expect(shouldPublishPlayerState(1000, 1100)).toBe(false);
    expect(shouldPublishPlayerState(1000, 1250)).toBe(true);
  });
});
