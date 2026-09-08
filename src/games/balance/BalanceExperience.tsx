import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createV1ProductUiPolicy, getProductionIdentityLabel } from '../../app/v1ProductPolicy';
import type { HostContext } from '../../contracts/events';
import { WebAudioManager } from '../../services/audioManager';
import { calculatePlaytestStats } from '../../services/playtestStats';
import type { ScoreRepository } from '../../services/scoreRepository';
import type { GamePhase, LeaderboardEntry, RunResult } from '../../types/game';
import { BalanceGameCanvas } from './BalanceGameCanvas';
import { getCompactDockedLayoutClasses, getInitialBalancePhase, getPhaseAfterRunResult } from './balanceV1Flow';
import { balanceConfig } from './config';
import {
  getDirectionForKey,
  getViewportLayoutMode,
  isEditableInputTarget,
  isGameplayInputActive,
  resolveHeldInput,
  shouldPreventScrollForKey,
} from './inputManager';
import { getMilestoneForScore, type BalanceConfig, type BalanceInputDirection, type BalanceState } from './simulation';

interface BalanceExperienceProps {
  scoreRepository: ScoreRepository;
  onExit?: () => void;
  hostContext: HostContext;
}

interface DebugSnapshot {
  state: BalanceState;
  input: BalanceInputDirection;
  phase: GamePhase;
}

