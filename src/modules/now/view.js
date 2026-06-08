import { escapeHtml } from '../../core/format.js';

function createNowView({
  timeLabel = '',
  metaParts = [],
  suggestionText = '',
  suggestionSubtext = '',
  suggestionType = 'pause',
  fadeKey = '',
  celebrating = false,
  taskPromptVisible = false,
  taskPromptTitle = ''
} = {}) {
  const typeClass =
    suggestionType === 'task'
      ? 'now__suggestion--task'
      : suggestionType === 'habit'
        ? 'now__suggestion--habit'
        : suggestionType === 'breathing'
          ? 'now__suggestion--breathing'
          : 'now__suggestion--pause';

  const subtextBlock =
    suggestionType === 'breathing' && String(suggestionSubtext).trim()
      ? `<p class="now__suggestion-sub">${escapeHtml(String(suggestionSubtext).trim())}</p>`
      : '';

  const primaryLabel = suggestionType === 'breathing' ? '▶ Commencer' : "✓ C'est fait !";

  const metaHtml = metaParts.length
    ? `<p class="now__meta">${metaParts.map((p) => `<span>${escapeHtml(p)}</span>`).join(' · ')}</p>`
    : '';

  const celebrateClass = celebrating ? ' animate-bounce-in' : '';

  return `
    <section class="now" aria-labelledby="now-heading">
      <h1 id="now-heading" class="visually-hidden">Que faire maintenant</h1>
      <header class="now__header">
        <p class="now__time">${escapeHtml(timeLabel)}</p>
        ${metaHtml}
      </header>
      <div class="now__center">
        <p
          class="now__suggestion ${typeClass} animate-fade-in${celebrateClass}"
          data-now-suggestion
          data-fade-key="${escapeHtml(fadeKey)}"
          role="status"
        >
          ${escapeHtml(suggestionText)}
        </p>
        ${subtextBlock}
      </div>
      <footer class="now__footer">
        <button type="button" class="btn now__btn-done" data-now-done>
          ${primaryLabel}
        </button>
        <button type="button" class="btn now__btn-other" data-now-other>
          → Autre chose
        </button>
      </footer>
      <div
        class="now__task-prompt card"
        data-now-task-prompt
        role="dialog"
        aria-live="polite"
        ${taskPromptVisible ? '' : 'hidden'}
      >
        <p class="now__task-prompt-text">Cocher cette tâche dans la liste ?</p>
        <p class="now__task-prompt-title" data-now-task-prompt-title>${escapeHtml(taskPromptTitle || '')}</p>
        <div class="now__task-prompt-actions">
          <button type="button" class="btn now__btn-confirm" data-now-task-yes>Oui, cocher</button>
          <button type="button" class="btn now__btn-skip" data-now-task-no>Pas maintenant</button>
        </div>
      </div>
    </section>
  `;
}

function createDashboardNowCompact(text = '') {
  const safe = escapeHtml(String(text).trim() || 'Ouvre le module pour une suggestion.');
  return `
    <div class="now-dashboard-compact" data-now-dashboard-compact-inner>
      <p class="now-dashboard-compact__text">${safe}</p>
    </div>
  `;
}

export { createNowView, createDashboardNowCompact, escapeHtml };
