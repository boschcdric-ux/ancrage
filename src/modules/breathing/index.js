import './style.css';
import { save, load } from '../../core/storage.js';
import { createBreathingView } from './view.js';

const SESSIONS_KEY = 'breathing:sessions';
const SETTINGS_KEY = 'breathing:settings';

const BREATHING_PROGRAMS = [
  {
    id: 'calm',
    label: "Calmer l'angoisse",
    emoji: '🌊',
    inhale: 4,
    hold: 0,
    exhale: 6,
    holdAfterExhale: 0,
    description: 'Expire plus longtemps pour activer le nerf vague'
  },
  {
    id: 'sleep',
    label: 'Se préparer à dormir',
    emoji: '🌙',
    inhale: 4,
    hold: 7,
    exhale: 8,
    holdAfterExhale: 0,
    description: 'Technique 4-7-8 — ralentit le système nerveux'
  },
  {
    id: 'coherence',
    label: 'Cohérence cardiaque',
    emoji: '💜',
    inhale: 5,
    hold: 0,
    exhale: 5,
    holdAfterExhale: 0,
    description: '5 min recommandées, 3x par jour'
  },
  {
    id: 'focus',
    label: 'Concentration',
    emoji: '🎯',
    inhale: 4,
    hold: 4,
    exhale: 4,
    holdAfterExhale: 4,
    description: 'Box breathing — équilibre et clarté mentale'
  },
  {
    id: 'reset',
    label: 'Décompresser vite',
    emoji: '⚡',
    inhale: 2,
    hold: 0,
    exhale: 4,
    holdAfterExhale: 0,
    description: 'Double soupir physiologique — reset rapide'
  }
];

const PHASE_ORDER = ['inhale', 'hold', 'exhale', 'holdAfterExhale'];

const ORB_MIN = 120;
const ORB_MAX = 200;

let rootContainer = null;
let onClick = null;
let tickId = null;
let audioCtx = null;

let screen = 'idle';
let settingsOpen = false;
let reducedMotion = false;

let durationMin = 5;
let programId = 'coherence';
let soundEnabled = true;

let cycleIndex = 1;
let totalCycles = 30;
let phase = 'inhale';
let phaseRemainingMs = 5000;

let orbSnapNext = false;

function getProgram() {
  return BREATHING_PROGRAMS.find((p) => p.id === programId) || BREATHING_PROGRAMS[2];
}

function getActivePhases() {
  const program = getProgram();
  return PHASE_ORDER.filter((p) => (program[p] || 0) > 0);
}

function getPhaseDurationSec(p) {
  return getProgram()[p] || 0;
}

function getCycleDurationSec() {
  const program = getProgram();
  return program.inhale + program.hold + program.exhale + program.holdAfterExhale;
}

function computeTotalCycles() {
  const cycleSec = getCycleDurationSec();
  if (cycleSec <= 0) return 1;
  const cpm = 60 / cycleSec;
  return Math.max(1, Math.round(durationMin * cpm));
}

function readSettings() {
  const raw = load(SETTINGS_KEY, null);
  if (!raw || typeof raw !== 'object') {
    return { durationMin: 5, soundEnabled: true, programId: 'coherence' };
  }
  const d = [3, 5, 10].includes(Number(raw.durationMin)) ? Number(raw.durationMin) : 5;
  const snd = raw.soundEnabled !== false;
  let pid = raw.programId || raw.pattern;
  if (pid === 'relax') pid = 'calm';
  if (!BREATHING_PROGRAMS.some((p) => p.id === pid)) pid = 'coherence';
  return { durationMin: d, soundEnabled: snd, programId: pid };
}

function writeSettings(next) {
  save(SETTINGS_KEY, next);
}

function readSessions() {
  const data = load(SESSIONS_KEY, []);
  return Array.isArray(data) ? data : [];
}

function appendSessionRecord(record) {
  const list = readSessions();
  list.push(record);
  save(SESSIONS_KEY, list);
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

async function resumeAudioIfNeeded() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
}

