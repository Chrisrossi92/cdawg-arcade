import type { GamePhase, RunResult } from '../../types/game';

export function getInitialBalancePhase(): GamePhase {
  return 'home';
}

export function getPhaseAfterRunResult(result: RunResult): GamePhase {
  return result ? 'results' : 'home';
}

export function getCompactDockedLayoutClasses(phase: GamePhase, developmentUi = false): string {
  return ['app-shell', 'game-shell', 'balance-v1-shell', 'layout-docked-safe', `phase-${phase}`, developmentUi ? 'has-dev-ui' : ''].filter(Boolean).join(' ');
}
