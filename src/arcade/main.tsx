import {createRoot} from 'react-dom/client';
import {ArcadeApp} from './ArcadeApp';
import {ArcadeRuntime} from './runtime';
import {createHostAdapter} from '../platform/createHostAdapter';
import {LocalScoreRepository} from '../services/scoreRepository';
const runtime=new ArcadeRuntime(createHostAdapter(),new LocalScoreRepository());
createRoot(document.getElementById('root')!).render(<ArcadeApp runtime={runtime}/>);
