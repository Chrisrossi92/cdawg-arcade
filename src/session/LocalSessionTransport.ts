import type {
  ArcadeUser,
  ChallengeEvent,
  CheerEvent,
  LeaderboardQuery,
  LeaderboardResult,
  PlayerStateSummary,
  ResultSubmission,
} from '../contracts/events';
import type { ArcadeSession, CreateChallengeInput, CreateSessionInput, SessionTransport } from './sessionTypes';
import { validateResultSubmission } from './resultValidation';

interface TransportMessage {
  type: 'session-updated';
  session: ArcadeSession;
}

const memorySessions = new Map<string, ArcadeSession>();
const memoryChallenges = new Map<string, ChallengeEvent>();
const memoryListeners = new Map<string, Set<(session: ArcadeSession) => void>>();
const lastCheerByUser = new Map<string, number>();
const leaderboardStorageKey = 'cdawg-arcade.local.leaderboard';
const challengeStorageKey = 'cdawg-arcade.local.challenges';

export class LocalSessionTransport implements SessionTransport {
  private channel: BroadcastChannel | null = null;

  constructor(private readonly storage: Storage | null = typeof window !== 'undefined' ? window.localStorage : null) {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('cdawg-arcade-session');
      this.channel.onmessage = (event: MessageEvent<TransportMessage>) => {
        if (event.data?.type === 'session-updated') {
          memorySessions.set(event.data.session.sessionId, event.data.session);
          emit(event.data.session);
        }
      };
    }
  }

  createSession(input: CreateSessionInput): ArcadeSession {
    const session: ArcadeSession = {
      sessionId: input.sessionId ?? createSessionCode(input.activityInstanceId),
      gameId: input.gameId,
      guildId: input.guildId,
      channelId: input.channelId,
      activityInstanceId: input.activityInstanceId,
      hostUser: input.hostUser,
      activePlayer: input.activePlayer,
      spectators: [],
      status: 'lobby',
      cheerCount: 0,
    };
    return this.save(session);
  }

  joinSession(sessionId: string, user: ArcadeUser, role: 'player' | 'spectator'): ArcadeSession {
    const session = this.getOrCreate(sessionId, user);
    if (role === 'player' && session.activePlayer.id === user.id) {
      return this.save({ ...session, activePlayer: user });
    }
    const spectators = session.spectators.some((spectator) => spectator.id === user.id)
      ? session.spectators
      : [...session.spectators, user];
    return this.save({ ...session, spectators });
  }

  leaveSession(sessionId: string, userId: string): ArcadeSession | null {
    const session = memorySessions.get(sessionId);
    if (!session) return null;
    return this.save({ ...session, spectators: session.spectators.filter((spectator) => spectator.id !== userId) });
  }

  subscribe(sessionId: string, listener: (session: ArcadeSession) => void): () => void {
    const listeners = memoryListeners.get(sessionId) ?? new Set<(session: ArcadeSession) => void>();
    listeners.add(listener);
    memoryListeners.set(sessionId, listeners);
    const existing = memorySessions.get(sessionId);
    if (existing) listener(existing);
    return () => listeners.delete(listener);
  }

  publishCheer(event: CheerEvent): ArcadeSession {
    const rateKey = `${event.sessionId}:${event.sender.id}`;
    const now = Date.parse(event.timestamp);
    const last = lastCheerByUser.get(rateKey) ?? 0;
    const session = this.requireSession(event.sessionId);
    if (now - last < 900) return session;
    lastCheerByUser.set(rateKey, now);
    return this.save({ ...session, cheerCount: session.cheerCount + 1, lastCheerEvent: event });
  }

  publishPlayerState(summary: PlayerStateSummary): ArcadeSession {
    const session = this.requireSession(summary.sessionId);
    if (session.activePlayer.id === 'spectator') return session;
    const nextStatus = summary.playerStatus === 'playing' || summary.playerStatus === 'countdown' ? summary.playerStatus : session.status;
    return this.save({ ...session, status: nextStatus, playerState: summary, startTimestamp: session.startTimestamp ?? summary.updatedAt });
  }

  submitResult(result: ResultSubmission): ArcadeSession {
    const errors = validateResultSubmission(result);
    if (errors.length) throw new Error(errors.join(', '));
    const session = this.requireSession(result.sessionId);
    this.saveLeaderboard(result, session.guildId);
    return this.save({
      ...session,
      status: 'completed',
      completionTimestamp: result.completedAt,
      finalScore: result.score,
      result,
    });
  }

  createChallenge(input: CreateChallengeInput): ChallengeEvent {
    const created = new Date();
    const challenge: ChallengeEvent = {
      challengeId: `CHAL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      challenger: input.challenger,
      challengedUser: input.challengedUser,
      gameId: input.gameId,
      initiatingScore: input.initiatingScore,
      status: 'pending',
      createdTimestamp: created.toISOString(),
      expiryTimestamp: new Date(created.getTime() + (input.expiresInMs ?? 24 * 60 * 60 * 1000)).toISOString(),
    };
    memoryChallenges.set(challenge.challengeId, challenge);
    this.writeChallenges(new Map([...this.readChallenges(), [challenge.challengeId, challenge]]));
    return challenge;
  }

  respondToChallenge(challengeId: string, status: ChallengeEvent['status'], user: ArcadeUser): ChallengeEvent {
    const challenge = memoryChallenges.get(challengeId) ?? this.readChallenges().get(challengeId);
    if (!challenge) throw new Error('Challenge not found');
    const updated = { ...challenge, status };
    memoryChallenges.set(challengeId, updated);
    this.writeChallenges(new Map([...this.readChallenges(), [challengeId, updated]]));
    return updated;
  }

  queryLeaderboard(query: LeaderboardQuery): LeaderboardResult[] {
    const entries = this.readLeaderboard()
      .filter((entry) => entry.gameId === query.gameId && (!query.guildId || entry.guildId === query.guildId))
      .sort((a, b) => b.score - a.score)
      .slice(0, query.limit);
    return entries.map((entry, index) => ({
      rank: index + 1,
      user: entry.user,
      score: entry.score,
      achievedTimestamp: entry.achievedTimestamp,
    }));
  }

  private getOrCreate(sessionId: string, user: ArcadeUser): ArcadeSession {
    return (
      memorySessions.get(sessionId) ??
      this.createSession({ sessionId, gameId: 'cdawg-balance', hostUser: user, activePlayer: user, activityInstanceId: sessionId })
    );
  }

  private requireSession(sessionId: string): ArcadeSession {
    const session = memorySessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    return session;
  }

  private save(session: ArcadeSession): ArcadeSession {
    memorySessions.set(session.sessionId, session);
    emit(session);
    this.channel?.postMessage({ type: 'session-updated', session } satisfies TransportMessage);
    return session;
  }

  private saveLeaderboard(result: ResultSubmission, guildId?: string): void {
    const entries = this.readLeaderboard();
    entries.push({
      gameId: result.gameId,
      guildId,
      user: result.player,
      score: result.score,
      achievedTimestamp: result.completedAt,
    });
    this.storage?.setItem(leaderboardStorageKey, JSON.stringify(entries));
  }

  private readLeaderboard(): Array<{ gameId: string; guildId?: string; user: ArcadeUser; score: number; achievedTimestamp: string }> {
    if (!this.storage) return [];
    const raw = this.storage.getItem(leaderboardStorageKey);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private readChallenges(): Map<string, ChallengeEvent> {
    if (!this.storage) return memoryChallenges;
    const raw = this.storage.getItem(challengeStorageKey);
    if (!raw) return memoryChallenges;
    try {
      return new Map<string, ChallengeEvent>(JSON.parse(raw));
    } catch {
      return memoryChallenges;
    }
  }

  private writeChallenges(challenges: Map<string, ChallengeEvent>): void {
    if (!this.storage) return;
    this.storage.setItem(challengeStorageKey, JSON.stringify(Array.from(challenges.entries())));
  }
}

function createSessionCode(seed?: string): string {
  return (seed || `LOCAL-${Math.random().toString(36).slice(2, 8)}`).toUpperCase();
}

function emit(session: ArcadeSession): void {
  const listeners = memoryListeners.get(session.sessionId);
  if (!listeners) return;
  for (const listener of listeners) listener(session);
}