export function BalanceExperience({ hostContext, scoreRepository, onExit }: BalanceExperienceProps) {
  const uiPolicy = useMemo(() => createV1ProductUiPolicy(), []);
  const [phase, setPhase] = useState<GamePhase>(() => getInitialBalancePhase());
  const [countdown, setCountdown] = useState(3);
  const [input, setInput] = useState<BalanceInputDirection>('none');
  const [score, setScore] = useState(0);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [showDev, setShowDev] = useState(false);
  const [debug, setDebug] = useState<DebugSnapshot | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [tuning, setTuning] = useState<BalanceConfig>(() => cloneBalanceConfig(balanceConfig));
  const [milestone, setMilestone] = useState<number | null>(null);
  const inputRef = useRef<BalanceInputDirection>('none');
  const configRef = useRef<BalanceConfig>(tuning);
  const heldKeysRef = useRef<Set<string>>(new Set());
  const phaseRef = useRef<GamePhase>(getInitialBalancePhase());
  const previousScoreRef = useRef(0);
  const audio = useMemo(() => new WebAudioManager(), []);

  const personalStats = scoreRepository.getPersonalStats(hostContext.currentUser.id, hostContext.guildId);
  const personalBest = personalStats.personalBest;
  const leaderboard = scoreRepository.getGuildLeaderboard(hostContext.guildId);
  const playtestStats = calculatePlaytestStats(personalStats.recentAttempts);
  const identityLabel = getProductionIdentityLabel(hostContext);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    configRef.current = tuning;
  }, [tuning]);

  useEffect(() => {
    audio.setMusicEnabled(musicEnabled);
    return () => audio.stopMusic();
  }, [audio, musicEnabled]);

  useEffect(() => {
    audio.setSfxEnabled(sfxEnabled);
  }, [audio, sfxEnabled]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    setCountdown(3);
    audio.playCue('countdown');
    const first = window.setTimeout(() => {
      setCountdown(2);
      audio.playCue('countdown');
    }, 800);
    const second = window.setTimeout(() => {
      setCountdown(1);
      audio.playCue('countdown');
    }, 1600);
    const third = window.setTimeout(() => {
      setScore(0);
      previousScoreRef.current = 0;
      setRunResult(null);
      setPhase('playing');
    }, 2400);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
      window.clearTimeout(third);
    };
  }, [audio, phase]);

  useEffect(() => {
    const clearHeldInput = () => {
      heldKeysRef.current.clear();
      setInput('none');
    };

    const down = (event: KeyboardEvent) => {
      const activePhase = phaseRef.current;
      if (shouldPreventScrollForKey(event.key, activePhase, event.target)) {
        event.preventDefault();
      }
      if (!isGameplayInputActive(activePhase) || isEditableInputTarget(event.target)) return;

      const direction = getDirectionForKey(event.key);
      if (!direction) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') event.preventDefault();
      heldKeysRef.current.delete(event.key);
      heldKeysRef.current.add(event.key);
      setInput(resolveHeldInput(heldKeysRef.current));
      if (!event.repeat) audio.playCue('input');
    };

    const up = (event: KeyboardEvent) => {
      const activePhase = phaseRef.current;
      if (shouldPreventScrollForKey(event.key, activePhase, event.target)) event.preventDefault();
      if (!getDirectionForKey(event.key)) return;
      heldKeysRef.current.delete(event.key);
      setInput(isGameplayInputActive(activePhase) ? resolveHeldInput(heldKeysRef.current) : 'none');
    };

    const visibility = () => {
      if (document.hidden) clearHeldInput();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clearHeldInput);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clearHeldInput);
      document.removeEventListener('visibilitychange', visibility);
      clearHeldInput();
    };
  }, [audio]);

  const startRun = () => {
    heldKeysRef.current.clear();
    setInput('none');
    setMilestone(null);
    setScore(0);
    setRunResult(null);
    setPhase('countdown');
  };

  const updateInput = (nextInput: BalanceInputDirection) => {
    if (!isGameplayInputActive(phase)) return;
    setInput(nextInput);
    if (nextInput !== 'none') audio.playCue('input');
  };

  const handleTick = useCallback(
    (state: BalanceState, nextScore: number) => {
      setScore(nextScore);
      setDebug({ state, input: inputRef.current, phase });
      const nextMilestone = getMilestoneForScore(nextScore, previousScoreRef.current);
      previousScoreRef.current = nextScore;
      if (nextMilestone) {
        setMilestone(nextMilestone);
        audio.playCue('record');
        window.setTimeout(() => setMilestone((current) => (current === nextMilestone ? null : current)), 1300);
      }
      if (Math.abs(state.tilt) > configRef.current.failureAngle * 0.72) audio.playCue('danger');
    },
    [audio, phase],
  );

  const handleGameOver = useCallback(
    (finalScore: number, finalState: BalanceState) => {
      const result = scoreRepository.submitScore(finalScore, {
        failureDirection: finalState.failureDirection,
        failurePhase: finalState.tuningPhase,
      });
      setRunResult(result);
      setPhase(getPhaseAfterRunResult(result));
      heldKeysRef.current.clear();
      setInput('none');
      audio.playCue(result.isPersonalBest ? 'record' : 'fall');
    },
    [audio, scoreRepository],
  );

  return (
    <main className={`${getCompactDockedLayoutClasses(phase, uiPolicy.showDevelopmentUi)} ${milestone ? 'milestone-active' : ''}`}>
      <header className="balance-v1-header">
        {uiPolicy.showDevelopmentUi && onExit && <button className="ghost-button" onClick={onExit} type="button">Back</button>}
        <div className="balance-brand">
          <span className="prototype-pill">Cdawg Balance</span>
          <h1>Cdawg Balance</h1>
        </div>
        <div className="audio-controls" aria-label="Audio settings">
          <label><input checked={musicEnabled} onChange={(event) => setMusicEnabled(event.target.checked)} type="checkbox" /> Music</label>
          <label><input checked={sfxEnabled} onChange={(event) => setSfxEnabled(event.target.checked)} type="checkbox" /> SFX</label>
        </div>
      </header>

      <section className="balance-compact-hud" aria-label="Score">
        <div><span>Score</span><strong>{score.toFixed(1)}s</strong></div>
        <div><span>Best</span><strong>{personalBest.toFixed(1)}s</strong></div>
        <div><span>Player</span><strong>{identityLabel}</strong></div>
      </section>

      {uiPolicy.showDiscordDebugState && (
        <section className="activity-status-panel" data-testid="dev-discord-status">
          <span>State: {hostContext.initializationState ?? 'detecting'}</span>
          <span>{hostContext.initializationStatus}</span>
          <span>User: {hostContext.currentUser.displayName}</span>
        </section>
      )}

      <section className="cabinet balance-stage" data-viewport-mode={getViewportLayoutMode(phase)}>
        {phase === 'playing' && <BalanceGameCanvas configRef={configRef} inputRef={inputRef} onGameOver={handleGameOver} onTick={handleTick} />}

        {phase === 'home' && (
          <div className="start-panel balance-start-panel">
            <p>One attempt. Hold the line. Keep Cdawg standing.</p>
            <button className="primary-button" onClick={startRun} type="button">Start Game</button>
          </div>
        )}

        {phase === 'countdown' && <div className="countdown">{countdown}</div>}

        {phase === 'results' && runResult && (
          <div className="result-panel">
            <p className="result-label">Final Score</p>
            <strong>{runResult.scoreSeconds.toFixed(1)}s</strong>
            <span>{runResult.isPersonalBest ? 'New personal best' : `Best remains ${personalBest.toFixed(1)}s`}</span>
            <div className="result-actions">
              <button className="primary-button" onClick={startRun} type="button">Play Again</button>
              <button className="secondary-button" onClick={() => setPhase('leaderboard')} type="button">Leaderboard</button>
            </div>
          </div>
        )}

        {phase === 'leaderboard' && <LeaderboardView entries={leaderboard} onBack={() => setPhase(runResult ? 'results' : 'home')} />}

        {milestone && <div className="milestone-message">{milestone}s survived</div>}
      </section>

      <section className="control-deck" aria-label="Game controls">
        <button
          className={`control-button control-left ${input === 'left' ? 'is-pressed' : ''}`}
          disabled={!isGameplayInputActive(phase)}
          onPointerDown={() => updateInput('left')}
          onPointerLeave={() => updateInput('none')}
          onPointerUp={() => updateInput('none')}
          type="button"
        >
          Left
        </button>
        <div className="center-controls">
          <span className="keyboard-hint">Use ← → or A / D</span>
        </div>
        <button
          className={`control-button control-right ${input === 'right' ? 'is-pressed' : ''}`}
          disabled={!isGameplayInputActive(phase)}
          onPointerDown={() => updateInput('right')}
          onPointerLeave={() => updateInput('none')}
          onPointerUp={() => updateInput('none')}
          type="button"
        >
          Right
        </button>
      </section>

      {uiPolicy.showDevelopmentUi && (
        <button className="dev-toggle" onClick={() => setShowDev((value) => !value)} type="button">Dev</button>
      )}
      {uiPolicy.showDevelopmentUi && showDev && (
        <aside className="dev-panel">
          <span>Phase: {phase}</span>
          <span>Input: {input}</span>
          <span>Tuning phase: {debug?.state.tuningPhase ?? 'Warmup'}</span>
          <span>Tilt: {debug?.state.tilt.toFixed(2) ?? '0.00'}</span>
          <span>Angular velocity: {debug?.state.angularVelocity.toFixed(2) ?? '0.00'}</span>
          <span>Difficulty: {debug?.state.difficultyMultiplier.toFixed(2) ?? '1.00'}</span>
          <span>Held input: {debug?.state.heldInputMs ?? 0}ms</span>
          <span>Disturbance: {debug?.state.lastDisturbance.toFixed(2) ?? '0.00'}</span>
          <span>Survival: {((debug?.state.survivalMs ?? 0) / 1000).toFixed(1)}s</span>
          <DevTuningControls tuning={tuning} onChange={setTuning} />
          <PlaytestStatsView stats={playtestStats} />
        </aside>
      )}
    </main>
  );
}

