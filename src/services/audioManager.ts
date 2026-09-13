export interface AudioManager {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  setMusicEnabled(enabled: boolean): void;
  setSfxEnabled(enabled: boolean): void;
  playCue(cue: AudioCue): void;
  startMusic(): void;
  stopMusic(): void;
}

export type AudioCue = 'countdown' | 'input' | 'danger' | 'fall' | 'record';

export class WebAudioManager implements AudioManager {
  musicEnabled = false;
  sfxEnabled = true;
  private context: AudioContext | null = null;
  private delayed = new Set<number>();
  private disposed = false;
  private musicTimer: number | null = null;

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
  }

  playCue(cue: AudioCue): void {
    if (!this.sfxEnabled) return;
    const frequencies: Record<AudioCue, number> = {
      countdown: 540,
      input: 260,
      danger: 140,
      fall: 82,
      record: 760,
    };
    this.playTone(frequencies[cue], cue === 'fall' ? 0.3 : 0.1, cue === 'danger' ? 'sawtooth' : 'square');
  }

  startMusic(): void {
    if (!this.musicEnabled || this.musicTimer !== null) return;
    this.musicTimer = window.setInterval(() => {
      this.playTone(110, 0.07, 'triangle', 0.025);
      const timer=window.setTimeout(() => {this.delayed.delete(timer);this.playTone(165,0.05,'triangle',0.02);},180);
      this.delayed.add(timer);
    }, 720);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  dispose(): void {
    this.disposed=true;this.stopMusic();
    this.delayed.forEach(t=>window.clearTimeout(t));this.delayed.clear();
    void this.context?.close().catch(()=>{});this.context=null;
  }

  private getContext(): AudioContext {
    this.context ??= new AudioContext();
    return this.context;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType, volume = 0.045): void {
    if(this.disposed)return;
    const context = this.getContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.stop(context.currentTime + duration);
  }
}
