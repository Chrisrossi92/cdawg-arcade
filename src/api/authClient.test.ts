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
