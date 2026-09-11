import Phaser from 'phaser';
import {MascotMotion, type MotionInput} from './motion';
import {atlases} from './assets';
export function preloadMascot(scene: Phaser.Scene): void {
  for (const [key, image, data] of atlases) if (!scene.textures.exists(key)) scene.load.atlas(key, image, data);
}
function texture(name: string): string {
  if (name.startsWith('balance')) return `balance${Math.floor(Number(name.split('-')[1]) / 2)}`;
  return name.startsWith('result') || name.includes('--1-') ? 'reactions0' : 'reactions1';
}
/** Blends adjacent authored samples; never switches/restarts independent Phaser animations. */
export class SpriteMascot {
  readonly motion: MascotMotion;
  private readonly images: Phaser.GameObjects.Image[] = [];
  private readonly preference = matchMedia('(prefers-reduced-motion: reduce)');
  reducedOverride: boolean | null = null;
  private angle = 0;
  get ready(): boolean {return this.images.length > 0}
  get reduced(): boolean {return this.reducedOverride ?? ((typeof __ARCADE_LOBBY__ !== 'undefined' && __ARCADE_LOBBY__ && document.documentElement.dataset.arcadeReducedMotion==='true') || this.preference.matches)}
  constructor(private readonly scene: Phaser.Scene, result?: {side: number; failed: boolean}) {
    this.motion = new MascotMotion(result);

  }
  draw(input: MotionInput, delta: number, x: number, groundY: number, scale = 1, boardAngle = 0): boolean {
    const angularTarget = input.finished ? 0 : boardAngle;
    this.angle += (angularTarget - this.angle) * (1 - Math.exp(-Math.max(0, Math.min(50, delta)) / 70));
    const weights = this.motion.advance(input, delta, this.reduced);
    if (!weights.filter(f => f.weight > .00001).every(f => this.scene.textures.exists(texture(f.name)))) return this.images.length > 0;
    if (!this.images.length) this.images.push(...Array.from({length: 5}, () => this.scene.add.image(0, 0, 'balance0', 'balance-0-14').setOrigin(.5, 1 - 30 / 256)));
    const unique = new Map<string, number>();
    for (const f of weights) if (f.weight > .00001) unique.set(f.name, (unique.get(f.name) ?? 0) + f.weight);
    // Normal alpha-over with cumulative weights preserves opaque interiors.
    // Neighbour samples differ by small authored motions; no large-pose ghosting.
    let total = 0, i = 0;
    for (const [name, weight] of unique) {
      total += weight;
      this.images[i++].setTexture(texture(name), name).setPosition(x, groundY).setScale(scale).setAngle(this.angle).setAlpha(weight / total).setVisible(true);
    }
    while (i < this.images.length) this.images[i++].setVisible(false);
    return true;
  }
  destroy(): void {for (const image of this.images) image.destroy()}
}
