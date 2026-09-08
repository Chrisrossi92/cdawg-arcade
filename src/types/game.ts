export type GamePhase = 'home' | 'countdown' | 'playing' | 'results' | 'leaderboard';

export interface GameRegistryEntry {
  id: string;
  title: string;
  tagline: string;
  route: string;
  accent: string;
}

export interface RunResult {
  scoreSeconds: number;
  isPersonalBest: boolean;
  endedAt: string;
  failureDirection?: 'left' | 'right';
  failurePhase?: string;
}

export interface AttemptRecord {
  id: string;
  scoreSeconds: number;
  createdAt: string;
  failureDirection?: 'left' | 'right';
  failurePhase?: string;
}

export interface LeaderboardEntry {
  playerName: string;
  bestSeconds: number;
  isLocalPlayer?: boolean;
}

export interface PersonalStats {
  personalBest: number;
  attempts: number;
  recentAttempts: AttemptRecord[];
}
