import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpAuthApiClient } from './authClient';

describe('HttpAuthApiClient', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('binds default fetch to globalThis for browser iframe contexts', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '/api');
    const fetchMock = vi.fn(function (this: typeof globalThis) {
      expect(this).toBe(globalThis);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ access_token: 'token' }),
      } as Response);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(new HttpAuthApiClient().exchangeCode('code')).resolves.toEqual({ access_token: 'token' });
    expect(fetchMock).toHaveBeenCalledWith('/api/token', expect.objectContaining({ method: 'POST' }));
  });
});


describe('safe bounded exchange', () => {
  afterEach(() => vi.useRealTimers());
  it('never relays backend response text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'PRIVATE_BACKEND_DATA' }) });
    await expect(new HttpAuthApiClient(fetchMock).exchangeCode('mock-code')).rejects.toThrow('token_exchange_failed');
  });
  it('bounds fetch and aborts the network request', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const fetchMock = vi.fn((_url, options) => { signal = options.signal; return new Promise<Response>(() => {}); });
    const promise = new HttpAuthApiClient(fetchMock, 50).exchangeCode('mock-code');
    const result = expect(promise).rejects.toThrow('operation_timeout');
    await vi.advanceTimersByTimeAsync(51);
    await result;
    expect(signal?.aborted).toBe(true);
  });
  it('bounds a hanging response body', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => new Promise(() => {}) });
    const result = expect(new HttpAuthApiClient(fetchMock, 50).exchangeCode('mock-code')).rejects.toThrow('operation_timeout');
    await vi.advanceTimersByTimeAsync(51);
    await result;
  });
});
