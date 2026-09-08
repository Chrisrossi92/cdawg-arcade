export interface SpectatorReaction {
  id: string;
  label: string;
  tone: 'hype' | 'fire' | 'noise' | 'clap';
}

export interface SpectatorReactionService {
  maybeCreateReaction(elapsedMs: number): SpectatorReaction | null;
  createManualCheer(): SpectatorReaction;
}

const labels: Array<Omit<SpectatorReaction, 'id'>> = [
  { label: 'APPLAUSE', tone: 'clap' },
  { label: 'FIRE', tone: 'fire' },
  { label: "LET'S GO", tone: 'hype' },
  { label: 'AIR HORN', tone: 'noise' },
  { label: 'HOLD IT', tone: 'hype' },
];

export class LocalSpectatorReactionService implements SpectatorReactionService {
  private nextAllowedMs = 1200;

  maybeCreateReaction(elapsedMs: number): SpectatorReaction | null {
    if (elapsedMs < this.nextAllowedMs || Math.random() > 0.018) {
      return null;
    }
    this.nextAllowedMs = elapsedMs + 900 + Math.random() * 1600;
    return this.createReaction();
  }

  createManualCheer(): SpectatorReaction {
    return this.createReaction("LET'S GO");
  }

  private createReaction(preferredLabel?: string): SpectatorReaction {
    const source = preferredLabel ? labels.find((item) => item.label === preferredLabel) ?? labels[0] : labels[Math.floor(Math.random() * labels.length)];
    return { ...source, id: crypto.randomUUID() };
  }
}
