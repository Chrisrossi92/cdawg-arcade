import type { AttemptRecord, LeaderboardEntry, PersonalStats, RunResult } from '../types/game';

export interface ScoreRepository {
  getPersonalStats(playerId?: string, guildId?: string): PersonalStats;
  submitScore(scoreSeconds: number, metadata?: AttemptMetadata): RunResult;
  getGuildLeaderboard(guildId?: string): LeaderboardEntry[];
  recordAttempt(scoreSeconds: number, metadata?: AttemptMetadata): RunResult;
  getPersonalBest(): number;
  getRecentAttempts(): AttemptRecord[];
  getLeaderboard(): LeaderboardEntry[];
}

export interface AttemptMetadata {
  failureDirection?: 'left' | 'right';
  failurePhase?: string;
}

const storageKey = 'cdawg-arcade.balance.scores';

interface ScoreStore {
  personalBest: number;
  recentAttempts: AttemptRecord[];
}

const developmentMockEntries: LeaderboardEntry[] = [
  { playerName: 'ArcadeAce', bestSeconds: 51.4 },
  { playerName: 'TiltBoss', bestSeconds: 38.2 },
  { playerName: 'SnackMage', bestSeconds: 27.8 },
  { playerName: 'Local Player', bestSeconds: 0, isLocalPlayer: true },
  { playerName: 'WobbleKid', bestSeconds: 14.1 },
];

export class LocalScoreRepository implements ScoreRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  getPersonalStats(): PersonalStats {
    const store = this.read();
    return {
      personalBest: store.personalBest,
      attempts: store.recentAttempts.length,
      recentAttempts: store.recentAttempts,
    };
  }

  submitScore(scoreSeconds: number, metadata: AttemptMetadata = {}): RunResult {
    const store = this.read();
    const isPersonalBest = scoreSeconds > store.personalBest;
    const attempt: AttemptRecord = {
      id: crypto.randomUUID(),
      scoreSeconds,
      createdAt: new Date().toISOString(),
      ...metadata,
    };
    const nextStore: ScoreStore = {
      personalBest: isPersonalBest ? scoreSeconds : store.personalBest,
      recentAttempts: [attempt, ...store.recentAttempts].slice(0, 8),
    };
    this.write(nextStore);
    return { scoreSeconds, isPersonalBest, endedAt: new Date().toISOString(), ...metadata };
  }

  getGuildLeaderboard(): LeaderboardEntry[] {
    const personalBest = this.getPersonalBest();
    const entries = personalBest > 0 ? [{ playerName: 'You', bestSeconds: personalBest, isLocalPlayer: true }] : [];
    return sortLeaderboardEntries(entries);
  }

  recordAttempt(scoreSeconds: number, metadata: AttemptMetadata = {}): RunResult {
    return this.submitScore(scoreSeconds, metadata);
  }

  getPersonalBest(): number {
    return this.getPersonalStats().personalBest;
  }

  getRecentAttempts(): AttemptRecord[] {
    return this.getPersonalStats().recentAttempts;
  }

  getLeaderboard(): LeaderboardEntry[] {
    if (import.meta.env.DEV) {
      const personalBest = this.getPersonalBest();
      return developmentMockEntries
        .map((entry) => (entry.isLocalPlayer ? { ...entry, bestSeconds: personalBest } : entry))
        .sort(compareLeaderboardEntries);
    }
    return this.getGuildLeaderboard();
  }

  private read(): ScoreStore {
    const raw = this.storage.getItem(storageKey);
    if (!raw) {
      return { personalBest: 0, recentAttempts: [] };
    }
    try {
      return JSON.parse(raw) as ScoreStore;
    } catch {
      return { personalBest: 0, recentAttempts: [] };
    }
  }

  private write(store: ScoreStore): void {
    this.storage.setItem(storageKey, JSON.stringify(store));
  }
}

export function sortLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort(compareLeaderboardEntries);
}

function compareLeaderboardEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  return b.bestSeconds - a.bestSeconds;
}

export class MemoryScoreRepository implements ScoreRepository {
  private store: ScoreStore = { personalBest: 0, recentAttempts: [] };

  getPersonalStats(): PersonalStats {
    return {
      personalBest: this.store.personalBest,
      attempts: this.store.recentAttempts.length,
      recentAttempts: this.store.recentAttempts,
    };
  }

  submitScore(scoreSeconds: number, metadata: AttemptMetadata = {}): RunResult {
    const isPersonalBest = scoreSeconds > this.store.personalBest;
    this.store = {
      personalBest: isPersonalBest ? scoreSeconds : this.store.personalBest,
      recentAttempts: [
        {
          id: `attempt-${this.store.recentAttempts.length + 1}`,
          scoreSeconds,
          createdAt: new Date(0).toISOString(),
          ...metadata,
        },
        ...this.store.recentAttempts,
      ].slice(0, 8),
    };
    return { scoreSeconds, isPersonalBest, endedAt: new Date(0).toISOString(), ...metadata };
  }

  getGuildLeaderboard(): LeaderboardEntry[] {
    return sortLeaderboardEntries(this.store.personalBest > 0 ? [{ playerName: 'Local Player', bestSeconds: this.store.personalBest, isLocalPlayer: true }] : []);
  }

  recordAttempt(scoreSeconds: number, metadata: AttemptMetadata = {}): RunResult {
    return this.submitScore(scoreSeconds, metadata);
  }

  getPersonalBest(): number {
    return this.getPersonalStats().personalBest;
  }

  getRecentAttempts(): AttemptRecord[] {
    return this.getPersonalStats().recentAttempts;
  }

  getLeaderboard(): LeaderboardEntry[] {
    return this.getGuildLeaderboard();
  }
}
