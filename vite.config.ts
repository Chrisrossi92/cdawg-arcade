import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { lobbyEnabled } from './config/lobby-release';

export default defineConfig(({ command, mode }) => ({
  // Builds and tests never load private local dotenv files. Dev behavior is unchanged.
  envDir: command === 'build' || process.env.VITEST || mode === 'lobby-integration' ? false : undefined,
  publicDir: command === 'build' ? false : 'public',
  define: { __ARCADE_LOBBY__: lobbyEnabled(mode) },
  plugins: [react(), {name:'arcade-entry', transformIndexHtml: {order:'pre',handler(html) {
    return lobbyEnabled(mode) ? html.replace('/src/main.tsx','/src/arcade/main.tsx') : html;
  }}}],
  server: {
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
}));
