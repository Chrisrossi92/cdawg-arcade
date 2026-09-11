import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({root,envDir:false,publicDir:false,server:{host:'127.0.0.1',port:5194,strictPort:true},build:{outDir:fileURLToPath(new URL('../../../tmp/mascot/correction-review-dist',import.meta.url)),emptyOutDir:true}});
