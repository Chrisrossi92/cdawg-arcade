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
