import { state, getActiveEntry } from './state.js';
import { createJournalEditor } from './editor.js';
import { stripHtml, countWords, FRENCH_DAY_NAMES, persistEntries } from './store.js';
import { entryHasDeletableContent, shouldShowDeleteButton } from './view.js';

const AUTO_SAVE_INTERVAL_MS = 30_000;

const editorCtrl = createJournalEditor();
let autoSaveTimer = null;

function setSaveState(saved) {
  if (!state.rootContainer) return;
  const stateNode = state.rootContainer.querySelector('[data-journal-save-state]');
  if (!stateNode) return;
  stateNode.textContent = saved ? 'Sauvegardé' : 'Non sauvegardé';
  stateNode.classList.toggle('is-saved', saved);
  stateNode.classList.toggle('is-unsaved', !saved);
}

function updateWordCount(wordCount) {
  if (!state.rootContainer) return;
  const wordsNode = state.rootContainer.querySelector('[data-journal-word-count]');
  if (wordsNode) wordsNode.textContent = `${wordCount} mots`;
}

function updateDeleteButtonVisibility() {
  if (!state.rootContainer) return;
  const deleteButton = state.rootContainer.querySelector('[data-journal-delete]');
  if (!(deleteButton instanceof HTMLButtonElement)) return;
  deleteButton.hidden = !shouldShowDeleteButton(getActiveEntry(), { isDraft: state.isDraft });
}

function removeUnsavedDraftIfEmpty() {
  if (!state.isDraft) return;
  const entry = getActiveEntry();
  if (!entry || entryHasDeletableContent(entry)) return;
  const entryIndex = state.entries.findIndex((item) => item.id === entry.id);
  if (entryIndex >= 0) state.entries.splice(entryIndex, 1);
}

function saveActiveEntry() {
  const entry = getActiveEntry();
  if (!entry || !editorCtrl.isMounted()) return false;

  const html = editorCtrl.getHTML();
  const text = stripHtml(html);
  const now = Date.now();

  entry.content = html;
  entry.contentText = text;
  entry.wordCount = countWords(text);
  entry.updatedAt = now;
  entry.dayOfWeek = FRENCH_DAY_NAMES[new Date(entry.date).getDay()] || entry.dayOfWeek;

  if (!entryHasDeletableContent(entry) && state.isDraft) {
    state.isDirty = false;
    setSaveState(false);
    updateDeleteButtonVisibility();
    return false;
  }

  persistEntries(state.entries);
  if (entryHasDeletableContent(entry)) state.isDraft = false;
  state.isDirty = false;
  setSaveState(true);
  updateWordCount(entry.wordCount);
  updateDeleteButtonVisibility();
  return true;
}

function stopAutosave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

function startAutosave() {
  stopAutosave();
  autoSaveTimer = setInterval(() => {
    if (state.isDirty) saveActiveEntry();
  }, AUTO_SAVE_INTERVAL_MS);
}

function mountEditor() {
  const entry = getActiveEntry();
  if (!state.rootContainer || !entry) return;
  const mountNode = state.rootContainer.querySelector('[data-journal-editor]');
  if (!(mountNode instanceof HTMLElement)) return;

  editorCtrl.mount(mountNode, entry.content, {
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = stripHtml(html);
      const words = countWords(text);
      const current = getActiveEntry();
      if (current) {
        current.content = html;
        current.contentText = text;
        current.wordCount = words;
      }
      state.isDirty = true;
      setSaveState(false);
      updateWordCount(words);
      updateDeleteButtonVisibility();
      editorCtrl.refreshToolbar(state.rootContainer);
    },
    onSelectionUpdate: () => editorCtrl.refreshToolbar(state.rootContainer)
  });

  editorCtrl.refreshToolbar(state.rootContainer);
  startAutosave();
}

export {
  editorCtrl,
  setSaveState,
  updateDeleteButtonVisibility,
  removeUnsavedDraftIfEmpty,
  saveActiveEntry,
  stopAutosave,
  mountEditor
};
