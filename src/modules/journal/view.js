import { escapeHtml, truncate } from '../../core/format.js';

const PREDEFINED_TAGS = [
  { id: 'maison', emoji: '🏠', label: 'Maison' },
  { id: 'boulot', emoji: '💼', label: 'Boulot' },
  { id: 'sante', emoji: '🏥', label: 'Santé' },
  { id: 'admin', emoji: '📋', label: 'Admin' },
  { id: 'personnel', emoji: '👤', label: 'Personnel' },
  { id: 'projets', emoji: '🚀', label: 'Projets' },
  { id: 'idees', emoji: '💡', label: 'Idées' },
  { id: 'ecriture', emoji: '✍️', label: 'Écriture' },
  { id: 'nature', emoji: '🌿', label: 'Nature' }
];

const FRESH_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

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
  return truncate(raw, 200);
}

function isFreshEntry(entry) {
  const ref = Number(entry?.updatedAt) || Number(entry?.createdAt) || 0;
  return Date.now() - ref <= FRESH_WINDOW_MS;
}

function createTagBar(activeTag = 'all') {
  const tagButtons = PREDEFINED_TAGS.map(
    (t) => `
      <button
        type="button"
        class="journal__tag-chip shared-tag-badge--${t.id} ${activeTag === t.id ? 'is-active' : ''}"
        data-journal-tag-filter="tag"
        data-journal-filter-tag="${t.id}"
        aria-pressed="${activeTag === t.id ? 'true' : 'false'}"
      >
        <span class="journal__tag-dot" aria-hidden="true"></span>${t.emoji} ${escapeHtml(t.label)}
      </button>`
  ).join('');

  return `
    <div class="journal__tagbar-wrap">
      <div class="journal__tagbar" data-h-scroll role="toolbar" aria-label="Filtrer par tag">
        <button
          type="button"
          class="journal__tag-chip journal__tag-chip--all ${activeTag === 'all' ? 'is-active' : ''}"
          data-journal-tag-filter="all"
          aria-pressed="${activeTag === 'all' ? 'true' : 'false'}"
        >
          Toutes
        </button>
        ${tagButtons}
      </div>
    </div>
  `;
}

function createSortControl(dateSort = 'desc') {
  return `
    <label class="journal__sort">
      <span class="journal__sort-label">Trier par date</span>
      <select class="journal__sort-select" data-journal-sort aria-label="Trier les entrées par date">
        <option value="desc" ${dateSort === 'desc' ? 'selected' : ''}>Plus récentes d'abord</option>
        <option value="asc" ${dateSort === 'asc' ? 'selected' : ''}>Plus anciennes d'abord</option>
      </select>
    </label>
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

function createStrata(entries = [], storedEntryCount = 0) {
  if (!entries.length) {
    if (storedEntryCount === 0) {
      return `
        <p class="journal__empty">
          Rien de déposé pour l'instant. Commence avec « Écrire ».
        </p>
      `;
    }
    return `<p class="journal__empty">Aucune entrée ne correspond à ce tag.</p>`;
  }

  const rows = entries
    .map((entry) => {
      const fresh = isFreshEntry(entry);
      const excerpt = getListBodyPreview(entry);
      return `
        <button type="button" class="journal__entry animate-fade-in" data-journal-open="${entry.id}">
          <span class="journal__entry-marker">
            <span class="journal__entry-depth ${fresh ? '' : 'journal__entry-depth--faded'}"></span>
          </span>
          <span class="journal__entry-card">
            <span class="journal__entry-date">${escapeHtml(entry.formattedDate)}</span>
            <span class="journal__entry-title">${escapeHtml(getListTitle(entry))}</span>
            ${excerpt ? `<span class="journal__entry-excerpt">${escapeHtml(excerpt)}</span>` : ''}
            <span class="journal__entry-foot">
              ${entry.tagId ? renderTagBadge(entry.tagId) : ''}
              <span class="journal__entry-words">${entry.wordCount || 0} mots</span>
            </span>
          </span>
        </button>
      `;
    })
    .join('');

  return `<div class="journal__strata" data-journal-list>${rows}</div>`;
}

function createListView(
  entries = [],
  searchQuery = '',
  listTagFilter = 'all',
  dateSort = 'desc',
  storedEntryCount = 0
) {
  const countLabel = `${storedEntryCount} ${storedEntryCount > 1 ? 'entrées' : 'entrée'}`;

  return `
    <section class="journal journal--list animate-fade-in">
      <div class="journal__list">
        <header class="journal__list-head">
          <div>
            <h1 class="journal__title">Journal</h1>
            <p class="journal__subtitle">Ce que tu as déposé, jour après jour.</p>
          </div>
          <button type="button" class="journal__write-btn" data-journal-new>
            <span aria-hidden="true">✍️</span> Écrire
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

        ${createTagBar(listTagFilter)}

        <div class="journal__sortrow">
          <span class="journal__sortrow-count">${countLabel}</span>
          ${createSortControl(dateSort)}
        </div>

        ${createStrata(entries, storedEntryCount)}
      </div>
    </section>
  `;
}

function entryHasDeletableContent(entry) {
  const title = String(entry?.title || '').trim();
  const text = String(entry?.contentText || '').trim();
  return Boolean(title || text);
}

function shouldShowDeleteButton(entry, { isDraft = false } = {}) {
  if (isDraft) return false;
  return entryHasDeletableContent(entry);
}

function createEditorView(entry, isSaved = true, editorState = {}) {
  const safeTitle = escapeHtml(entry?.title || '');
  const statusLabel = isSaved ? 'Sauvegardé' : 'Non sauvegardé';
  const statusClass = isSaved ? 'is-saved' : 'is-unsaved';
  const words = Number(entry?.wordCount) || 0;
  const tagValue = entry?.tagId || '';
  const showDeleteButton = shouldShowDeleteButton(entry, editorState);

  return `
    <section class="journal journal--editor animate-fade-in">
      <div class="journal__panel journal__panel--editor">
        <div class="journal__editor-actions">
          <button type="button" class="journal__action-back" data-journal-back>
            ← Retour
          </button>
          <button
            type="button"
            class="journal__action-delete"
            data-journal-delete
            ${showDeleteButton ? '' : 'hidden'}
          >
            🗑 Supprimer
          </button>
        </div>
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
          <span class="journal__toolbar-sep"></span>
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
          <span class="journal__toolbar-sep"></span>
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

export {
  createListView,
  createEditorView,
  createDashboardPreview,
  entryHasDeletableContent,
  shouldShowDeleteButton,
  PREDEFINED_TAGS
};
