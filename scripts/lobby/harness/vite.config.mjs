import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const here=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({root:here,envDir:false,publicDir:false,define:{__ARCADE_LOBBY__:true},esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:5196,strictPort:true},build:{target:'esnext',rollupOptions:{input:{index:here+'index.html',responsive:here+'responsive.html',candidate:here+'candidate.html'}},outDir:fileURLToPath(new URL('../../../tmp/lobby-integration/harness',import.meta.url)),emptyOutDir:true}});
