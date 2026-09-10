import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConnectionStatus } from './ConnectionStatus';
import { makeDefaultLocalContext } from '../platform/hostAdapter';
import { BalanceExperience } from '../games/balance/BalanceExperience';
import { MemoryScoreRepository } from '../services/scoreRepository';
import { vi } from 'vitest';
vi.mock('../games/balance/BalanceGameCanvas', () => ({ BalanceGameCanvas: () => null }));

describe('production connection and score wording', () => {
  it('labels ordinary browser practice', () => {
    expect(renderToStaticMarkup(<ConnectionStatus context={makeDefaultLocalContext()} />)).toContain('Local practice');
  });
  it('has a compact successful Discord status without a practice identity or recovery banner', () => {
    const html = renderToStaticMarkup(<ConnectionStatus context={{ ...makeDefaultLocalContext(), environment: 'discord', authenticated: true, connectionState: 'discord-authenticated' }} />);
    expect(html).toContain('Discord connected');
    expect(html).not.toContain('practice');
    expect(html).not.toContain('role="alert"');
  });
  it('invalid context requests relaunch, not an ineffective retry', () => {
    const html = renderToStaticMarkup(<ConnectionStatus context={{ ...makeDefaultLocalContext(), connectionState: 'discord-error', connectionError: 'invalid-context', initializationStatus: 'Relaunch from Discord' }} />);
    expect(html).toContain('Relaunch from Discord');
    expect(html).toContain('Continue in practice');
    expect(html).not.toContain('Retry Discord connection');
  });
  it('failure leaves Start Game available with local score labels', () => {
    const context = { ...makeDefaultLocalContext(), environment: 'discord' as const, connectionState: 'discord-error' as const, connectionError: 'sdk' as const, initializationStatus: 'Retry or continue in practice.' };
    const html = renderToStaticMarkup(<BalanceExperience hostContext={context} scoreRepository={new MemoryScoreRepository()} />);
    expect(html).toContain('Start Game');
    expect(html).toContain('Historical Local Best');
    expect(html).toContain('Retry Discord connection');
    expect(html).toContain('Local Player');
  });
});
