import { useEffect, useMemo, useState } from 'react';
import { BalanceExperience } from '../games/balance/BalanceExperience';
import { LocalScoreRepository } from '../services/scoreRepository';
import { createHostAdapter } from '../platform/createHostAdapter';
import type { HostContext } from '../contracts/events';

export function App() {
  const hostAdapter = useMemo(() => createHostAdapter(), []);
  const [hostContext, setHostContext] = useState<HostContext>(() => hostAdapter.getContext());
  const scoreRepository = useMemo(() => new LocalScoreRepository(), []);

  useEffect(() => {
    const unsubscribe = hostAdapter.subscribe(setHostContext);
    if (hostAdapter.environment === 'discord') void hostAdapter.requestAuthentication();
    return () => { unsubscribe(); hostAdapter.dispose(); };
  }, [hostAdapter]);

  return <BalanceExperience hostContext={hostContext} scoreRepository={scoreRepository} onRetryConnection={() => { void hostAdapter.requestAuthentication(); }} onContinuePractice={() => hostAdapter.continuePractice()} />;
}
