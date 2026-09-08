import { buildApiUrl } from './url';
import { bounded, OperationTimeout } from './bounded';
export interface TokenResponse { access_token: string; token_type?: string; expires_in?: number; scope?: string; }
export interface AuthApiClient { exchangeCode(code: string, signal?: AbortSignal): Promise<TokenResponse>; }
export class HttpAuthApiClient implements AuthApiClient {
  constructor(private readonly fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis), private readonly timeoutMs = 10000) {}
  async exchangeCode(code: string, parent?: AbortSignal): Promise<TokenResponse> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (parent?.aborted) abort();
    parent?.addEventListener('abort', abort, { once: true });
    try {
      return await bounded(async () => {
        const response = await this.fetchImpl(buildApiUrl('/token'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }), signal: controller.signal,
        });
        if (!response.ok) throw new Error('token_exchange_failed');
        const body = await response.json() as Partial<TokenResponse> | null;
        if (!body || typeof body.access_token !== 'string' || !body.access_token) throw new Error('token_exchange_failed');
        return { access_token: body.access_token };
      }, controller.signal, this.timeoutMs);
    } catch (error) {
      if (error instanceof OperationTimeout) throw error;
      throw new Error('token_exchange_failed');
    } finally {
      controller.abort(); parent?.removeEventListener('abort', abort);
    }
  }
}
