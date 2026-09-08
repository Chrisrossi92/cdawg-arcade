import { describe, expect, it } from 'vitest';
import { buildApiUrl } from './url';

describe('API URL construction', () => {
  it('supports proxied relative API mappings', () => {
    expect(buildApiUrl('/token', '/api')).toBe('/api/token');
  });

  it('supports configured absolute backend URLs', () => {
    expect(buildApiUrl('/health', 'https://example.trycloudflare.com/api')).toBe('https://example.trycloudflare.com/api/health');
  });
});
