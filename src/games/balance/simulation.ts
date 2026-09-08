export type BalanceInputDirection = 'left' | 'right' | 'none';
export type BalanceTuningPhase = 'Warmup' | 'Active' | 'Intense' | 'Critical';
export type FailureDirection = 'left' | 'right';

export interface BalancePhaseBand {
  phase: BalanceTuningPhase;
  startsAtSeconds: number;
  gravityMultiplier: number;
  disturbanceMultiplier: number;
  dampingOffset: number;
  pressureMultiplier: number;
}

export interface BalanceConfig {
  inputAcceleration: number;
  gravityAcceleration: number;
  damping: number;
  disturbanceBase: number;
  disturbanceGrowth: number;
  disturbanceLimit: number;
  directionalPressureBase: number;
  directionalPressureGrowth: number;
  difficultyGrowthPerSecond: number;
  maxDifficultyMultiplier: number;
  failureAngle: number;
  failureBalance: number;
  startingTilt: number;
  startingVelocity: number;
  maxAngularVelocity: number;
  wobbleFrequency: number;
  warmupGraceSeconds: number;
  holdFatigueStartsMs: number;
  holdFatigueMax: number;
  holdFatigueRampMs: number;
  releaseKickStrength: number;
  releaseKickDecay: number;
  centralRecoveryZone: number;
  phaseBands: BalancePhaseBand[];
}

export interface BalanceState {
  tilt: number;
  angularVelocity: number;
  survivalMs: number;
  difficultyMultiplier: number;
  tuningPhase: BalanceTuningPhase;
  heldInputMs: number;
  previousInput: BalanceInputDirection;
  releaseKick: number;
  lastDisturbance: number;
  failureDirection?: FailureDirection;
  failed: boolean;
}

export interface SimulationStep {
  state: BalanceState;
  scoreSeconds: number;
}

export function createInitialBalanceState(config: BalanceConfig): BalanceState {
  return {
    tilt: config.startingTilt,
    angularVelocity: config.startingVelocity,
    survivalMs: 0,
    difficultyMultiplier: 1,
    tuningPhase: 'Warmup',
    heldInputMs: 0,
    previousInput: 'none',
    releaseKick: 0,
    lastDisturbance: 0,
    failed: false,
  };
}

export function calculateDifficulty(survivalMs: number, config: BalanceConfig): number {
  const seconds = survivalMs / 1000;
  if (seconds <= config.warmupGraceSeconds) return 1;
  const activeSeconds = seconds - config.warmupGraceSeconds;
  const smoothCurve = Math.pow(activeSeconds, 1.08);
  return Math.min(config.maxDifficultyMultiplier, 1 + smoothCurve * config.difficultyGrowthPerSecond);
}

export function getBalanceTuningPhase(survivalMs: number, config: BalanceConfig): BalanceTuningPhase {
  const seconds = survivalMs / 1000;
  return [...config.phaseBands]
    .sort((a, b) => a.startsAtSeconds - b.startsAtSeconds)
    .reduce<BalanceTuningPhase>((phase, band) => (seconds >= band.startsAtSeconds ? band.phase : phase), 'Warmup');
}

export function getPhaseBand(survivalMs: number, config: BalanceConfig): BalancePhaseBand {
  const phase = getBalanceTuningPhase(survivalMs, config);
  return config.phaseBands.find((band) => band.phase === phase) ?? config.phaseBands[0];
}

export function calculateScoreSeconds(survivalMs: number): number {
  return Math.max(0, Math.round((survivalMs / 1000) * 10) / 10);
}

export function calculateBoundedDisturbance(survivalMs: number, difficultyMultiplier: number, config: BalanceConfig): number {
  const seconds = survivalMs / 1000;
  const raw =
    Math.sin(seconds * Math.PI * 2 * config.wobbleFrequency) *
      (config.disturbanceBase + config.disturbanceGrowth * (difficultyMultiplier - 1)) +
    Math.sin(seconds * 0.83 + 1.7) *
      (config.directionalPressureBase + config.directionalPressureGrowth * (difficultyMultiplier - 1));
  return clamp(raw, -config.disturbanceLimit, config.disturbanceLimit);
}

