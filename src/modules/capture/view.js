import { escapeHtml } from '../../core/format.js';

const PREDEFINED_TAGS = [
  { id: 'maison', emoji: '🏠', label: 'Maison' },
  { id: 'boulot', emoji: '💼', label: 'Boulot' },
  { id: 'jardin', emoji: '🌿', label: 'Jardin' },
  { id: 'sante', emoji: '🏥', label: 'Santé' },
  { id: 'admin', emoji: '📋', label: 'Admin' },
  { id: 'personnel', emoji: '👤', label: 'Personnel' }
];

function renderTagBadge(tagId) {
  const tag = PREDEFINED_TAGS.find((t) => t.id === tagId);
  if (!tag) return '';
  return `<span class="shared-tag-badge shared-tag-badge--${tag.id}"><span class="shared-tag-badge__emoji" aria-hidden="true">${tag.emoji}</span><span class="shared-tag-badge__label">${escapeHtml(tag.label)}</span></span>`;
}

function createCaptureTagField(selectedTagId = '') {
  const options = [
    `<option value="">Sans tag</option>`,
    ...PREDEFINED_TAGS.map(
      (t) =>
        `<option value="${t.id}" ${selectedTagId === t.id ? 'selected' : ''}>${t.emoji} ${escapeHtml(t.label)}</option>`
    )
  ].join('');

  return `
    <div class="capture__tag-field">
      <label class="capture__tag-label" for="capture-tag">Tag</label>
      <select id="capture-tag" class="capture__tag-select" data-capture-tag aria-label="Tag de la capture">
        ${options}
      </select>
    </div>
  `;
}

function createCaptureFilterBar(activeFilter = 'all') {
  const tagButtons = PREDEFINED_TAGS.map(
    (t) => `
    <button
      type="button"
      class="capture__filter-chip ${activeFilter === t.id ? 'is-active' : ''}"
      data-capture-filter="tag"
      data-capture-filter-tag="${t.id}"
      aria-pressed="${activeFilter === t.id ? 'true' : 'false'}"
    >
      ${t.emoji} ${escapeHtml(t.label)}
    </button>
  `
  ).join('');

  return `
    <div class="capture__filters" role="toolbar" aria-label="Filtrer les captures">
      <button
        type="button"
        class="capture__filter-chip ${activeFilter === 'all' ? 'is-active' : ''}"
        data-capture-filter="all"
        aria-pressed="${activeFilter === 'all' ? 'true' : 'false'}"
      >
        Toutes
      </button>
      ${tagButtons}
    </div>
  `;
}

function formatCaptureDate(timestamp) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

function createCaptureItem(capture) {
  const badge = capture.tagId ? renderTagBadge(capture.tagId) : '';

  return `
    <li class="capture__item animate-scale-in">
      <div class="capture__item-head">
        ${badge || '<span class="capture__item-head-spacer" aria-hidden="true"></span>'}
      </div>
      <p class="capture__item-text">${escapeHtml(capture.text)}</p>
      <div class="capture__item-footer">
        <time class="capture__item-date" datetime="${new Date(capture.createdAt).toISOString()}">
          ${formatCaptureDate(capture.createdAt)}
        </time>
        <div class="capture__item-actions">
          <button
            type="button"
            class="capture__edit"
            data-capture-edit="${capture.id}"
            aria-label="Modifier la capture"
            title="Modifier"
          >
            <svg class="capture__edit-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            class="capture__delete"
            data-capture-delete="${capture.id}"
            aria-label="Supprimer la capture"
            title="Supprimer"
          >
            ✕
          </button>
        </div>
      </div>
    </li>
  `;
}

function createCaptureList(captures = [], noCapturesInStorage = false) {
  if (!captures.length) {
    return `<p class="capture__empty">${noCapturesInStorage ? 'Aucune capture récente.' : 'Aucune capture pour ce tag.'}</p>`;
  }

  return `
    <ul class="capture__list">
      ${captures.map(createCaptureItem).join('')}
    </ul>
  `;
}

function createCaptureListToggle(remaining = 0, expanded = false) {
  if (expanded) {
    return `
      <button
        type="button"
        class="capture__list-toggle btn"
        data-capture-list-collapse
      >
        Réduire
      </button>
    `;
  }

  if (remaining <= 0) return '';

  const label = remaining === 1 ? 'restante' : 'restantes';
  return `
    <button
      type="button"
      class="capture__list-toggle btn"
      data-capture-list-expand
    >
      Voir plus (${remaining} ${label})
    </button>
  `;
}

function createCaptureListBlock(
  captures = [],
  { noCapturesInStorage = false, remaining = 0, expanded = false } = {}
) {
  return `
    ${createCaptureList(captures, noCapturesInStorage)}
    ${createCaptureListToggle(remaining, expanded)}
  `;
}

function createCaptureView(
  captures = [],
  listFilter = 'all',
  formTagId = '',
  storedCaptureCount = 0,
  listToggle = { remaining: 0, expanded: false }
) {
  return `
    <section class="capture animate-fade-in">
      <div class="capture__card card animate-slide-up">
        <header class="capture__header">
          <h1 class="capture__title">Capture Rapide</h1>
          <p class="capture__subtitle">Dépose ton idée en quelques mots et reprends ton focus.</p>
        </header>

        <form class="capture__form" data-capture-form>
          <label class="capture__label" for="capture-input" data-capture-label>Nouvelle capture</label>
          <textarea
            id="capture-input"
            class="capture__input"
            data-capture-input
            placeholder="Capture une idée..."
            rows="4"
            maxlength="280"
            required
          ></textarea>
          <div class="capture__form-submit-row">
            ${createCaptureTagField(formTagId)}
            <div class="capture__actions">
              <button type="submit" class="btn btn-primary" data-capture-submit>Capturer</button>
            </div>
          </div>
        </form>
      </div>

      <div class="capture__recent card animate-slide-up">
        <h2 class="capture__recent-title">Captures récentes</h2>
        <div class="capture__filters-wrap" data-capture-filters>
          ${createCaptureFilterBar(listFilter)}
        </div>
        <div class="capture__recent-content" data-capture-list>
          ${createCaptureListBlock(captures, {
            noCapturesInStorage: storedCaptureCount === 0,
            remaining: listToggle.remaining,
            expanded: listToggle.expanded
          })}
        </div>
      </div>
    </section>
  `;
}

export {
  createCaptureView,
  createCaptureList,
  createCaptureListBlock,
  createCaptureFilterBar,
  PREDEFINED_TAGS
};
