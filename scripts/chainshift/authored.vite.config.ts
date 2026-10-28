import {defineConfig} from 'vite';
import config from '../../vite.config';
const base=config({command:'serve',mode:'chainshift-authored-integration',isSsrBuild:false,isPreview:false});
export default defineConfig({...base,mode:'chainshift-authored-integration',envDir:false,publicDir:false,optimizeDeps:{entries:['index.html']},
 plugins:[...(base.plugins??[]),{name:'local-authored-entry',transformIndexHtml:{order:'pre',handler(html){return html.replace('/src/arcade/main.tsx','/src/arcade/chainshift-candidate.tsx');}}}],
 server:{fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/server/**','**/build/**','**/tmp/**','**/research/**','**/docs/**']},watch:{ignored:['**/tmp/**','**/dist/**','**/build/**']},host:'127.0.0.1',port:5280,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:5281',changeOrigin:false}}}});
