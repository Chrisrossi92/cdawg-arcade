import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  // Builds and tests never load private local dotenv files. Dev behavior is unchanged.
  envDir: command === 'build' || process.env.VITEST ? false : undefined,
  publicDir: command === 'build' ? false : 'public',
  plugins: [react()],
  server: {
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
}));
