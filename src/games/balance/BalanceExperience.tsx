import { CountdownClock, SimulationClock } from './simulationClock';
import { HeldControls, observeInterruptions } from './interruption';
import { ConnectionStatus } from '../../app/ConnectionStatus';
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
  shouldPreventScrollForKey,
} from './inputManager';
import { getMilestoneForScore, type BalanceConfig, type BalanceInputDirection, type BalanceState } from './simulation';

interface BalanceExperienceProps {
  scoreRepository: ScoreRepository;
  onExit?: () => void;
  hostContext: HostContext;
  onRetryConnection?: () => void;
  onContinuePractice?: () => void;
}

interface DebugSnapshot {
  state: BalanceState;
  input: BalanceInputDirection;
  phase: GamePhase;
}

export function BalanceExperience({ hostContext, scoreRepository, onExit, onRetryConnection, onContinuePractice }: BalanceExperienceProps) {
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
  const controls = useRef(new HeldControls());
  const clockRef = useRef(new SimulationClock(balanceConfig));
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
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
    if (phase !== 'countdown' || paused) return;
    const countdownClock = new CountdownClock();
    let frame = 0;
    let digit = 3;
    setCountdown(digit); audio.playCue('countdown');
    const tick = (now: number) => {
      if (pausedRef.current) return;
      const result = countdownClock.frame(now);
      if (document.hidden || result === 'interrupted') { pauseRun(); return; }
      if (result === 'ready') {
        clearInput(); setScore(0); previousScoreRef.current = 0; setRunResult(null); setPhase('playing'); return;
      }
      if (digit !== countdownClock.digit) { digit = countdownClock.digit; setCountdown(digit); audio.playCue('countdown'); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [audio, phase, paused]);

  const clearInput = () => {
    controls.current.clear(); inputRef.current = 'none'; setInput('none'); clockRef.current.clearInput();
  };
  const pauseRun = () => {
    clearInput();
    if (!isGameplayInputActive(phaseRef.current) || clockRef.current.state.failed) return;
    pausedRef.current = true; clockRef.current.pause(); setPaused(true);
  };
  const publishInput = () => {
    const direction = controls.current.direction;
    inputRef.current = direction; setInput(direction);
    clockRef.current.input(direction, performance.now());
  };
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (shouldPreventScrollForKey(event.key, phaseRef.current, event.target)) event.preventDefault();
      if (pausedRef.current || !isGameplayInputActive(phaseRef.current) || isEditableInputTarget(event.target) || event.repeat) return;
      const direction = getDirectionForKey(event.key);
      if (!direction || direction === 'none') return;
      controls.current.press(`key:${event.code || event.key.toLowerCase()}`, direction);
      publishInput(); audio.playCue('input');
    };
    const up = (event: KeyboardEvent) => {
      if (!getDirectionForKey(event.key)) return;
      if (shouldPreventScrollForKey(event.key, phaseRef.current, event.target)) event.preventDefault();
      controls.current.release(`key:${event.code || event.key.toLowerCase()}`); publishInput();
    };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    const stop = observeInterruptions(window, document, pauseRun, clearInput);
    return () => {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); stop(); clockRef.current.pause();
    };
  }, [audio]);

  const startRun = () => {
    clearInput();
    clockRef.current = new SimulationClock(configRef.current);
    pausedRef.current = false; setPaused(false);
    setMilestone(null);
    setScore(0);
    setRunResult(null);
    setPhase('countdown');
  };

  const pointerDown = (event: React.PointerEvent<HTMLButtonElement>, direction: 'left' | 'right') => {
    if (pausedRef.current || !isGameplayInputActive(phase)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    controls.current.press(`pointer:${event.pointerId}`, direction); publishInput(); audio.playCue('input');
  };
  const pointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    controls.current.release(`pointer:${event.pointerId}`); publishInput();
  };
  const resumeRun = () => {
    if (document.hidden) return;
    clearInput(); clockRef.current.resume(); pausedRef.current = false; setPaused(false);
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
      clearInput();
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
          <ConnectionStatus context={hostContext} onRetry={onRetryConnection} onPractice={onContinuePractice} />
        </div>
        <div className="audio-controls" aria-label="Audio settings">
          <label><input checked={musicEnabled} onChange={(event) => setMusicEnabled(event.target.checked)} type="checkbox" /> Music</label>
          <label><input checked={sfxEnabled} onChange={(event) => setSfxEnabled(event.target.checked)} type="checkbox" /> SFX</label>
        </div>
      </header>

      <section className="balance-compact-hud" aria-label="Score">
        <div><span>Score</span><strong>{score.toFixed(1)}s</strong></div>
        <div><span>Local best</span><strong>{personalBest.toFixed(1)}s</strong></div>
        <div><span>Player</span><strong>{identityLabel}</strong></div>
      </section>

      {uiPolicy.showDiscordDebugState && (
        <section className="activity-status-panel" data-testid="dev-discord-status">
          <span>State: {hostContext.connectionState ?? 'local-practice'}</span>
          <span>{hostContext.initializationStatus}</span>
          <span>User: {hostContext.currentUser.displayName}</span>
        </section>
      )}

      <section className="cabinet balance-stage" data-viewport-mode={getViewportLayoutMode(phase)}>
        {phase === 'playing' && <BalanceGameCanvas clock={clockRef.current} onPause={pauseRun} configRef={configRef} onGameOver={handleGameOver} onTick={handleTick} />}

        {phase === 'home' && (
          <div className="start-panel balance-start-panel">
            <p>One attempt. Hold the line. Keep Cdawg standing.</p>
            <button className="primary-button" onClick={startRun} type="button">Start Game</button>
          </div>
        )}

        {phase === 'countdown' && !paused && <div className="countdown">{countdown}</div>}

        {paused && <div className="pause-panel" role="dialog" aria-label="Game paused">
          <strong>Paused</strong><p>Your score is on hold.</p>
          <button className="primary-button" onClick={resumeRun} type="button">Resume</button>
        </div>}

        {phase === 'results' && runResult && (
          <div className="result-panel">
            <p className="result-label">Final Score · Saved locally</p>
            <strong>{runResult.scoreSeconds.toFixed(1)}s</strong>
            <span>{runResult.isPersonalBest ? 'New local best' : `Local best remains ${personalBest.toFixed(1)}s`}</span>
            <div className="result-actions">
              <button className="primary-button" onClick={startRun} type="button">Play Again</button>
              <button className="secondary-button" onClick={() => setPhase('leaderboard')} type="button">Local results</button>
            </div>
          </div>
        )}

        {phase === 'leaderboard' && <LeaderboardView entries={leaderboard} onBack={() => setPhase(runResult ? 'results' : 'home')} />}

        {milestone && <div className="milestone-message">{milestone}s survived</div>}
      </section>

      <section className="control-deck" aria-label="Game controls">
        <button
          className={`control-button control-left ${input === 'left' ? 'is-pressed' : ''}`}
          disabled={paused || !isGameplayInputActive(phase)}
          onPointerDown={(event) => pointerDown(event, 'left')}
          onPointerUp={pointerUp}
          onPointerCancel={clearInput}
          onLostPointerCapture={pointerUp}
          type="button"
        >
          Left
        </button>
        <div className="center-controls">
          <span className="keyboard-hint">Use ← → or A / D</span>
        </div>
        <button
          className={`control-button control-right ${input === 'right' ? 'is-pressed' : ''}`}
          disabled={paused || !isGameplayInputActive(phase)}
          onPointerDown={(event) => pointerDown(event, 'right')}
          onPointerUp={pointerUp}
          onPointerCancel={clearInput}
          onLostPointerCapture={pointerUp}
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
      <p className="result-label">Local practice results</p>
      <p>Saved in this browser only. Not shared with your server.</p>
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
