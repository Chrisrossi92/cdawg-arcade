import { describe, expect, it } from 'vitest';
import {
  getDirectionForKey,
  getViewportLayoutMode,
  resolveHeldInput,
  shouldPreventScrollForKey,
} from './inputManager';
import type { GamePhase } from '../../types/game';

describe('balance input manager', () => {
  it('ArrowLeft applies left input', () => {
    expect(getDirectionForKey('ArrowLeft')).toBe('left');
  });

  it('ArrowRight applies right input', () => {
    expect(getDirectionForKey('ArrowRight')).toBe('right');
  });

  it('A and D map correctly', () => {
    expect(getDirectionForKey('a')).toBe('left');
    expect(getDirectionForKey('A')).toBe('left');
    expect(getDirectionForKey('d')).toBe('right');
    expect(getDirectionForKey('D')).toBe('right');
  });

  it('keyup releases input when no held key remains', () => {
    const heldKeys = new Set<string>(['ArrowLeft']);
    heldKeys.delete('ArrowLeft');

    expect(resolveHeldInput(heldKeys)).toBe('none');
  });

  it('blur clears held input', () => {
    const heldKeys = new Set<string>(['ArrowRight', 'd']);
    heldKeys.clear();

    expect(resolveHeldInput(heldKeys)).toBe('none');
  });

  it('Arrow keys prevent default scrolling only when gameplay input is active', () => {
    expect(shouldPreventScrollForKey('ArrowLeft', 'countdown', null)).toBe(true);
    expect(shouldPreventScrollForKey('ArrowRight', 'playing', null)).toBe(true);
    expect(shouldPreventScrollForKey('ArrowLeft', 'home', null)).toBe(false);
    expect(shouldPreventScrollForKey('a', 'playing', null)).toBe(false);
  });

  it('layout state keeps the same viewport mode between countdown, playing, and results', () => {
    const phases: GamePhase[] = ['countdown', 'playing', 'results'];
    const modes = phases.map((phase) => getViewportLayoutMode(phase));

    expect(new Set(modes).size).toBe(1);
    expect(modes[0]).toBe('fixed-gameplay-viewport');
  });
});
