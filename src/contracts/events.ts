export type HostEnvironmentType = 'local' | 'discord';
export type SessionRole = 'player' | 'spectator';
export type SessionStatus = 'lobby' | 'countdown' | 'playing' | 'completed' | 'cancelled';
export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'expired';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'all-time';

export interface ArcadeUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface HostContext {
  connectionState?: 'local-practice' | 'discord-connecting' | 'discord-authenticated' | 'discord-error';
  connectionError?: 'invalid-context' | 'configuration' | 'sdk' | 'authorization' | 'exchange' | 'timeout' | 'unexpected';
  environment: HostEnvironmentType;
  currentUser: ArcadeUser;
  guildId?: string;
  channelId?: string;
  activityInstanceId?: string;
  authenticated: boolean;
  ready: boolean;
  role: SessionRole;
  initializationStatus: string;
  initializationState?: 'detecting' | 'outside-discord' | 'sdk-initializing' | 'authorization-required' | 'exchanging-token' | 'authenticating' | 'ready' | 'failed';
  participantCount?: number;
  participants?: ArcadeUser[];
}

export interface CheerEvent {
  eventId: string;
  sessionId: string;
  sender: ArcadeUser;
  reactionType: string;
  timestamp: string;
}

export interface PlayerStateSummary {
  sessionId: string;
  score: number;
  tiltPercent: number;
  danger: boolean;
  gamePhase: string;
  milestone?: number;
  playerStatus: SessionStatus;
  updatedAt: string;
}

export interface ResultSubmission {
  sessionId: string;
  player: ArcadeUser;
  gameId: string;
  score: number;
  duration: number;
  startedAt: string;
  completedAt: string;
  clientVersion: string;
  localValidationMetadata: {
    failureDirection?: 'left' | 'right';
    failurePhase?: string;
    cheerCount: number;
  };
}

export interface ChallengeEvent {
  challengeId: string;
  challenger: ArcadeUser;
  challengedUser: ArcadeUser;
  gameId: string;
  initiatingScore: number;
  status: ChallengeStatus;
  createdTimestamp: string;
  expiryTimestamp: string;
}

export interface LeaderboardQuery {
  gameId: string;
  guildId?: string;
  period: LeaderboardPeriod;
  limit: number;
}

export interface LeaderboardResult {
  rank: number;
  user: ArcadeUser;
  score: number;
  achievedTimestamp: string;
}
