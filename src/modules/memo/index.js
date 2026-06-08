import './style.css';
import { load, save, generateUUID } from '../../core/storage.js';
import { createHomeView, createSectionView, createCardView, createCardEditorView } from './view.js';

const STORAGE_KEY = 'memo:data';
const MIGRATED_KEY = 'memo:migrated';
const LEGACY_NOTES_KEY = 'notes:items';
/** Couleurs prédéfinies : `id` enregistré au choix ; `legacyHex` reconnu pour les cartes existantes. */
const CARD_COLOR_PRESETS = [
  { id: 'orange', legacyHex: '#f59e0b' },
  { id: 'rouge', legacyHex: '#ef4444' },
  { id: 'bleu', legacyHex: '#06b6d4' },
  { id: 'vert', legacyHex: '#10b981' },
  { id: 'violet', legacyHex: '#8b5cf6' },
  { id: 'rose', legacyHex: '#ec4899' }
];

const DEFAULT_SECTIONS = [
  { icon: '🔐', title: 'Codes & Accès' },
  { icon: '📋', title: 'Listes' },
  { icon: '💡', title: 'Idées' },
  { icon: '👤', title: 'Contacts importants' },
  { icon: '🏠', title: 'Maison' },
  { icon: '📚', title: 'À voir / À lire' }
];

let rootContainer = null;
let onClick = null;
let onInput = null;
let memoData = { sections: [] };
let viewState = { screen: 'home', sectionId: null, cardId: null, search: '', draft: null, isNewCard: false };

function normalizeCard(card) {
  if (!card || typeof card.id !== 'string') return null;
  return {
    id: card.id,
    title: typeof card.title === 'string' ? card.title : '',
    content: typeof card.content === 'string' ? card.content : '',
    color: typeof card.color === 'string' ? card.color : null,
    pinned: Boolean(card.pinned),
    createdAt: Number(card.createdAt) || Date.now(),
    updatedAt: Number(card.updatedAt) || Date.now()
  };
}

function normalizeSection(section) {
  if (!section || typeof section.id !== 'string') return null;
  const cards = Array.isArray(section.cards) ? section.cards.map(normalizeCard).filter(Boolean) : [];
  return {
    id: section.id,
    title: typeof section.title === 'string' && section.title.trim() ? section.title.trim() : 'Section',
    icon: typeof section.icon === 'string' && section.icon.trim() ? section.icon.trim() : '📁',
    color: typeof section.color === 'string' ? section.color : null,
    createdAt: Number(section.createdAt) || Date.now(),
    cards
  };
}

function createDefaultSections() {
  const now = Date.now();
  return DEFAULT_SECTIONS.map((section) => ({
    id: generateUUID(),
    title: section.title,
    icon: section.icon,
    color: null,
    createdAt: now,
    cards: []
  }));
}

function normalizeMemoData(data) {
  const sections = Array.isArray(data?.sections) ? data.sections.map(normalizeSection).filter(Boolean) : [];
  return { sections };
}

function persistMemo() {
  save(STORAGE_KEY, memoData);
}

function readMemoData() {
  const raw = load(STORAGE_KEY, { sections: [] });
  const normalized = normalizeMemoData(raw);
  if (!normalized.sections.length) {
    normalized.sections = createDefaultSections();
    save(STORAGE_KEY, normalized);
  }
  return normalized;
}

function buildLegacyNoteContent(note) {
  if (note?.mode === 'list' && Array.isArray(note?.listItems)) {
    const items = note.listItems
      .map((item) => {
        const text = typeof item?.text === 'string' ? item.text.trim() : '';
        if (!text) return '';
        return item.done ? `✓ ${text}` : `• ${text}`;
      })
      .filter(Boolean);
    if (items.length) return items.join('\n');
  }
  return typeof note?.content === 'string' ? note.content : '';
}

