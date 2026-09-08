import { describe, expect, it } from 'vitest';
import { LocalHostAdapter } from './LocalHostAdapter';

describe('LocalHostAdapter', () => {
  it('provides a ready local mock context', () => {
    const adapter = new LocalHostAdapter();

    expect(adapter.getContext().environment).toBe('local');
    expect(adapter.getContext().ready).toBe(true);
    expect(adapter.getContext().authenticated).toBe(false);
  });

  it('updates local context without reload', () => {
    const adapter = new LocalHostAdapter();
    adapter.updateContext({ role: 'spectator', currentUser: { id: 'u2', displayName: 'Viewer' } });

    expect(adapter.getContext().role).toBe('spectator');
    expect(adapter.getContext().currentUser.displayName).toBe('Viewer');
  });
});
