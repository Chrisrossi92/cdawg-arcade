import {mountManagedGame} from './managedGame';
import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import Phaser from 'phaser';
import type { SimulationClock } from './simulationClock';
import { BalanceScene } from './BalanceScene';
import type { BalanceConfig, BalanceState } from './simulation';

interface BalanceGameCanvasProps {
  clockRef: MutableRefObject<SimulationClock>;
  active: () => boolean;
  onReady: () => void;
  onError: () => void;
  onPause: () => void;
  configRef: MutableRefObject<BalanceConfig>;
  onTick: (state: BalanceState, scoreSeconds: number) => void;
  onGameOver: (scoreSeconds: number, finalState: BalanceState) => void;
}

export function BalanceGameCanvas({ configRef, onTick, onGameOver, clockRef, active, onReady, onError, onPause }: BalanceGameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const callbacksRef = useRef({ onTick, onGameOver, onPause, active, onReady, onError });

  useEffect(() => {
    callbacksRef.current = { onTick, onGameOver, onPause, active, onReady, onError };
  }, [onGameOver, onTick, onPause, active, onReady, onError]);

  useEffect(() => {
    if (!hostRef.current) return;
    const scene = new BalanceScene({
      clock: () => clockRef.current,
      active: () => callbacksRef.current.active(),
      onReady: () => callbacksRef.current.onReady(),
      onError: () => callbacksRef.current.onError(),
      onPause: () => callbacksRef.current.onPause(),
      configRef,
      onTick: (state, score) => callbacksRef.current.onTick(state, score),
      onGameOver: (score, state) => callbacksRef.current.onGameOver(score, state),
    });
    return mountManagedGame(Phaser, {
      type: Phaser.AUTO,
      parent: hostRef.current,
      backgroundColor: '#090a12',
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: hostRef.current.clientWidth,
        height: hostRef.current.clientHeight,
      },
      scene,
      physics: { default: 'arcade' },
    }, () => callbacksRef.current.onError());
  }, [configRef, clockRef]);

  return <div className="game-canvas" ref={hostRef} />;
}
