import { isIP } from 'node:net';

export const siteOrigin = 'https://arcade.cdawgbot.xyz';
export const safeVersion = /^(?:[a-f0-9]{40}|development-[a-z0-9.-]{1,48})$/;
export interface ServerConfig {
  production: boolean;
  discordClientId: string;
  discordClientSecret: string;
  discordRedirectUri: string;
  port: number;
  host: string;
  allowedOrigins: string[];
  appVersion: string;
  releaseSha: string;
  discordConfigPresent: boolean;
  missingRequired: string[];
}
const supplied = (value?: string) => !!value && !value.startsWith('replace-with-') && value.trim() === value;
export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const production = env.NODE_ENV === 'production';
  const portText = env.PORT ?? env.SERVER_PORT ?? (production ? '10000' : '3001');
  if (!/^\d{1,5}$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) throw new Error('Invalid PORT or SERVER_PORT');
  const host = env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1');
  if (!isIP(host)) throw new Error('HOST must be an IP bind address');
  const missingRequired = ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_REDIRECT_URI'].filter(key => !supplied(env[key]));
  const discordClientId = env.DISCORD_CLIENT_ID ?? '';
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? (production ? '' : 'http://127.0.0.1:5173')).split(',').map(x => x.trim()).filter(Boolean);
  const releaseSha = env.RELEASE_SHA ?? env.RENDER_GIT_COMMIT ?? '';
  if (production) {
    const invalid = (key: string, valid: boolean) => { if (!valid && !missingRequired.includes(key)) missingRequired.push(key); };
    invalid('PORT', supplied(env.PORT));
    invalid('DISCORD_CLIENT_ID', /^\d{17,20}$/.test(discordClientId));
    invalid('DISCORD_CLIENT_SECRET', supplied(env.DISCORD_CLIENT_SECRET) && (env.DISCORD_CLIENT_SECRET?.length ?? 0) >= 16);
    try {
      const uri = new URL(env.DISCORD_REDIRECT_URI ?? '');
      invalid('DISCORD_REDIRECT_URI', uri.protocol === 'https:' && !uri.username && !uri.password && !uri.hash);
    } catch { invalid('DISCORD_REDIRECT_URI', false); }
    const expected = [siteOrigin, `https://${discordClientId}.discordsays.com`];
    invalid('ALLOWED_ORIGINS', allowedOrigins.length === 2 && expected.every(x => allowedOrigins.includes(x)));
    invalid('RELEASE_SHA', safeVersion.test(releaseSha));
  }
  const discordConfigPresent = !missingRequired.some(x => x.startsWith('DISCORD_'));
  return {
    production, discordClientId, discordClientSecret: env.DISCORD_CLIENT_SECRET ?? '',
    discordRedirectUri: env.DISCORD_REDIRECT_URI ?? 'https://127.0.0.1',
    port: Number(portText), host, allowedOrigins,
    appVersion: safeVersion.test(env.VITE_APP_VERSION ?? '') ? env.VITE_APP_VERSION! : 'development-local',
    releaseSha: safeVersion.test(releaseSha) ? releaseSha : 'development-unconfigured',
    discordConfigPresent, missingRequired,
  };
}