function migrateLegacyNotesIfNeeded() {
  const migrated = load(MIGRATED_KEY, false);
  if (migrated) return;

  const legacyNotes = load(LEGACY_NOTES_KEY, []);
  const safeNotes = Array.isArray(legacyNotes) ? legacyNotes.filter((note) => note && note.archived !== true) : [];
  if (!safeNotes.length) {
    save(MIGRATED_KEY, true);
    return;
  }

  const ideasSection =
    memoData.sections.find((section) => section.title === 'Idées') ||
    memoData.sections.find((section) => section.icon === '💡') ||
    memoData.sections[0];
  if (!ideasSection) {
    save(MIGRATED_KEY, true);
    return;
  }

  const importedCards = safeNotes.map((note) => {
    const content = buildLegacyNoteContent(note).trim();
    return {
      id: generateUUID(),
      title: typeof note?.title === 'string' && note.title.trim() ? note.title.trim() : 'Note importée',
      content,
      color: null,
      pinned: Boolean(note?.pinned),
      createdAt: Number(note?.createdAt) || Date.now(),
      updatedAt: Date.now()
    };
  });

  ideasSection.cards.unshift(...importedCards);
  persistMemo();
  save(MIGRATED_KEY, true);
}

function getSectionById(sectionId) {
  return memoData.sections.find((section) => section.id === sectionId) || null;
}

function getCardById(section, cardId) {
  if (!section || !Array.isArray(section.cards)) return null;
  return section.cards.find((card) => card.id === cardId) || null;
}

function sortCards(cards) {
  return [...cards].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
  });
}

function getSearchResults() {
  const query = viewState.search.trim().toLowerCase();
  return memoData.sections.map((section) => ({
    section,
    cards: section.cards.filter((card) => {
      if (!query) return true;
      const haystack = `${card.title || ''} ${card.content || ''}`.toLowerCase();
      return haystack.includes(query);
    })
  }));
}

function render() {
  if (!rootContainer) return;
  if (viewState.screen === 'home') {
    rootContainer.innerHTML = createHomeView({
      sections: memoData.sections,
      query: viewState.search,
      resultsBySection: getSearchResults()
    });
    return;
  }

  const section = getSectionById(viewState.sectionId);
  if (!section) {
    viewState = { screen: 'home', sectionId: null, cardId: null, search: viewState.search, draft: null, isNewCard: false };
    render();
    return;
  }

  if (viewState.screen === 'section') {
    rootContainer.innerHTML = createSectionView(section, sortCards(section.cards), CARD_COLOR_PRESETS);
    return;
  }

  const card = getCardById(section, viewState.cardId);
  if (!card && viewState.screen !== 'edit-card') {
    viewState = { ...viewState, screen: 'section', cardId: null };
    render();
    return;
  }

  if (viewState.screen === 'card') {
    rootContainer.innerHTML = createCardView(section, card, CARD_COLOR_PRESETS);
    return;
  }

  if (viewState.screen === 'edit-card') {
    rootContainer.innerHTML = createCardEditorView(section, viewState.draft, CARD_COLOR_PRESETS, viewState.isNewCard);
  }
}

function createSection() {
  const title = window.prompt('Nom de la section ?');
  if (!title || !title.trim()) return;
  const icon = window.prompt('Icône de la section (emoji)', '📁') || '📁';
  memoData.sections.push({
    id: generateUUID(),
    title: title.trim(),
    icon: icon.trim() || '📁',
    color: null,
    createdAt: Date.now(),
    cards: []
  });
  persistMemo();
  render();
}

function renameSection(sectionId) {
  const section = getSectionById(sectionId);
  if (!section) return;
  const nextTitle = window.prompt('Nouveau nom de section', section.title);
  if (!nextTitle || !nextTitle.trim()) return;
  section.title = nextTitle.trim();
  persistMemo();
  render();
}

function deleteSection(sectionId) {
  const sectionIndex = memoData.sections.findIndex((entry) => entry.id === sectionId);
  if (sectionIndex < 0) return;
  const removedSection = normalizeSection(memoData.sections[sectionIndex]);
  if (!removedSection) return;

  memoData.sections.splice(sectionIndex, 1);
  persistMemo();
  viewState = { screen: 'home', sectionId: null, cardId: null, search: viewState.search, draft: null, isNewCard: false };
  render();

  const undo = window.showUndoToast;
  if (typeof undo === 'function') {
    undo('Section Mémo supprimée', () => {
      const exists = memoData.sections.some((entry) => entry.id === removedSection.id);
      if (exists) return;
      const insertAt = Math.min(Math.max(sectionIndex, 0), memoData.sections.length);
      memoData.sections.splice(insertAt, 0, removedSection);
      persistMemo();
      render();
    });
  }
}

