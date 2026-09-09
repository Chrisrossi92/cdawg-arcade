import type { ServerConfig } from '../env.js';
export interface VerifiedIdentity { userId: string; displayName: string; avatarHash: string | null; guildId: string; }
export interface VerifiedBootstrap { identity: VerifiedIdentity; accessToken: string; }
export interface IdentityProvider { verify(code: string, verifier: string, instance: string, signal: AbortSignal): Promise<VerifiedBootstrap>; }
const snowflake = /^[1-9][0-9]{16,19}$/;
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
export class VerificationFailure extends Error { constructor() { super('verification_unavailable'); } }
export class DiscordIdentityProvider implements IdentityProvider {
  constructor(private config: ServerConfig, private botToken: string, private fetchImpl: typeof fetch = fetch) {}
  async verify(code: string, verifier: string, instance: string, signal: AbortSignal): Promise<VerifiedBootstrap> {
    const bounded = AbortSignal.any([signal, AbortSignal.timeout(7500)]);
    const request = async (url: string, init: RequestInit): Promise<Record<string, unknown>> => {
      const response = await this.fetchImpl(url, { ...init, redirect: 'error', signal: bounded });
      if (!response.ok || !response.body) throw new VerificationFailure();
      const reader = response.body.getReader();
      let length = 0; const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const {value, done} = await reader.read(); if (done) break;
          length += value.length; if (length > 65536) throw new VerificationFailure(); chunks.push(value);
        }
      } finally { await reader.cancel().catch(() => {}); }
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!record(body)) throw new VerificationFailure(); return body;
    };
    try {
      const token = await request('https://discord.com/api/oauth2/token', {
        method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({client_id: this.config.discordClientId, client_secret: this.config.discordClientSecret,
          grant_type: 'authorization_code', code, redirect_uri: this.config.discordRedirectUri, code_verifier: verifier}),
      });
      if (typeof token.access_token !== 'string' || !token.access_token || token.access_token.length > 4096 ||
          token.token_type !== 'Bearer' || typeof token.scope !== 'string' || !token.scope.split(' ').includes('identify')) throw new VerificationFailure();
      const user = await request('https://discord.com/api/v10/users/@me', {headers:{Authorization: `Bearer ${token.access_token}`}});
      const activity = await request(`https://discord.com/api/applications/${this.config.discordClientId}/activity-instances/${encodeURIComponent(instance)}`, {headers:{Authorization: `Bot ${this.botToken}`}});
      const name = typeof user.global_name === 'string' && user.global_name ? user.global_name : user.username;
      if (typeof user.id !== 'string' || !snowflake.test(user.id) || typeof name !== 'string' || !name.trim() || name.length > 100 ||
          activity.application_id !== this.config.discordClientId || activity.instance_id !== instance ||
          !record(activity.location) || activity.location.kind !== 'gc' || typeof activity.location.guild_id !== 'string' || !snowflake.test(activity.location.guild_id) ||
          !Array.isArray(activity.users) || !activity.users.includes(user.id)) throw new VerificationFailure();
      return { identity: {userId: user.id, displayName: name, guildId: activity.location.guild_id,
        avatarHash: typeof user.avatar === 'string' && /^(?:a_)?[a-f0-9]{32}$/.test(user.avatar) ? user.avatar : null}, accessToken: token.access_token };
    } catch { throw new VerificationFailure(); }
  }
}
