import './style.css';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { save, load, generateUUID } from '../../core/storage.js';
import { createListView, createEditorView, createDashboardPreview, PREDEFINED_TAGS } from './view.js';

const STORAGE_KEY = 'journal:entries';

const TAG_ID_SET = new Set(PREDEFINED_TAGS.map((t) => t.id));

function normalizeTagId(value) {
  if (value == null || value === '') return null;
  const id = String(value);
  return TAG_ID_SET.has(id) ? id : null;
}
const AUTO_SAVE_INTERVAL_MS = 30_000;

const JOURNAL_EDITOR_ACTIVE_CLASS = 'journal-editor-active';

const FRENCH_DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function setJournalEditorLayoutActive(active) {
  if (typeof document === 'undefined' || !document.body) return;
  document.body.classList.toggle(JOURNAL_EDITOR_ACTIVE_CLASS, active);
}

let rootContainer = null;
let entries = [];
let searchQuery = '';
let journalTagFilter = 'all';
let journalDateSort = 'desc';
let activeEntryId = null;
let editor = null;
let autoSaveTimer = null;
let isDirty = false;
function stripHtml(html = '') {
  const temp = document.createElement('div');
  temp.innerHTML = String(html || '');
  return temp.textContent || temp.innerText || '';
}

function countWords(text = '') {
  const words = String(text || '')
    .trim()
    .match(/\S+/g);
  return words ? words.length : 0;
}

function formatDateValue(timestamp) {
  const date = new Date(Number(timestamp) || Date.now());
  return date.toISOString().slice(0, 10);
}

function normalizeEntry(entry) {
  if (!entry || typeof entry.id !== 'string') return null;
  const createdAt = Number(entry.createdAt) || Date.now();
  const updatedAt = Number(entry.updatedAt) || createdAt;
  const content = typeof entry.content === 'string' ? entry.content : '<p></p>';
  const contentText = stripHtml(content);
  const date = typeof entry.date === 'string' && entry.date ? entry.date : formatDateValue(createdAt);
  const dateObject = new Date(date);

  return {
    id: entry.id,
    title: typeof entry.title === 'string' ? entry.title : '',
    content,
    createdAt,
    updatedAt,
    date,
    dayOfWeek:
      typeof entry.dayOfWeek === 'string' && entry.dayOfWeek
        ? entry.dayOfWeek
        : FRENCH_DAY_NAMES[Number.isNaN(dateObject.getDay()) ? new Date(createdAt).getDay() : dateObject.getDay()],
    wordCount: Number(entry.wordCount) || countWords(contentText),
    contentText,
    tagId: normalizeTagId(entry.tagId)
  };
}

function readEntries() {
  const data = load(STORAGE_KEY, []);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeEntry).filter(Boolean);
}

function persistEntries() {
  save(
    STORAGE_KEY,
    entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      date: entry.date,
      dayOfWeek: entry.dayOfWeek,
      wordCount: entry.wordCount,
      tagId: entry.tagId
    }))
  );
}

function getSortedEntries() {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) {
      return journalDateSort === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
    }
    return journalDateSort === 'desc' ? b.updatedAt - a.updatedAt : a.updatedAt - b.updatedAt;
  });
}

function formatDateFr(date) {
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(dt);
}

function getVisibleEntries() {
  const query = searchQuery.trim().toLowerCase();
  let source = getSortedEntries();
  if (journalTagFilter !== 'all') {
    source = source.filter((entry) => entry.tagId === journalTagFilter);
  }
  const list = query
    ? source.filter((entry) => {
        return entry.title.toLowerCase().includes(query) || entry.contentText.toLowerCase().includes(query);
      })
    : source;

  return list.map((entry) => ({
    ...entry,
    formattedDate: formatDateFr(entry.date)
  }));
}

function getActiveEntry() {
  if (!activeEntryId) return null;
  return entries.find((entry) => entry.id === activeEntryId) || null;
}

function createEntry() {
  const now = Date.now();
  const nowDate = new Date(now);
  return {
    id: generateUUID(),
    title: '',
    content: '<p></p>',
    createdAt: now,
    updatedAt: now,
    date: formatDateValue(now),
    dayOfWeek: FRENCH_DAY_NAMES[nowDate.getDay()],
    wordCount: 0,
    contentText: '',
    tagId: null
  };
}

