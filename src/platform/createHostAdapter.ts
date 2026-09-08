import type { HostAdapter } from './hostAdapter';
import { DiscordHostAdapter, shouldUseDiscordAdapter } from './discord/DiscordHostAdapter';
import { LocalHostAdapter } from './local/LocalHostAdapter';

let sharedHostAdapter: HostAdapter | null = null;

export function createHostAdapter(): HostAdapter {
  if (sharedHostAdapter) return sharedHostAdapter;

  if (shouldUseDiscordAdapter()) {
    const adapter = new DiscordHostAdapter();
    void adapter.initialize();
    sharedHostAdapter = adapter;
    return sharedHostAdapter;
  }

  sharedHostAdapter = new LocalHostAdapter();
  return sharedHostAdapter;
}

export function resetHostAdapterForTests(): void {
  sharedHostAdapter = null;
}
