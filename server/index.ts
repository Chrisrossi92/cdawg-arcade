import dotenv from 'dotenv';
import { createServerApp } from './app';
import { loadServerConfig } from './env';
import { DiscordTokenExchangeService } from './tokenExchange';

dotenv.config();

const config = loadServerConfig();
if (config.missingRequired.length) {
  console.warn(`Missing backend Discord config: ${config.missingRequired.join(', ')}`);
}

const app = createServerApp(config, new DiscordTokenExchangeService(config));
app.listen(config.port, '127.0.0.1', () => {
  console.log(`Cdawg Arcade auth server listening at http://127.0.0.1:${config.port}`);
});