function setSaveState(saved) {
  if (!rootContainer) return;
  const stateNode = rootContainer.querySelector('[data-journal-save-state]');
  if (!stateNode) return;
  stateNode.textContent = saved ? 'Sauvegardé' : 'Non sauvegardé';
  stateNode.classList.toggle('is-saved', saved);
  stateNode.classList.toggle('is-unsaved', !saved);
}

function updateWordCount(wordCount) {
  if (!rootContainer) return;
  const wordsNode = rootContainer.querySelector('[data-journal-word-count]');
  if (wordsNode) wordsNode.textContent = `${wordCount} mots`;
}

function updateToolbarState() {
  if (!rootContainer || !editor) return;
  const buttons = rootContainer.querySelectorAll('[data-journal-command]');
  for (const button of buttons) {
    if (!(button instanceof HTMLButtonElement)) continue;
    const command = button.dataset.journalCommand;
    if (!command) continue;

    let isActive = false;
    if (command === 'bold') isActive = editor.isActive('bold');
    if (command === 'italic') isActive = editor.isActive('italic');
    if (command === 'underline') isActive = editor.isActive('underline');
    if (command === 'strike') isActive = editor.isActive('strike');
    if (command === 'heading1') isActive = editor.isActive('heading', { level: 1 });
    if (command === 'heading2') isActive = editor.isActive('heading', { level: 2 });
    if (command === 'heading3') isActive = editor.isActive('heading', { level: 3 });
    if (command === 'highlight') isActive = editor.isActive('highlight');
    if (command === 'color-purple') isActive = editor.isActive('textStyle', { color: 'var(--accent)' });
    if (command === 'color-red') isActive = editor.isActive('textStyle', { color: 'var(--danger)' });
    if (command === 'color-green') isActive = editor.isActive('textStyle', { color: 'var(--success)' });
    if (command === 'color-orange') isActive = editor.isActive('textStyle', { color: 'var(--warning)' });
    if (command === 'bulletList') isActive = editor.isActive('bulletList');
    if (command === 'orderedList') isActive = editor.isActive('orderedList');
    if (command === 'taskList') isActive = editor.isActive('taskList');
    if (command === 'blockquote') isActive = editor.isActive('blockquote');

    button.classList.toggle('is-active', isActive);
  }
}

function saveActiveEntry() {
  const entry = getActiveEntry();
  if (!entry || !editor) return false;

  const html = editor.getHTML();
  const text = stripHtml(html);
  const now = Date.now();

  entry.content = html;
  entry.contentText = text;
  entry.wordCount = countWords(text);
  entry.updatedAt = now;
  entry.dayOfWeek = FRENCH_DAY_NAMES[new Date(entry.date).getDay()] || entry.dayOfWeek;

  persistEntries();
  isDirty = false;
  setSaveState(true);
  updateWordCount(entry.wordCount);
  return true;
}

function destroyEditor() {
  if (editor) {
    editor.destroy();
    editor = null;
  }
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
    if (!isDirty) return;
    saveActiveEntry();
  }, AUTO_SAVE_INTERVAL_MS);
}

function executeCommand(command) {
  if (!editor) return;
  const chain = editor.chain().focus();

  if (command === 'bold') chain.toggleBold().run();
  if (command === 'italic') chain.toggleItalic().run();
  if (command === 'underline') chain.toggleUnderline().run();
  if (command === 'strike') chain.toggleStrike().run();
  if (command === 'heading1') chain.toggleHeading({ level: 1 }).run();
  if (command === 'heading2') chain.toggleHeading({ level: 2 }).run();
  if (command === 'heading3') chain.toggleHeading({ level: 3 }).run();
  if (command === 'highlight') chain.toggleHighlight({ color: '#fef08a' }).run();
  if (command === 'color-purple') chain.setColor('var(--accent)').run();
  if (command === 'color-red') chain.setColor('var(--danger)').run();
  if (command === 'color-green') chain.setColor('var(--success)').run();
  if (command === 'color-orange') chain.setColor('var(--warning)').run();
  if (command === 'color-reset') chain.unsetColor().run();
  if (command === 'bulletList') chain.toggleBulletList().run();
  if (command === 'orderedList') chain.toggleOrderedList().run();
  if (command === 'taskList') chain.toggleTaskList().run();
  if (command === 'blockquote') chain.toggleBlockquote().run();
  if (command === 'horizontalRule') chain.setHorizontalRule().run();

  updateToolbarState();
}

