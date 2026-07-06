import { escapeHtml } from '../../core/format.js';

function createFocusView(state) {
  const hasPomodoro = Boolean(state.hasPomodoroState);
  const hasTask = Boolean(state.selectedTaskText);
  const modeLabel = state.modeLabel || 'Travail';

  const taskBlock = hasTask
    ? `
      <div class="focus__task-wrap">
        <p class="focus__task" data-focus-task>${escapeHtml(state.selectedTaskText)}</p>
        <p class="focus__subtask" data-focus-subtask>${escapeHtml(state.selectedSubtaskText || '')}</p>
      </div>
    `
    : `
      <div class="focus__task-wrap">
        <p class="focus__task focus__task--empty">Choisis une tâche pour te concentrer.</p>
        <div class="focus__suggestions" data-focus-suggestions>
          ${state.suggestionButtons || ''}
        </div>
      </div>
    `;

  return `
    <section
      class="focus ${state.isActive ? 'focus--active' : ''} animate-fade-in"
      data-focus-root
      data-focus-theme="${state.theme}"
      aria-live="polite"
    >
      ${
        state.isActive
          ? `
        <div class="focus__topbar">
          <div class="focus__top-actions">
            <button type="button" class="focus__icon-btn" data-focus-sound-toggle aria-label="Activer ou couper le son Pomodoro">
              ${state.soundEnabled ? '🔔' : '🔕'}
            </button>
            <button type="button" class="focus__icon-btn" data-focus-exit aria-label="Quitter le mode Focus">✕</button>
          </div>
        </div>
      `
          : ''
      }

      <div class="focus__center">
        ${
          state.isActive
            ? `
          <div class="focus__timer-wrap">
            <p class="focus__mode" data-focus-mode>${modeLabel}</p>
            <p class="focus__timer" data-focus-time>${escapeHtml(state.formattedTime)}</p>
          </div>
        `
            : `
          <div class="focus__intro">
            <h1 class="focus__title">Mode Focus</h1>
            <p class="focus__intro-text">Plein écran minimal, pensé pour la concentration TDAH.</p>
            <button type="button" class="btn btn-primary" data-focus-enter>Entrer en mode Focus</button>
          </div>
        `
        }
        ${state.isActive ? taskBlock : ''}
        ${
          state.isActive && !hasPomodoro
            ? `
          <button type="button" class="btn btn-primary focus__start-pomodoro" data-focus-open-pomodoro>
            Démarrer un Pomodoro
          </button>
        `
            : ''
        }
      </div>

      ${
        state.isActive
          ? `
        <div class="focus__ambiences" data-focus-ambiences>
          ${state.ambienceButtons}
        </div>
      `
          : ''
      }
    </section>
  `;
}

function createAmbienceButtons(currentTheme, ambiences) {
  return ambiences
    .map((ambience) => {
      const isActive = ambience.id === currentTheme;
      return `
        <button
          type="button"
          class="focus__ambience-btn ${isActive ? 'is-active' : ''}"
          data-focus-ambience="${ambience.id}"
          title="${ambience.label}"
          aria-label="${ambience.label}"
          aria-pressed="${isActive}"
        >
          <span>${ambience.emoji}</span>
        </button>
      `;
    })
    .join('');
}

function createSuggestedTasks(tasks) {
  if (!tasks.length) return '<p class="focus__suggestions-empty">Aucune tâche active.</p>';
  return tasks
    .map(
      (task) => `
      <button type="button" class="btn btn-secondary focus__task-suggestion" data-focus-select-task="${task.id}">
        ${escapeHtml(task.text)}
      </button>
    `
    )
    .join('');
}

export { createFocusView, createAmbienceButtons, createSuggestedTasks };
