import type { HostAdapter } from './hostAdapter';
import { makeDefaultLocalContext } from './hostAdapter';
import { DiscordHostAdapter } from './discord/DiscordHostAdapter';
import { getLaunchDecision } from './discord/launchContext';
import { LocalHostAdapter } from './local/LocalHostAdapter';

let sharedHostAdapter: HostAdapter | null = null;

export function createHostAdapter(search = typeof window === 'undefined' ? '' : window.location.search): HostAdapter {
  if (sharedHostAdapter) return sharedHostAdapter;
  const decision = getLaunchDecision(search);
  sharedHostAdapter = decision === 'discord' ? new DiscordHostAdapter(undefined, { search }) : new LocalHostAdapter({
    ...makeDefaultLocalContext(),
    ...(decision === 'invalid' ? {
      connectionState: 'discord-error' as const,
      connectionError: 'invalid-context' as const,
      initializationStatus: 'Discord launch information is incomplete. Relaunch from Discord or continue in practice.',
    } : {}),
  });
  return sharedHostAdapter;
}

export function resetHostAdapterForTests(): void {
  sharedHostAdapter?.dispose();
  sharedHostAdapter = null;
}
