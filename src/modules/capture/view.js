import { escapeHtml } from '../../core/format.js';

const PREDEFINED_TAGS = [
  { id: 'maison', emoji: '🏠', label: 'Maison' },
  { id: 'boulot', emoji: '💼', label: 'Boulot' },
  { id: 'jardin', emoji: '🌿', label: 'Jardin' },
  { id: 'sante', emoji: '🏥', label: 'Santé' },
  { id: 'admin', emoji: '📋', label: 'Admin' },
  { id: 'personnel', emoji: '👤', label: 'Personnel' }
];

const SURFACE_BACK_SVG =
  '<svg class="cap__surface-back" viewBox="0 0 1200 18" preserveAspectRatio="none" aria-hidden="true"><path d="M0,9 C75,3 150,15 300,9 C450,3 525,15 600,9 C675,3 750,15 900,9 C1050,3 1125,15 1200,9 L1200,18 L0,18 Z"/></svg>';

const SURFACE_FRONT_SVG =
  '<svg class="cap__surface-front" viewBox="0 0 1200 18" preserveAspectRatio="none" aria-hidden="true"><path d="M0,11 C100,6 200,14 300,11 C400,7 500,14 600,11 C700,6 800,14 900,11 C1000,7 1100,14 1200,11 L1200,18 L0,18 Z"/></svg>';

function renderTagBadge(tagId) {
  const tag = PREDEFINED_TAGS.find((t) => t.id === tagId);
  if (!tag) return '';
  return `<span class="capture__badge"><span aria-hidden="true">${tag.emoji}</span> ${escapeHtml(tag.label)}</span>`;
}

function createCaptureTagPicker(formTagId = '', isOpen = false) {
  const tag = formTagId ? PREDEFINED_TAGS.find((t) => t.id === formTagId) : null;
  const btnClass = tag ? 'tagpick__btn has-tag' : 'tagpick__btn';
  const label = tag ? `${tag.emoji} ${tag.label}` : 'Tag';

  const menuItems = [
    `<button type="button" class="tagpick__item" data-capture-tag-pick data-tag-id="">Aucun tag</button>`,
    ...PREDEFINED_TAGS.map(
      (t) =>
        `<button type="button" class="tagpick__item" data-capture-tag-pick data-tag-id="${t.id}">${t.emoji} ${escapeHtml(t.label)}</button>`
    )
  ].join('');

  return `
    <div class="tagpick" data-capture-tag-wrap>
      <button
        type="button"
        class="${btnClass}"
        data-capture-tag-toggle
        aria-haspopup="true"
        aria-expanded="${isOpen ? 'true' : 'false'}"
        aria-label="${tag ? `Tag sélectionné : ${escapeHtml(tag.label)}` : 'Choisir un tag'}"
      >
        🏷 <span data-capture-tag-label>${escapeHtml(label)}</span>
      </button>
      <div class="tagpick__menu ${isOpen ? 'is-open' : ''}" data-capture-tag-menu role="menu" aria-hidden="${isOpen ? 'false' : 'true'}">
        ${menuItems}
      </div>
    </div>
  `;
}

function getFilterChipCount(allCaptures, filterId) {
  if (filterId === 'all') return allCaptures.length;
  return allCaptures.filter((c) => c.tagId === filterId).length;
}

function renderChipCount(count) {
  if (count <= 0) return '';
  return `<span class="capture__chip-n">${count}</span>`;
}

