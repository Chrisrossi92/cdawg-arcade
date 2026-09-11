import {createManagedGame} from './managedGame';
import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import Phaser from 'phaser';
import type { SimulationClock } from './simulationClock';
import { BalanceScene } from './BalanceScene';
import type { BalanceConfig, BalanceState } from './simulation';

interface BalanceGameCanvasProps {
  clock: SimulationClock;
  onPause: () => void;
  configRef: MutableRefObject<BalanceConfig>;
  onTick: (state: BalanceState, scoreSeconds: number) => void;
  onGameOver: (scoreSeconds: number, finalState: BalanceState) => void;
}

export function BalanceGameCanvas({ configRef, onTick, onGameOver, clock, onPause }: BalanceGameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const callbacksRef = useRef({ onTick, onGameOver, onPause });

  useEffect(() => {
    callbacksRef.current = { onTick, onGameOver, onPause };
  }, [onGameOver, onTick, onPause]);

  useEffect(() => {
    if (!hostRef.current) return;
    const scene = new BalanceScene({
      clock,
      onPause: () => callbacksRef.current.onPause(),
      configRef,
      onTick: (state, score) => callbacksRef.current.onTick(state, score),
      onGameOver: (score, state) => callbacksRef.current.onGameOver(score, state),
    });
    const config:Phaser.Types.Core.GameConfig = {
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
    };
    const game=typeof __ARCADE_LOBBY__!=='undefined'&&__ARCADE_LOBBY__?createManagedGame(Phaser,config):new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, [configRef, clock]);

  return <div className="game-canvas" ref={hostRef} />;
}