function playPhaseBell(phaseType) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.connect(gain);
  gain.connect(ctx.destination);

  const peak = 0.04;

  switch (phaseType) {
    case 'inhale':
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(528, t + 0.8);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      osc.start(t);
      osc.stop(t + 0.85);
      break;
    case 'hold':
      osc.frequency.setValueAtTime(528, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak * 0.65, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.55);
      break;
    case 'exhale':
      osc.frequency.setValueAtTime(528, t);
      osc.frequency.exponentialRampToValueAtTime(396, t + 0.8);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      osc.start(t);
      osc.stop(t + 0.85);
      break;
    case 'holdAfterExhale':
      osc.frequency.setValueAtTime(396, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak * 0.25, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.35);
      break;
    default:
      return;
  }
}

function orbTargetPx(forPhase) {
  if (reducedMotion) return Math.round((ORB_MIN + ORB_MAX) / 2);
  if (forPhase === 'inhale' || forPhase === 'hold') return ORB_MAX;
  return ORB_MIN;
}

function shouldSnapOrb(forPhase) {
  return forPhase === 'inhale' || forPhase === 'exhale';
}

function phaseLabelText() {
  switch (phase) {
    case 'inhale':
      return 'Inspire';
    case 'hold':
      return 'Rétention';
    case 'exhale':
      return 'Expire';
    case 'holdAfterExhale':
      return 'Pause';
    default:
      return '';
  }
}

function countdownFromMs(ms) {
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / 1000));
}

function sessionProgressRatio() {
  if (totalCycles <= 0) return 0;
  const cycleSec = getCycleDurationSec();
  if (cycleSec <= 0) return 0;

  const phases = getActivePhases();
  let elapsedInCycle = 0;
  for (const p of phases) {
    if (p === phase) {
      const dur = getPhaseDurationSec(p) * 1000;
      const inPhase = dur > 0 ? Math.min(1, Math.max(0, 1 - phaseRemainingMs / dur)) : 1;
      elapsedInCycle += getPhaseDurationSec(p) * inPhase;
      break;
    }
    elapsedInCycle += getPhaseDurationSec(p);
  }

  const completedCycles = cycleIndex - 1;
  const totalSec = totalCycles * cycleSec;
  return Math.min(1, Math.max(0, (completedCycles * cycleSec + elapsedInCycle) / totalSec));
}

function buildState() {
  const program = getProgram();
  const orbPx = orbTargetPx(phase);
  const midOrb = Math.round((ORB_MIN + ORB_MAX) / 2);
  const orbSizePx =
    screen === 'idle'
      ? midOrb
      : orbSnapNext
        ? phase === 'inhale'
          ? ORB_MIN
          : ORB_MAX
        : orbPx;

  const orbPhase =
    screen === 'idle' ? 'idle' : screen === 'complete' ? 'idle' : phase;

  return {
    screen,
    durationMin,
    program,
    programs: BREATHING_PROGRAMS,
    programId,
    soundEnabled,
    reducedMotion,
    cycleIndex,
    totalCycles,
    phase,
    orbPhase,
    phaseLabel: screen === 'running' || screen === 'paused' ? phaseLabelText() : '',
    phaseCountdown: screen === 'running' || screen === 'paused' ? countdownFromMs(phaseRemainingMs) : '',
    phaseDurationSec: getPhaseDurationSec(phase),
    orbSizePx,
    sessionProgress: screen === 'running' || screen === 'paused' ? sessionProgressRatio() : 0,
    settingsOpen
  };
}

function render() {
  if (!rootContainer) return;
  rootContainer.innerHTML = createBreathingView(buildState());
  if (orbSnapNext && (screen === 'running' || screen === 'paused')) {
    const orb = rootContainer.querySelector('[data-breathing-orb]');
    if (orb instanceof HTMLElement) {
      void orb.offsetWidth;
      const target = orbTargetPx(phase);
      const dur = getPhaseDurationSec(phase) * 1000;
      const ease = 'cubic-bezier(0.4, 0, 0.2, 1)';
      const animateSize = shouldSnapOrb(phase);
      orb.style.transition = reducedMotion
        ? 'none'
        : animateSize
          ? `width ${dur}ms ${ease}, height ${dur}ms ${ease}, background-color 1s ease, border-color 1s ease`
          : 'background-color 1s ease, border-color 1s ease';
      if (animateSize) {
        orb.style.width = `${target}px`;
        orb.style.height = `${target}px`;
      }
    }
    orbSnapNext = false;
  }
}

