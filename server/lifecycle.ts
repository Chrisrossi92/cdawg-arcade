import type { Server } from 'node:http';

export function installShutdown(server: Server, markDraining: () => void, exit: (code: number) => void = process.exit, maximumMs = 12_000) {
  let stopping = false;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const dispose = () => {
    process.off('SIGTERM', stop);
    process.off('SIGINT', stop);
    if (deadline) clearTimeout(deadline);
  };
  const stop = () => {
    if (stopping) return;
    stopping = true;
    markDraining();
    deadline = setTimeout(() => {
      server.closeAllConnections();
      dispose();
      exit(1);
    }, maximumMs);
    server.close(() => { dispose(); exit(0); });
    server.closeIdleConnections();
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  return { stop, dispose };
}
