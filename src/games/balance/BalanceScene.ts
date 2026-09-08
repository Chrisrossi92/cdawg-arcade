import Phaser from 'phaser';
import type { MutableRefObject } from 'react';
import { balanceConfig } from './config';
import { CdawgRig, getCdawgPoseForBalance } from './CdawgRig';
import {
  calculateScoreSeconds,
  createInitialBalanceState,
  getMilestoneForScore,
  stepBalanceSimulation,
  type BalanceConfig,
  type BalanceInputDirection,
  type BalanceState,
} from './simulation';

interface BalanceSceneOptions {
  inputRef: MutableRefObject<BalanceInputDirection>;
  configRef: MutableRefObject<BalanceConfig>;
  onTick: (state: BalanceState, scoreSeconds: number) => void;
  onGameOver: (scoreSeconds: number, finalState: BalanceState) => void;
}

export class BalanceScene extends Phaser.Scene {
  private state = createInitialBalanceState(balanceConfig);
  private platform!: Phaser.GameObjects.Rectangle;
  private platformGlow!: Phaser.GameObjects.Rectangle;
  private background!: Phaser.GameObjects.Rectangle;
  private cdawg!: CdawgRig;
  private scoreText!: Phaser.GameObjects.Text;
  private impactText!: Phaser.GameObjects.Text;
  private particles: Phaser.GameObjects.Arc[] = [];
  private lastScoreSeconds = 0;
  private milestonePulseUntil = 0;
  private ended = false;

  constructor(private readonly options: BalanceSceneOptions) {
    super('BalanceScene');
  }

  create(): void {
    this.state = createInitialBalanceState(this.options.configRef.current);
    const { width, height } = this.scale;

    this.background = this.add.rectangle(width / 2, height / 2, width, height, 0x090a12);
    this.add.rectangle(width / 2, height * 0.05, width, height * 0.14, 0xff8a22, 0.16);
    this.add.grid(width / 2, height / 2, width, height, 36, 36, 0x211a22, 0.42, 0xff8a22, 0.07);
    this.createCrowd(width, height);

    this.platformGlow = this.add.rectangle(width / 2, height * 0.7, Math.min(width * 0.72, 460), 24, 0xff8a22, 0.2);
    this.platform = this.add.rectangle(width / 2, height * 0.67, Math.min(width * 0.72, 460), 20, 0xff8a22);
    this.platform.setStrokeStyle(4, 0xffc266);
    this.cdawg = new CdawgRig(this, width / 2, height * 0.55);

    this.impactText = this.add.text(width / 2, height * 0.28, '', {
      color: '#ffc266',
      fontFamily: 'Arial, sans-serif',
      fontSize: '44px',
      fontStyle: '900',
      stroke: '#1d1208',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);
    this.particles = Array.from({ length: 12 }, (_, index) => this.add.circle(width / 2, height * 0.68, 4 + (index % 3), 0xffc266, 0));

    this.scoreText = this.add.text(18, 16, '0.0s', {
      color: '#fff7df',
      fontFamily: 'Arial, sans-serif',
      fontSize: '30px',
      fontStyle: '700',
    });
    this.scale.on('resize', this.handleResize, this);
  }

  update(_time: number, delta: number): void {
    if (this.ended) return;
    const config = this.options.configRef.current;
    const step = stepBalanceSimulation(this.state, this.options.inputRef.current, delta, config);
    this.state = step.state;
    this.renderState(step.scoreSeconds);
    if (getMilestoneForScore(step.scoreSeconds, this.lastScoreSeconds)) {
      this.pulseCdawg();
    }
    this.lastScoreSeconds = step.scoreSeconds;
    this.options.onTick(step.state, step.scoreSeconds);

    if (step.state.failed) {
      this.ended = true;
      this.renderImpact();
      this.time.delayedCall(380, () => this.options.onGameOver(calculateScoreSeconds(step.state.survivalMs), step.state));
    }
  }

  private createCrowd(width: number, height: number): void {
    const baseY = height * 0.84;
    for (let i = 0; i < 18; i += 1) {
      const x = (i / 17) * width;
      const crowdHeight = 22 + (i % 5) * 9;
      this.add.rectangle(x, baseY - crowdHeight / 2, width / 22, crowdHeight, 0x05060b, 0.56);
      if (i % 3 === 0) this.add.circle(x, baseY - crowdHeight - 8, 4, 0xff8a22, 0.18);
    }
  }

  private renderState(scoreSeconds: number): void {
    const { width, height } = this.scale;
    const config = this.options.configRef.current;
    const tilt = this.state.tilt;
    const panic = Math.abs(tilt) / config.failureAngle;
    this.platform.setPosition(width / 2, height * 0.67).setAngle(tilt);
    this.platformGlow.setPosition(width / 2, height * 0.7).setAngle(tilt).setAlpha(0.18 + panic * 0.35);
    this.cdawg.setPosition(width / 2 + tilt * 2.1, height * 0.56 + Math.sin(this.state.survivalMs / 120) * 3);
    this.cdawg.setAngle(tilt * 0.74);
    const pulseProgress = Math.max(0, this.milestonePulseUntil - this.time.now) / 420;
    this.cdawg.setScale(1 + panic * 0.04 + pulseProgress * 0.08, 1 - panic * 0.03 - pulseProgress * 0.04);
    this.cdawg.applyPose(getCdawgPoseForBalance(tilt, panic, false), panic);
    this.scoreText.setText(`${scoreSeconds.toFixed(1)}s`);
  }

  private renderImpact(): void {
    this.cdawg.setPosition(this.scale.width / 2 + (this.state.tilt > 0 ? 82 : -82), this.scale.height * 0.72);
    this.cdawg.applyPose('impact', 1);
    this.impactText.setText('WHAM!').setAlpha(1);
    this.particles.forEach((particle, index) => {
      const angle = (Math.PI * 2 * index) / this.particles.length;
      const distance = 34 + (index % 4) * 12;
      particle.setPosition(this.scale.width / 2, this.scale.height * 0.68).setAlpha(0.9);
      this.tweens.add({
        targets: particle,
        x: this.scale.width / 2 + Math.cos(angle) * distance,
        y: this.scale.height * 0.68 + Math.sin(angle) * distance,
        alpha: 0,
        duration: 360,
      });
    });
    this.cameras.main.shake(160, 0.012);
  }

  private pulseCdawg(): void {
    this.milestonePulseUntil = this.time.now + 420;
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width;
    const height = gameSize.height;
    this.background.setPosition(width / 2, height / 2).setSize(width, height);
    this.platform.setSize(Math.min(width * 0.72, 460), 20);
    this.platformGlow.setSize(Math.min(width * 0.72, 460), 24);
    this.impactText.setPosition(width / 2, height * 0.28);
  }
}
