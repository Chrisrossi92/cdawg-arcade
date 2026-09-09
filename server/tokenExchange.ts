import type { ServerConfig } from './env.js';

export interface TokenExchangeService {
  exchangeCode(code: string, signal?: AbortSignal): Promise<TokenExchangeResult>;
}

export interface TokenExchangeResult {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

export class DiscordTokenExchangeService implements TokenExchangeService {
  constructor(
    private readonly config: ServerConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async exchangeCode(code: string, signal?: AbortSignal): Promise<TokenExchangeResult> {
    if (!this.config.discordConfigPresent) {
      throw new SafeTokenExchangeError('missing_discord_config', 500);
    }

    const response = await this.fetchImpl('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.discordClientId,
        client_secret: this.config.discordClientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.discordRedirectUri,
      }),
      redirect: 'error',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
    });

    const body = (await response.json().catch(() => ({}))) as Partial<TokenExchangeResult>;
    if (!response.ok || typeof body.access_token !== 'string' || !body.access_token) {
      throw new SafeTokenExchangeError('discord_token_exchange_failed', response.status || 502);
    }
    return {
      access_token: body.access_token,
      token_type: body.token_type,
      expires_in: body.expires_in,
      scope: body.scope,
    };
  }
}

export class SafeTokenExchangeError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}
