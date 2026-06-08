function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const NOTE_COLORS = ['#fef3c7', '#fce7f3', '#dbeafe', '#d1fae5', '#ede9fe', '#ffedd5'];

function createFilterDots(activeColorFilter) {
  const allClass = activeColorFilter ? '' : 'is-active';
  return `
    <button type="button" class="notes__filter-dot notes__filter-dot--all ${allClass}" data-filter-color="" title="Tout afficher" aria-label="Tout afficher"></button>
    ${NOTE_COLORS.map((color) => {
      const activeClass = activeColorFilter === color ? 'is-active' : '';
      return `<button type="button" class="notes__filter-dot ${activeClass}" data-filter-color="${color}" style="--dot-color: ${color};" title="Filtrer ${color}" aria-label="Filtrer ${color}"></button>`;
    }).join('')}
  `;
}

function createColorPalette(note, isOpen = false) {
  return `
    <div class="notes__palette ${isOpen ? 'is-open' : ''}" aria-label="Choisir une couleur">
      ${NOTE_COLORS.map(
        (color) => `
          <button
            type="button"
            class="notes__palette-dot ${note.color === color ? 'is-active' : ''}"
            data-note-color="${note.id}"
            data-color-value="${color}"
            style="--dot-color: ${color};"
            aria-label="Couleur ${color}"
            title="Couleur ${color}"
          ></button>
        `
      ).join('')}
    </div>
  `;
}

function createListEditor(note, isArchiveView = false) {
  const items = Array.isArray(note.listItems) ? note.listItems : [];
  const listRows =
    items.length > 0
      ? items
          .map(
            (item) => `
        <label class="notes__list-row">
          <input type="checkbox" data-note-list-toggle="${note.id}" data-list-item-id="${item.id}" ${item.done ? 'checked' : ''} ${isArchiveView ? 'disabled' : ''} />
          <input
            type="text"
            class="notes__list-input ${item.done ? 'is-done' : ''}"
            data-note-list-input="${note.id}"
            data-list-item-id="${item.id}"
            value="${escapeHtml(item.text || '')}"
            placeholder="Nouvel item..."
            ${isArchiveView ? 'readonly' : ''}
          />
          ${
            isArchiveView
              ? ''
              : `<button
                  type="button"
                  class="notes__list-remove"
                  data-note-list-remove="${note.id}"
                  data-list-item-id="${item.id}"
                  aria-label="Supprimer la puce"
                  title="Supprimer la puce"
                >✕</button>`
          }
        </label>
      `
          )
          .join('')
      : `
      <label class="notes__list-row">
        <input type="checkbox" disabled />
        <input type="text" class="notes__list-input" disabled placeholder="Passe en mode liste pour commencer..." />
      </label>
    `;

  return `<div class="notes__list-editor">${listRows}</div>`;
}

function createNoteItem(note, options = {}) {
  const { isArchiveView = false, isDimmed = false, isNew = false, isColorMenuOpen = false } = options;
  const actions = isArchiveView
    ? `
      <button
        type="button"
        class="notes__action notes__action--restore"
        data-note-restore="${note.id}"
        aria-label="Restaurer le post-it"
        title="Restaurer"
      >
        Restaurer
      </button>
    `
    : `
      <button
        type="button"
        class="notes__action notes__action--pin ${note.pinned ? 'is-active' : ''}"
        data-note-pin="${note.id}"
        aria-label="Épingler le post-it"
        title="Épingler"
      >
        📌
      </button>
      <button
        type="button"
        class="notes__action notes__action--mode"
        data-note-mode="${note.id}"
        aria-label="Basculer mode texte/liste"
        title="Basculer mode texte/liste"
      >
        ${note.mode === 'list' ? '≣' : '☰'}
      </button>
      <button
        type="button"
        class="notes__action notes__action--color ${isColorMenuOpen ? 'is-active' : ''}"
        data-note-color-toggle="${note.id}"
        aria-label="Choisir la couleur du post-it"
        aria-expanded="${isColorMenuOpen}"
        title="Couleur"
      >
        🎨
      </button>
      <button
        type="button"
        class="notes__action notes__action--archive"
        data-note-archive="${note.id}"
        aria-label="Archiver le post-it"
        title="Archiver"
      >
        📦
      </button>
      <button
        type="button"
        class="notes__action notes__action--delete"
        data-note-delete="${note.id}"
        aria-label="Supprimer le post-it"
        title="Supprimer"
      >
        ✕
      </button>
    `;

  const positionStyle = isArchiveView
    ? ''
    : `--note-x: ${Number(note.x) || 0}px; --note-y: ${Number(note.y) || 0}px; --note-width: ${Number(note.width) || 200}px; --note-height: ${Number(note.height) || 200}px; --note-tilt: ${Number(note.tilt) || 0}deg;`;

  const classes = ['notes__item'];
  if (note.pinned) classes.push('notes__item--pinned');
  if (isDimmed) classes.push('is-dimmed');
  if (isNew) classes.push('notes__item--new');

  return `
    <article
      class="${classes.join(' ')}"
      style="--note-color: ${escapeHtml(note.color)}; ${positionStyle}"
      data-note-id="${note.id}"
    >
      <div class="notes__top-right">
        ${isArchiveView ? '' : createColorPalette(note, isColorMenuOpen)}
        <div class="notes__actions">${actions}</div>
      </div>
      <input
        type="text"
        class="notes__title-input"
        data-note-title="${note.id}"
        value="${escapeHtml(note.title || '')}"
        placeholder="Titre..."
        aria-label="Titre du post-it"
        ${isArchiveView ? 'readonly' : ''}
      />
      <div class="notes__separator"></div>
      ${
        note.mode === 'list'
          ? createListEditor(note, isArchiveView)
          : `
      <textarea
        class="notes__textarea"
        data-note-content="${note.id}"
        placeholder="Écris ici..."
        aria-label="Contenu du post-it"
        ${isArchiveView ? 'readonly' : ''}
      >${escapeHtml(note.content)}</textarea>
      `
      }
      ${
        isArchiveView
          ? ''
          : '<button type="button" class="notes__resize-handle" data-note-resize aria-label="Redimensionner le post-it" title="Redimensionner"></button>'
      }
    </article>
  `;
}

