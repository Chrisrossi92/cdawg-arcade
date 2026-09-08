import { afterEach, describe, expect, it, vi } from 'vitest';
import { containsLongDiscordId, createV1ProductUiPolicy, getActivePlayer, getProductionIdentityLabel } from './v1ProductPolicy';
import type { HostContext } from '../contracts/events';

const context: HostContext = {
  environment: 'discord',
  currentUser: { id: '1525653423804907542', displayName: 'CDAWG9000' },
  guildId: '1525653423804907542',
  channelId: '1525653424262217789',
  activityInstanceId: 'i-1525656234844356723-gc-1525653423804907542-1525653424262217789',
  authenticated: true,
  ready: true,
  role: 'spectator',
  initializationStatus: 'ready',
  participantCount: 1,
};

describe('V1 product policy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('hides prototype controls in normal production UI', () => {
    vi.stubEnv('DEV', false);
    const policy = createV1ProductUiPolicy('');

    expect(policy.showDevelopmentUi).toBe(false);
    expect(policy.showDiscordDebugState).toBe(false);
    expect(policy.showSessionIdentifiers).toBe(false);
    expect(policy.showSpectatorControls).toBe(false);
    expect(policy.showChallengeControls).toBe(false);
  });

  it('allows development diagnostics only behind an explicit dev flag', () => {
    vi.stubEnv('DEV', true);

    expect(createV1ProductUiPolicy('').showDevelopmentUi).toBe(false);
    expect(createV1ProductUiPolicy('?dev=1').showDevelopmentUi).toBe(true);
  });

  it('uses the authenticated Discord user as the active player', () => {
    expect(getActivePlayer(context)).toEqual(context.currentUser);
  });

  it('falls back to a local mock identity outside Discord auth', () => {
    expect(getProductionIdentityLabel({ ...context, environment: 'local', authenticated: false })).toBe('Local Player');
  });

  it('detects long Discord IDs that must not render in production UI', () => {
    expect(containsLongDiscordId(context.activityInstanceId ?? '')).toBe(true);
    expect(containsLongDiscordId('CDAWG9000')).toBe(false);
  });
});