export function getMilestoneForScore(scoreSeconds: number, previousScoreSeconds: number): number | null {
  const milestones = [10, 20, 30, 45, 60];
  return milestones.find((milestone) => previousScoreSeconds < milestone && scoreSeconds >= milestone) ?? null;
}

export function stepBalanceSimulation(
  previous: BalanceState,
  input: BalanceInputDirection,
  deltaMs: number,
  config: BalanceConfig,
): SimulationStep {
  if (previous.failed) {
    return { state: previous, scoreSeconds: calculateScoreSeconds(previous.survivalMs) };
  }

  const dt = Math.min(deltaMs, 50) / 1000;
  const survivalMs = previous.survivalMs + deltaMs;
  const difficultyMultiplier = calculateDifficulty(survivalMs, config);
  const phaseBand = getPhaseBand(survivalMs, config);
  const tuningPhase = phaseBand.phase;
  const normalizedTilt = previous.tilt / config.failureAngle;
  const centralRecovery = Math.abs(normalizedTilt) < config.centralRecoveryZone ? 0.78 : 1;
  const downhillAcceleration =
    normalizedTilt * config.gravityAcceleration * difficultyMultiplier * phaseBand.gravityMultiplier * centralRecovery;
  const heldInputMs = input !== 'none' && input === previous.previousInput ? previous.heldInputMs + deltaMs : input === 'none' ? 0 : deltaMs;
  const fatigueProgress = clamp((heldInputMs - config.holdFatigueStartsMs) / config.holdFatigueRampMs, 0, 1);
  const inputFatigue = fatigueProgress * config.holdFatigueMax;
  const inputAcceleration =
    input === 'left'
      ? -config.inputAcceleration * (1 - inputFatigue)
      : input === 'right'
        ? config.inputAcceleration * (1 - inputFatigue)
        : 0;
  const releasedDirection = previous.previousInput !== 'none' && input === 'none' ? directionSign(previous.previousInput) : 0;
  const releaseKick =
    previous.releaseKick * config.releaseKickDecay +
    (releasedDirection ? -releasedDirection * config.releaseKickStrength * clamp(previous.heldInputMs / 1200, 0, 1) : 0);
  const disturbance = clamp(
    calculateBoundedDisturbance(survivalMs, difficultyMultiplier, config) *
      phaseBand.disturbanceMultiplier *
      phaseBand.pressureMultiplier,
    -config.disturbanceLimit,
    config.disturbanceLimit,
  );
  const inactionPenalty =
    input === 'none' && Math.abs(normalizedTilt) > config.centralRecoveryZone
      ? Math.sign(previous.tilt || 1) * 0.11 * difficultyMultiplier
      : 0;
  const effectiveDamping = clamp(config.damping + phaseBand.dampingOffset, 0.82, 0.985);
  const angularVelocity = clamp(
    (previous.angularVelocity + downhillAcceleration + inputAcceleration + disturbance + releaseKick + inactionPenalty) *
      effectiveDamping,
    -config.maxAngularVelocity,
    config.maxAngularVelocity,
  );
  const tilt = previous.tilt + angularVelocity * dt * 18;
  const failed = Math.abs(tilt) >= config.failureAngle || Math.abs(tilt / config.failureAngle) >= config.failureBalance;

  const failureDirection: FailureDirection | undefined = failed ? (tilt < 0 ? 'left' : 'right') : undefined;
  const state: BalanceState = {
    tilt,
    angularVelocity,
    survivalMs,
    difficultyMultiplier,
    tuningPhase,
    heldInputMs,
    previousInput: input,
    releaseKick,
    lastDisturbance: disturbance,
    failureDirection,
    failed,
  };

  return { state, scoreSeconds: calculateScoreSeconds(survivalMs) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function directionSign(input: BalanceInputDirection): number {
  if (input === 'left') return -1;
  if (input === 'right') return 1;
  return 0;
}
