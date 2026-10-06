import {defineConfig} from 'vite';
import local from './vite.config';
export default defineConfig({...local,plugins:[...(local.plugins??[]),{name:'chainshift-ranked-candidate-entry',transformIndexHtml:{order:'pre',handler(html){return html.replace('/src/games/chainshift/main.tsx','/src/games/chainshift/ranked-main.tsx').replace('Chainshift · Local Arcade','Chainshift · Ranked Local Candidate');}}}],server:{host:'127.0.0.1',port:5264,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:5265',changeOrigin:false}}},build:{outDir:'tmp/chainshift/ranked-dist',emptyOutDir:true}});
