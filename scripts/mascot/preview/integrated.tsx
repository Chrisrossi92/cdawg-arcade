import {createRoot} from 'react-dom/client';
import {BalanceExperience} from '../../../src/games/balance/BalanceExperience';
import {MemoryScoreRepository} from '../../../src/services/scoreRepository';
import {makeDefaultLocalContext} from '../../../src/platform/hostAdapter';
import '../../../src/styles/global.css';
// Actual application UI and gameplay. Explicit in-memory repository: no database or score persistence.
createRoot(document.querySelector('#root')!).render(<BalanceExperience scoreRepository={new MemoryScoreRepository()} hostContext={makeDefaultLocalContext()} />);
