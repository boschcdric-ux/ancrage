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

const WATER_LOW = 22;
const WATER_HIGH = 82;

let rootContainer = null;
let onClick = null;
let onKeyDown = null;
let tickId = null;
let audioCtx = null;
let noiseSrc = null;
let filterNode = null;
let gainNode = null;

let screen = 'idle';
let reducedMotion = false;
let waterLevel = WATER_LOW;

let durationMin = 5;
let programId = 'coherence';
let soundEnabled = true;

let cycleIndex = 1;
let totalCycles = 30;
let phase = 'inhale';
let phaseRemainingMs = 5000;

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

function initAudio() {
  if (audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = new Ctx();
  const len = audioCtx.sampleRate * 2;
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.04 * w) / 1.04;
    d[i] = last * 4.2;
  }
  noiseSrc = audioCtx.createBufferSource();
  noiseSrc.buffer = buf;
  noiseSrc.loop = true;
  filterNode = audioCtx.createBiquadFilter();
  filterNode.type = 'lowpass';
  filterNode.frequency.value = 280;
  filterNode.Q.value = 0.6;
  gainNode = audioCtx.createGain();
  gainNode.gain.value = 0;
  noiseSrc.connect(filterNode).connect(gainNode).connect(audioCtx.destination);
  noiseSrc.start();
}

async function resumeAudioIfNeeded() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {
      /* ignore */
    }
  }
}

function waveSound(phaseName, dur) {
  if (!soundEnabled || !audioCtx || !gainNode || !filterNode) return;
  const now = audioCtx.currentTime;
  const g = gainNode.gain;
  const f = filterNode.frequency;
  g.cancelScheduledValues(now);
  f.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  f.setValueAtTime(f.value, now);
  if (phaseName === 'inhale') {
    g.linearRampToValueAtTime(0.16, now + dur * 0.85);
    f.exponentialRampToValueAtTime(900, now + dur);
  } else if (phaseName === 'exhale') {
    g.setValueAtTime(Math.max(g.value, 0.14), now);
    g.linearRampToValueAtTime(0.015, now + dur);
    f.exponentialRampToValueAtTime(240, now + dur);
  } else {
    g.linearRampToValueAtTime(0.05, now + 0.6);
    f.exponentialRampToValueAtTime(320, now + 0.6);
  }
}

function stopSound() {
  if (!audioCtx || !gainNode) return;
  const now = audioCtx.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.linearRampToValueAtTime(0, now + 1.2);
}

function setWater(level, seconds, easing) {
  const sea = rootContainer?.querySelector('[data-breathing-sea]');
  if (!(sea instanceof HTMLElement)) return;
  sea.style.setProperty('--breath-ms', `${seconds * 1000}ms`);
  sea.style.setProperty('--breath-ease', easing);
  sea.style.setProperty('--level', `${level}%`);
  waterLevel = level;
}

function applyPhaseWater(phaseName, durSec) {
  if (reducedMotion) return;
  if (phaseName === 'inhale') {
    setWater(WATER_HIGH, durSec, 'cubic-bezier(.35,0,.35,1)');
  } else if (phaseName === 'exhale') {
    setWater(WATER_LOW, durSec, 'cubic-bezier(.45,0,.55,1)');
  }
}

function onPhaseStart(phaseName, durSec) {
  waveSound(phaseName, durSec);
  applyPhaseWater(phaseName, durSec);
}

function phaseLabelText() {
  switch (phase) {
    case 'inhale':
      return 'Inspire';
    case 'hold':
      return 'Retiens';
    case 'exhale':
      return 'Expire';
    case 'holdAfterExhale':
      return 'Poumons vides';
    default:
      return '';
  }
}

