import lobby from '../lobby/harness/vite.config.mjs';
import diagnostic from './vite.config';
export default {...lobby,plugins:diagnostic.plugins};
