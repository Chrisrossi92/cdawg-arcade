import { afterEach, describe, expect, it, vi } from 'vitest';
import { shouldUseDiscordAdapter } from './DiscordHostAdapter';

describe('DiscordHostAdapter detection', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('falls back outside Discord when no activity markers are present', () => {
    vi.stubEnv('VITE_DISCORD_ENABLED', 'false');

    expect(shouldUseDiscordAdapter('?plain=true')).toBe(false);
  });

  it('detects Discord activity query markers', () => {
    vi.stubEnv('VITE_DISCORD_ENABLED', 'false');

    expect(shouldUseDiscordAdapter('?frame_id=abc')).toBe(true);
    expect(shouldUseDiscordAdapter('?instance_id=abc')).toBe(true);
  });

  it('can force Discord activity mode from environment config', () => {
    vi.stubEnv('VITE_DISCORD_ENABLED', 'true');

    expect(shouldUseDiscordAdapter('?plain=true')).toBe(true);
  });
});

describe('Discord auth storage safety', () => {
  it('does not persist token-shaped values in browser storage during tests', () => {
    expect(globalThis.localStorage?.getItem('access_token')).toBeFalsy();
    expect(globalThis.sessionStorage?.getItem('access_token')).toBeFalsy();
  });
});
