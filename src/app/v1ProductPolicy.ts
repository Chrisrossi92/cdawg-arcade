import type { HostContext } from '../contracts/events';

const longDiscordIdPattern = /\b\d{17,22}\b/;

export interface ProductUiPolicy {
  showDevelopmentUi: boolean;
  showDiscordDebugState: boolean;
  showSessionIdentifiers: boolean;
  showSpectatorControls: boolean;
  showChallengeControls: boolean;
}

export function createV1ProductUiPolicy(search = typeof window === 'undefined' ? '' : window.location.search): ProductUiPolicy {
  const params = new URLSearchParams(search);
  const showDevelopmentUi = import.meta.env.DEV && (params.has('dev') || params.has('tuning'));
  return {
    showDevelopmentUi,
    showDiscordDebugState: showDevelopmentUi,
    showSessionIdentifiers: showDevelopmentUi,
    showSpectatorControls: false,
    showChallengeControls: false,
  };
}

export function getActivePlayer(context: HostContext): HostContext['currentUser'] {
  return context.currentUser;
}

export function getProductionIdentityLabel(context: HostContext): string {
  if (context.authenticated) return context.currentUser.displayName;
  return context.environment === 'discord' ? 'Discord Player' : 'Local Player';
}

export function containsLongDiscordId(value: string): boolean {
  return longDiscordIdPattern.test(value);
}
