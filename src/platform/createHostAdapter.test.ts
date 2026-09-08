import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHostAdapter, resetHostAdapterForTests } from './createHostAdapter';
import { DiscordHostAdapter } from './discord/DiscordHostAdapter';
import { getLaunchDecision } from './discord/launchContext';

afterEach(() => { resetHostAdapterForTests(); vi.unstubAllEnvs(); });
describe('launch decisions', () => {
  it.each(['', '?other=yes', '?guild_id=123', '?user_id=123&display_name=Fake'])('browser remains practice with support enabled: %s', (search) => {
    vi.stubEnv('VITE_DISCORD_ENABLED', 'true');
    expect(getLaunchDecision(search)).toBe('browser');
    const adapter = createHostAdapter(search);
    expect(adapter).not.toBeInstanceOf(DiscordHostAdapter);
    expect(adapter.getContext()).toMatchObject({ connectionState: 'local-practice', authenticated: false });
  });
  it.each(['desktop', 'mobile'])('selects valid Discord %s context', (platform) => {
    expect(createHostAdapter(`?frame_id=frame&instance_id=instance&platform=${platform}`)).toBeInstanceOf(DiscordHostAdapter);
  });
  it.each([
    '?frame_id=f', '?instance_id=i', '?platform=desktop', '?frame_id=f&instance_id=i',
    '?frame_id=f&platform=desktop', '?instance_id=i&platform=desktop',
    '?frame_id=&instance_id=i&platform=desktop', '?frame_id=%20&instance_id=i&platform=desktop',
    '?frame_id=f&instance_id=i&platform=invalid', '?frame_id=f&frame_id=g&instance_id=i&platform=desktop',
  ])('rejects partial or malformed context: %s', (search) => {
    const adapter = createHostAdapter(search);
    expect(adapter).not.toBeInstanceOf(DiscordHostAdapter);
    expect(adapter.getContext()).toMatchObject({ connectionState: 'discord-error', connectionError: 'invalid-context', authenticated: false });
    adapter.continuePractice();
    expect(adapter.getContext().connectionState).toBe('local-practice');
  });
  it('reuses the adapter without starting effects in render', () => {
    expect(createHostAdapter()).toBe(createHostAdapter());
  });
});
