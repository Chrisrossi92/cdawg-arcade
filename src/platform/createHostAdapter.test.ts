import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHostAdapter, resetHostAdapterForTests } from './createHostAdapter';

vi.mock('@discord/embedded-app-sdk', () => ({
  DiscordSDK: class {
    ready = vi.fn().mockResolvedValue(undefined);
  },
}));

describe('createHostAdapter', () => {
  afterEach(() => {
    resetHostAdapterForTests();
    vi.unstubAllEnvs();
  });

  it('reuses the same local adapter instance', () => {
    vi.stubEnv('VITE_DISCORD_ENABLED', 'false');

    expect(createHostAdapter()).toBe(createHostAdapter());
  });

  it('reuses the same Discord adapter instance during development remounts', () => {
    vi.stubEnv('VITE_DISCORD_ENABLED', 'true');
    vi.stubEnv('VITE_DISCORD_CLIENT_ID', 'client-id');

    expect(createHostAdapter()).toBe(createHostAdapter());
  });
});