function clearTick() {
  if (tickId != null) {
    clearInterval(tickId);
    tickId = null;
  }
}

function onPhaseBoundary() {
  const phases = getActivePhases();
  const currentIdx = phases.indexOf(phase);
  const nextPhase =
    currentIdx >= 0 && currentIdx < phases.length - 1 ? phases[currentIdx + 1] : null;

  if (nextPhase) {
    phase = nextPhase;
    phaseRemainingMs = getPhaseDurationSec(phase) * 1000;
    playPhaseBell(phase);
    orbSnapNext = shouldSnapOrb(phase);
    render();
    return;
  }

  if (cycleIndex >= totalCycles) {
    finishSessionSuccess();
    return;
  }

  cycleIndex += 1;
  phase = phases[0];
  phaseRemainingMs = getPhaseDurationSec(phase) * 1000;
  playPhaseBell(phase);
  orbSnapNext = shouldSnapOrb(phase);
  render();
}

function tick() {
  if (screen !== 'running') return;
  const step = 250;
  phaseRemainingMs -= step;
  if (phaseRemainingMs <= 0) {
    onPhaseBoundary();
    return;
  }
  const timeEl = rootContainer?.querySelector('.breathing__countdown');
  if (timeEl) timeEl.textContent = String(countdownFromMs(phaseRemainingMs));
  const labelEl = rootContainer?.querySelector('.breathing__phase-text');
  if (labelEl) labelEl.textContent = phaseLabelText();
  const meta = rootContainer?.querySelector('.breathing__session-meta');
  if (meta) meta.textContent = `Cycle ${cycleIndex} / ${totalCycles}`;
  const bar = rootContainer?.querySelector('.breathing__progress-bar');
  if (bar instanceof HTMLElement) {
    bar.style.width = `${Math.min(100, Math.max(0, sessionProgressRatio() * 100))}%`;
  }
  const wrap = rootContainer?.querySelector('.breathing__progress');
  if (wrap) {
    const pct = Math.round(sessionProgressRatio() * 100);
    wrap.setAttribute('aria-valuenow', String(pct));
  }
}

function finishSessionSuccess() {
  clearTick();
  appendSessionRecord({
    date: new Date().toISOString().slice(0, 10),
    duration: durationMin,
    cycles: totalCycles,
    completedAt: Date.now()
  });
  screen = 'complete';
  render();
}

function startSession() {
  void resumeAudioIfNeeded();
  reducedMotion = prefersReducedMotion();
  const s = readSettings();
  durationMin = s.durationMin;
  soundEnabled = s.soundEnabled;
  programId = s.programId;
  totalCycles = computeTotalCycles();
  cycleIndex = 1;
  const phases = getActivePhases();
  phase = phases[0];
  phaseRemainingMs = getPhaseDurationSec(phase) * 1000;
  screen = 'running';
  orbSnapNext = true;
  playPhaseBell(phase);
  render();
  clearTick();
  tickId = window.setInterval(tick, 250);
}

function pauseSession() {
  if (screen !== 'running') return;
  screen = 'paused';
  clearTick();
  render();
}

function resumeSession() {
  if (screen !== 'paused') return;
  screen = 'running';
  render();
  tickId = window.setInterval(tick, 250);
}

function stopSession() {
  clearTick();
  screen = 'idle';
  phase = 'inhale';
  cycleIndex = 1;
  totalCycles = computeTotalCycles();
  render();
}

function resetToIdleAfterComplete() {
  screen = 'idle';
  phase = 'inhale';
  cycleIndex = 1;
  totalCycles = computeTotalCycles();
  render();
}

