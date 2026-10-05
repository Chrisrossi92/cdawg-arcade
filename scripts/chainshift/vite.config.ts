import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
// Explicit loopback candidate only. No dotenv, API proxy, production entry, or release gate.
export default defineConfig({
 envDir:false,publicDir:false,
 plugins:[react(),{
  name:'chainshift-local-entry',
  transformIndexHtml:{order:'pre',handler(html){return html.replace('/src/main.tsx','/src/games/chainshift/main.tsx').replace('user-scalable=no','interactive-widget=resizes-content').replace(/<title>.*?<\/title>/,'<title>Chainshift · Local Arcade</title>');}},
  generateBundle(_options,bundle){
   for(const item of Object.values(bundle))if(item.type==='chunk')for(const id of Object.keys(item.modules)){
    if(/phaser|@discord|src\/games\/balance|LOCAL_PUZZLES|review-data|METRICS_V2|reports-v2|local-puzzles-v2/.test(id))throw new Error('Unexpected dependency in local Chainshift bundle: '+id);
   }
  },
 }],
 server:{host:'127.0.0.1',port:5263,strictPort:true},
 build:{outDir:'tmp/chainshift/dist',emptyOutDir:true},
});
