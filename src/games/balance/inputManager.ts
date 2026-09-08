import type { GamePhase } from '../../types/game';
import type { BalanceInputDirection } from './simulation';

const leftKeys = new Set(['ArrowLeft', 'a', 'A']);
const rightKeys = new Set(['ArrowRight', 'd', 'D']);

export type BalanceInputKey = 'ArrowLeft' | 'ArrowRight' | 'a' | 'A' | 'd' | 'D';

export function isGameplayInputActive(phase: GamePhase): boolean {
  return phase === 'countdown' || phase === 'playing';
}

export function isEditableInputTarget(target: EventTarget | null): boolean {
  if (!target || typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

export function getDirectionForKey(key: string): BalanceInputDirection | null {
  if (leftKeys.has(key)) return 'left';
  if (rightKeys.has(key)) return 'right';
  return null;
}

export function shouldPreventScrollForKey(key: string, phase: GamePhase, target: EventTarget | null): boolean {
  if (!isGameplayInputActive(phase) || isEditableInputTarget(target)) return false;
  return key === 'ArrowLeft' || key === 'ArrowRight';
}

export function resolveHeldInput(heldKeys: ReadonlySet<string>): BalanceInputDirection {
  const keys = Array.from(heldKeys);
  let lastRelevantKey: string | undefined;
  for (let index = keys.length - 1; index >= 0; index -= 1) {
    if (leftKeys.has(keys[index]) || rightKeys.has(keys[index])) {
      lastRelevantKey = keys[index];
      break;
    }
  }
  return lastRelevantKey ? getDirectionForKey(lastRelevantKey) ?? 'none' : 'none';
}

export function getViewportLayoutMode(_phase: GamePhase): 'fixed-gameplay-viewport' {
  return 'fixed-gameplay-viewport';
}
