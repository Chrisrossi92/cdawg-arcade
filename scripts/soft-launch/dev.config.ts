// Explicit loopback-only diagnostic review; never loads local dotenv or proxies an API.
import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';
export default defineConfig({envDir:false,publicDir:false,define:{__ARCADE_LOBBY__:true},plugins:[react(),{name:'local-arcade-entry',transformIndexHtml(html){return html.replace('/src/main.tsx','/src/arcade/main.tsx');}}],server:{host:'127.0.0.1',port:5255,strictPort:true}});
