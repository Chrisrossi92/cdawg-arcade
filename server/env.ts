export interface ServerConfig {
  discordClientId: string;
  discordClientSecret: string;
  discordRedirectUri: string;
  port: number;
  allowedOrigins: string[];
  appVersion: string;
  discordConfigPresent: boolean;
  missingRequired: string[];
}

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const missingRequired = ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_REDIRECT_URI'].filter(
    (key) => !env[key] || env[key]?.startsWith('replace-with-'),
  );
  return {
    discordClientId: env.DISCORD_CLIENT_ID ?? '',
    discordClientSecret: env.DISCORD_CLIENT_SECRET ?? '',
    discordRedirectUri: env.DISCORD_REDIRECT_URI ?? 'https://127.0.0.1',
    port: Number(env.SERVER_PORT ?? 3001),
    allowedOrigins: (env.ALLOWED_ORIGINS ?? 'http://127.0.0.1:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    appVersion: env.VITE_APP_VERSION ?? env.APP_VERSION ?? 'local-dev',
    discordConfigPresent: missingRequired.length === 0,
    missingRequired,
  };
}
