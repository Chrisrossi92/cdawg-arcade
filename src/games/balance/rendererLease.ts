/** Serialize renderer lifetimes, including Phaser's asynchronous destruction. */
export class RendererLease {
  private tail: Promise<void> = Promise.resolve();
  mount(start: (released: () => void) => {destroy: () => void}, failed: () => void): () => void {
    let canceled = false;
    let renderer: {destroy: () => void} | undefined;
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>(resolve => { release = resolve; });
    void previous.then(() => {
      if (canceled) { release(); return; }
      try { renderer = start(release); }
      catch { release(); if (!canceled) failed(); }
    });
    return () => {
      if (canceled) return;
      canceled = true;
      renderer?.destroy();
    };
  }
}
