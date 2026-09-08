import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import Phaser from 'phaser';
import { BalanceScene } from './BalanceScene';
import type { BalanceConfig, BalanceInputDirection, BalanceState } from './simulation';

interface BalanceGameCanvasProps {
  inputRef: MutableRefObject<BalanceInputDirection>;
  configRef: MutableRefObject<BalanceConfig>;
  onTick: (state: BalanceState, scoreSeconds: number) => void;
  onGameOver: (scoreSeconds: number, finalState: BalanceState) => void;
}

export function BalanceGameCanvas({ inputRef, configRef, onTick, onGameOver }: BalanceGameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const callbacksRef = useRef({ onTick, onGameOver });

  useEffect(() => {
    callbacksRef.current = { onTick, onGameOver };
  }, [onGameOver, onTick]);

  useEffect(() => {
    if (!hostRef.current) return;
    const scene = new BalanceScene({
      inputRef,
      configRef,
      onTick: (state, score) => callbacksRef.current.onTick(state, score),
      onGameOver: (score, state) => callbacksRef.current.onGameOver(score, state),
    });
    const game = new Phaser.Game({
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
    });

    return () => {
      game.destroy(true);
    };
  }, [configRef, inputRef]);

  return <div className="game-canvas" ref={hostRef} />;
}
