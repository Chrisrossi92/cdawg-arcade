import {defineConfig} from 'vite';
import config from '../../vite.config';
export default defineConfig({...config({command:'serve',mode:'chainshift-integration',isSsrBuild:false,isPreview:false}),envDir:false,publicDir:false,
 // Scan this candidate's entry only. Repository-wide HTML discovery also pulls in
 // unrelated mascot experiments whose optional dependencies are not installed.
 optimizeDeps:{entries:['index.html']},
 plugins:[...((config({command:'serve',mode:'chainshift-integration',isSsrBuild:false,isPreview:false}) as {plugins?:[]}).plugins??[]),{name:'local-integrated-entry',transformIndexHtml:{order:'pre',handler(html){return html.replace('/src/arcade/main.tsx','/src/arcade/chainshift-candidate.tsx');}}}],
 server:{watch:{ignored:['**/tmp/**','**/dist/**','**/build/**']},host:'127.0.0.1',port:5266,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:5267',changeOrigin:false}}}});
