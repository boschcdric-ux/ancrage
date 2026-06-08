import { escapeHtml, truncate } from '../../core/format.js';

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

function getListTitle(entry) {
  const title = String(entry.title || '').trim();
  return title || 'Sans titre';
}

function getListBodyPreview(entry) {
  const raw = String(entry.contentText || '').trim();
  return truncate(raw, 220);
}

function createJournalTagFilters(activeTag = 'all') {
  const tagButtons = PREDEFINED_TAGS.map(
    (t) => `
    <button
      type="button"
      class="journal__filter-chip ${activeTag === t.id ? 'is-active' : ''}"
      data-journal-tag-filter="tag"
      data-journal-filter-tag="${t.id}"
      aria-pressed="${activeTag === t.id ? 'true' : 'false'}"
    >
      ${t.emoji} ${escapeHtml(t.label)}
    </button>
  `
  ).join('');

  return `
    <div class="journal__tag-filters" role="toolbar" aria-label="Filtrer par tag">
      <button
        type="button"
        class="journal__filter-chip ${activeTag === 'all' ? 'is-active' : ''}"
        data-journal-tag-filter="all"
        aria-pressed="${activeTag === 'all' ? 'true' : 'false'}"
      >
        Toutes
      </button>
      ${tagButtons}
    </div>
  `;
}

function createJournalSortControl(dateSort = 'desc') {
  return `
    <div class="journal__sort-field">
      <label class="journal__sort-label" for="journal-sort">Tri par date</label>
      <select id="journal-sort" class="journal__sort-select" data-journal-sort aria-label="Trier les entrées par date">
        <option value="desc" ${dateSort === 'desc' ? 'selected' : ''}>Plus récent</option>
        <option value="asc" ${dateSort === 'asc' ? 'selected' : ''}>Plus ancien</option>
      </select>
    </div>
  `;
}

function createEditorTagField(selectedTagId = '') {
  const options = [
    `<option value="">Sans tag</option>`,
    ...PREDEFINED_TAGS.map(
      (t) =>
        `<option value="${t.id}" ${selectedTagId === t.id ? 'selected' : ''}>${t.emoji} ${escapeHtml(t.label)}</option>`
    )
  ].join('');

  return `
    <div class="journal__editor-tag-field">
      <label class="journal__editor-tag-label" for="journal-entry-tag">Tag</label>
      <select id="journal-entry-tag" class="journal__editor-tag-select" data-journal-tag aria-label="Tag de l'entrée">
        ${options}
      </select>
    </div>
  `;
}

function createListItems(entries = [], storedEntryCount = 0) {
  if (!entries.length) {
    if (storedEntryCount === 0) {
      return `
      <p class="journal__empty">
        Aucune entrée pour le moment. Commence avec « Nouvelle entrée ».
      </p>
    `;
    }
    return `<p class="journal__empty">Aucune entrée ne correspond à ces filtres.</p>`;
  }

  return `
    <ul class="journal__entries-list">
      ${entries
        .map(
          (entry) => `
            <li>
              <button type="button" class="journal__entry card animate-fade-in" data-journal-open="${entry.id}">
                <div class="journal__entry-top">
                  <span class="journal__entry-date">${escapeHtml(entry.formattedDate)}</span>
                  <span class="journal__entry-meta">
                    ${entry.tagId ? renderTagBadge(entry.tagId) : ''}
                    <span class="journal__entry-length">${entry.wordCount || 0} mots</span>
                  </span>
                </div>
                <p class="journal__entry-title">${escapeHtml(getListTitle(entry))}</p>
                <p class="journal__entry-body-preview">${escapeHtml(getListBodyPreview(entry))}</p>
              </button>
            </li>
          `
        )
        .join('')}
    </ul>
  `;
}

function createListView(
  entries = [],
  searchQuery = '',
  listTagFilter = 'all',
  dateSort = 'desc',
  storedEntryCount = 0
) {
  return `
    <section class="journal animate-fade-in">
      <div class="journal__panel card animate-slide-up">
        <header class="journal__header">
          <div>
            <h1 class="journal__title">Journal</h1>
            <p class="journal__subtitle">Écris, relis, et garde une trace claire de tes journées.</p>
          </div>
          <button type="button" class="btn btn-primary" data-journal-new>
            Nouvelle entrée
          </button>
        </header>

        <div class="journal__search-wrap">
          <input
            type="search"
            class="journal__search"
            data-journal-search
            placeholder="Rechercher dans les entrées..."
            value="${escapeHtml(searchQuery)}"
            aria-label="Rechercher dans les entrées"
          />
        </div>

        <div class="journal__list-controls">
          ${createJournalTagFilters(listTagFilter)}
          ${createJournalSortControl(dateSort)}
        </div>

        <div class="journal__entries" data-journal-list>
          ${createListItems(entries, storedEntryCount)}
        </div>
      </div>
    </section>
  `;
}

