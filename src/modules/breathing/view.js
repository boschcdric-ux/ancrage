import { escapeHtml } from '../../core/format.js';

const SEA_WAVES_BACK =
  '<svg class="breathing__sea-waves breathing__sea-waves--back" viewBox="0 0 1200 20" preserveAspectRatio="none" aria-hidden="true"><path d="M0,10 C75,3 150,17 300,10 C450,3 525,17 600,10 C675,3 750,17 900,10 C1050,3 1125,17 1200,10 L1200,20 L0,20 Z"/></svg>';

const SEA_WAVES_FRONT =
  '<svg class="breathing__sea-waves breathing__sea-waves--front" viewBox="0 0 1200 20" preserveAspectRatio="none" aria-hidden="true"><path d="M0,12 C100,6 200,16 300,12 C400,7 500,16 600,12 C700,6 800,16 900,12 C1000,7 1100,16 1200,12 L1200,20 L0,20 Z"/></svg>';

function programRhythm(prog) {
  return [prog.inhale, prog.hold, prog.exhale, prog.holdAfterExhale]
    .filter((v, i) => v > 0 || i === 0 || i === 2)
    .join('-');
}

function renderProgramCards(programs, selectedId, settingsLocked) {
  return programs
    .map(
      (prog) => `
    <button
      type="button"
      class="breathing__prog ${selectedId === prog.id ? 'is-active' : ''}"
      data-breathing-set-program="${escapeHtml(prog.id)}"
      aria-pressed="${selectedId === prog.id}"
      ${settingsLocked ? 'disabled' : ''}
    >
      <span class="breathing__prog-emoji" aria-hidden="true">${prog.emoji}</span>
      <span class="breathing__prog-body">
        <span class="breathing__prog-label">${escapeHtml(prog.label)}</span>
        <span class="breathing__prog-desc">${escapeHtml(prog.description)}</span>
      </span>
      <span class="breathing__prog-rhythm">${programRhythm(prog)}</span>
    </button>
  `
    )
    .join('');
}

function createBreathingView(state) {
  const {
    screen,
    durationMin,
    programs,
    programId,
    soundEnabled,
    reducedMotion,
    cycleIndex,
    totalCycles,
    phaseWord,
    phaseCount,
    phaseHint,
    waterLevel,
    holding,
    sessionProgress,
    seaCardLabel
  } = state;

  const settingsLocked = screen !== 'idle' && screen !== 'complete';
  const sessionPct = Math.min(100, Math.max(0, sessionProgress * 100));
  const showControls = screen === 'running' || screen === 'paused';
  const showCycles = screen === 'running' || screen === 'paused';

  const seaCardClasses = [
    'breathing__sea-card',
    screen === 'idle' ? 'breathing__sea-card--idle' : '',
    screen === 'complete' ? 'breathing__sea-card--done' : '',
    holding ? 'breathing__sea-card--holding' : '',
    reducedMotion ? 'breathing__sea-card--reduced' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const durationChips = [3, 5, 10]
    .map(
      (m) => `
    <button
      type="button"
      class="breathing__chip ${durationMin === m ? 'is-active' : ''}"
      data-breathing-set-duration="${m}"
      ${settingsLocked ? 'disabled' : ''}
    >${m} min</button>
  `
    )
    .join('');

  return `
    <section class="breathing" aria-label="Respiration guidée">
      <div
        class="${seaCardClasses}"
        data-breathing-sea-card
        role="button"
        tabindex="0"
        aria-label="${escapeHtml(seaCardLabel)}"
      >
        <div class="breathing__session-track" aria-hidden="true">
          <div
            class="breathing__session-bar"
            style="--session: ${sessionPct}%"
          ></div>
        </div>
        <div class="breathing__phase" aria-live="polite">
          <div class="breathing__phase-word">${escapeHtml(phaseWord)}</div>
          <div class="breathing__phase-count">${phaseCount > 0 ? `${phaseCount} s` : ''}</div>
          ${phaseHint ? `<div class="breathing__phase-hint">${escapeHtml(phaseHint)}</div>` : ''}
        </div>
        <div
          class="breathing__sea"
          data-breathing-sea
          style="--level: ${waterLevel}%"
        >
          ${SEA_WAVES_BACK}
          ${SEA_WAVES_FRONT}
        </div>
        <div class="breathing__cycles">${showCycles ? `cycle ${cycleIndex} / ${totalCycles}` : ''}</div>
      </div>

      <div class="breathing__controls" ${showControls ? '' : 'hidden'}>
        ${
          screen === 'running'
            ? '<button type="button" class="breathing__ctl" data-breathing-pause>Pause</button>'
            : '<button type="button" class="breathing__ctl breathing__ctl--primary" data-breathing-resume>Reprendre</button>'
        }
        <button type="button" class="breathing__ctl" data-breathing-stop>Terminer</button>
      </div>

      <section class="breathing__progs" aria-label="Réglages de session">
        <h2 class="breathing__progs-title">Programme</h2>
        <div class="breathing__prog-list">
          ${renderProgramCards(programs, programId, settingsLocked)}
        </div>
        <div class="breathing__row">
          <span class="breathing__row-label">Durée</span>
          ${durationChips}
        </div>
        <div class="breathing__row">
          <span class="breathing__row-label">Son des vagues</span>
          <button
            type="button"
            class="breathing__chip ${soundEnabled ? 'is-active' : ''}"
            data-breathing-toggle-sound="1"
          >Activé</button>
          <button
            type="button"
            class="breathing__chip ${!soundEnabled ? 'is-active' : ''}"
            data-breathing-toggle-sound="0"
          >Désactivé</button>
        </div>
      </section>
    </section>
  `;
}

export { createBreathingView, programRhythm };
