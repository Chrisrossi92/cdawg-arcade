import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],envDir:false,publicDir:false,server:{host:'127.0.0.1',port:4185,strictPort:true},define:{'import.meta.env.VITE_DISCORD_CLIENT_ID':JSON.stringify('123456789012345678')}});
