import Phaser from 'phaser';

export type CdawgPoseState = 'idle' | 'lean-left' | 'lean-right' | 'brace' | 'wobble' | 'panic' | 'fall' | 'impact' | 'new-record-victory';

export interface CdawgRigParts {
  head: Phaser.GameObjects.Arc;
  leftEar: Phaser.GameObjects.Ellipse;
  rightEar: Phaser.GameObjects.Ellipse;
  muzzle: Phaser.GameObjects.Ellipse;
  torso: Phaser.GameObjects.Rectangle;
  jacketTrim: Phaser.GameObjects.Rectangle;
  leftArm: Phaser.GameObjects.Rectangle;
  rightArm: Phaser.GameObjects.Rectangle;
  leftHand: Phaser.GameObjects.Arc;
  rightHand: Phaser.GameObjects.Arc;
  leftLeg: Phaser.GameObjects.Rectangle;
  rightLeg: Phaser.GameObjects.Rectangle;
  leftShoe: Phaser.GameObjects.Ellipse;
  rightShoe: Phaser.GameObjects.Ellipse;
  tail: Phaser.GameObjects.Triangle;
  leftEye: Phaser.GameObjects.Arc;
  rightEye: Phaser.GameObjects.Arc;
  leftBrow: Phaser.GameObjects.Rectangle;
  rightBrow: Phaser.GameObjects.Rectangle;
  mouth: Phaser.GameObjects.Rectangle;
  emblem: Phaser.GameObjects.Text;
}

const colors = {
  fur: 0x151515,
  furLight: 0x252323,
  cream: 0xffefd0,
  orange: 0xff8a22,
  orangeLight: 0xffc266,
  shoe: 0xf7f2e8,
  ink: 0x08080c,
};

export function getCdawgPoseForBalance(tilt: number, panic: number, failed: boolean, impact = false, newRecord = false): CdawgPoseState {
  if (newRecord) return 'new-record-victory';
  if (impact) return 'impact';
  if (failed) return 'fall';
  if (panic > 0.82) return 'panic';
  if (panic > 0.58) return 'wobble';
  if (Math.abs(tilt) > 13) return 'brace';
  if (tilt < -4) return 'lean-left';
  if (tilt > 4) return 'lean-right';
  return 'idle';
}

export class CdawgRig {
  readonly container: Phaser.GameObjects.Container;
  readonly parts: CdawgRigParts;
  private poseState: CdawgPoseState = 'idle';

  constructor(private readonly scene: Phaser.Scene, x: number, y: number) {
    this.container = scene.add.container(x, y);
    this.parts = this.createParts();
    this.container.add([
      this.parts.tail,
      this.parts.leftLeg,
      this.parts.rightLeg,
      this.parts.leftShoe,
      this.parts.rightShoe,
      this.parts.torso,
      this.parts.jacketTrim,
      this.parts.emblem,
      this.parts.leftArm,
      this.parts.rightArm,
      this.parts.leftHand,
      this.parts.rightHand,
      this.parts.leftEar,
      this.parts.rightEar,
      this.parts.head,
      this.parts.muzzle,
      this.parts.leftEye,
      this.parts.rightEye,
      this.parts.leftBrow,
      this.parts.rightBrow,
      this.parts.mouth,
    ]);
    this.applyPose('idle', 0);
  }

  setPosition(x: number, y: number): this {
    this.container.setPosition(x, y);
    return this;
  }

  setAngle(angle: number): this {
    this.container.setAngle(angle);
    return this;
  }

  setScale(x: number, y = x): this {
    this.container.setScale(x, y);
    return this;
  }

  getPoseState(): CdawgPoseState {
    return this.poseState;
  }

