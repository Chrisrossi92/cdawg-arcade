import { buildApiUrl } from './url';

export interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

export interface AuthApiClient {
  exchangeCode(code: string): Promise<TokenResponse>;
}

export class HttpAuthApiClient implements AuthApiClient {
  constructor(private readonly fetchImpl: typeof fetch = defaultFetch()) {}

  async exchangeCode(code: string): Promise<TokenResponse> {
    const response = await this.fetchImpl(buildApiUrl('/token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const body = (await response.json().catch(() => ({}))) as Partial<TokenResponse> & { error?: string };
    if (!response.ok || !body.access_token) {
      throw new Error(body.error ?? 'token_exchange_failed');
    }
    return { access_token: body.access_token, token_type: body.token_type, expires_in: body.expires_in, scope: body.scope };
  }
}

function defaultFetch(): typeof fetch {
  return globalThis.fetch.bind(globalThis);
}
