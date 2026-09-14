import {it, expect, vi, afterEach, beforeEach} from 'vitest';
import {WebAudioManager, AUDIO_PREPARATION_TIMEOUT_MS} from './audioManager';

let state: AudioContextState;
let resumes: ReturnType<typeof vi.fn>;
let starts: ReturnType<typeof vi.fn>;
let constructors = vi.fn<() => void>();
let close: ReturnType<typeof vi.fn>;
let gains: number[];
let outputGain: {value: number} | undefined;
let endDelay: number;
let constructionFails: boolean;
let nodeFails: boolean;
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal('window', globalThis);
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => setTimeout(() => fn(performance.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  state = 'suspended'; gains = []; outputGain = undefined; endDelay = 20; constructionFails = false; nodeFails = false;
  starts = vi.fn(); constructors = vi.fn(); close = vi.fn(async () => {});
  resumes = vi.fn(async () => { state = 'running'; });
  vi.stubGlobal('AudioContext', class {
    constructor() { constructors(); if (constructionFails) throw Error('private device detail'); }
    get state() { return state; }
    currentTime = 0; destination = {}; resume = resumes; close = close;
    createGain = () => {
      const node = {gain: {value: 0, exponentialRampToValueAtTime: vi.fn()}, connect() { gains.push(this.gain.value); }, disconnect() {}};
      outputGain ??= node.gain; return node;
    };
    createOscillator = () => {
      if (nodeFails) throw Error('private node detail');
      let timer: ReturnType<typeof setTimeout>;
      return {type: '', frequency: {value: 0}, onended: null as (() => void) | null,
        connect() {}, disconnect() {}, start: starts,
        stop(when?: number) { clearTimeout(timer); if (when !== undefined) timer = setTimeout(() => this.onended?.(), endDelay); },
      };
    };
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
async function ready(audio: WebAudioManager) {
  const p = audio.prepare(); await vi.advanceTimersByTimeAsync(150); expect(await p).toBe('ready');
}
it('resumes synchronously in Start, warms every allowed waveform at zero gain before any real cue', async () => {
  const audio = new WebAudioManager(); audio.playCue('input'); expect(constructors).not.toHaveBeenCalled();
  const p = audio.prepare(); expect(resumes).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(10); expect(outputGain?.value).toBe(0);
  await vi.advanceTimersByTimeAsync(150); expect(await p).toBe('ready');
  expect(gains).toEqual([0, 0.045, 0.045]); expect(outputGain?.value).toBe(1); audio.playCue('input'); expect(gains[gains.length - 1]).toBe(0.045);
  expect(constructors).toHaveBeenCalledOnce(); audio.dispose(); expect(vi.getTimerCount()).toBe(0);
});
it.each([0, 218, 500])('awaits successful resume delayed %i ms', async delay => {
  resumes.mockImplementation(() => new Promise<void>(resolve => setTimeout(() => { state = 'running'; resolve(); }, delay)));
  const audio = new WebAudioManager(); let finished = false;
  const p = audio.prepare().then(value => { finished = true; return value; });
  await vi.advanceTimersByTimeAsync(delay); expect(finished).toBe(false);
  await vi.advanceTimersByTimeAsync(80); expect(await p).toBe('ready'); audio.dispose();
});
it('awaits delayed first-use playback completion above the interruption threshold', async () => {
  endDelay = 218; const audio = new WebAudioManager(); let done = false;
  const p = audio.prepare().then(value => { done = true; return value; });
  await vi.advanceTimersByTimeAsync(150); expect(done).toBe(false); audio.playCue('input'); expect(gains).toEqual([0, 0.045, 0.045]);
  await vi.advanceTimersByTimeAsync(150); expect(await p).toBe('ready'); audio.dispose();
});
it.each(['rejection', 'context', 'node', 'suspended', 'timeout'])('bounds %s failure and forbids subsequent active initialization', async failure => {
  if (failure === 'rejection') resumes.mockRejectedValue(Error('private autoplay detail'));
  if (failure === 'context') constructionFails = true;
  if (failure === 'node') nodeFails = true;
  if (failure === 'suspended') resumes.mockResolvedValue(undefined);
  if (failure === 'timeout') resumes.mockImplementation(() => new Promise(() => {}));
  const audio = new WebAudioManager(); const p = audio.prepare();
  await vi.advanceTimersByTimeAsync(AUDIO_PREPARATION_TIMEOUT_MS); expect(await p).toBe('degraded');
  const count = constructors.mock.calls.length; audio.setMusicEnabled(true); audio.playCue('input');
  await vi.advanceTimersByTimeAsync(1000); expect(constructors).toHaveBeenCalledTimes(count); expect(vi.getTimerCount()).toBe(0); audio.dispose();
});
it('supports explicit next Start retry after rejection', async () => {
  resumes.mockRejectedValueOnce(Error('denied')); const audio = new WebAudioManager(); expect(await audio.prepare()).toBe('degraded');
  await ready(audio); expect(resumes).toHaveBeenCalledTimes(2); audio.dispose();
});
it.each([[false, true, 2], [true, false, 1], [false, false, 0], [true, true, 3]])('respects music=%s sfx=%s', async (music, sfx, count) => {
  const audio = new WebAudioManager(); audio.setMusicEnabled(Boolean(music)); audio.setSfxEnabled(Boolean(sfx));
  const p = audio.prepare(); await vi.advanceTimersByTimeAsync(100);
  expect(await p).toBe(count ? 'ready' : 'muted'); expect(starts).toHaveBeenCalledTimes(Number(count));
  if (!count) expect(constructors).not.toHaveBeenCalled();
  audio.dispose();
});
it('reuses verified warm paths and revalidates suspension before Play Again', async () => {
  const audio = new WebAudioManager(); await ready(audio); state = 'suspended'; await ready(audio);
  expect(resumes).toHaveBeenCalledTimes(2); expect(starts).toHaveBeenCalledTimes(4); expect(constructors).toHaveBeenCalledOnce(); audio.dispose();
});
it('mutes a newly suspended context for the whole attempt without resuming', async () => {
  const audio = new WebAudioManager(); await ready(audio); state = 'suspended'; audio.playCue('input'); state = 'running'; audio.playCue('input');
  expect(resumes).toHaveBeenCalledOnce(); expect(starts).toHaveBeenCalledTimes(2); audio.dispose();
});
it('coalesces duplicate Start and ignores stale completion after cancel and retry', async () => {
  let complete!: () => void;
  resumes.mockImplementationOnce(() => new Promise<void>(resolve => { complete = resolve; }));
  const audio = new WebAudioManager(); const p = audio.prepare(); expect(audio.prepare()).toBe(p);
  audio.cancelPreparation(); expect(await p).toBe('cancelled'); await ready(audio);
  complete(); await vi.advanceTimersByTimeAsync(100); expect(starts).toHaveBeenCalledTimes(2); audio.dispose();
});
it('unmount during warmup clears timers/nodes and cannot revive audio', async () => {
  const audio = new WebAudioManager(); const p = audio.prepare(); await vi.advanceTimersByTimeAsync(1); audio.dispose();
  expect(await p).toBe('cancelled'); await vi.advanceTimersByTimeAsync(6000);
  expect(vi.getTimerCount()).toBe(0); expect(await audio.prepare()).toBe('cancelled'); expect(close).toHaveBeenCalledOnce();
});
it('does not initialize a category enabled after muted preparation', async () => {
  const audio = new WebAudioManager(); audio.setSfxEnabled(false); expect(await audio.prepare()).toBe('muted');
  audio.setMusicEnabled(true); audio.setSfxEnabled(true); audio.playCue('input'); expect(constructors).not.toHaveBeenCalled(); audio.dispose();
});
it('closes audio and removes delayed music across 100 lifecycles', async () => {
  for (let i = 0; i < 100; i++) {
    const audio = new WebAudioManager(); audio.setMusicEnabled(true); await ready(audio); audio.startMusic();
    await vi.advanceTimersByTimeAsync(750); audio.dispose(); expect(vi.getTimerCount()).toBe(0);
    const count = starts.mock.calls.length; audio.playCue('input'); await vi.advanceTimersByTimeAsync(1000); expect(starts).toHaveBeenCalledTimes(count);
  }
  expect(close).toHaveBeenCalledTimes(100);
});
it('replaces a closed context only at the next Start', async () => {
  const audio = new WebAudioManager(); await ready(audio); state = 'closed'; audio.playCue('input');
  expect(constructors).toHaveBeenCalledOnce(); await ready(audio); expect(constructors).toHaveBeenCalledTimes(2); audio.dispose();
});
it('cancels preparation while stable-frame warmup is pending', async () => {
  const audio = new WebAudioManager(); const p = audio.prepare(); await vi.advanceTimersByTimeAsync(25);
  audio.cancelPreparation(); expect(await p).toBe('cancelled'); expect(vi.getTimerCount()).toBe(0); audio.dispose();
});
it('cannot publish readiness after a synchronous operation exhausts the deadline', async () => {
  const audio = new WebAudioManager(); const p = audio.prepare();
  await vi.advanceTimersByTimeAsync(10);
  const now = vi.spyOn(performance, 'now').mockReturnValue(AUDIO_PREPARATION_TIMEOUT_MS + 1);
  await vi.advanceTimersByTimeAsync(100); expect(await p).toBe('degraded');
  now.mockRestore(); audio.playCue('input'); expect(starts).toHaveBeenCalledTimes(2); audio.dispose();
});