  applyPose(state: CdawgPoseState, intensity: number): void {
    this.poseState = state;
    const lean = state === 'lean-left' ? -1 : state === 'lean-right' ? 1 : 0;
    const panic = state === 'panic' || state === 'fall' || state === 'impact' ? 1 : Math.min(0.7, intensity);
    const brace = state === 'brace' || state === 'wobble' ? 1 : 0;

    this.parts.leftArm.setPosition(-44 - brace * 8 + lean * 4, 6).setAngle(-22 - panic * 26 - brace * 18);
    this.parts.rightArm.setPosition(44 + brace * 8 + lean * 4, 6).setAngle(22 + panic * 26 + brace * 18);
    this.parts.leftHand.setPosition(-51 - brace * 13, 34 - panic * 8);
    this.parts.rightHand.setPosition(51 + brace * 13, 34 - panic * 8);
    this.parts.leftBrow.setAngle(-14 - panic * 20 + lean * 6);
    this.parts.rightBrow.setAngle(14 + panic * 20 + lean * 6);
    this.parts.mouth.setSize(18 + panic * 18, 4 + panic * 12);
    this.parts.tail.setAngle(-18 - lean * 18 + (state === 'new-record-victory' ? 38 : 0));

    if (state === 'fall') {
      this.container.setAngle(lean >= 0 ? 84 : -84);
      this.parts.leftLeg.setAngle(-18);
      this.parts.rightLeg.setAngle(24);
    } else if (state === 'impact') {
      this.container.setAngle(0);
      this.container.setScale(1.18, 0.72);
      this.parts.mouth.setSize(38, 14);
    } else if (state === 'new-record-victory') {
      this.parts.leftArm.setAngle(-118).setY(-14);
      this.parts.rightArm.setAngle(118).setY(-14);
      this.parts.mouth.setSize(34, 10);
      this.container.setScale(1.08, 0.98);
    }
  }

  private createParts(): CdawgRigParts {
    const leftLeg = this.scene.add.rectangle(-18, 44, 13, 38, colors.fur).setOrigin(0.5, 0);
    const rightLeg = this.scene.add.rectangle(18, 44, 13, 38, colors.fur).setOrigin(0.5, 0);
    const leftShoe = this.scene.add.ellipse(-20, 86, 34, 14, colors.shoe).setStrokeStyle(3, colors.ink);
    const rightShoe = this.scene.add.ellipse(20, 86, 34, 14, colors.shoe).setStrokeStyle(3, colors.ink);
    const tail = this.scene.add.triangle(42, 26, 0, 8, 34, 0, 8, 28, colors.furLight).setStrokeStyle(3, colors.ink);
    const torso = this.scene.add.rectangle(0, 16, 62, 70, colors.orange).setStrokeStyle(4, colors.orangeLight);
    const jacketTrim = this.scene.add.rectangle(0, 16, 16, 70, colors.cream, 0.92);
    const emblem = this.scene.add.text(0, 13, 'C', {
      color: '#151515',
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fontStyle: '900',
    }).setOrigin(0.5);
    const leftArm = this.scene.add.rectangle(-44, 6, 13, 58, colors.orange).setStrokeStyle(3, colors.ink);
    const rightArm = this.scene.add.rectangle(44, 6, 13, 58, colors.orange).setStrokeStyle(3, colors.ink);
    const leftHand = this.scene.add.circle(-50, 34, 10, colors.cream).setStrokeStyle(3, colors.ink);
    const rightHand = this.scene.add.circle(50, 34, 10, colors.cream).setStrokeStyle(3, colors.ink);
    const leftEar = this.scene.add.ellipse(-25, -74, 22, 42, colors.fur).setAngle(-26).setStrokeStyle(3, colors.ink);
    const rightEar = this.scene.add.ellipse(25, -74, 22, 42, colors.fur).setAngle(26).setStrokeStyle(3, colors.ink);
    const head = this.scene.add.circle(0, -48, 38, colors.fur).setStrokeStyle(4, colors.ink);
    const muzzle = this.scene.add.ellipse(0, -36, 42, 26, colors.cream).setStrokeStyle(3, colors.ink);
    const leftEye = this.scene.add.circle(-13, -54, 4, colors.cream);
    const rightEye = this.scene.add.circle(13, -54, 4, colors.cream);
    const leftBrow = this.scene.add.rectangle(-14, -64, 18, 4, colors.cream);
    const rightBrow = this.scene.add.rectangle(14, -64, 18, 4, colors.cream);
    const mouth = this.scene.add.rectangle(0, -32, 18, 4, colors.ink);

    return {
      head,
      leftEar,
      rightEar,
      muzzle,
      torso,
      jacketTrim,
      leftArm,
      rightArm,
      leftHand,
      rightHand,
      leftLeg,
      rightLeg,
      leftShoe,
      rightShoe,
      tail,
      leftEye,
      rightEye,
      leftBrow,
      rightBrow,
      mouth,
      emblem,
    };
  }
}
