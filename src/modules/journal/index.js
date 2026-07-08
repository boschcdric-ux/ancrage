import './style.css';
import {
  createListView,
  createEditorView,
  createDashboardPreview,
  entryHasDeletableContent
} from './view.js';
import {
  normalizeTagId,
  formatDateFullFr,
  normalizeEntry,
  readEntries,
  persistEntries,
  getVisibleEntries,
  createEntry
} from './store.js';
import { createEventHandlers, bindJournalEvents, unbindJournalEvents } from './events.js';
import { state, getActiveEntry, resetSessionState } from './state.js';
import {
  editorCtrl,
  setSaveState,
  updateDeleteButtonVisibility,
  removeUnsavedDraftIfEmpty,
  saveActiveEntry,
  stopAutosave,
  mountEditor
} from './session.js';

const JOURNAL_EDITOR_ACTIVE_CLASS = 'journal-editor-active';

function setJournalEditorLayoutActive(active) {
  if (typeof document === 'undefined' || !document.body) return;
  document.body.classList.toggle(JOURNAL_EDITOR_ACTIVE_CLASS, active);
}

function renderList() {
  setJournalEditorLayoutActive(false);
  if (!state.rootContainer) return;
  editorCtrl.destroy();
  stopAutosave();
  state.rootContainer.innerHTML = createListView(
    getVisibleEntries(state.entries, {
      searchQuery: state.searchQuery,
      tagFilter: state.tagFilter,
      dateSort: state.dateSort
    }),
    state.searchQuery,
    state.tagFilter,
    state.dateSort,
    state.entries.length
  );
}

function renderEditor() {
  if (!state.rootContainer) return;
  const entry = getActiveEntry();
  if (!entry) {
    state.activeEntryId = null;
    renderList();
    return;
  }
  state.rootContainer.innerHTML = createEditorView(entry, !state.isDirty, { isDraft: state.isDraft });
  mountEditor();
  updateDeleteButtonVisibility();
  setJournalEditorLayoutActive(true);
  const editorContent = state.rootContainer.querySelector('.journal__editor-content');
  if (editorContent) editorContent.scrollTop = 0;
}

function openEntry(entryId) {
  if (!state.entries.some((entry) => entry.id === entryId)) return;
  state.activeEntryId = entryId;
  state.isDirty = false;
  state.isDraft = false;
  renderEditor();
}

function openNewEntry() {
  const entry = createEntry();
  state.entries.unshift(entry);
  state.activeEntryId = entry.id;
  state.isDirty = false;
  state.isDraft = true;
  renderEditor();
}

function leaveEditor() {
  if (state.isDirty) saveActiveEntry();
  removeUnsavedDraftIfEmpty();
  state.activeEntryId = null;
  state.isDirty = false;
  state.isDraft = false;
  renderList();
}

function deleteActiveEntry() {
  const entry = getActiveEntry();
  if (!entry) return;
  const entryIndex = state.entries.findIndex((item) => item.id === entry.id);
  if (entryIndex < 0) return;
  const removedEntry = normalizeEntry(entry);
  if (!removedEntry) return;

  state.entries.splice(entryIndex, 1);
  persistEntries(state.entries);
  state.activeEntryId = null;
  state.isDirty = false;
  state.isDraft = false;
  renderList();

  const undo = window.showUndoToast;
  if (typeof undo === 'function') {
    undo('Entrée Journal supprimée', () => {
      if (state.entries.some((item) => item.id === removedEntry.id)) return;
      const insertAt = Math.min(Math.max(entryIndex, 0), state.entries.length);
      state.entries.splice(insertAt, 0, removedEntry);
      persistEntries(state.entries);
      state.activeEntryId = removedEntry.id;
      state.isDirty = false;
      state.isDraft = false;
      renderEditor();
    });
  }
}

function setActiveTitle(value) {
  const active = getActiveEntry();
  if (!active) return;
  active.title = value;
  active.updatedAt = Date.now();
  state.isDirty = true;
  setSaveState(false);
  updateDeleteButtonVisibility();
}

function setActiveTag(value) {
  const active = getActiveEntry();
  if (!active) return;
  active.tagId = normalizeTagId(value);
  active.updatedAt = Date.now();
  state.isDirty = true;
  setSaveState(false);
  if (!state.isDraft || entryHasDeletableContent(active)) {
    persistEntries(state.entries);
    if (entryHasDeletableContent(active)) state.isDraft = false;
  }
  updateDeleteButtonVisibility();
}

function setSearch(value, caretStart, caretEnd) {
  state.searchQuery = value;
  renderList();
  const searchInput = state.rootContainer?.querySelector('[data-journal-search]');
  if (searchInput instanceof HTMLInputElement) {
    searchInput.focus();
    const safeStart = Number.isInteger(caretStart) ? caretStart : value.length;
    const safeEnd = Number.isInteger(caretEnd) ? caretEnd : safeStart;
    searchInput.setSelectionRange(safeStart, safeEnd);
  }
}

const controller = {
  openEntry,
  openNewEntry,
  leaveEditor,
  deleteActiveEntry,
  setActiveTitle,
  setActiveTag,
  runCommand(command) {
    editorCtrl.exec(command);
    editorCtrl.refreshToolbar(state.rootContainer);
  },
  setTagFilter(value) {
    state.tagFilter = value;
    renderList();
  },
  setSearch,
  setDateSort(sort) {
    state.dateSort = sort;
    renderList();
  }
};

const journalModule = {
  id: 'journal',
  label: 'Journal',
  icon: '📔',

  init(container) {
    state.rootContainer = container;
    state.entries = readEntries();
    resetSessionState();
    renderList();
    state.eventHandlers = createEventHandlers(controller);
    bindJournalEvents(state.rootContainer, state.eventHandlers);
  },

  destroy() {
    if (state.isDirty) saveActiveEntry();
    removeUnsavedDraftIfEmpty();
    stopAutosave();
    editorCtrl.destroy();
    setJournalEditorLayoutActive(false);

    if (state.rootContainer && state.eventHandlers) {
      unbindJournalEvents(state.rootContainer, state.eventHandlers);
    }
    state.eventHandlers = null;
    state.entries = [];
    resetSessionState();

    if (state.rootContainer) {
      state.rootContainer.innerHTML = '';
      state.rootContainer = null;
    }
  },

  getDashboardWidget() {
    const latest = readEntries()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((entry) => ({ ...entry, formattedDate: formatDateFullFr(entry.date) }))[0];

    return {
      title: 'Journal',
      content: createDashboardPreview(latest || null)
    };
  }
};

export default journalModule;