function DevTuningControls({ tuning, onChange }: { tuning: BalanceConfig; onChange: (config: BalanceConfig) => void }) {
  const update = (key: keyof Pick<BalanceConfig, 'gravityAcceleration' | 'inputAcceleration' | 'damping' | 'difficultyGrowthPerSecond' | 'disturbanceGrowth' | 'failureAngle'>, value: number) => {
    onChange({ ...tuning, [key]: value });
  };

  const copyTuning = () => {
    void navigator.clipboard?.writeText(JSON.stringify(tuning, null, 2));
  };

  return (
    <div className="dev-section">
      <strong>Tuning</strong>
      <TuningSlider label="Gravity" max={0.9} min={0.2} onChange={(value) => update('gravityAcceleration', value)} step={0.01} value={tuning.gravityAcceleration} />
      <TuningSlider label="Input" max={1.3} min={0.5} onChange={(value) => update('inputAcceleration', value)} step={0.01} value={tuning.inputAcceleration} />
      <TuningSlider label="Damping" max={0.98} min={0.82} onChange={(value) => update('damping', value)} step={0.005} value={tuning.damping} />
      <TuningSlider label="Growth" max={0.13} min={0.02} onChange={(value) => update('difficultyGrowthPerSecond', value)} step={0.005} value={tuning.difficultyGrowthPerSecond} />
      <TuningSlider label="Disturb" max={0.14} min={0.02} onChange={(value) => update('disturbanceGrowth', value)} step={0.005} value={tuning.disturbanceGrowth} />
      <TuningSlider label="Fail angle" max={38} min={24} onChange={(value) => update('failureAngle', value)} step={1} value={tuning.failureAngle} />
      <div className="dev-actions">
        <button className="mini-button" onClick={() => onChange(cloneBalanceConfig(balanceConfig))} type="button">Reset</button>
        <button className="mini-button" onClick={copyTuning} type="button">Copy JSON</button>
      </div>
    </div>
  );
}