function mountEditor() {
  const entry = getActiveEntry();
  if (!rootContainer || !entry) return;

  const mountNode = rootContainer.querySelector('[data-journal-editor]');
  if (!(mountNode instanceof HTMLElement)) return;

  destroyEditor();
  editor = new Editor({
    element: mountNode,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: { class: 'journal-task-item' }
      })
    ],
    content: entry.content || '<p></p>',
    onUpdate: ({ editor: nextEditor }) => {
      const html = nextEditor.getHTML();
      const text = stripHtml(html);
      const words = countWords(text);
      const current = getActiveEntry();
      if (current) {
        current.content = html;
        current.contentText = text;
        current.wordCount = words;
      }
      isDirty = true;
      setSaveState(false);
      updateWordCount(words);
      updateToolbarState();
    },
    onSelectionUpdate: () => {
      updateToolbarState();
    }
  });

  updateToolbarState();
  startAutosave();
}

function renderList() {
  setJournalEditorLayoutActive(false);
  if (!rootContainer) return;
  destroyEditor();
  stopAutosave();
  rootContainer.innerHTML = createListView(
    getVisibleEntries(),
    searchQuery,
    journalTagFilter,
    journalDateSort,
    entries.length
  );
}

function renderEditor() {
  if (!rootContainer) return;
  const entry = getActiveEntry();
  if (!entry) {
    activeEntryId = null;
    renderList();
    return;
  }
  rootContainer.innerHTML = createEditorView(entry, !isDirty);
  mountEditor();
  setJournalEditorLayoutActive(true);
  const editorContent = rootContainer.querySelector('.journal__editor-content');
  if (editorContent) editorContent.scrollTop = 0;
}

function openEntry(entryId) {
  const exists = entries.some((entry) => entry.id === entryId);
  if (!exists) return;
  activeEntryId = entryId;
  isDirty = false;
  renderEditor();
}

function openNewEntry() {
  const entry = createEntry();
  entries.unshift(entry);
  persistEntries();
  activeEntryId = entry.id;
  isDirty = false;
  renderEditor();
}

function deleteActiveEntry() {
  const entry = getActiveEntry();
  if (!entry) return;
  const entryIndex = entries.findIndex((item) => item.id === entry.id);
  if (entryIndex < 0) return;
  const removedEntry = normalizeEntry(entry);
  if (!removedEntry) return;

  entries.splice(entryIndex, 1);
  persistEntries();
  activeEntryId = null;
  isDirty = false;
  renderList();

  const undo = window.showUndoToast;
  if (typeof undo === 'function') {
    undo('Entrée Journal supprimée', () => {
      const exists = entries.some((item) => item.id === removedEntry.id);
      if (exists) return;
      const insertAt = Math.min(Math.max(entryIndex, 0), entries.length);
      entries.splice(insertAt, 0, removedEntry);
      persistEntries();
      activeEntryId = removedEntry.id;
      isDirty = false;
      renderEditor();
    });
  }
}

function handleEntryClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const openButton = target.closest('[data-journal-open]');
  if (openButton instanceof HTMLButtonElement) {
    const entryId = openButton.dataset.journalOpen;
    if (entryId) openEntry(entryId);
    return;
  }

  const newButton = target.closest('[data-journal-new]');
  if (newButton instanceof HTMLButtonElement) {
    openNewEntry();
  }
}

function handleEditorActions(event) {
  if (event.type === 'click') {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const backButton = target.closest('[data-journal-back]');
    if (backButton instanceof HTMLButtonElement) {
      if (isDirty) saveActiveEntry();
      activeEntryId = null;
      isDirty = false;
      renderList();
      return;
    }

    const deleteButton = target.closest('[data-journal-delete]');
    if (deleteButton instanceof HTMLButtonElement) {
      deleteActiveEntry();
    }
    return;
  }

  if (event.type === 'input') {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches('[data-journal-title]')) return;

    const active = getActiveEntry();
    if (!active) return;
    active.title = target.value;
    active.updatedAt = Date.now();
    isDirty = true;
    setSaveState(false);
    return;
  }

  if (event.type === 'change') {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (!target.matches('[data-journal-tag]')) return;

    const active = getActiveEntry();
    if (!active) return;
    active.tagId = normalizeTagId(target.value);
    active.updatedAt = Date.now();
    isDirty = true;
    setSaveState(false);
    persistEntries();
  }
}

