import type { HostContext, SessionRole } from '../contracts/events';

export interface HostAdapter {
  readonly environment: HostContext['environment'];
  getContext(): HostContext;
  subscribe(listener: (context: HostContext) => void): () => void;
  requestAuthentication(): Promise<HostContext>;
  continuePractice(): void;
  dispose(): void;
  closeActivity(): Promise<void>;
  inviteOrShareActivity(): Promise<void>;
}

export type HostContextPatch = Partial<Omit<HostContext, 'environment' | 'ready' | 'authenticated'>> & {
  authenticated?: boolean;
  ready?: boolean;
  role?: SessionRole;
};

export function makeDefaultLocalContext(): HostContext {
  return {
    connectionState: 'local-practice',
    environment: 'local',
    currentUser: { id: 'local-player', displayName: 'Local Player' },
    guildId: 'local-guild',
    channelId: 'local-channel',
    activityInstanceId: 'local-session',
    authenticated: false,
    ready: true,
    role: 'player',
    initializationStatus: 'Local practice',
  };
}