function TuningSlider({ label, max, min, onChange, step, value }: { label: string; max: number; min: number; onChange: (value: number) => void; step: number; value: number }) {
  return (
    <label className="tuning-slider">
      <span>{label}: {value.toFixed(step < 0.01 ? 3 : 2)}</span>
      <input max={max} min={min} onChange={(event) => onChange(Number(event.target.value))} step={step} type="range" value={value} />
    </label>
  );
}

function PlaytestStatsView({ stats }: { stats: ReturnType<typeof calculatePlaytestStats> }) {
  return (
    <div className="dev-section">
      <strong>Playtest</strong>
      <span>Attempts: {stats.attempts}</span>
      <span>Average: {stats.average.toFixed(1)}s</span>
      <span>Median: {stats.median.toFixed(1)}s</span>
      <span>Best: {stats.best.toFixed(1)}s</span>
      <span>Buckets: &lt;10 {stats.buckets.under10}, 10-20 {stats.buckets['10to20']}, 20-40 {stats.buckets['20to40']}, 40-60 {stats.buckets['40to60']}, 60+ {stats.buckets['60plus']}</span>
      <span>Falls: L {stats.failureDirections.left}, R {stats.failureDirections.right}, ? {stats.failureDirections.unknown}</span>
      <span>Phases: {Object.entries(stats.failurePhases).map(([phaseName, count]) => `${phaseName} ${count}`).join(', ') || 'none'}</span>
    </div>
  );
}

function cloneBalanceConfig(config: BalanceConfig): BalanceConfig {
  return {
    ...config,
    phaseBands: config.phaseBands.map((band) => ({ ...band })),
  };
}

function LeaderboardView({ entries, onBack }: { entries: LeaderboardEntry[]; onBack: () => void }) {
  return (
    <div className="leaderboard-panel">
      <p className="result-label">Leaderboard</p>
      {entries.length > 0 ? (
        <ol>
          {entries.map((entry, index) => (
            <li className={entry.isLocalPlayer ? 'local-player' : ''} key={entry.playerName}>
              <span>#{index + 1}</span>
              <strong>{entry.playerName}</strong>
              <em>{entry.bestSeconds.toFixed(1)}s</em>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-leaderboard">Your first completed run will set the bar.</p>
      )}
      <button className="secondary-button" onClick={onBack} type="button">Back</button>
    </div>
  );
}
