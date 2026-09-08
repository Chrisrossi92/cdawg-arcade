import type { HostContext } from '../../contracts/events';
import { HttpAuthApiClient, type AuthApiClient } from '../../api/authClient';
import { bounded, OperationTimeout } from '../../api/bounded';
import type { HostAdapter } from '../hostAdapter';
import { makeDefaultLocalContext } from '../hostAdapter';
import { normalizeDiscordUser, normalizeParticipants, type DiscordUserLike } from './context';
import { getLaunchDecision } from './launchContext';

export interface DiscordSdkLike {
  ready: () => Promise<void>;
  commands: {
    authorize: (args: { client_id: string; scope: string[]; response_type: 'code' }) => Promise<{ code: string }>;
    authenticate: (args: { access_token: string }) => Promise<unknown>;
    openInviteDialog?: () => Promise<unknown>;
    getInstanceConnectedParticipants?: () => Promise<{ participants: DiscordUserLike[] }>;
  };
  subscribe?: (event: string, listener: (event: unknown) => void) => Promise<unknown>;
  unsubscribe?: (event: string, listener: (event: unknown) => void) => Promise<unknown>;
  close?: (code: number, message: string) => unknown;
  guildId?: string | null;
  channelId?: string | null;
  instanceId?: string | null;
}
interface Options {
  search?: string;
  clientId?: string;
  loadSdk?: () => Promise<(clientId: string) => DiscordSdkLike>;
  timeoutMs?: number;
}
const messages = {
  'invalid-context': 'Discord launch information is incomplete. Relaunch from Discord or continue in practice.',
  configuration: 'Discord connection is not configured. You can continue in practice.',
  sdk: 'Could not connect to Discord. Retry the connection or continue in practice.',
  authorization: 'Discord authorization did not complete. Retry and allow access, or continue in practice.',
  exchange: 'Could not complete Discord sign-in. Retry in a moment or continue in practice.',
  timeout: 'Discord sign-in took too long. Retry the connection or continue in practice.',
  unexpected: 'Discord sign-in could not finish. Retry the connection or continue in practice.',
};
export function shouldUseDiscordAdapter(search?: string): boolean { return getLaunchDecision(search) === 'discord'; }

export class DiscordHostAdapter implements HostAdapter {
  readonly environment = 'discord' as const;
  private context: HostContext = { ...makeDefaultLocalContext(), environment: 'discord', connectionState: 'discord-connecting', ready: false, initializationStatus: 'Connecting to Discord…' };
  private listeners = new Set<(context: HostContext) => void>();
  private sdk: DiscordSdkLike | null = null;
  private controller: AbortController | null = null;
  private attempt: Promise<HostContext> | null = null;
  private participantListener: ((event: unknown) => void) | null = null;
  private readonly search: string;

