import balance0 from '../../../../assets/brand/mascot/runtime/cdawg-mascot-balance0-v003.webp';
import balance0Data from '../../../../assets/brand/mascot/runtime/cdawg-mascot-balance0-v003.json';
import balance1 from '../../../../assets/brand/mascot/runtime/cdawg-mascot-balance1-v003.webp';
import balance1Data from '../../../../assets/brand/mascot/runtime/cdawg-mascot-balance1-v003.json';
import reactions0 from '../../../../assets/brand/mascot/runtime/cdawg-mascot-reactions0-v003.webp';
import reactions0Data from '../../../../assets/brand/mascot/runtime/cdawg-mascot-reactions0-v003.json';
import reactions1 from '../../../../assets/brand/mascot/runtime/cdawg-mascot-reactions1-v003.webp';
import reactions1Data from '../../../../assets/brand/mascot/runtime/cdawg-mascot-reactions1-v003.json';
export const atlases: ReadonlyArray<readonly [string, string, object]> = [
  ['balance0', balance0, balance0Data], ['balance1', balance1, balance1Data],
  ['reactions0', reactions0, reactions0Data], ['reactions1', reactions1, reactions1Data],
];

const warmed = new Set<string>();
/** Nonblocking cache warmup during home/countdown. Never delays start/input/clock. */
export function warmMascot(reactions = false): void {
  for (const [key, image] of atlases) {
    if (key.startsWith('reactions') !== reactions || warmed.has(key)) continue;
    warmed.add(key);
    const img = new Image(); img.src = image;
  }
}