function weekSessionCount() {
  const sessions = readSessions();
  const now = new Date();
  const start = new Date(now);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();
  return sessions.filter((s) => {
    const t = Number(s.completedAt) || 0;
    return t >= startMs;
  }).length;
}

function hasSessionToday() {
  const today = new Date().toISOString().slice(0, 10);
  return readSessions().some((s) => s && s.date === today);
}

function bindEvents() {
  if (!rootContainer) return;
  onClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest('[data-breathing-settings]')) {
      settingsOpen = !settingsOpen;
      render();
      return;
    }

    if (target.closest('[data-breathing-set-duration]')) {
      const btn = target.closest('[data-breathing-set-duration]');
      const v = btn instanceof HTMLElement ? Number(btn.dataset.breathingSetDuration) : NaN;
      if ([3, 5, 10].includes(v)) {
        durationMin = v;
        writeSettings({ durationMin, soundEnabled, programId });
        totalCycles = computeTotalCycles();
        render();
      }
      return;
    }

    if (target.closest('[data-breathing-set-program]')) {
      const btn = target.closest('[data-breathing-set-program]');
      const id = btn instanceof HTMLElement ? btn.dataset.breathingSetProgram : '';
      if (BREATHING_PROGRAMS.some((p) => p.id === id)) {
        programId = id;
        writeSettings({ durationMin, soundEnabled, programId });
        totalCycles = computeTotalCycles();
        render();
      }
      return;
    }

    const soundBtn = target.closest('[data-breathing-toggle-sound]');
    if (soundBtn instanceof HTMLElement && soundBtn.dataset.breathingToggleSound != null) {
      soundEnabled = soundBtn.dataset.breathingToggleSound === '1';
      writeSettings({ durationMin, soundEnabled, programId });
      render();
      return;
    }

    if (target.closest('[data-breathing-orb-start]')) {
      settingsOpen = false;
      startSession();
      return;
    }

    if (target.closest('[data-breathing-pause]')) {
      pauseSession();
      return;
    }

    if (target.closest('[data-breathing-resume]')) {
      resumeSession();
      return;
    }

    if (target.closest('[data-breathing-stop]')) {
      stopSession();
      return;
    }

    if (target.closest('[data-breathing-new]')) {
      resetToIdleAfterComplete();
    }
  };
  rootContainer.addEventListener('click', onClick);
}

function unbindEvents() {
  if (rootContainer && onClick) {
    rootContainer.removeEventListener('click', onClick);
  }
  onClick = null;
}

const breathingModule = {
  id: 'breathing',
  label: 'Respiration',
  icon: '🫁',

  init(container) {
    rootContainer = container;
    reducedMotion = prefersReducedMotion();
    const s = readSettings();
    durationMin = s.durationMin;
    soundEnabled = s.soundEnabled;
    programId = s.programId;
    totalCycles = computeTotalCycles();
    screen = 'idle';
    settingsOpen = false;
    phase = 'inhale';
    cycleIndex = 1;
    render();
    bindEvents();
  },

  destroy() {
    clearTick();
    unbindEvents();
    screen = 'idle';
    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    const n = weekSessionCount();
    const todayDone = hasSessionToday();
    if (todayDone) {
      return {
        title: 'Respiration',
        content: `
          <div class="breathing-dashboard card">
            <p class="breathing-dashboard__text">🫁 ${n} session${n > 1 ? 's' : ''} cette semaine</p>
            <button type="button" class="btn dashboard__link" data-dashboard-nav="breathing">Ouvrir la respiration</button>
          </div>
        `
      };
    }
    return {
      title: 'Respiration',
      content: `
        <div class="breathing-dashboard card">
          <p class="breathing-dashboard__text">Pas encore respiré aujourd'hui 🌿</p>
          <button type="button" class="btn btn-primary breathing-dashboard__cta" data-dashboard-nav="breathing">Commencer</button>
        </div>
      `
    };
  }
};

export default breathingModule;
