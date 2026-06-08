function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatTime(totalSeconds) {
  const safeValue = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeValue / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(safeValue % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function createTaskOptions(tasks, selectedTaskId) {
  if (!tasks.length) {
    return '<option value="">Aucune tâche active</option>';
  }

  const placeholder = '<option value="">Aucune tâche liée</option>';
  const options = tasks
    .map((task) => {
      const selected = task.id === selectedTaskId ? 'selected' : '';
      return `<option value="${task.id}" ${selected}>${escapeHtml(task.text)}</option>`;
    })
    .join('');

  return placeholder + options;
}

function createSubtaskOptions(subtasks, selectedSubtaskId) {
  if (!subtasks.length) {
    return '<option value="">Aucune sous-tâche active</option>';
  }

  const placeholder = '<option value="">Aucune sous-tâche liée</option>';
  const options = subtasks
    .map((subtask) => {
      const selected = subtask.id === selectedSubtaskId ? 'selected' : '';
      return `<option value="${subtask.id}" ${selected}>${escapeHtml(subtask.text)}</option>`;
    })
    .join('');

  return placeholder + options;
}

function createCompletionHistory(completionEntries = []) {
  if (!completionEntries.length) return '';

  const groups = new Map();
  completionEntries.forEach((entry) => {
    const key = entry.taskId || 'unknown';
    if (!groups.has(key)) {
      groups.set(key, {
        taskText: entry.taskText || 'Tâche',
        items: []
      });
    }
    groups.get(key).items.push(entry);
  });

  const groupsHtml = Array.from(groups.values())
    .map((group) => {
      const itemsHtml = group.items
        .map((entry) => {
          const label = entry.subtaskText || group.taskText;
          return `
            <li class="pomodoro__completion-item">
              <span class="pomodoro__completion-item-text">✅ ${escapeHtml(label)}</span>
              <button
                type="button"
                class="btn btn-secondary pomodoro__undo-btn"
                data-pomodoro-undo-complete="${entry.id}"
                aria-label="Annuler la complétion"
                title="Annuler"
              >
                ↩
              </button>
            </li>
          `;
        })
        .join('');

      return `
        <div class="pomodoro__completion-group">
          <p class="pomodoro__completion-group-title">${escapeHtml(group.taskText)}</p>
          <ul class="pomodoro__completion-items">${itemsHtml}</ul>
        </div>
      `;
    })
    .join('');

  return `
    <div class="pomodoro__completion-feedback animate-slide-up" data-pomodoro-completion-feedback>
      ${groupsHtml}
    </div>
  `;
}

function createPomodoroView(state) {
  const progressPercent = Math.max(0, Math.min(100, state.progressPercent || 0));
  const modeLabel =
    state.mode === 'work'
      ? 'Travail'
      : state.mode === 'shortBreak'
        ? 'Pause courte'
        : 'Pause longue';
  const cycleLen = Math.min(8, Math.max(2, Number(state.settings?.sessionsBeforeLongBreak) || 4));
  const sessionPosition = (state.completedWorkSessions % cycleLen) + 1;
  const showCycleHint = state.mode === 'work';
  const nextBreakIsLong = showCycleHint && (state.completedWorkSessions + 1) % cycleLen === 0;
  const cycleHintText = !showCycleHint
    ? ''
    : nextBreakIsLong
      ? '→ Pause longue après cette session ✨'
      : '→ Pause courte après cette session';
  const cycleHintClass = `pomodoro__cycle-hint${nextBreakIsLong ? ' pomodoro__cycle-hint--long' : ''}`;

  return `
    <section class="pomodoro pomodoro--${state.mode} animate-fade-in" data-pomodoro-root>
      <div class="pomodoro__main card animate-slide-up">
        <header class="pomodoro__header">
          <h1 class="pomodoro__title">Pomodoro</h1>
          <p class="pomodoro__subtitle">Un focus calme, clair et progressif.</p>
        </header>

        <div class="pomodoro__status">
          <span class="pomodoro__mode-badge" data-pomodoro-mode>${modeLabel}</span>
          <div class="pomodoro__session-stack">
            <span class="pomodoro__session" data-pomodoro-session>Session ${sessionPosition}/${cycleLen}</span>
            <p class="${cycleHintClass}" data-pomodoro-cycle-hint ${showCycleHint ? '' : 'hidden'}>${cycleHintText}</p>
          </div>
        </div>

        <div class="pomodoro__timer-wrap">
          <svg
            class="pomodoro__ring"
            viewBox="0 0 220 220"
            role="img"
            aria-label="Progression du timer"
          >
            <circle class="pomodoro__ring-bg" cx="110" cy="110" r="96"></circle>
            <circle class="pomodoro__ring-progress" cx="110" cy="110" r="96" data-pomodoro-ring></circle>
          </svg>
          <div class="pomodoro__time animate-scale-in" data-pomodoro-time data-progress="${progressPercent}">
            ${formatTime(state.remainingSeconds)}
          </div>
        </div>

        <div class="pomodoro__controls">
          <button type="button" class="btn btn-primary" data-pomodoro-start>Démarrer</button>
          <button type="button" class="btn btn-secondary" data-pomodoro-pause>Pause</button>
          <button type="button" class="btn btn-secondary" data-pomodoro-reset>Réinitialiser</button>
        </div>
        <div class="pomodoro__focus-link">
          <button type="button" class="btn btn-secondary" data-pomodoro-open-focus>🎯 Mode Focus</button>
        </div>

        <p class="pomodoro__notification" data-pomodoro-notification aria-live="polite"></p>

        <div data-pomodoro-completion-container>
          ${createCompletionHistory(state.completionEntries)}
        </div>

        <div class="pomodoro__task-link card">
          <div class="pomodoro__selectors">
            <select id="pomodoro-task-select" class="pomodoro__select pomodoro__select--task" data-pomodoro-task-select>
              ${createTaskOptions(state.availableTasks, state.selectedTaskId)}
            </select>
            <select
              id="pomodoro-subtask-select"
              class="pomodoro__select pomodoro__select--subtask"
              data-pomodoro-subtask-select
              ${state.selectedTaskId ? '' : 'disabled'}
            >
              ${createSubtaskOptions(state.availableSubtasks, state.selectedSubtaskId)}
            </select>
          </div>

          <div class="pomodoro__task-focus ${state.selectedTaskId ? 'animate-slide-up is-selected' : ''}" data-pomodoro-task-focus ${state.selectedTaskId ? '' : 'hidden'}>
            <p class="pomodoro__task-title" data-pomodoro-task-title>${state.selectedTaskText || 'Aucune tâche liée.'}</p>
            <p class="pomodoro__subtask-title" data-pomodoro-subtask-title>${state.selectedSubtaskText || ''}</p>
          </div>

          <button
            type="button"
            class="btn btn-primary pomodoro__complete-btn"
            data-pomodoro-complete-task
            ${state.selectedTaskId ? '' : 'disabled'}
          >
            ✓ Marquer comme complétée
          </button>
        </div>
      </div>

      <aside class="pomodoro__side card animate-slide-up">
        <section class="pomodoro__durations">
          <h2 class="pomodoro__panel-title">Durées</h2>
          <div class="pomodoro__duration-list">
            <div class="pomodoro__duration-row">
              <span>Travail</span>
              <div class="pomodoro__stepper" data-duration-key="work">
                <button type="button" class="btn btn-secondary" data-duration-change="work:-1">-</button>
                <strong data-duration-value="work">${state.settings.workMinutes} min</strong>
                <button type="button" class="btn btn-secondary" data-duration-change="work:1">+</button>
              </div>
            </div>
            <div class="pomodoro__duration-row">
              <span>Pause courte</span>
              <div class="pomodoro__stepper" data-duration-key="shortBreak">
                <button type="button" class="btn btn-secondary" data-duration-change="shortBreak:-1">-</button>
                <strong data-duration-value="shortBreak">${state.settings.shortBreakMinutes} min</strong>
                <button type="button" class="btn btn-secondary" data-duration-change="shortBreak:1">+</button>
              </div>
            </div>
            <div class="pomodoro__duration-row">
              <span>Pause longue</span>
              <div class="pomodoro__stepper" data-duration-key="longBreak">
                <button type="button" class="btn btn-secondary" data-duration-change="longBreak:-1">-</button>
                <strong data-duration-value="longBreak">${state.settings.longBreakMinutes} min</strong>
                <button type="button" class="btn btn-secondary" data-duration-change="longBreak:1">+</button>
              </div>
            </div>
            <div class="pomodoro__duration-row">
              <span>Sessions avant pause longue</span>
              <div class="pomodoro__stepper" data-duration-key="sessionsBeforeLongBreak">
                <button type="button" class="btn btn-secondary" data-pomodoro-sessions-cycle="-1">-</button>
                <strong data-duration-value="sessionsBeforeLongBreak">${cycleLen}</strong>
                <button type="button" class="btn btn-secondary" data-pomodoro-sessions-cycle="1">+</button>
              </div>
            </div>
          </div>
        </section>

        <section class="pomodoro__sound">
          <h2 class="pomodoro__panel-title">Son</h2>
          <button type="button" class="btn btn-secondary" data-pomodoro-sound-toggle>
            ${state.soundEnabled ? '🔔 Son activé' : '🔕 Son désactivé'}
          </button>
        </section>

        <section class="pomodoro__history">
          <h2 class="pomodoro__panel-title">Aujourd'hui</h2>
          <p data-pomodoro-history-sessions>${state.todayCompletedSessions} sessions complétées</p>
          <p data-pomodoro-history-focus>${state.todayFocusMinutes} min de concentration</p>
        </section>
      </aside>
    </section>
  `;
}

export { createPomodoroView, formatTime, createTaskOptions, createSubtaskOptions, createCompletionHistory };