function createEditorView(entry, isSaved = true) {
  const safeTitle = escapeHtml(entry?.title || '');
  const statusLabel = isSaved ? 'Sauvegardé' : 'Non sauvegardé';
  const statusClass = isSaved ? 'is-saved' : 'is-unsaved';
  const words = Number(entry?.wordCount) || 0;
  const tagValue = entry?.tagId || '';

  return `
    <section class="journal animate-fade-in">
      <div class="journal__panel journal__panel--editor card animate-slide-up">
        <div class="journal__editor-top">
          <input
            type="text"
            class="journal__title-input"
            data-journal-title
            placeholder="Titre de l'entrée..."
            value="${safeTitle}"
            maxlength="180"
          />
          ${createEditorTagField(tagValue)}
        </div>

        <div class="journal__toolbar">
          <button type="button" class="journal__tool-btn" data-journal-command="bold" aria-label="Gras">B</button>
          <button type="button" class="journal__tool-btn" data-journal-command="italic" aria-label="Italique">I</button>
          <button type="button" class="journal__tool-btn" data-journal-command="underline" aria-label="Souligné">U</button>
          <button type="button" class="journal__tool-btn" data-journal-command="strike" aria-label="Barré"><span style="text-decoration:line-through">S</span></button>
          <button type="button" class="journal__tool-btn" data-journal-command="heading1" aria-label="Titre 1">H1</button>
          <button type="button" class="journal__tool-btn" data-journal-command="heading2" aria-label="Titre 2">H2</button>
          <button type="button" class="journal__tool-btn" data-journal-command="heading3" aria-label="Titre 3">H3</button>
          <span class="journal__toolbar-sep"></span>
          <button type="button" class="journal__tool-btn" data-journal-command="highlight" aria-label="Surligner" title="Surligner">🖊️</button>
          <button type="button" class="journal__tool-btn journal__color-btn" data-journal-command="color-purple" aria-label="Texte violet" title="Violet">
            <span class="journal__color-dot" style="background:var(--accent)"></span>
          </button>
          <button type="button" class="journal__tool-btn journal__color-btn" data-journal-command="color-red" aria-label="Texte rouge" title="Rouge">
            <span class="journal__color-dot" style="background:var(--danger)"></span>
          </button>
          <button type="button" class="journal__tool-btn journal__color-btn" data-journal-command="color-green" aria-label="Texte vert" title="Vert">
            <span class="journal__color-dot" style="background:var(--success)"></span>
          </button>
          <button type="button" class="journal__tool-btn journal__color-btn" data-journal-command="color-orange" aria-label="Texte orange" title="Orange">
            <span class="journal__color-dot" style="background:var(--warning)"></span>
          </button>
          <button type="button" class="journal__tool-btn journal__color-btn" data-journal-command="color-reset" aria-label="Couleur par défaut" title="Couleur par défaut">
            <span class="journal__color-dot journal__color-reset">A</span>
          </button>
          <button type="button" class="journal__tool-btn" data-journal-command="bulletList" aria-label="Liste à puces">• Liste</button>
          <button type="button" class="journal__tool-btn" data-journal-command="orderedList" aria-label="Liste numérotée">1. Liste</button>
          <button type="button" class="journal__tool-btn" data-journal-command="taskList" aria-label="Liste de tâches">☑ Tâche</button>
          <button type="button" class="journal__tool-btn" data-journal-command="blockquote" aria-label="Citation">"</button>
          <button type="button" class="journal__tool-btn" data-journal-command="horizontalRule" aria-label="Séparateur">—</button>
        </div>

        <div class="journal__editor-content">
          <div class="journal__editor-prosemirror" data-journal-editor></div>
        </div>

        <footer class="journal__editor-footer">
          <span class="journal__save-state ${statusClass}" data-journal-save-state>${statusLabel}</span>
          <span class="journal__word-count" data-journal-word-count>${words} mots</span>
        </footer>

        <div class="journal__editor-actions">
          <button type="button" class="btn btn-secondary journal__action-back" data-journal-back>
            ← Retour
          </button>
          <button type="button" class="btn btn-secondary journal__action-delete" data-journal-delete>
            🗑 Supprimer
          </button>
        </div>
      </div>
    </section>
  `;
}

function createDashboardPreview(entry) {
  if (!entry) {
    return '<p class="journal-widget__empty">Aucune entrée. Prends 2 minutes pour écrire aujourd’hui.</p>';
  }

  const line = truncate(entry.contentText || entry.content || '', 80) || 'Entrée sans contenu';
  const title = truncate(entry.title || 'Sans titre', 80);
  const badge = entry.tagId ? renderTagBadge(entry.tagId) : '';

  return `
    <div class="journal-widget">
      <p class="journal-widget__meta">${badge ? `${badge} · ` : ''}${escapeHtml(entry.formattedDate || '')}</p>
      <p class="journal-widget__title">${escapeHtml(title)}</p>
      <p class="journal-widget__text">${escapeHtml(line)}</p>
    </div>
  `;
}

export { createListView, createEditorView, createDashboardPreview, PREDEFINED_TAGS };
