import type { HostContext } from '../contracts/events';

export function ConnectionStatus({ context, onRetry, onPractice }: { context: HostContext; onRetry?: () => void; onPractice?: () => void }) {
  const state = context.connectionState ?? 'local-practice';
  const error = state === 'discord-error';
  const canRetry = context.environment === 'discord' && !['invalid-context', 'configuration'].includes(context.connectionError ?? '');
  const label = state === 'discord-authenticated' ? 'Discord connected' : state === 'discord-connecting' ? 'Connecting to Discord…' : error ? 'Discord unavailable · Practice available' : 'Local practice';
  return <div className="connection-status">
    <span role="status">{label}</span>
    {error && <div className="connection-recovery" role="alert">
      <p>{context.initializationStatus}</p>
      <div>
        {canRetry && <button className="secondary-button" type="button" onClick={onRetry}>Retry Discord connection</button>}
        <button className="secondary-button" type="button" onClick={onPractice}>Continue in practice</button>
      </div>
    </div>}
  </div>;
}