function handleToolbarCommands(event) {
  if (event.type !== 'click') return;
  const target = event.target;
  if (!(target instanceof Element)) return;

  const commandButton = target.closest('[data-journal-command]');
  if (commandButton instanceof HTMLButtonElement) {
    const command = commandButton.dataset.journalCommand;
    if (command) executeCommand(command);
  }
}

function handleEntryFilters(event) {
  if (event.type === 'click') {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const tagFilterBtn = target.closest('[data-journal-tag-filter]');
    if (tagFilterBtn instanceof HTMLButtonElement) {
      const mode = tagFilterBtn.dataset.journalTagFilter;
      if (mode === 'all') journalTagFilter = 'all';
      else if (mode === 'tag') {
        const tid = tagFilterBtn.dataset.journalFilterTag;
        journalTagFilter = tid && TAG_ID_SET.has(tid) ? tid : 'all';
      }
      renderList();
    }
    return;
  }

  if (event.type === 'input') {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches('[data-journal-search]')) return;

    const nextQuery = target.value;
    const caretStart = target.selectionStart;
    const caretEnd = target.selectionEnd;
    searchQuery = nextQuery;
    renderList();
    const searchInput = rootContainer?.querySelector('[data-journal-search]');
    if (searchInput instanceof HTMLInputElement) {
      searchInput.focus();
      const safeStart = Number.isInteger(caretStart) ? caretStart : nextQuery.length;
      const safeEnd = Number.isInteger(caretEnd) ? caretEnd : safeStart;
      searchInput.setSelectionRange(safeStart, safeEnd);
    }
    return;
  }

  if (event.type === 'change') {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (!target.matches('[data-journal-sort]')) return;

    journalDateSort = target.value === 'asc' ? 'asc' : 'desc';
    renderList();
  }
}

function bindEvents() {
  if (!rootContainer) return;

  rootContainer.addEventListener('click', handleEntryClick);
  rootContainer.addEventListener('click', handleEditorActions);
  rootContainer.addEventListener('click', handleToolbarCommands);
  rootContainer.addEventListener('click', handleEntryFilters);
  rootContainer.addEventListener('input', handleEditorActions);
  rootContainer.addEventListener('input', handleEntryFilters);
  rootContainer.addEventListener('change', handleEditorActions);
  rootContainer.addEventListener('change', handleEntryFilters);
}

const journalModule = {
  id: 'journal',
  label: 'Journal',
  icon: '📔',

  init(container) {
    rootContainer = container;
    entries = readEntries();
    searchQuery = '';
    journalTagFilter = 'all';
    journalDateSort = 'desc';
    activeEntryId = null;
    isDirty = false;
    renderList();
    bindEvents();
  },

  destroy() {
    if (isDirty) saveActiveEntry();
    stopAutosave();
    destroyEditor();
    setJournalEditorLayoutActive(false);

    if (rootContainer) {
      rootContainer.removeEventListener('click', handleEntryClick);
      rootContainer.removeEventListener('click', handleEditorActions);
      rootContainer.removeEventListener('click', handleToolbarCommands);
      rootContainer.removeEventListener('click', handleEntryFilters);
      rootContainer.removeEventListener('input', handleEditorActions);
      rootContainer.removeEventListener('input', handleEntryFilters);
      rootContainer.removeEventListener('change', handleEditorActions);
      rootContainer.removeEventListener('change', handleEntryFilters);
    }
    entries = [];
    searchQuery = '';
    journalTagFilter = 'all';
    journalDateSort = 'desc';
    activeEntryId = null;
    isDirty = false;

    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    const latest = readEntries()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((entry) => ({ ...entry, formattedDate: formatDateFr(entry.date) }))[0];

    return {
      title: 'Journal',
      content: createDashboardPreview(latest || null)
    };
  }
};

export default journalModule;