  constructor(private readonly authClient: AuthApiClient = new HttpAuthApiClient(), private readonly options: Options = {}) {
    this.search = options.search ?? (typeof window === 'undefined' ? '' : window.location.search);
  }
  getContext(): HostContext { return this.context; }
  subscribe(listener: (context: HostContext) => void): () => void {
    this.listeners.add(listener); listener(this.context);
    return () => { this.listeners.delete(listener); };
  }
  initialize(): Promise<HostContext> { return this.requestAuthentication(); }
  requestAuthentication(): Promise<HostContext> {
    if (this.attempt) return this.attempt;
    if (this.context.connectionState === 'discord-authenticated') return Promise.resolve(this.context);
    const controller = new AbortController();
    this.controller = controller;
    // Defer work until the attempt is registered, including listener-triggered retries.
    this.attempt = Promise.resolve().then(() => this.connect(controller)).finally(() => {
      if (this.controller === controller) this.attempt = null;
    });
    return this.attempt;
  }
  private async connect(controller: AbortController): Promise<HostContext> {
    const signal = controller.signal;
    const current = () => this.controller === controller && !signal.aborted;
    if (!current()) return this.context;
    let stage: keyof typeof messages = 'sdk';
    try {
      if (getLaunchDecision(this.search) !== 'discord') { stage = 'invalid-context'; throw new Error('invalid_context'); }
      const clientId = this.options.clientId ?? import.meta.env.VITE_DISCORD_CLIENT_ID;
      if (!clientId || clientId.startsWith('replace-with-')) { stage = 'configuration'; throw new Error('configuration'); }
      this.update({ ...makeDefaultLocalContext(), environment: 'discord', connectionState: 'discord-connecting', connectionError: undefined, ready: false, initializationStatus: 'Connecting to Discord…' });
      const wait = <T>(operation: () => Promise<T>, ms = 10000) => bounded(operation, signal, this.options.timeoutMs ?? ms);
      if (!this.sdk) {
        const factory = await wait(this.options.loadSdk ?? (async () => {
          const { DiscordSDK } = await import('@discord/embedded-app-sdk');
          return (id: string) => new DiscordSDK(id) as unknown as DiscordSdkLike;
        }));
        signal.throwIfAborted();
        this.sdk = factory(clientId);
      }
      const sdk = this.sdk;
      await wait(() => sdk.ready());
      signal.throwIfAborted();
      stage = 'authorization';
      const { code } = await wait(() => sdk.commands.authorize({ client_id: clientId, response_type: 'code', scope: ['identify', 'guilds'] }), 30000);
      signal.throwIfAborted();
      if (!code) throw new Error('authorization');
      stage = 'exchange';
      const token = await wait(() => this.authClient.exchangeCode(code, signal));
      signal.throwIfAborted();
      stage = 'unexpected';
      const auth = await wait(() => sdk.commands.authenticate({ access_token: token.access_token })) as { user?: DiscordUserLike } | null;
      signal.throwIfAborted();
      if (!auth?.user?.id || !(auth.user.global_name || auth.user.username)) throw new Error('identity_missing');
      if (current()) {
        this.update({ currentUser: normalizeDiscordUser(auth.user), guildId: sdk.guildId ?? undefined, channelId: sdk.channelId ?? undefined, activityInstanceId: sdk.instanceId ?? undefined, authenticated: true, ready: true, connectionState: 'discord-authenticated', connectionError: undefined, initializationStatus: 'Connected to Discord' });
        void this.observeParticipants(sdk, controller);
      }
    } catch (error) {
      if (current()) {
        const reason = error instanceof OperationTimeout ? 'timeout' : stage;
        this.update({ authenticated: false, ready: true, connectionState: 'discord-error', connectionError: reason, initializationStatus: messages[reason] });
        controller.abort();
      }
    }
    return this.context;
  }
  continuePractice(): void {
    this.dispose();
    this.update({ ...makeDefaultLocalContext(), connectionError: undefined });
  }
  dispose(): void {
    this.controller?.abort(); this.controller = null; this.attempt = null;
    if (this.participantListener) {
      void this.sdk?.unsubscribe?.('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', this.participantListener).catch(() => {});
      this.participantListener = null;
    }
    // SDK.close sends CLOSE to Discord, ending the Activity. Keep the single SDK
    // transport for retries / React effect remounts; cancelled RPC results are ignored.
  }
  async closeActivity(): Promise<void> { this.dispose(); this.sdk?.close?.(1000, 'Activity closed'); }
  async inviteOrShareActivity(): Promise<void> {
    if (this.context.authenticated) await this.sdk?.commands.openInviteDialog?.().catch(() => {});
  }
  private update(patch: Partial<HostContext>): HostContext {
    this.context = { ...this.context, ...patch };
    for (const listener of this.listeners) listener(this.context);
    return this.context;
  }
  private async observeParticipants(sdk: DiscordSdkLike, controller: AbortController): Promise<void> {
    const current = () => this.controller === controller && !controller.signal.aborted;
    const listener = (event: unknown) => {
      if (!current()) return;
      const participants = normalizeParticipants((event as { participants?: DiscordUserLike[] })?.participants);
      this.update({ participants, participantCount: participants.length });
    };
    try {
      if (sdk.commands.getInstanceConnectedParticipants) {
        const result = await bounded(() => sdk.commands.getInstanceConnectedParticipants!(), controller.signal, 10000);
        if (current()) listener(result);
      }
      if (!current() || !sdk.subscribe) return;
      this.participantListener = listener;
      await sdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', listener);
      if (!current()) void sdk.unsubscribe?.('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', listener).catch(() => {});
    } catch { /* Participant information must not change authentication success. */ }
  }
}