function createCaptureFilterBar(activeFilter = 'all', allCaptures = []) {
  const tagButtons = PREDEFINED_TAGS.map((t) => {
    const count = getFilterChipCount(allCaptures, t.id);
    return `
    <button
      type="button"
      class="capture__chip ${activeFilter === t.id ? 'is-active' : ''}"
      data-capture-filter="tag"
      data-capture-filter-tag="${t.id}"
      aria-pressed="${activeFilter === t.id ? 'true' : 'false'}"
    >
      ${t.emoji} ${escapeHtml(t.label)}${renderChipCount(count)}
    </button>
  `;
  }).join('');

  return `
    <div class="capture__filters" role="toolbar" aria-label="Filtrer les captures">
      <button
        type="button"
        class="capture__chip ${activeFilter === 'all' ? 'is-active' : ''}"
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
  const date = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.floor((startOfToday - startOfDate) / 86400000);

  if (dayDiff === 0) {
    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `aujourd'hui · ${time}`;
  }
  if (dayDiff === 1) return 'hier';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function createCaptureItem(capture, index = 0) {
  const badge = capture.tagId ? renderTagBadge(capture.tagId) : '';

  return `
    <li class="capture__item" data-capture-item="${capture.id}" style="animation-delay:${index * 40}ms">
      <div class="capture__item-head">
        ${badge}
      </div>
      <p class="capture__item-text">${escapeHtml(capture.text)}</p>
      <div class="capture__item-foot">
        <time class="capture__item-date" datetime="${new Date(capture.createdAt).toISOString()}">
          ${formatCaptureDate(capture.createdAt)}
        </time>
        <div class="capture__item-actions">
          <button
            type="button"
            class="capture__iact"
            data-capture-edit="${capture.id}"
            aria-label="Modifier la capture"
            title="Modifier"
          >
            ✎
          </button>
          <button
            type="button"
            class="capture__iact capture__iact--danger"
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

function createCaptureEmpty(noCapturesInStorage) {
  if (noCapturesInStorage) {
    return `
      <li class="capture__empty">
        <div class="capture__empty-title">Surface claire.</div>
        <div class="capture__empty-hint">Aucune pensée ne t'attend ici. C'est une bonne nouvelle.</div>
      </li>
    `;
  }
  return `
    <li class="capture__empty">
      <div class="capture__empty-title">Rien ici pour ce tag.</div>
      <div class="capture__empty-hint">Change de filtre ou capture une nouvelle pensée.</div>
    </li>
  `;
}

function createCaptureList(captures = [], noCapturesInStorage = false) {
  if (!captures.length) {
    return `<ul class="capture__items">${createCaptureEmpty(noCapturesInStorage)}</ul>`;
  }

  return `
    <ul class="capture__items">
      ${captures.map((c, i) => createCaptureItem(c, i)).join('')}
    </ul>
  `;
}

function createCaptureListToggle(remaining = 0, expanded = false, filteredTotal = 0, maxVisible = 5) {
  if (expanded && filteredTotal > maxVisible) {
    return `
      <button type="button" class="capture__more" data-capture-list-collapse>
        Replier
      </button>
    `;
  }

  if (remaining <= 0) return '';

  return `
    <button type="button" class="capture__more" data-capture-list-expand>
      Voir ${remaining} de plus
    </button>
  `;
}

function createCaptureListBlock(
  captures = [],
  { noCapturesInStorage = false, remaining = 0, expanded = false, filteredTotal = 0, maxVisible = 5 } = {}
) {
  return `
    ${createCaptureList(captures, noCapturesInStorage)}
    ${createCaptureListToggle(remaining, expanded, filteredTotal, maxVisible)}
  `;
}

function createCaptureView(
  captures = [],
  listFilter = 'all',
  formTagId = '',
  allCaptures = [],
  listToggle = { remaining: 0, expanded: false, filteredTotal: 0, maxVisible: 5 },
  openFormTagMenu = false,
  inputAriaLabel = 'Nouvelle capture'
) {
  return `
    <section class="capture">
      <div class="cap" data-cap-card>
        <div class="cap__layer" data-cap-layer aria-hidden="true">
          <div class="cap__surface" data-cap-surface>
            ${SURFACE_BACK_SVG}
            ${SURFACE_FRONT_SVG}
          </div>
        </div>

        <h1 class="cap__title">Capture</h1>
        <p class="cap__subtitle">Dépose la pensée. L'eau la garde, ta tête est libre.</p>

        <form class="cap__form" data-capture-form>
          <textarea
            id="capture-input"
            class="cap__input"
            data-capture-input
            placeholder="Capture une idée…"
            rows="4"
            required
            aria-label="${escapeHtml(inputAriaLabel)}"
          ></textarea>
          <div class="cap__row">
            ${createCaptureTagPicker(formTagId, openFormTagMenu)}
            <span class="cap__counter" data-capture-counter aria-live="polite"></span>
            <button type="submit" class="cap__submit" data-capture-submit>Capturer</button>
          </div>
        </form>

        <div class="cap__ack" data-capture-ack aria-live="polite">Posée.</div>
      </div>

      <section class="capture__recent">
        <h2 class="capture__recent-title">Sous la surface</h2>
        <div class="capture__filters-wrap" data-capture-filters>
          ${createCaptureFilterBar(listFilter, allCaptures)}
        </div>
        <div class="capture__recent-content" data-capture-list>
          ${createCaptureListBlock(captures, {
            noCapturesInStorage: allCaptures.length === 0,
            remaining: listToggle.remaining,
            expanded: listToggle.expanded,
            filteredTotal: listToggle.filteredTotal,
            maxVisible: listToggle.maxVisible
          })}
        </div>
      </section>
    </section>
  `;
}

export {
  createCaptureView,
  createCaptureList,
  createCaptureListBlock,
  createCaptureFilterBar,
  createCaptureTagPicker,
  PREDEFINED_TAGS
};
