import { escapeHtml } from '../../core/format.js';

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildLegacyHexToPresetId(colorPresets) {
  return Object.fromEntries(colorPresets.map((p) => [p.legacyHex.toLowerCase(), p.id]));
}

function memoCardPresetClass(color, colorPresets) {
  if (!color) return '';
  const raw = String(color).trim();
  if (!raw) return '';
  const byId = colorPresets.some((p) => p.id === raw);
  if (byId) return `memo-card--${raw}`;
  const legacyMap = buildLegacyHexToPresetId(colorPresets);
  const id = legacyMap[raw.toLowerCase()];
  return id ? `memo-card--${id}` : '';
}

function memoCardColorInlineStyle(color, colorPresets) {
  if (!color) return '';
  const raw = String(color).trim();
  if (!raw) return '';
  if (memoCardPresetClass(color, colorPresets)) return '';
  if (/^#[0-9a-f]{3,8}$/i.test(raw)) {
    return `--memo-card-color: ${escapeHtml(raw)};`;
  }
  return '';
}

function isPresetColorActive(draftColor, preset) {
  const raw = draftColor == null ? '' : String(draftColor).trim();
  if (!raw) return false;
  if (raw === preset.id) return true;
  return raw.toLowerCase() === preset.legacyHex.toLowerCase();
}

function highlightText(text, query) {
  const safeText = escapeHtml(text || '');
  const q = String(query || '').trim();
  if (!q) return safeText;
  const pattern = new RegExp(`(${escapeRegExp(q)})`, 'gi');
  return safeText.replace(pattern, '<mark>$1</mark>');
}

function cardPreview(card, max = 90) {
  const raw = String(card?.content || '').replace(/\s+/g, ' ').trim();
  if (!raw) return 'Carte vide';
  return raw.length > max ? `${raw.slice(0, max - 1)}…` : raw;
}

function createSectionRow(section) {
  const count = Array.isArray(section.cards) ? section.cards.length : 0;
  const firstCard = Array.isArray(section.cards) && section.cards.length ? section.cards[0] : null;
  return `
    <article class="memo-section-row animate-slide-up">
      <button type="button" class="memo-section-row__main" data-action="open-section" data-section-id="${section.id}">
        <div class="memo-section-row__leading">
          <span class="memo-section-row__icon">${escapeHtml(section.icon || '📁')}</span>
          <div class="memo-section-row__text">
            <p class="memo-section-row__title">${escapeHtml(section.title || 'Section')}</p>
            <p class="memo-section-row__meta">${count} carte${count > 1 ? 's' : ''}</p>
            <p class="memo-section-row__preview">${escapeHtml(firstCard ? cardPreview(firstCard, 64) : 'Aucune carte')}</p>
          </div>
        </div>
        <span class="memo-section-row__chevron">›</span>
      </button>
      <div class="memo-section-row__actions">
        <button type="button" class="btn btn-secondary memo-btn-icon" data-action="move-section-up" data-section-id="${section.id}" aria-label="Monter la section">↑</button>
        <button type="button" class="btn btn-secondary memo-btn-icon" data-action="move-section-down" data-section-id="${section.id}" aria-label="Descendre la section">↓</button>
        <button type="button" class="btn btn-secondary memo-btn-icon" data-action="rename-section" data-section-id="${section.id}" aria-label="Renommer la section">✎</button>
        <button type="button" class="btn btn-secondary memo-btn-icon" data-action="delete-section" data-section-id="${section.id}" aria-label="Supprimer la section">✕</button>
      </div>
    </article>
  `;
}

function createSearchResultsView(resultsBySection, query) {
  const hasResult = resultsBySection.some((group) => group.cards.length > 0);
  if (!hasResult) {
    return `<p class="memo-empty">Aucun résultat pour "${escapeHtml(query)}"</p>`;
  }

  return resultsBySection
    .filter((group) => group.cards.length > 0)
    .map((group) => {
      const cardsMarkup = group.cards
        .map(
          (card) => `
            <button type="button" class="memo-search-card" data-action="open-card" data-section-id="${group.section.id}" data-card-id="${card.id}">
              <strong>${highlightText(card.title || 'Sans titre', query)}</strong>
              <p>${highlightText(cardPreview(card, 160), query)}</p>
            </button>
          `
        )
        .join('');
      return `
        <section class="memo-search-group">
          <h3>${escapeHtml(group.section.icon || '📁')} ${escapeHtml(group.section.title || 'Section')}</h3>
          <div class="memo-search-group__cards">${cardsMarkup}</div>
        </section>
      `;
    })
    .join('');
}

function createHomeView({ sections, query, resultsBySection }) {
  const trimmed = String(query || '').trim();
  const content = trimmed
    ? createSearchResultsView(resultsBySection, trimmed)
    : sections.map((section) => createSectionRow(section)).join('');

  return `
    <section class="memo animate-fade-in">
      <header class="memo__top">
        <h1>Mémo 🗒️</h1>
        <input
          type="search"
          class="memo-search-input"
          data-action="search-input"
          value="${escapeHtml(query || '')}"
          placeholder="Rechercher dans tous les mémos..."
          aria-label="Recherche globale"
        />
      </header>

      <div class="memo__content">
        ${content || '<p class="memo-empty">Aucune section pour le moment.</p>'}
      </div>

      <footer class="memo__footer">
        <button type="button" class="btn btn-primary memo-cta" data-action="create-section">+ Nouvelle section</button>
      </footer>
    </section>
  `;
}