function moveSection(sectionId, direction) {
  const index = memoData.sections.findIndex((section) => section.id === sectionId);
  if (index < 0) return;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= memoData.sections.length) return;
  const [item] = memoData.sections.splice(index, 1);
  memoData.sections.splice(target, 0, item);
  persistMemo();
  render();
}

function startCreateCard(sectionId) {
  viewState = {
    ...viewState,
    screen: 'edit-card',
    sectionId,
    cardId: null,
    isNewCard: true,
    draft: {
      id: generateUUID(),
      title: '',
      content: '',
      color: null,
      pinned: false
    }
  };
  render();
}

function startEditCard(sectionId, cardId) {
  const section = getSectionById(sectionId);
  const card = getCardById(section, cardId);
  if (!card) return;
  viewState = {
    ...viewState,
    screen: 'edit-card',
    sectionId,
    cardId,
    isNewCard: false,
    draft: { ...card }
  };
  render();
}

function saveCard(sectionId) {
  const section = getSectionById(sectionId);
  if (!section || !viewState.draft) return;
  const now = Date.now();
  const payload = {
    ...viewState.draft,
    title: String(viewState.draft.title || '').trim(),
    content: String(viewState.draft.content || '').trim(),
    color: viewState.draft.color || null,
    pinned: Boolean(viewState.draft.pinned)
  };

  if (viewState.isNewCard) {
    section.cards.unshift({
      ...payload,
      createdAt: now,
      updatedAt: now
    });
    viewState.cardId = payload.id;
  } else {
    const card = getCardById(section, payload.id);
    if (!card) return;
    card.title = payload.title;
    card.content = payload.content;
    card.color = payload.color;
    card.pinned = payload.pinned;
    card.updatedAt = now;
  }

  persistMemo();
  viewState = { ...viewState, screen: 'card', isNewCard: false, draft: null };
  render();
}

function deleteCard(sectionId, cardId) {
  const section = getSectionById(sectionId);
  if (!section) return;
  const cardIndex = section.cards.findIndex((entry) => entry.id === cardId);
  if (cardIndex < 0) return;
  const removedCard = normalizeCard(section.cards[cardIndex]);
  if (!removedCard) return;

  section.cards.splice(cardIndex, 1);
  persistMemo();
  viewState = { ...viewState, screen: 'section', cardId: null, draft: null, isNewCard: false };
  render();

  const undo = window.showUndoToast;
  if (typeof undo === 'function') {
    undo('Carte Mémo supprimée', () => {
      const targetSection = getSectionById(sectionId);
      if (!targetSection) return;
      const exists = targetSection.cards.some((entry) => entry.id === removedCard.id);
      if (exists) return;
      const insertAt = Math.min(Math.max(cardIndex, 0), targetSection.cards.length);
      targetSection.cards.splice(insertAt, 0, removedCard);
      persistMemo();
      render();
    });
  }
}

function updateDraft(action, value) {
  if (!viewState.draft) return;
  viewState.draft = { ...viewState.draft, [action]: value };
}

