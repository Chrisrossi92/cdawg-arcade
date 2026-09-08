import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createServerApp } from './app';
import { loadServerConfig } from './env';
import { DiscordTokenExchangeService, SafeTokenExchangeError, type TokenExchangeService } from './tokenExchange';

const config = loadServerConfig({
  DISCORD_CLIENT_ID: 'client-id',
  DISCORD_CLIENT_SECRET: 'client-secret',
  DISCORD_REDIRECT_URI: 'https://127.0.0.1',
  ALLOWED_ORIGINS: 'http://127.0.0.1:5173',
});

describe('server environment validation', () => {
  it('reports missing Discord backend variables without values', () => {
    const missing = loadServerConfig({});

    expect(missing.discordConfigPresent).toBe(false);
    expect(missing.missingRequired).toEqual(['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_REDIRECT_URI']);
  });
});

describe('token exchange service', () => {
  it('exchanges a code using mocked Discord fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'access-token', token_type: 'Bearer', expires_in: 123 }),
    });
    const service = new DiscordTokenExchangeService(config, fetchMock as unknown as typeof fetch);

    await expect(service.exchangeCode('valid-code')).resolves.toMatchObject({ access_token: 'access-token' });
    expect(String(fetchMock.mock.calls[0][1].body)).toContain('grant_type=authorization_code');
  });

  it('normalizes Discord token errors safely', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error_description: 'secret detail' }),
    });
    const service = new DiscordTokenExchangeService(config, fetchMock as unknown as typeof fetch);

    await expect(service.exchangeCode('valid-code')).rejects.toMatchObject({ code: 'discord_token_exchange_failed' });
  });
});

describe('server routes', () => {
  it('responds to health without exposing secrets', async () => {
    const app = createServerApp(config, { exchangeCode: async () => ({ access_token: 'token' }) });
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body.discordConfigPresent).toBe(true);
    expect(JSON.stringify(response.body)).not.toContain('client-secret');
  });

  it('rejects malformed token requests', async () => {
    const app = createServerApp(config, { exchangeCode: async () => ({ access_token: 'token' }) });

    await request(app).post('/api/token').send({ code: '' }).expect(400);
  });

  it('does not expose secret-bearing exchange failures', async () => {
    const service: TokenExchangeService = {
      exchangeCode: async () => {
        throw new SafeTokenExchangeError('discord_token_exchange_failed', 401);
      },
    };
    const app = createServerApp(config, service);
    const response = await request(app).post('/api/token').send({ code: 'valid-code' }).expect(400);

    expect(response.body).toEqual({ error: 'discord_token_exchange_failed' });
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });

  it('allows Discord Activity proxy origins for iframe token exchange', async () => {
    const app = createServerApp(config, { exchangeCode: async () => ({ access_token: 'token' }) });

    await request(app)
      .post('/api/token')
      .set('Origin', 'https://1525643672194908330.discordsays.com')
      .send({ code: 'valid-code' })
      .expect(200);
  });
});


describe('safe parser and CORS errors', () => {
  it('does not send raw parser errors or stack traces', async () => {
    const app = createServerApp(config, { exchangeCode: async () => ({ access_token: 'mock-token' }) });
    const response = await request(app).post('/api/token').set('Content-Type', 'application/json').send('{PRIVATE_MALFORMED_BODY').expect(400);
    expect(response.body).toEqual({ error: 'invalid_request' });
    expect(response.text).not.toContain('PRIVATE_MALFORMED_BODY');
  });
  it('sanitizes disallowed origin failures', async () => {
    const app = createServerApp(config, { exchangeCode: async () => ({ access_token: 'mock-token' }) });
    const response = await request(app).post('/api/token').set('Origin', 'https://untrusted.example').send({ code: 'mock-code' }).expect(400);
    expect(response.body).toEqual({ error: 'invalid_request' });
  });
});
