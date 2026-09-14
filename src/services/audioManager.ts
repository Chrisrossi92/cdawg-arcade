export type AudioCue = 'countdown' | 'input' | 'danger' | 'fall' | 'record';
export type AudioReadiness = 'ready' | 'muted' | 'degraded' | 'cancelled';
export const AUDIO_PREPARATION_TIMEOUT_MS = 5_000;

export interface AudioManager {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  setMusicEnabled(enabled: boolean): void;
  setSfxEnabled(enabled: boolean): void;
  playCue(cue: AudioCue): void;
  startMusic(): void;
  stopMusic(): void;
}

/** Synthesized tones: no fetched/encoded audio assets or decoder exists.
 * Context construction/resume and each permitted waveform's first playback happen
 * only in prepare(), invoked synchronously by Start. Playback never initializes.
 */
export class WebAudioManager implements AudioManager {
  musicEnabled = false;
  sfxEnabled = true;
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private delayed = new Set<number>();
  private nodes = new Set<() => void>();
  private disposed = false;
  private musicTimer: number | null = null;
  private allowedMusic = false;
  private allowedSfx = false;
  private playable = false;
  private warmed = new Set<OscillatorType>();
  private pending: Promise<AudioReadiness> | null = null;
  private cancelPending: (() => void) | null = null;

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (enabled) this.startMusic();
    else this.stopMusic();
  }

  setSfxEnabled(enabled: boolean): void { this.sfxEnabled = enabled; }

  get readyForAttempt(): boolean { return this.playable && this.context?.state === 'running'; }

  prepare(): Promise<AudioReadiness> {
    if (this.pending) return this.pending;
    if (this.disposed) return Promise.resolve('cancelled');
    this.playable = false;
    if (this.output) this.output.gain.value = 0;
    this.stopMusic();
    this.clearNodes();
    this.allowedMusic = this.musicEnabled;
    this.allowedSfx = this.sfxEnabled;
    if (!this.allowedMusic && !this.allowedSfx) return Promise.resolve('muted');
    const deadline = performance.now() + AUDIO_PREPARATION_TIMEOUT_MS;
    let settled = false;
    let frame: number | undefined;
    let finish!: (result: AudioReadiness) => void;
    const promise = new Promise<AudioReadiness>(resolve => { finish = resolve; });
    this.pending = promise;
    const settle = (result: AudioReadiness) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (frame !== undefined) cancelAnimationFrame(frame);
      this.pending = null;
      this.cancelPending = null;
      this.playable = result === 'ready';
      if (this.output) this.output.gain.value = this.playable ? 1 : 0;
      if (result !== 'ready') this.clearNodes();
      finish(result);
    };
    const timer = setTimeout(() => settle('degraded'), AUDIO_PREPARATION_TIMEOUT_MS);
    this.cancelPending = () => settle('cancelled');
    try {
      if (this.context?.state === 'closed') { this.output?.disconnect(); this.output = null; this.context = null; this.warmed.clear(); }
      this.context ??= new AudioContext();
      const context = this.context;
      // A suspended output may need its playback path primed after resumption.
      if (context.state !== 'running') this.warmed.clear();
      // Must be called before yielding out of the trusted Start/Retry gesture.
      const resumed = context.resume();
      void resumed.then(async () => {
        if (settled) return;
        if (context.state !== 'running') throw new Error('unavailable');
        if (!this.output) {
          this.output = context.createGain();
          this.output.gain.value = 0;
          this.output.connect(context.destination);
        }
        const types: OscillatorType[] = [
          ...(this.allowedSfx ? ['square', 'sawtooth'] as const : []),
          ...(this.allowedMusic ? ['triangle'] as const : []),
        ];
        await Promise.all(types.filter(type => !this.warmed.has(type)).map(type =>
          new Promise<void>(resolve => {
            // Exercise the real envelope/playback path behind a zero-gain output.
            // Unmute only after every warm-up oscillator has ended/disconnected.
            this.tone(260, 0.02, type, 0.045, () => { this.warmed.add(type); resolve(); });
          }),
        ));
        if (settled) return;
        // Drain stale frame timestamps after synchronous first-use work. This is
        // preparation pacing only; it never advances or resumes a game clock.
        await new Promise<void>(resolve => {
          let previous: number | undefined;
          let stable = 0;
          const tick = (now: number) => {
            if (settled) return;
            stable = previous !== undefined && now - previous >= 0 && now - previous <= 100 ? stable + 1 : 0;
            previous = now;
            if (stable >= 2) { frame = undefined; resolve(); }
            else frame = requestAnimationFrame(tick);
          };
          frame = requestAnimationFrame(tick);
        });
        if (settled) return;
        settle(performance.now() < deadline && context.state === 'running' ? 'ready' : 'degraded');
      }).catch(() => settle('degraded'));
    } catch { settle('degraded'); }
    return promise;
  }

  cancelPreparation(): void {
    this.cancelPending?.();
    this.playable = false;
    if (this.output) this.output.gain.value = 0;
    this.stopMusic();
    this.clearNodes();
  }

  playCue(cue: AudioCue): void {
    if (!this.sfxEnabled || !this.allowedSfx) return;
    const frequencies: Record<AudioCue, number> = { countdown: 540, input: 260, danger: 140, fall: 82, record: 760 };
    this.playTone(frequencies[cue], cue === 'fall' ? 0.3 : 0.1, cue === 'danger' ? 'sawtooth' : 'square');
  }

  startMusic(): void {
    if (!this.musicEnabled || !this.allowedMusic || !this.playable || this.musicTimer !== null) return;
    this.musicTimer = window.setInterval(() => {
      this.playTone(110, 0.07, 'triangle', 0.025);
      const timer = window.setTimeout(() => {
        this.delayed.delete(timer);
        if (this.musicEnabled) this.playTone(165, 0.05, 'triangle', 0.02);
      }, 180);
      this.delayed.add(timer);
    }, 720);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.delayed.forEach(timer => window.clearTimeout(timer));
    this.delayed.clear();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelPreparation();
    void this.context?.close().catch(() => {});
    this.context = null;
    this.output?.disconnect(); this.output = null;
    this.warmed.clear();
  }

  private clearNodes(): void {
    for (const cleanup of this.nodes) cleanup();
    this.nodes.clear();
  }

  private playTone(frequency: number, duration: number, type: OscillatorType, volume = 0.045): void {
    if (this.disposed || !this.playable) return;
    // Suspension/failure mutes the rest of this attempt; no active-game resume/retry.
    if (this.context?.state !== 'running') { this.cancelPreparation(); return; }
    try { this.tone(frequency, duration, type, volume); }
    catch { this.cancelPreparation(); }
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number, ended?: () => void): void {
    const context = this.context!;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const cleanup = () => {
      oscillator.onended = null;
      try { oscillator.stop(); } catch { /* Already stopped. */ }
      oscillator.disconnect(); gain.disconnect(); this.nodes.delete(cleanup);
    };
    this.nodes.add(cleanup);
    oscillator.onended = () => { cleanup(); ended?.(); };
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(this.output!);
    oscillator.start();
    if (volume > 0) gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.stop(context.currentTime + duration);
  }
}
