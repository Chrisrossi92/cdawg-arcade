import { useEffect, useMemo, useState } from 'react';
import { BalanceExperience } from '../games/balance/BalanceExperience';
import { LocalScoreRepository } from '../services/scoreRepository';
import { createHostAdapter } from '../platform/createHostAdapter';
import type { HostContext } from '../contracts/events';

export function App() {
  const hostAdapter = useMemo(() => createHostAdapter(), []);
  const [hostContext, setHostContext] = useState<HostContext>(() => hostAdapter.getContext());
  const scoreRepository = useMemo(() => new LocalScoreRepository(), []);

  useEffect(() => hostAdapter.subscribe(setHostContext), [hostAdapter]);

  useEffect(() => {
    if (hostContext.environment !== 'discord' || hostContext.authenticated || hostContext.initializationState !== 'authorization-required') return;
    void hostAdapter.requestAuthentication();
  }, [hostAdapter, hostContext.authenticated, hostContext.environment, hostContext.initializationState]);

  return <BalanceExperience hostContext={hostContext} scoreRepository={scoreRepository} />;
}
