import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscordHostAdapter, type DiscordSdkLike } from './DiscordHostAdapter';
const search = '?frame_id=frame&instance_id=instance&platform=desktop';
const sensitive = 'PRIVATE_RESPONSE_DO_NOT_DISPLAY';
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }
function setup() {
  const sdk: DiscordSdkLike = {
    ready: vi.fn().mockResolvedValue(undefined),
    commands: {
      authorize: vi.fn().mockResolvedValue({ code: 'mock-code' }),
      authenticate: vi.fn().mockResolvedValue({ user: { id: 'player', username: 'Cdawg' } }),
      openInviteDialog: vi.fn().mockResolvedValue(undefined),
    },
    close: vi.fn(),
  };
  const exchangeCode = vi.fn().mockResolvedValue({ access_token: 'mock-token' });
  const factory = vi.fn(() => sdk);
  const options = { search, clientId: 'test-client', loadSdk: async () => factory, timeoutMs: 100 };
  const adapter = new DiscordHostAdapter({ exchangeCode }, options);
  return { sdk, exchangeCode, adapter, factory, options };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); });
describe('Discord connection lifecycle', () => {
  it('authenticates with SDK identity and does not expose code/token', async () => {
    const { adapter, sdk } = setup();
    await adapter.initialize();
    expect(adapter.getContext()).toMatchObject({ connectionState: 'discord-authenticated', authenticated: true, currentUser: { id: 'player', displayName: 'Cdawg' } });
    expect(JSON.stringify(adapter.getContext())).not.toMatch(/mock-code|mock-token/);
    await adapter.inviteOrShareActivity();
    expect(sdk.commands.openInviteDialog).toHaveBeenCalledOnce();
  });
  it('guards the constructor even when adapter is used directly', async () => {
    const { options, factory } = setup();
    const adapter = new DiscordHostAdapter(undefined, { ...options, search: '?instance_id=i&platform=desktop' });
    await adapter.initialize();
    expect(factory).not.toHaveBeenCalled();
    expect(adapter.getContext().connectionError).toBe('invalid-context');
  });
  it.each(['sdk', 'authorization', 'exchange', 'unexpected'] as const)('sanitizes and recovers from %s failure', async (stage) => {
    const { adapter, sdk, exchangeCode } = setup();
    const target = stage === 'sdk' ? sdk.ready : stage === 'authorization' ? sdk.commands.authorize : stage === 'exchange' ? exchangeCode : sdk.commands.authenticate;
    vi.mocked(target).mockRejectedValueOnce(new Error(sensitive));
    await adapter.initialize();
    expect(adapter.getContext()).toMatchObject({ connectionState: 'discord-error', connectionError: stage, authenticated: false });
    expect(JSON.stringify(adapter.getContext())).not.toContain(sensitive);
    expect(JSON.stringify(adapter.getContext())).not.toContain('Error:');
    await adapter.requestAuthentication();
    expect(adapter.getContext().connectionState).toBe('discord-authenticated');
    expect(sdk.ready).toHaveBeenCalledTimes(2);
    expect(sdk.close).not.toHaveBeenCalled();
  });
  it('retries a failed SDK import instead of caching its rejection', async () => {
    const { options, sdk } = setup();
    const loadSdk = vi.fn().mockRejectedValueOnce(new Error(sensitive)).mockResolvedValue(() => sdk);
    const adapter = new DiscordHostAdapter({ exchangeCode: async () => ({ access_token: 'mock-token' }) }, { ...options, loadSdk });
    await adapter.initialize();
    expect(adapter.getContext().connectionError).toBe('sdk');
    await adapter.requestAuthentication();
    expect(loadSdk).toHaveBeenCalledTimes(2);
    expect(adapter.getContext().connectionState).toBe('discord-authenticated');
  });
  it('does not construct an SDK after its import is cancelled', async () => {
    const { options, factory } = setup();
    const loading = deferred<(id: string) => DiscordSdkLike>();
    const adapter = new DiscordHostAdapter(undefined, { ...options, loadSdk: () => loading.promise });
    const attempt = adapter.initialize();
    await vi.advanceTimersByTimeAsync(0);
    adapter.continuePractice();
    loading.resolve(factory);
    await attempt;
    expect(factory).not.toHaveBeenCalled();
    expect(adapter.getContext().connectionState).toBe('local-practice');
  });
  it('does not let optional participant failures undo authentication', async () => {
    const { sdk, adapter } = setup();
    sdk.commands.getInstanceConnectedParticipants = vi.fn().mockRejectedValue(new Error(sensitive));
    await adapter.initialize();
    await vi.advanceTimersByTimeAsync(0);
    expect(adapter.getContext().connectionState).toBe('discord-authenticated');
  });
  it('rejects authentication without a real identity', async () => {
    const { adapter, sdk } = setup();
    vi.mocked(sdk.commands.authenticate).mockResolvedValue({});
    await adapter.initialize();
    expect(adapter.getContext()).toMatchObject({ authenticated: false, connectionError: 'unexpected' });
  });
  it.each(['sdk', 'authorization', 'exchange', 'authenticate'] as const)('bounds %s and ignores late completion after retry', async (stage) => {
    const { adapter, sdk, exchangeCode } = setup();
    const late = deferred<never>();
    const target = stage === 'sdk' ? sdk.ready : stage === 'authorization' ? sdk.commands.authorize : stage === 'exchange' ? exchangeCode : sdk.commands.authenticate;
    vi.mocked(target).mockReturnValueOnce(late.promise);
    const attempt = adapter.initialize();
    await vi.advanceTimersByTimeAsync(101);
    await attempt;
    expect(adapter.getContext()).toMatchObject({ connectionError: 'timeout', authenticated: false });
    await adapter.requestAuthentication();
    expect(adapter.getContext().connectionState).toBe('discord-authenticated');
    const context = adapter.getContext();
    late.resolve({ user: { id: 'stale', username: sensitive } } as never);
    await vi.advanceTimersByTimeAsync(0);
    expect(adapter.getContext()).toBe(context);
  });
  it('deduplicates concurrent retry clicks', async () => {
    const { adapter, sdk } = setup();
    const a = adapter.requestAuthentication();
    expect(adapter.requestAuthentication()).toBe(a);
    expect(adapter.requestAuthentication()).toBe(a);
    await a;
    expect(sdk.commands.authorize).toHaveBeenCalledOnce();
  });
  it('cancels pending work on unmount and starts fresh on remount', async () => {
    const { adapter, sdk } = setup();
    const late = deferred<void>();
    vi.mocked(sdk.ready).mockReturnValueOnce(late.promise);
    const a = adapter.initialize();
    await vi.advanceTimersByTimeAsync(0);
    adapter.dispose();
    await a;
    await adapter.initialize();
    late.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(sdk.commands.authorize).toHaveBeenCalledOnce();
    expect(adapter.getContext().connectionState).toBe('discord-authenticated');
  });
  it('practice cancels pending authentication and cannot be overwritten', async () => {
    const { adapter, sdk } = setup();
    const late = deferred<unknown>();
    vi.mocked(sdk.commands.authenticate).mockReturnValueOnce(late.promise);
    const a = adapter.initialize();
    await vi.advanceTimersByTimeAsync(0);
    adapter.continuePractice();
    late.resolve({ user: { id: 'stale', username: sensitive } });
    await a;
    expect(adapter.getContext()).toMatchObject({ connectionState: 'local-practice', environment: 'local', authenticated: false, ready: true });
  });
  it('continues practice after failure without authenticating or clearing scores', async () => {
    const { adapter, sdk } = setup();
    vi.mocked(sdk.ready).mockRejectedValue(new Error(sensitive));
    await adapter.initialize();
    adapter.continuePractice();
    expect(adapter.getContext()).toMatchObject({ connectionState: 'local-practice', authenticated: false, ready: true, currentUser: { id: 'local-player' } });
    expect(sdk.commands.authenticate).not.toHaveBeenCalled();
  });
});

