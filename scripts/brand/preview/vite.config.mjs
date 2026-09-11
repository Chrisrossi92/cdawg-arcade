import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const here=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({root:here,envDir:false,publicDir:false,esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:5193,strictPort:true},build:{outDir:fileURLToPath(new URL('../../../tmp/brand/preview-dist',import.meta.url)),emptyOutDir:true,rollupOptions:{input:{index:here+'index.html',balance:here+'balance.html'}}}});