function createSectionView(section, cards, colorPresets) {
  const list = cards
    .map(
      (card) => {
        const presetClass = memoCardPresetClass(card.color, colorPresets);
        const colorStyle = memoCardColorInlineStyle(card.color, colorPresets);
        const styleAttr = colorStyle ? ` style="${colorStyle}"` : '';
        return `
        <button
          type="button"
          class="memo-card-row ${card.pinned ? 'is-pinned' : ''}${presetClass ? ` ${presetClass}` : ''}"
          data-action="open-card"
          data-section-id="${section.id}"
          data-card-id="${card.id}"${styleAttr}
        >
          <div class="memo-card-row__top">
            <strong>${escapeHtml(card.title || 'Sans titre')}</strong>
            <span>${card.pinned ? '📌' : ''}</span>
          </div>
          <p>${escapeHtml(cardPreview(card, 140))}</p>
        </button>
      `;
      }
    )
    .join('');

  return `
    <section class="memo animate-fade-in">
      <header class="memo-head">
        <button type="button" class="btn btn-secondary memo-btn-icon" data-action="back-home">←</button>
        <h2>${escapeHtml(section.icon || '📁')} ${escapeHtml(section.title || 'Section')}</h2>
        <button type="button" class="btn btn-secondary memo-btn-icon" data-action="rename-section" data-section-id="${section.id}">✏️</button>
      </header>

      <div class="memo__content">
        ${list || '<p class="memo-empty">Aucune carte dans cette section.</p>'}
      </div>

      <footer class="memo__footer">
        <button type="button" class="btn btn-primary memo-cta" data-action="create-card" data-section-id="${section.id}">+ Nouvelle carte</button>
      </footer>
    </section>
  `;
}

function createCardView(section, card, colorPresets) {
  const presetClass = memoCardPresetClass(card.color, colorPresets);
  const colorStyle = memoCardColorInlineStyle(card.color, colorPresets);
  const classNames = `memo-card-full ${card.pinned ? 'is-pinned' : ''}${presetClass ? ` ${presetClass}` : ''}`;
  const styleAttr = colorStyle ? ` style="${colorStyle}"` : '';
  return `
    <section class="memo animate-fade-in">
      <header class="memo-head">
        <button type="button" class="btn btn-secondary memo-btn-icon" data-action="back-section" data-section-id="${section.id}">←</button>
        <h2>${escapeHtml(card.title || 'Sans titre')}</h2>
        <button type="button" class="btn btn-secondary memo-btn-icon" data-action="edit-card" data-section-id="${section.id}" data-card-id="${card.id}">✏️</button>
      </header>

      <article class="${classNames}"${styleAttr}>
        <div class="memo-card-full__meta">${escapeHtml(section.icon || '📁')} ${escapeHtml(section.title || 'Section')} ${card.pinned ? '• 📌 Épinglée' : ''}</div>
        <div class="memo-card-full__content">${escapeHtml(card.content || '').replaceAll('\n', '<br />')}</div>
      </article>

      <footer class="memo__footer memo__footer--split">
        <button type="button" class="btn btn-secondary memo-cta" data-action="edit-card" data-section-id="${section.id}" data-card-id="${card.id}">Modifier</button>
        <button type="button" class="btn btn-secondary memo-cta memo-cta--danger" data-action="delete-card" data-section-id="${section.id}" data-card-id="${card.id}">Supprimer</button>
      </footer>
    </section>
  `;
}

function createCardEditorView(section, draft, colorPresets, isNew) {
  const colors = colorPresets
    .map(
      (preset) => `
        <button
          type="button"
          class="memo-color-dot memo-color-dot--${preset.id} ${isPresetColorActive(draft.color, preset) ? 'is-active' : ''}"
          data-action="set-card-color"
          data-color="${preset.id}"
          aria-label="Choisir la couleur ${preset.id}"
        ></button>
      `
    )
    .join('');

  return `
    <section class="memo animate-fade-in">
      <header class="memo-head">
        <button type="button" class="btn btn-secondary memo-btn-icon" data-action="cancel-edit-card" data-section-id="${section.id}" data-card-id="${draft.id}">←</button>
        <h2>${isNew ? 'Nouvelle carte' : 'Modifier la carte'}</h2>
        <span></span>
      </header>

      <div class="memo-editor">
        <label>
          <span>Titre</span>
          <input type="text" data-action="edit-title" value="${escapeHtml(draft.title || '')}" placeholder="Titre de la carte" />
        </label>
        <label>
          <span>Contenu</span>
          <textarea data-action="edit-content" rows="10" placeholder="Écris ton mémo...">${escapeHtml(draft.content || '')}</textarea>
        </label>
        <div class="memo-editor__colors">
          <span>Couleur</span>
          <div>${colors}</div>
        </div>
        <label class="memo-toggle">
          <input type="checkbox" data-action="edit-pinned" ${draft.pinned ? 'checked' : ''} />
          <span>Épingler cette carte</span>
        </label>
      </div>

      <footer class="memo__footer">
        <button type="button" class="btn btn-primary memo-cta" data-action="save-card" data-section-id="${section.id}" data-card-id="${draft.id}">Enregistrer</button>
      </footer>
    </section>
  `;
}

export { createHomeView, createSectionView, createCardView, createCardEditorView };
