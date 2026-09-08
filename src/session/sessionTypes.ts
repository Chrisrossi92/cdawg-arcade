import type {
  ArcadeUser,
  ChallengeEvent,
  CheerEvent,
  LeaderboardQuery,
  LeaderboardResult,
  PlayerStateSummary,
  ResultSubmission,
  SessionStatus,
} from '../contracts/events';

export interface ArcadeSession {
  sessionId: string;
  gameId: string;
  guildId?: string;
  channelId?: string;
  activityInstanceId?: string;
  hostUser: ArcadeUser;
  activePlayer: ArcadeUser;
  spectators: ArcadeUser[];
  status: SessionStatus;
  startTimestamp?: string;
  completionTimestamp?: string;
  finalScore?: number;
  cheerCount: number;
  lastCheerEvent?: CheerEvent;
  challengeState?: ChallengeEvent;
  playerState?: PlayerStateSummary;
  result?: ResultSubmission;
}

export interface SessionTransport {
  createSession(input: CreateSessionInput): ArcadeSession;
  joinSession(sessionId: string, user: ArcadeUser, role: 'player' | 'spectator'): ArcadeSession;
  leaveSession(sessionId: string, userId: string): ArcadeSession | null;
  subscribe(sessionId: string, listener: (session: ArcadeSession) => void): () => void;
  publishCheer(event: CheerEvent): ArcadeSession;
  publishPlayerState(summary: PlayerStateSummary): ArcadeSession;
  submitResult(result: ResultSubmission): ArcadeSession;
  createChallenge(input: CreateChallengeInput): ChallengeEvent;
  respondToChallenge(challengeId: string, status: ChallengeEvent['status'], user: ArcadeUser): ChallengeEvent;
  queryLeaderboard(query: LeaderboardQuery): LeaderboardResult[];
}

export interface CreateSessionInput {
  sessionId?: string;
  gameId: string;
  guildId?: string;
  channelId?: string;
  activityInstanceId?: string;
  hostUser: ArcadeUser;
  activePlayer: ArcadeUser;
}

export interface CreateChallengeInput {
  challenger: ArcadeUser;
  challengedUser: ArcadeUser;
  gameId: string;
  initiatingScore: number;
  expiresInMs?: number;
}