function isHoldingPhase() {
  return phase === 'hold' || phase === 'holdAfterExhale';
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

function seaCardAriaLabel() {
  if (screen === 'idle') return 'Commencer la session de respiration';
  if (screen === 'complete') return 'Séance terminée — toucher pour recommencer';
  if (screen === 'running') return 'Session en cours — toucher pour mettre en pause';
  if (screen === 'paused') return 'Session en pause — toucher pour reprendre';
  return '';
}

function phaseDisplayText() {
  if (screen === 'idle') return 'Respire avec la mer';
  if (screen === 'complete') return 'Mer étale.';
  if (screen === 'paused') return 'En pause';
  return phaseLabelText();
}

function phaseHintText() {
  if (screen === 'idle') return "Touche l'eau pour commencer";
  if (screen === 'complete') return 'Séance tenue.';
  return '';
}

function buildState() {
  return {
    screen,
    durationMin,
    programs: BREATHING_PROGRAMS,
    programId,
    soundEnabled,
    reducedMotion,
    cycleIndex,
    totalCycles,
    phaseWord: phaseDisplayText(),
    phaseCount:
      screen === 'running' || screen === 'paused' ? countdownFromMs(phaseRemainingMs) : 0,
    phaseHint: phaseHintText(),
    waterLevel,
    holding: screen === 'running' && isHoldingPhase(),
    sessionProgress:
      screen === 'running' || screen === 'paused' ? sessionProgressRatio() : screen === 'complete' ? 1 : 0,
    seaCardLabel: seaCardAriaLabel()
  };
}

function render(opts = {}) {
  if (!rootContainer) return;
  rootContainer.innerHTML = createBreathingView(buildState());
  if (opts.applyPhase && screen === 'running') {
    onPhaseStart(phase, opts.phaseDurSec ?? getPhaseDurationSec(phase));
  }
}

function clearTick() {
  if (tickId != null) {
    clearInterval(tickId);
    tickId = null;
  }
}

function updateLiveDom() {
  const countEl = rootContainer?.querySelector('.breathing__phase-count');
  if (countEl) {
    const n = countdownFromMs(phaseRemainingMs);
    countEl.textContent = n > 0 ? `${n} s` : '';
  }
  const wordEl = rootContainer?.querySelector('.breathing__phase-word');
  if (wordEl) wordEl.textContent = phaseDisplayText();
  const cyclesEl = rootContainer?.querySelector('.breathing__cycles');
  if (cyclesEl) cyclesEl.textContent = `cycle ${cycleIndex} / ${totalCycles}`;
  const lineEl = rootContainer?.querySelector('.breathing__session-line');
  if (lineEl instanceof HTMLElement) {
    const pct = Math.min(100, Math.max(0, sessionProgressRatio() * 100));
    lineEl.style.setProperty('--session', `${pct}%`);
  }
  const card = rootContainer?.querySelector('[data-breathing-sea-card]');
  if (card) {
    card.classList.toggle('breathing__sea-card--holding', screen === 'running' && isHoldingPhase());
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
    render({ applyPhase: true });
    return;
  }

  if (cycleIndex >= totalCycles) {
    finishSessionSuccess();
    return;
  }

  cycleIndex += 1;
  phase = phases[0];
  phaseRemainingMs = getPhaseDurationSec(phase) * 1000;
  render({ applyPhase: true });
}

function tick() {
  if (screen !== 'running') return;
  const step = 250;
  phaseRemainingMs -= step;
  if (phaseRemainingMs <= 0) {
    onPhaseBoundary();
    return;
  }
  updateLiveDom();
}

function finishSessionSuccess() {
  clearTick();
  stopSound();
  appendSessionRecord({
    date: new Date().toISOString().slice(0, 10),
    duration: durationMin,
    cycles: totalCycles,
    completedAt: Date.now()
  });
  screen = 'complete';
  render();
  if (!reducedMotion) setWater(WATER_LOW, 3, 'ease-out');
}

function startSession() {
  if (soundEnabled) {
    initAudio();
    void resumeAudioIfNeeded();
  }
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
  waterLevel = WATER_LOW;
  render({ applyPhase: true });
  clearTick();
  tickId = window.setInterval(tick, 250);
}

function pauseSession() {
  if (screen !== 'running') return;
  screen = 'paused';
  clearTick();
  stopSound();
  render();
}

function resumeSession() {
  if (screen !== 'paused') return;
  screen = 'running';
  const durSec = phaseRemainingMs / 1000;
  render({ applyPhase: true, phaseDurSec: durSec });
  tickId = window.setInterval(tick, 250);
}

function stopSession() {
  clearTick();
  stopSound();
  screen = 'idle';
  phase = 'inhale';
  cycleIndex = 1;
  totalCycles = computeTotalCycles();
  waterLevel = WATER_LOW;
  render();
  if (!reducedMotion) setWater(WATER_LOW, 3, 'ease-out');
}

function toggleSeaCard() {
  if (screen === 'idle' || screen === 'complete') {
    startSession();
    return;
  }
  if (screen === 'running') {
    pauseSession();
    return;
  }
  if (screen === 'paused') {
    resumeSession();
  }
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

  onKeyDown = (event) => {
    const card = event.target instanceof HTMLElement ? event.target.closest('[data-breathing-sea-card]') : null;
    if (!card) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleSeaCard();
    }
  };

  onClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest('[data-breathing-sea-card]') && !target.closest('[data-breathing-pause], [data-breathing-resume], [data-breathing-stop]')) {
      const inControls = target.closest('.breathing__controls');
      if (!inControls) {
        toggleSeaCard();
        return;
      }
    }

    if (target.closest('[data-breathing-set-duration]')) {
      if (screen !== 'idle' && screen !== 'complete') return;
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
      if (screen !== 'idle' && screen !== 'complete') return;
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
      if (soundEnabled) {
        initAudio();
        void resumeAudioIfNeeded();
      } else {
        stopSound();
      }
      if (screen === 'running' && soundEnabled) {
        render({ applyPhase: true, phaseDurSec: phaseRemainingMs / 1000 });
      } else {
        render();
      }
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
    }
  };

  rootContainer.addEventListener('click', onClick);
  rootContainer.addEventListener('keydown', onKeyDown);
}

function unbindEvents() {
  if (rootContainer && onClick) {
    rootContainer.removeEventListener('click', onClick);
  }
  if (rootContainer && onKeyDown) {
    rootContainer.removeEventListener('keydown', onKeyDown);
  }
  onClick = null;
  onKeyDown = null;
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
    phase = 'inhale';
    cycleIndex = 1;
    waterLevel = WATER_LOW;
    render();
    bindEvents();
  },

  destroy() {
    clearTick();
    stopSound();
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
