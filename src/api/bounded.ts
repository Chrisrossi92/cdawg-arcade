export class OperationTimeout extends Error {
  constructor() { super('operation_timeout'); }
}

// Also bounds promises whose provider does not implement AbortSignal (SDK RPCs).
export function bounded<T>(operation: () => Promise<T>, signal: AbortSignal, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('operation_cancelled')); return; }
    let settled = false;
    const timer = setTimeout(() => finish(() => reject(new OperationTimeout())), timeoutMs);
    const cancel = () => finish(() => reject(new Error('operation_cancelled')));
    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      settle();
    };
    signal.addEventListener('abort', cancel, { once: true });
    Promise.resolve().then(() => { signal.throwIfAborted(); return operation(); }).then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error)),
    );
  });
}