function createNotesGrid(notes = [], options = {}) {
  const { isArchiveView = false, dimmedNoteIds = new Set(), justCreatedId = null, openColorMenuNoteId = null } = options;
  if (!notes.length) {
    return `<p class="notes__empty">${
      isArchiveView
        ? 'Aucun post-it archivé.'
        : 'Clique sur "Nouveau post-it" pour commencer.'
    }</p>`;
  }

  return notes
    .map((note) =>
      createNoteItem(note, {
        isArchiveView,
        isDimmed: dimmedNoteIds.has(note.id),
        isNew: justCreatedId === note.id,
        isColorMenuOpen: openColorMenuNoteId === note.id
      })
    )
    .join('');
}

function createNotesView(activeNotes = [], archivedNotesCount = 0, snapToGrid = false, activeColorFilter = '', searchQuery = '', dimmedNoteIds = new Set(), justCreatedId = null, openColorMenuNoteId = null) {
  return `
    <section class="notes animate-fade-in">
      <header class="notes__header">
        <div class="notes__header-main">
          <h1 class="notes__title">Bloc-notes</h1>
          <button type="button" class="btn btn-secondary notes__archives-btn" data-notes-open-archives>
            Archives (${archivedNotesCount})
          </button>
        </div>
        <div class="notes__header-actions">
          <div class="notes__filters" role="group" aria-label="Filtrer par couleur">
            ${createFilterDots(activeColorFilter)}
          </div>
          <input
            type="search"
            class="notes__search"
            data-notes-search
            placeholder="Rechercher..."
            value="${escapeHtml(searchQuery)}"
            aria-label="Recherche rapide"
          />
          <button type="button" class="btn btn-secondary notes__snap-btn" data-notes-toggle-snap aria-pressed="${snapToGrid}">
            ${snapToGrid ? 'Alignement grille: ON' : 'Alignement grille: OFF'}
          </button>
          <button type="button" class="btn btn-primary" data-note-create>
            Nouveau post-it
          </button>
        </div>
      </header>

      <div class="notes__desk animate-slide-up" data-notes-desk>
        ${createNotesGrid(activeNotes, { dimmedNoteIds, justCreatedId, openColorMenuNoteId })}
      </div>
    </section>
  `;
}

function createArchivesView(archivedNotes = [], archivedNotesCount = 0) {
  return `
    <section class="notes animate-fade-in">
      <header class="notes__header">
        <div class="notes__header-main">
          <h1 class="notes__title">Archives</h1>
          <button type="button" class="btn btn-secondary notes__archives-btn" data-notes-close-archives>
            Retour au bureau
          </button>
        </div>
        <p class="notes__archives-count">${archivedNotesCount} post-it(s) archivé(s)</p>
      </header>

      <div class="notes__desk notes__desk--archives animate-slide-up" data-notes-desk>
        ${createNotesGrid(archivedNotes, { isArchiveView: true })}
      </div>
    </section>
  `;
}

export { createNotesView, createArchivesView, createNotesGrid };
