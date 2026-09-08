import type { HostAdapter, HostContextPatch } from '../hostAdapter';
import { makeDefaultLocalContext } from '../hostAdapter';
import type { HostContext } from '../../contracts/events';

export class LocalHostAdapter implements HostAdapter {
  readonly environment = 'local' as const;
  private context: HostContext;
  private listeners = new Set<(context: HostContext) => void>();

  constructor(initialContext: HostContext = makeDefaultLocalContext()) {
    this.context = initialContext;
  }

  getContext(): HostContext {
    return this.context;
  }

  subscribe(listener: (context: HostContext) => void): () => void {
    this.listeners.add(listener);
    listener(this.context);
    return () => this.listeners.delete(listener);
  }

  updateContext(patch: HostContextPatch): HostContext {
    this.context = {
      ...this.context,
      ...patch,
      currentUser: patch.currentUser ? patch.currentUser : this.context.currentUser,
      environment: 'local',
    };
    this.emit();
    return this.context;
  }

  async requestAuthentication(): Promise<HostContext> {
    return this.updateContext({ authenticated: true, initializationStatus: 'Local mock authentication active' });
  }

  async closeActivity(): Promise<void> {
    this.updateContext({ initializationStatus: 'Local activity close requested' });
  }

  async inviteOrShareActivity(): Promise<void> {
    this.updateContext({ initializationStatus: 'Local share copied conceptually' });
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.context);
  }
}
