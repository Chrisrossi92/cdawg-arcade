import type { HostContext } from '../../contracts/events';
import { HttpAuthApiClient, type AuthApiClient } from '../../api/authClient';
import type { HostAdapter } from '../hostAdapter';
import { makeDefaultLocalContext } from '../hostAdapter';
import { normalizeDiscordUser, normalizeParticipants, withDiscordContext } from './context';

interface DiscordSdkLike {
  ready?: () => Promise<void>;
  commands?: {
    authorize?: (args: { client_id: string; scope: string[]; response_type?: 'code' }) => Promise<{ code: string }>;
    authenticate?: (args: { access_token: string }) => Promise<unknown>;
    getInstanceConnectedParticipants?: () => Promise<{ participants: Array<{ id: string; username?: string; global_name?: string | null; avatar?: string | null }> }>;
  };
  subscribe?: (event: string, listener: (event: unknown) => void) => Promise<unknown>;
  close?: (...args: unknown[]) => unknown;
  openInviteDialog?: () => Promise<void>;
  guildId?: string | null;
  channelId?: string | null;
  instanceId?: string | null;
}

export function shouldUseDiscordAdapter(search = typeof window === 'undefined' ? '' : window.location.search): boolean {
  const params = new URLSearchParams(search);
  return import.meta.env.VITE_DISCORD_ENABLED === 'true' || params.has('frame_id') || params.has('instance_id');
}

export class DiscordHostAdapter implements HostAdapter {
  readonly environment = 'discord' as const;
  private context: HostContext;
  private listeners = new Set<(context: HostContext) => void>();
  private sdk: DiscordSdkLike | null = null;
  private authClient: AuthApiClient;
  private initializePromise: Promise<HostContext> | null = null;
  private participantsSubscribed = false;

  constructor(authClient: AuthApiClient = new HttpAuthApiClient()) {
    this.authClient = authClient;
    const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
    this.context = {
      ...makeDefaultLocalContext(),
      environment: 'discord',
      currentUser: { id: params.get('user_id') ?? 'discord-user', displayName: params.get('display_name') ?? 'Discord User' },
      guildId: params.get('guild_id') ?? undefined,
      channelId: params.get('channel_id') ?? undefined,
      activityInstanceId: params.get('instance_id') ?? params.get('frame_id') ?? undefined,
      authenticated: false,
      ready: false,
      initializationStatus: 'Waiting for Discord Activity initialization',
      initializationState: 'detecting',
      participantCount: 0,
      participants: [],
    };
  }

  getContext(): HostContext {
    return this.context;
  }

  subscribe(listener: (context: HostContext) => void): () => void {
    this.listeners.add(listener);
    listener(this.context);
    return () => this.listeners.delete(listener);
  }

  async initialize(): Promise<HostContext> {
    this.initializePromise ??= this.runInitialize();
    return this.initializePromise;
  }

  private async runInitialize(): Promise<HostContext> {
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
    if (!clientId || clientId === 'replace-with-discord-application-client-id') {
      return this.update({ initializationStatus: 'Discord client ID missing; running mocked Discord context', initializationState: 'failed', ready: true });
    }

    try {
      this.update({ initializationStatus: 'Discord SDK initializing', initializationState: 'sdk-initializing' });
      const module = await import('@discord/embedded-app-sdk');
      const SdkCtor = module.DiscordSDK;
      this.sdk = new SdkCtor(clientId) as unknown as DiscordSdkLike;
      await this.sdk.ready?.();
      this.update({
        ready: true,
        guildId: this.sdk.guildId ?? this.context.guildId,
        channelId: this.sdk.channelId ?? this.context.channelId,
        activityInstanceId: this.sdk.instanceId ?? this.context.activityInstanceId,
        initializationStatus: 'Discord SDK ready; authorization required',
        initializationState: 'authorization-required',
      });
      return this.context;
    } catch (error) {
      return this.update({
        ready: true,
        initializationState: 'failed',
        initializationStatus: `Discord SDK unavailable (${describeError(error).slice(0, 120)})`,
      });
    }
  }

  async requestAuthentication(): Promise<HostContext> {
    if (!this.sdk?.commands?.authorize || !this.sdk.commands.authenticate) {
      return this.update({ initializationState: 'failed', initializationStatus: 'Discord SDK auth commands unavailable' });
    }
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
    try {
      this.update({ initializationState: 'authorization-required', initializationStatus: 'Requesting Discord authorization' });
      const { code } = await this.sdk.commands.authorize({
        client_id: clientId,
        response_type: 'code',
        scope: ['identify', 'guilds'],
      });
      this.update({ initializationState: 'exchanging-token', initializationStatus: 'Exchanging authorization code' });
      const token = await this.authClient.exchangeCode(code);
      this.update({ initializationState: 'authenticating', initializationStatus: 'Authenticating Activity SDK session' });
      const auth = (await this.sdk.commands.authenticate({ access_token: token.access_token })) as {
        user?: { id: string; username?: string; global_name?: string | null; avatar?: string | null };
      };
      const user = auth.user ? normalizeDiscordUser(auth.user) : this.context.currentUser;
      this.update({
        currentUser: user,
        authenticated: true,
        ready: true,
        initializationState: 'ready',
        initializationStatus: 'Discord SDK authenticated',
      });
      await this.loadParticipants();
      await this.subscribeParticipants();
      return this.context;
    } catch (error) {
      return this.update({
        authenticated: false,
        initializationState: 'failed',
        initializationStatus: `Discord authentication failed (${describeError(error).slice(0, 120)})`,
      });
    }
  }

  async closeActivity(): Promise<void> {
    this.sdk?.close?.(1000, 'Cdawg Arcade local close');
  }

  async inviteOrShareActivity(): Promise<void> {
    await this.sdk?.openInviteDialog?.();
  }

  private update(patch: Partial<HostContext>): HostContext {
    this.context = withDiscordContext(this.context, patch);
    for (const listener of this.listeners) listener(this.context);
    return this.context;
  }

  private async loadParticipants(): Promise<void> {
    try {
      const response = await this.sdk?.commands?.getInstanceConnectedParticipants?.();
      const participants = normalizeParticipants(response?.participants);
      this.update({ participants, participantCount: participants.length });
    } catch {
      this.update({ participantCount: this.context.participantCount ?? 0 });
    }
  }

  private async subscribeParticipants(): Promise<void> {
    if (this.participantsSubscribed) return;
    this.participantsSubscribed = true;
    await this.sdk?.subscribe?.('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', (event) => {
      const participants = normalizeParticipants((event as { participants?: Array<{ id: string; username?: string; global_name?: string | null; avatar?: string | null }> })?.participants);
      this.update({ participants, participantCount: participants.length });
    }).catch(() => {
      this.participantsSubscribed = false;
    });
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
