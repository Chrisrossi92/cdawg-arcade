import {createManagedGame} from '../managedGame';
import {useEffect, useRef} from 'react';
/** Decorative reaction. Lazy renderer keeps server-side UI tests independent of a browser. */
export function ResultMascot({side, failed}: {side: number; failed: boolean}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let game: {destroy(removeCanvas: boolean): void} | undefined;
    void Promise.all([import('phaser'), import('./SpriteMascot')]).then(([{default: Phaser}, {preloadMascot, SpriteMascot}]) => {
      if (disposed || !host.current) return;
      class Reaction extends Phaser.Scene {
        private mascot!: InstanceType<typeof SpriteMascot>;
        preload() {preloadMascot(this)}
        create() {this.mascot = new SpriteMascot(this, {side, failed})}
        update(_time: number, delta: number) {this.mascot.draw({balance: side, finished: true, failed}, delta, 128, 142, .70)}
      }
      const config:import('phaser').Types.Core.GameConfig = {type: Phaser.AUTO, parent: host.current, width: 256, height: 160,
        transparent: true, audio: {noAudio: true}, banner: false, scene: Reaction};
      game=typeof __ARCADE_LOBBY__!=='undefined'&&__ARCADE_LOBBY__?createManagedGame(Phaser,config):new Phaser.Game(config);
    }).catch(() => { /* Decorative failure must never block result controls or score delivery. */ });
    return () => {disposed = true; game?.destroy(true)};
  }, [side, failed]);
  return <div className="mascot-result" aria-hidden="true" ref={host} />;
}