function bindEvents() {
  if (!rootContainer) return;

  onClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const actionEl = target.closest('[data-action]');
    if (!(actionEl instanceof HTMLElement)) return;

    const action = actionEl.dataset.action;
    const sectionId = actionEl.dataset.sectionId || null;
    const cardId = actionEl.dataset.cardId || null;

    if (action === 'create-section') return createSection();
    if (action === 'open-section' && sectionId) {
      viewState = { ...viewState, screen: 'section', sectionId, cardId: null, draft: null, isNewCard: false };
      return render();
    }
    if (action === 'rename-section' && sectionId) return renameSection(sectionId);
    if (action === 'delete-section' && sectionId) return deleteSection(sectionId);
    if (action === 'move-section-up' && sectionId) return moveSection(sectionId, 'up');
    if (action === 'move-section-down' && sectionId) return moveSection(sectionId, 'down');
    if (action === 'back-home') {
      viewState = { ...viewState, screen: 'home', sectionId: null, cardId: null, draft: null, isNewCard: false };
      return render();
    }
    if (action === 'create-card' && sectionId) return startCreateCard(sectionId);
    if (action === 'open-card' && sectionId && cardId) {
      viewState = { ...viewState, screen: 'card', sectionId, cardId, draft: null, isNewCard: false };
      return render();
    }
    if (action === 'back-section' && sectionId) {
      viewState = { ...viewState, screen: 'section', sectionId, cardId: null, draft: null, isNewCard: false };
      return render();
    }
    if (action === 'edit-card' && sectionId && cardId) return startEditCard(sectionId, cardId);
    if (action === 'cancel-edit-card' && sectionId) {
      viewState = { ...viewState, screen: viewState.isNewCard ? 'section' : 'card', sectionId, draft: null, isNewCard: false };
      return render();
    }
    if (action === 'save-card' && sectionId) return saveCard(sectionId);
    if (action === 'delete-card' && sectionId && cardId) return deleteCard(sectionId, cardId);
    if (action === 'set-card-color') {
      updateDraft('color', actionEl.dataset.color || null);
      return render();
    }
  };

  onInput = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;

    if (action === 'search-input' && target instanceof HTMLInputElement) {
      viewState = { ...viewState, search: target.value };
      return render();
    }
    if (action === 'edit-title' && target instanceof HTMLInputElement) {
      updateDraft('title', target.value);
      return;
    }
    if (action === 'edit-content' && target instanceof HTMLTextAreaElement) {
      updateDraft('content', target.value);
      return;
    }
    if (action === 'edit-pinned' && target instanceof HTMLInputElement) {
      updateDraft('pinned', target.checked);
    }
  };

  rootContainer.addEventListener('click', onClick);
  rootContainer.addEventListener('input', onInput);
}

const memoModule = {
  id: 'memo',
  label: 'Mémo',
  icon: '🗒️',

  init(container) {
    rootContainer = container;
    memoData = readMemoData();
    migrateLegacyNotesIfNeeded();
    memoData = readMemoData();
    viewState = { screen: 'home', sectionId: null, cardId: null, search: '', draft: null, isNewCard: false };
    render();
    bindEvents();
  },

  destroy() {
    if (rootContainer && onClick) rootContainer.removeEventListener('click', onClick);
    if (rootContainer && onInput) rootContainer.removeEventListener('input', onInput);
    onClick = null;
    onInput = null;
    memoData = { sections: [] };
    viewState = { screen: 'home', sectionId: null, cardId: null, search: '', draft: null, isNewCard: false };
    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    const data = normalizeMemoData(load(STORAGE_KEY, { sections: [] }));
    const cards = data.sections.flatMap((section) =>
      (Array.isArray(section.cards) ? section.cards : []).map((card) => ({
        ...card,
        sectionTitle: section.title
      }))
    );
    if (!cards.length) {
      return {
        title: 'Mémo',
        content: `
          <p style="color: var(--text-secondary)">
            Aucune note pour l'instant.
          </p>
          <button type="button" class="btn btn-sm" data-dashboard-nav="memo">
            Créer une carte
          </button>
        `
      };
    }

    const latest = [...cards]
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
      .slice(0, 2);

    const content = `
      <p><strong>${cards.length}</strong> carte${cards.length > 1 ? 's' : ''} au total</p>
      <ul class="memo-widget__list">
        ${latest
          .map((card) => `<li><strong>${card.title || 'Sans titre'}</strong><br /><span>${card.sectionTitle}</span></li>`)
          .join('')}
      </ul>
      <button type="button" class="btn btn-secondary" data-dashboard-nav="memo">Ouvrir Mémo</button>
    `;

    return { title: 'Mémo', content };
  }
};

export default memoModule;
