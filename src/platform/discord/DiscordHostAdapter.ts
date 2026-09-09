import { ArcadeSessionClient, SessionClientError } from '../../api/sessionClient';
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
    authorize: (args: { client_id: string; scope: string[]; response_type: 'code'; code_challenge?: string; code_challenge_method?: 'S256' }) => Promise<{ code: string }>;
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
  sessions?: ArcadeSessionClient;
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
  private accountListener: ((event: unknown) => void) | null = null;
  private participantListener: ((event: unknown) => void) | null = null;
  private readonly search: string;
  private readonly sessions: ArcadeSessionClient | null;
  private verifiedSession = false;
  private signingOut = false;
  private sessionTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly authClient: AuthApiClient = new HttpAuthApiClient(), private readonly options: Options = {}) {
    this.sessions = options.sessions ?? (authClient instanceof HttpAuthApiClient ? new ArcadeSessionClient() : null);
    this.search = options.search ?? (typeof window === 'undefined' ? '' : window.location.search);
  }
  getContext(): HostContext { return this.context; }
  subscribe(listener: (context: HostContext) => void): () => void {
    this.listeners.add(listener); listener(this.context);
    return () => { this.listeners.delete(listener); };
  }
  initialize(): Promise<HostContext> { return this.requestAuthentication(); }
  requestAuthentication(): Promise<HostContext> {
    if (this.signingOut) return Promise.resolve(this.context);
    if (this.attempt) return this.attempt;
    if (this.context.connectionState === 'discord-authenticated' && !this.sessions) return Promise.resolve(this.context);
    this.controller?.abort();
    if (this.sessionTimer) clearInterval(this.sessionTimer);
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
      this.update({ ...makeDefaultLocalContext(), environment: 'discord', connectionState: 'discord-connecting', connectionError: undefined, arcadeSessionState:this.sessions?'verifying':undefined, ready: false, initializationStatus: 'Connecting to Discord…' });
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
      let challenge = null;
      if (this.sessions) {
        this.update({arcadeSessionState:'verifying'});
        try {challenge = await this.sessions.challenge(signal);} catch {if (current()) this.update({arcadeSessionState:'unavailable'});}
      }
      signal.throwIfAborted();
      stage = 'authorization';
      const { code } = await wait(() => sdk.commands.authorize({ client_id: clientId, response_type: 'code', scope: ['identify', 'guilds'], ...(challenge ? {code_challenge:challenge.codeChallenge,code_challenge_method:challenge.codeChallengeMethod} : {}) }), 30000);
      signal.throwIfAborted();
      if (!code) throw new Error('authorization');
      stage = 'exchange';
      const established = challenge && this.sessions ? await this.sessions.establish(challenge,code,sdk.instanceId ?? '',signal) : null;
      const token = established ? {access_token:established.access_token} : await wait(() => this.authClient.exchangeCode(code, signal));
      signal.throwIfAborted();
      stage = 'unexpected';
      const auth = await wait(() => sdk.commands.authenticate({ access_token: token.access_token })) as { user?: DiscordUserLike } | null;
      token.access_token = '';
      if (established) established.access_token = '';
      signal.throwIfAborted();
      if (!auth?.user?.id || !(auth.user.global_name || auth.user.username)) throw new Error('identity_missing');
      if (current()) {
        this.verifiedSession = !!established;
        this.update({ currentUser: established ? {id:established.session.player.id,displayName:established.session.player.displayName} : normalizeDiscordUser(auth.user), guildId: established?.session.guild.id ?? sdk.guildId ?? undefined, arcadeSessionState: established ? 'verified' : this.sessions ? 'unavailable' : undefined, channelId: sdk.channelId ?? undefined, activityInstanceId: sdk.instanceId ?? undefined, authenticated: true, ready: true, connectionState: 'discord-authenticated', connectionError: undefined, initializationStatus: 'Connected to Discord' });
        if (established && auth.user.id !== established.session.player.id) void this.sessions?.discrepancy(signal).catch(() => {});
        if (this.accountListener) void sdk.unsubscribe?.('CURRENT_USER_UPDATE',this.accountListener).catch(() => {});
        this.accountListener = event => {
          const id = (event as {id?:string})?.id;
          if (current() && id && id !== this.context.currentUser.id) {
            this.update({arcadeSessionState:'account-changed',authenticated:false,connectionState:'discord-error',initializationStatus:'Different Discord account detected. Reconnect or continue in practice.'});
            if (this.sessions && !this.signingOut) {
              this.signingOut=true;
              void this.sessions.logout().catch(() => {}).finally(() => {this.signingOut=false;});
            }
          }
        };
        void sdk.subscribe?.('CURRENT_USER_UPDATE',this.accountListener).catch(() => {});
        void this.observeParticipants(sdk, controller);
        if (established && this.sessions) {
          if (this.sessionTimer) clearInterval(this.sessionTimer);
          this.sessionTimer = setInterval(() => {
            void this.sessions!.me(signal).then(value => {
              if (current() && value.player.id !== this.context.currentUser.id) {this.update({arcadeSessionState:'account-changed',authenticated:false,connectionState:'discord-error',initializationStatus:'Different Discord account detected. Reconnect or continue in practice.'});}
            }).catch(error => {if(current()) this.update({arcadeSessionState:error instanceof SessionClientError && error.code==='expired'?'expired':'unavailable'});});
          },60000);
        }
      }
    } catch (error) {
      if (current()) {
        if (error instanceof SessionClientError) this.update({arcadeSessionState:error.code==='account_changed'?'account-changed':'unavailable'});
        const reason = error instanceof OperationTimeout ? 'timeout' : stage;
        this.update({ authenticated: false, ready: true, connectionState: 'discord-error', connectionError: reason, initializationStatus: messages[reason] });
        controller.abort();
      }
    }
    return this.context;
  }
  continuePractice(): void {
    if (this.signingOut) return;
    const needsLogout = this.verifiedSession || this.sessions?.hasSession;
    this.dispose();
    if (!needsLogout || !this.sessions) {
      this.update({ ...makeDefaultLocalContext(), arcadeSessionState:undefined, connectionError:undefined });
      return;
    }
    this.signingOut=true;
    this.update({authenticated:false,arcadeSessionState:'unavailable',initializationStatus:'Signing out of the server session…'});
    void this.sessions.logout().then(() => {
      this.verifiedSession=false;
      this.update({...makeDefaultLocalContext(),arcadeSessionState:'signed-out',connectionError:undefined});
    }).catch(() => {
      this.update({authenticated:false,connectionState:'discord-error',arcadeSessionState:'unavailable',initializationStatus:'Server sign-out could not finish. Practice is available; retry disconnect when the connection returns.'});
    }).finally(() => {this.signingOut=false;});
  }
  dispose(): void {
    if (this.sessionTimer) clearInterval(this.sessionTimer);
    this.controller?.abort(); this.controller = null; this.attempt = null;
    if (this.accountListener) {
      void this.sdk?.unsubscribe?.('CURRENT_USER_UPDATE',this.accountListener).catch(() => {});
      this.accountListener=null;
    }
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
