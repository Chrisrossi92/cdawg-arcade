import type { ArcadeUser, HostContext } from '../../contracts/events';

export interface DiscordUserLike {
  id: string;
  username?: string;
  global_name?: string | null;
  avatar?: string | null;
}

export function normalizeDiscordUser(user: DiscordUserLike): ArcadeUser {
  return {
    id: user.id,
    displayName: user.global_name || user.username || user.id,
    avatarUrl: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : undefined,
  };
}

export function normalizeParticipants(participants: DiscordUserLike[] | undefined): ArcadeUser[] {
  return (participants ?? []).map(normalizeDiscordUser);
}

export function withDiscordContext(context: HostContext, patch: Partial<HostContext>): HostContext {
  return { ...context, ...patch, environment: 'discord' };
}
