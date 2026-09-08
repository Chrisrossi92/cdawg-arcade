/** One subscription per mounted game; repeated events are deliberately idempotent. */
export function observeInterruptions(
  windowTarget: EventTarget, documentTarget: EventTarget & { hidden: boolean },
  pause: () => void, clear: () => void,
): () => void {
  const visibility = () => { if (documentTarget.hidden) pause(); };
  const blur = () => pause();
  const cancel = () => clear();
  windowTarget.addEventListener('blur', blur);
  documentTarget.addEventListener('visibilitychange', visibility);
  windowTarget.addEventListener('pointercancel', cancel);
  return () => {
    windowTarget.removeEventListener('blur', blur);
    documentTarget.removeEventListener('visibilitychange', visibility);
    windowTarget.removeEventListener('pointercancel', cancel);
    clear();
  };
}

export class HeldControls {
  private held = new Map<string, 'left' | 'right'>();
  press(id: string, direction: 'left' | 'right'): void {
    if (!this.held.has(id)) this.held.set(id, direction);
  }
  release(id: string): void { this.held.delete(id); }
  clear(): void { this.held.clear(); }
  get direction(): 'left' | 'right' | 'none' { const values = [...this.held.values()]; return values[values.length - 1] ?? 'none'; }
}
