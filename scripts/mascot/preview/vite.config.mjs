import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  root: here,
  envDir: false,
  publicDir: fileURLToPath(new URL('../../../assets/brand/mascot/runtime/', import.meta.url)),
  server: { host: '127.0.0.1', port: 5187, strictPort: true },
  build: {
    modulePreload: { polyfill: false },
    outDir: fileURLToPath(new URL('../../../tmp/mascot/preview-dist/', import.meta.url)),
    emptyOutDir: true,
    rollupOptions: { input: { candidateLive: here + 'candidate-live.html', candidate: here + 'candidate.html', index: here + 'index.html', live: here + 'live.html', sprite: here + 'sprite.html' } },
  },
});
