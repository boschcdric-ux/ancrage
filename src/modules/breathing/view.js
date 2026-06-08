function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderProgramCards(programs, selectedId) {
  return programs
    .map(
      (prog) => `
    <button
      type="button"
      class="breathing__program-card ${selectedId === prog.id ? 'is-active' : ''}"
      data-breathing-set-program="${escapeHtml(prog.id)}"
      aria-pressed="${selectedId === prog.id}"
    >
      <span class="breathing__program-emoji" aria-hidden="true">${prog.emoji}</span>
      <span class="breathing__program-label">${escapeHtml(prog.label)}</span>
      <span class="breathing__program-desc">${escapeHtml(prog.description)}</span>
    </button>
  `
    )
    .join('');
}

function createBreathingView(state) {
  const {
    screen,
    durationMin,
    program,
    programs,
    programId,
    soundEnabled,
    reducedMotion,
    cycleIndex,
    totalCycles,
    phase,
    orbPhase,
    phaseLabel,
    phaseCountdown,
    phaseDurationSec,
    orbSizePx,
    sessionProgress,
    settingsOpen
  } = state;

  const phaseMs = phaseDurationSec * 1000;
  const animateOrbSize = phase === 'inhale' || phase === 'exhale';

  const orbTransition =
    screen === 'idle' || reducedMotion
      ? 'none'
      : animateOrbSize
        ? `width ${phaseMs}ms cubic-bezier(0.4, 0, 0.2, 1), height ${phaseMs}ms cubic-bezier(0.4, 0, 0.2, 1), background-color 1s ease, border-color 1s ease`
        : 'background-color 1s ease, border-color 1s ease';

  const orbStyle = reducedMotion
    ? `width: 160px; height: 160px;`
    : `width: ${orbSizePx}px; height: ${orbSizePx}px; transition: ${orbTransition};`;

  const orbPhaseClass = `breathing__orb--${orbPhase}`;

  const settingsPanel = settingsOpen
    ? `
    <div class="breathing__settings-panel card" role="region" aria-label="Réglages respiration">
      <p class="breathing__settings-title">Programme</p>
      <div class="breathing__programs">
        ${renderProgramCards(programs, programId)}
      </div>
      <p class="breathing__settings-title">Durée de session</p>
      <div class="breathing__settings-row">
        ${[3, 5, 10]
          .map(
            (m) => `
          <button type="button" class="btn btn-secondary breathing__chip ${
            durationMin === m ? 'is-active' : ''
          }" data-breathing-set-duration="${m}">${m} min</button>
        `
          )
          .join('')}
      </div>
      <p class="breathing__settings-title">Son de transition</p>
      <div class="breathing__settings-row">
        <button type="button" class="btn btn-secondary breathing__chip ${
          soundEnabled ? 'is-active' : ''
        }" data-breathing-toggle-sound="1">Activé</button>
        <button type="button" class="btn btn-secondary breathing__chip ${
          !soundEnabled ? 'is-active' : ''
        }" data-breathing-toggle-sound="0">Désactivé</button>
      </div>
    </div>
  `
    : '';

  let centerHtml = '';
  if (screen === 'idle') {
    centerHtml = `
      <button
        type="button"
        class="breathing__orb-wrap breathing__orb-wrap--clickable"
        data-breathing-orb-start
        aria-label="Commencer la session de respiration"
      >
        <div
          class="breathing__orb ${orbPhaseClass}"
          data-breathing-orb
          style="${orbStyle}"
          aria-hidden="true"
        ></div>
        <div class="breathing__orb-label" data-breathing-orb-label>
          <span class="breathing__phase-text">Prêt</span>
        </div>
      </button>
      <p class="breathing__session-meta breathing__session-meta--idle">${
        totalCycles > 0 ? `${totalCycles} cycles (${durationMin} min)` : ''
      }</p>
      <div class="breathing__progress breathing__progress--hidden" aria-hidden="true">
        <div class="breathing__progress-bar" style="width: 0%"></div>
      </div>
    `;
  } else if (screen === 'running' || screen === 'paused') {
    const pct = Math.min(100, Math.max(0, sessionProgress * 100));
    centerHtml = `
      <div class="breathing__orb-wrap">
        <div
          class="breathing__orb ${orbPhaseClass} ${screen === 'paused' ? 'is-paused' : ''}"
          data-breathing-orb
          style="${orbStyle}"
          aria-hidden="true"
        ></div>
        <div class="breathing__orb-label" data-breathing-orb-label>
          <span class="breathing__phase-text">${escapeHtml(phaseLabel)}</span>
          <span class="breathing__countdown" aria-live="polite">${phaseCountdown}</span>
        </div>
      </div>
      <p class="breathing__session-meta">Cycle ${cycleIndex} / ${totalCycles}</p>
      <div class="breathing__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(
        pct
      )}">
        <div class="breathing__progress-bar" style="width: ${pct}%"></div>
      </div>
    `;
  } else if (screen === 'complete') {
    centerHtml = `
      <div class="breathing__complete animate-scale-in">
        <span class="breathing__complete-spark" aria-hidden="true">✨</span>
        <p class="breathing__complete-title">Session terminée !</p>
        <p class="breathing__complete-sub">Bien joué 🎉</p>
      </div>
    `;
  }

  let footerHtml = '';
  if (screen === 'running') {
    footerHtml = `
      <div class="breathing__actions-row">
        <button type="button" class="btn btn-secondary breathing__btn-half" data-breathing-pause>⏸ Pause</button>
        <button type="button" class="btn btn-secondary breathing__btn-half" data-breathing-stop>⏹ Arrêter</button>
      </div>
    `;
  } else if (screen === 'paused') {
    footerHtml = `
      <div class="breathing__actions-row">
        <button type="button" class="btn btn-primary breathing__btn-half" data-breathing-resume>▶ Reprendre</button>
        <button type="button" class="btn btn-secondary breathing__btn-half" data-breathing-stop>⏹ Arrêter</button>
      </div>
    `;
  } else if (screen === 'complete') {
    footerHtml = `
      <button type="button" class="btn btn-primary breathing__btn-main" data-breathing-new>Nouvelle session</button>
    `;
  }

  return `
    <section class="breathing" aria-labelledby="breathing-heading">
      <header class="breathing__header">
        <div class="breathing__titles">
          <h1 id="breathing-heading" class="breathing__title">${escapeHtml(program.emoji)} ${escapeHtml(program.label)}</h1>
          <p class="breathing__subtitle">${escapeHtml(program.description)}</p>
        </div>
        ${
          screen === 'idle'
            ? `<button type="button" class="breathing__gear" data-breathing-settings aria-label="Réglages" aria-expanded="${settingsOpen}">⚙️</button>`
            : ''
        }
      </header>
      <div class="breathing__center">
        ${centerHtml}
      </div>
      ${settingsPanel}
      <footer class="breathing__footer">
        ${footerHtml}
      </footer>
    </section>
  `;
}

export { createBreathingView, escapeHtml };