describe('Arcade verified-session lifecycle',()=>{
  function sessionsSetup() {
    const view={status:'verified' as const,player:{id:'234567890123456789',displayName:'Verified Player'},guild:{id:'345678901234567890'},csrf:'x'.repeat(43),expiresAt:'2026-09-10T00:00:00Z',idleExpiresAt:'2026-09-09T20:00:00Z'};
    const sessions={hasSession:true,challenge:vi.fn().mockResolvedValue({challengeId:'synthetic',codeChallenge:'x'.repeat(43),codeChallengeMethod:'S256'}),establish:vi.fn().mockResolvedValue({session:view,access_token:'TRANSIENT_PRIVATE_TOKEN'}),me:vi.fn().mockResolvedValue(view),logout:vi.fn().mockResolvedValue(undefined),discrepancy:vi.fn().mockResolvedValue(undefined)};
    const original=setup();vi.mocked(original.sdk.commands.authenticate).mockResolvedValue({user:{id:view.player.id,username:'SDK display'}});original.sdk.subscribe=vi.fn().mockResolvedValue(undefined);original.sdk.unsubscribe=vi.fn().mockResolvedValue(undefined);
    const adapter=new DiscordHostAdapter({exchangeCode:original.exchangeCode},{...original.options,sessions:sessions as unknown as import('../../api/sessionClient').ArcadeSessionClient});return {...original,adapter,sessions,view};
  }
  it('uses the verified backend display and sends PKCE to SDK authorization',async()=>{const {adapter,sdk,exchangeCode}=sessionsSetup();await adapter.initialize();expect(adapter.getContext()).toMatchObject({arcadeSessionState:'verified',currentUser:{displayName:'Verified Player'},guildId:'345678901234567890'});expect(sdk.commands.authorize).toHaveBeenCalledWith(expect.objectContaining({code_challenge:'x'.repeat(43),code_challenge_method:'S256'}));expect(exchangeCode).not.toHaveBeenCalled();expect(JSON.stringify(adapter.getContext())).not.toContain('TRANSIENT_PRIVATE_TOKEN');adapter.dispose();});
  it('records SDK mismatch but keeps backend identity authoritative',async()=>{const {adapter,sdk,sessions}=sessionsSetup();vi.mocked(sdk.commands.authenticate).mockResolvedValue({user:{id:'456789012345678901',username:'Untrusted display'}});await adapter.initialize();expect(adapter.getContext().currentUser.id).toBe('234567890123456789');expect(sessions.discrepancy).toHaveBeenCalledOnce();adapter.dispose();});
  it('keeps verification failure honest without returning a verified state',async()=>{const {adapter,sessions}=sessionsSetup();sessions.establish.mockRejectedValue(new Error('PRIVATE_PROVIDER_ERROR'));await adapter.initialize();expect(adapter.getContext().authenticated).toBe(false);expect(adapter.getContext().arcadeSessionState).not.toBe('verified');expect(JSON.stringify(adapter.getContext())).not.toContain('PRIVATE_PROVIDER_ERROR');adapter.dispose();});
  it('does not report successful logout when durable revocation fails',async()=>{const {adapter,sessions}=sessionsSetup();await adapter.initialize();sessions.logout.mockRejectedValue(new Error('database unavailable'));adapter.continuePractice();await vi.advanceTimersByTimeAsync(0);expect(adapter.getContext()).toMatchObject({authenticated:false,connectionState:'discord-error',arcadeSessionState:'unavailable'});expect(adapter.getContext().initializationStatus).toContain('sign-out could not finish');adapter.dispose();});
  it('blocks reconnect until logout settles',async()=>{const {adapter,sessions}=sessionsSetup();await adapter.initialize();const wait=deferred<void>();sessions.logout.mockReturnValue(wait.promise);adapter.continuePractice();await adapter.requestAuthentication();expect(sessions.establish).toHaveBeenCalledOnce();wait.resolve();await vi.advanceTimersByTimeAsync(0);expect(adapter.getContext().arcadeSessionState).toBe('signed-out');adapter.dispose();});
  it('invalidates display and requests revocation on account change',async()=>{const {adapter,sdk,sessions}=sessionsSetup();await adapter.initialize();const handler=vi.mocked(sdk.subscribe!).mock.calls.find(x=>x[0]==='CURRENT_USER_UPDATE')![1];handler({id:'456789012345678901'});expect(adapter.getContext()).toMatchObject({authenticated:false,arcadeSessionState:'account-changed'});expect(sessions.logout).toHaveBeenCalledOnce();adapter.dispose();});
});
