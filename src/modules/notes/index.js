import './style.css';
import { save, load, generateUUID } from '../../core/storage.js';
import { createNotesView, createArchivesView, createNotesGrid } from './view.js';

const STORAGE_KEY = 'notes:items';
const STORAGE_SETTINGS_KEY = 'notes:settings';
const NOTE_COLORS = ['#fef3c7', '#fce7f3', '#dbeafe', '#d1fae5', '#ede9fe', '#ffedd5'];
const NOTE_SIZE = 200;
const NOTE_MIN_SIZE = 140;
const NOTE_MAX_SIZE = 420;
const DESK_PADDING = 24;
const NOTE_GAP = 16;
const SNAP_STEP = 24;

let rootContainer = null;
let notes = [];
let onClick = null;
let onInput = null;
let onChange = null;
let onKeyDown = null;
let onPointerDown = null;
let onPointerMove = null;
let onPointerUp = null;
let isArchiveView = false;
let dragState = null;
let snapToGrid = false;
let activeColorFilter = '';
let searchQuery = '';
let justCreatedNoteId = null;
let openColorMenuNoteId = null;

function normalizeNote(note) {
  if (!note || typeof note.id !== 'string') return null;
  const color = NOTE_COLORS.includes(note.color) ? note.color : NOTE_COLORS[0];

  return {
    id: note.id,
    color,
    title: typeof note.title === 'string' ? note.title : '',
    content: typeof note.content === 'string' ? note.content : '',
    mode: note.mode === 'list' ? 'list' : 'text',
    listItems: Array.isArray(note.listItems)
      ? note.listItems
          .filter((item) => item && typeof item.id === 'string')
          .map((item) => ({ id: item.id, text: typeof item.text === 'string' ? item.text : '', done: Boolean(item.done) }))
      : [],
    pinned: Boolean(note.pinned),
    tilt: Number.isFinite(note.tilt) ? Number(note.tilt) : 0,
    createdAt: Number(note.createdAt) || Date.now(),
    archived: Boolean(note.archived),
    x: Number.isFinite(note.x) ? Number(note.x) : null,
    y: Number.isFinite(note.y) ? Number(note.y) : null,
    width: Number.isFinite(note.width) ? Number(note.width) : NOTE_SIZE,
    height: Number.isFinite(note.height) ? Number(note.height) : NOTE_SIZE
  };
}

function readNotes() {
  const data = load(STORAGE_KEY, []);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeNote).filter(Boolean);
}

function readSettings() {
  const data = load(STORAGE_SETTINGS_KEY, {});
  return {
    snapToGrid: Boolean(data?.snapToGrid),
    activeColorFilter: NOTE_COLORS.includes(data?.activeColorFilter) ? data.activeColorFilter : '',
    searchQuery: typeof data?.searchQuery === 'string' ? data.searchQuery : ''
  };
}

function persistNotes() {
  save(STORAGE_KEY, notes);
}

function persistSettings() {
  save(STORAGE_SETTINGS_KEY, { snapToGrid, activeColorFilter, searchQuery });
}

function getRandomColor() {
  return NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
}

function createListItem(text = '') {
  return { id: generateUUID(), text, done: false };
}

function createNote() {
  const activeCount = getActiveNotes().length;
  const x = DESK_PADDING + (activeCount % 3) * (NOTE_SIZE + NOTE_GAP);
  const y = DESK_PADDING + Math.floor(activeCount / 3) * (NOTE_SIZE + NOTE_GAP);
  return {
    id: generateUUID(),
    color: getRandomColor(),
    title: '',
    content: '',
    mode: 'text',
    listItems: [],
    pinned: false,
    tilt: Number((Math.random() * 4 - 2).toFixed(2)),
    createdAt: Date.now(),
    archived: false,
    x,
    y,
    width: NOTE_SIZE,
    height: NOTE_SIZE
  };
}

function snapValue(value, start = 0) {
  return Math.round((value - start) / SNAP_STEP) * SNAP_STEP + start;
}

function getActiveNotes() {
  return notes.filter((note) => !note.archived);
}

function getArchivedNotes() {
  return notes.filter((note) => note.archived);
}

function buildSearchText(note) {
  const listText = Array.isArray(note.listItems) ? note.listItems.map((item) => item.text || '').join(' ') : '';
  return `${note.title || ''} ${note.content || ''} ${listText}`.toLowerCase();
}

function getDimmedNoteIds() {
  if (!activeColorFilter && !searchQuery.trim()) return new Set();
  const query = searchQuery.trim().toLowerCase();
  const dimmed = new Set();
  for (const note of getActiveNotes()) {
    const colorMatch = !activeColorFilter || note.color === activeColorFilter;
    const queryMatch = !query || buildSearchText(note).includes(query);
    if (!(colorMatch && queryMatch)) dimmed.add(note.id);
  }
  return dimmed;
}

function applyDimmedState() {
  if (!rootContainer || isArchiveView) return;
  const dimmedIds = getDimmedNoteIds();
  const noteElements = rootContainer.querySelectorAll('[data-note-id]');
  for (const element of noteElements) {
    if (!(element instanceof HTMLElement)) continue;
    const noteId = element.dataset.noteId;
    if (!noteId) continue;
    element.classList.toggle('is-dimmed', dimmedIds.has(noteId));
  }
}

function ensureActiveNotePositions() {
  let changed = false;
  getActiveNotes().forEach((note, index) => {
    if (Number.isFinite(note.x) && Number.isFinite(note.y)) return;
    note.x = DESK_PADDING + (index % 3) * (NOTE_SIZE + NOTE_GAP);
    note.y = DESK_PADDING + Math.floor(index / 3) * (NOTE_SIZE + NOTE_GAP);
    changed = true;
  });
  if (changed) persistNotes();
}

function updateDeskHeight() {
  if (!rootContainer || isArchiveView) return;
  const desk = rootContainer.querySelector('[data-notes-desk]');
  if (!(desk instanceof HTMLElement)) return;
  const activeNotes = getActiveNotes();
  if (!activeNotes.length) {
    desk.style.minHeight = '360px';
    return;
  }
  const maxBottom = activeNotes.reduce((acc, note) => Math.max(acc, (Number(note.y) || 0) + (Number(note.height) || NOTE_SIZE)), 0);
  desk.style.minHeight = `${Math.max(360, maxBottom + DESK_PADDING)}px`;
}

function renderNotesGrid() {
  if (!rootContainer) return;
  const desk = rootContainer.querySelector('[data-notes-desk]');
  if (!(desk instanceof HTMLElement)) return;
  if (!isArchiveView) ensureActiveNotePositions();

  desk.innerHTML = createNotesGrid(isArchiveView ? getArchivedNotes() : getActiveNotes(), {
    isArchiveView,
    dimmedNoteIds: isArchiveView ? new Set() : getDimmedNoteIds(),
    justCreatedId: justCreatedNoteId,
    openColorMenuNoteId
  });
  justCreatedNoteId = null;
  updateDeskHeight();
}

function renderView() {
  if (!rootContainer) return;
  ensureActiveNotePositions();
  const archivedNotes = getArchivedNotes();
  if (isArchiveView) {
    rootContainer.innerHTML = createArchivesView(archivedNotes, archivedNotes.length);
  } else {
    rootContainer.innerHTML = createNotesView(
      getActiveNotes(),
      archivedNotes.length,
      snapToGrid,
      activeColorFilter,
      searchQuery,
      getDimmedNoteIds(),
      justCreatedNoteId,
      openColorMenuNoteId
    );
  }
  justCreatedNoteId = null;
  updateDeskHeight();
}

function addNote() {
  notes.unshift(createNote());
  justCreatedNoteId = notes[0].id;
  openColorMenuNoteId = null;
  persistNotes();
  isArchiveView = false;
  renderView();
  const titleInput = rootContainer?.querySelector('[data-note-title]');
  if (titleInput instanceof HTMLInputElement) titleInput.focus();
}

function deleteNote(noteId) {
  const before = notes.length;
  notes = notes.filter((note) => note.id !== noteId);
  if (notes.length === before) return;
  persistNotes();
  renderNotesGrid();
}

function archiveNote(noteId) {
  const note = notes.find((item) => item.id === noteId);
  if (!note || note.archived) return;
  note.archived = true;
  note.pinned = false;
  note.x = null;
  note.y = null;
  persistNotes();
  renderView();
}

function restoreNote(noteId) {
  const note = notes.find((item) => item.id === noteId);
  if (!note || !note.archived) return;
  note.archived = false;
  note.x = null;
  note.y = null;
  note.width = NOTE_SIZE;
  note.height = NOTE_SIZE;
  persistNotes();
  renderView();
}

function updateNoteContent(noteId, content) {
  const note = notes.find((item) => item.id === noteId);
  if (!note) return;
  note.content = content;
  persistNotes();
}

function updateNoteTitle(noteId, title) {
  const note = notes.find((item) => item.id === noteId);
  if (!note) return;
  note.title = title;
  persistNotes();
}

function setNoteMode(noteId, mode) {
  const note = notes.find((item) => item.id === noteId && !item.archived);
  if (!note) return;
  note.mode = mode === 'list' ? 'list' : 'text';
  if (note.mode === 'list' && !note.listItems.length) note.listItems = [createListItem('')];
  persistNotes();
  renderNotesGrid();
}

function toggleNotePin(noteId) {
  const note = notes.find((item) => item.id === noteId && !item.archived);
  if (!note) return;
  note.pinned = !note.pinned;
  persistNotes();
  renderNotesGrid();
}

function settleNoteRotation(noteId) {
  const note = notes.find((item) => item.id === noteId && !item.archived);
  if (!note || note.tilt === 0) return;
  note.tilt = 0;
  persistNotes();
  const noteElement = rootContainer?.querySelector(`[data-note-id="${noteId}"]`);
  if (noteElement instanceof HTMLElement) noteElement.style.setProperty('--note-tilt', '0deg');
}

function updateNoteColor(noteId, color) {
  if (!NOTE_COLORS.includes(color)) return;
  const note = notes.find((item) => item.id === noteId);
  if (!note) return;
  note.color = color;
  openColorMenuNoteId = null;
  persistNotes();
  renderNotesGrid();
  const noteElement = rootContainer?.querySelector(`[data-note-id="${noteId}"]`);
  if (noteElement instanceof HTMLElement) noteElement.classList.add('notes__item--color-flash');
}

function updateListItemText(noteId, itemId, text) {
  const note = notes.find((item) => item.id === noteId && !item.archived);
  if (!note) return;
  const item = note.listItems.find((entry) => entry.id === itemId);
  if (!item) return;
  item.text = text;
  persistNotes();
}

function toggleListItem(noteId, itemId) {
  const note = notes.find((item) => item.id === noteId && !item.archived);
  if (!note) return;
  const item = note.listItems.find((entry) => entry.id === itemId);
  if (!item) return;
  item.done = !item.done;
  persistNotes();
  renderNotesGrid();
}

function insertListItemAfter(noteId, itemId) {
  const note = notes.find((item) => item.id === noteId && !item.archived);
  if (!note) return;
  const index = note.listItems.findIndex((entry) => entry.id === itemId);
  if (index === -1) return;
  const nextItem = createListItem('');
  note.listItems.splice(index + 1, 0, nextItem);
  persistNotes();
  renderNotesGrid();
  const input = rootContainer?.querySelector(`[data-note-list-input="${noteId}"][data-list-item-id="${nextItem.id}"]`);
  if (input instanceof HTMLInputElement) input.focus();
}

function removeListItem(noteId, itemId) {
  const note = notes.find((item) => item.id === noteId && !item.archived);
  if (!note) return;
  const index = note.listItems.findIndex((entry) => entry.id === itemId);
  if (index === -1) return;
  if (note.listItems.length === 1) {
    note.listItems[0].text = '';
    note.listItems[0].done = false;
  } else {
    note.listItems.splice(index, 1);
  }
  persistNotes();
  renderNotesGrid();
}

function bindEvents() {
  if (!rootContainer) return;

  onClick = (event) => {
    const eventTarget = event.target;
    const target =
      eventTarget instanceof Element
        ? eventTarget
        : eventTarget instanceof Node
          ? eventTarget.parentElement
          : null;
    if (!(target instanceof Element)) return;

    if (openColorMenuNoteId) {
      const clickedInMenu = target.closest('.notes__palette');
      const clickedToggle = target.closest('[data-note-color-toggle]');
      const clickedColor = target.closest('[data-note-color]');
      if (!clickedInMenu && !clickedToggle && !clickedColor) {
        openColorMenuNoteId = null;
        renderNotesGrid();
        return;
      }
    }

    const createButton = target.closest('[data-note-create]');
    if (createButton instanceof HTMLButtonElement) return addNote();

    const openArchivesButton = target.closest('[data-notes-open-archives]');
    if (openArchivesButton instanceof HTMLButtonElement) {
      isArchiveView = true;
      return renderView();
    }

    const closeArchivesButton = target.closest('[data-notes-close-archives]');
    if (closeArchivesButton instanceof HTMLButtonElement) {
      isArchiveView = false;
      return renderView();
    }

    const snapButton = target.closest('[data-notes-toggle-snap]');
    if (snapButton instanceof HTMLButtonElement) {
      snapToGrid = !snapToGrid;
      if (snapToGrid) {
        for (const note of getActiveNotes()) {
          note.x = Math.max(0, snapValue(Number(note.x) || 0));
          note.y = Math.max(0, snapValue(Number(note.y) || 0));
          note.width = Math.min(NOTE_MAX_SIZE, Math.max(NOTE_MIN_SIZE, snapValue(Number(note.width) || NOTE_SIZE)));
          note.height = Math.min(NOTE_MAX_SIZE, Math.max(NOTE_MIN_SIZE, snapValue(Number(note.height) || NOTE_SIZE)));
        }
        persistNotes();
      }
      persistSettings();
      return renderView();
    }

    const filterButton = target.closest('[data-filter-color]');
    if (filterButton instanceof HTMLButtonElement) {
      const color = filterButton.dataset.filterColor || '';
      activeColorFilter = activeColorFilter === color ? '' : color;
      persistSettings();
      return renderView();
    }

    const archiveButton = target.closest('[data-note-archive]');
    if (archiveButton instanceof HTMLButtonElement) return archiveNote(archiveButton.dataset.noteArchive || '');

    const restoreButton = target.closest('[data-note-restore]');
    if (restoreButton instanceof HTMLButtonElement) return restoreNote(restoreButton.dataset.noteRestore || '');

    const deleteButton = target.closest('[data-note-delete]');
    if (deleteButton instanceof HTMLButtonElement) return deleteNote(deleteButton.dataset.noteDelete || '');

    const pinButton = target.closest('[data-note-pin]');
    if (pinButton instanceof HTMLButtonElement) return toggleNotePin(pinButton.dataset.notePin || '');

    const modeButton = target.closest('[data-note-mode]');
    if (modeButton instanceof HTMLButtonElement) {
      const noteId = modeButton.dataset.noteMode || '';
      const note = notes.find((item) => item.id === noteId);
      if (note) setNoteMode(noteId, note.mode === 'list' ? 'text' : 'list');
      return;
    }

    const colorToggleButton = target.closest('[data-note-color-toggle]');
    if (colorToggleButton instanceof HTMLButtonElement) {
      const noteId = colorToggleButton.dataset.noteColorToggle || '';
      openColorMenuNoteId = openColorMenuNoteId === noteId ? null : noteId;
      renderNotesGrid();
      return;
    }

    const colorButton = target.closest('[data-note-color]');
    if (colorButton instanceof HTMLButtonElement) {
      const noteId = colorButton.dataset.noteColor;
      const color = colorButton.dataset.colorValue;
      if (noteId && color) updateNoteColor(noteId, color);
      return;
    }

    const removeListItemButton = target.closest('[data-note-list-remove]');
    if (removeListItemButton instanceof HTMLButtonElement) {
      const noteId = removeListItemButton.dataset.noteListRemove || '';
      const itemId = removeListItemButton.dataset.listItemId || '';
      removeListItem(noteId, itemId);
      return;
    }
  };

  onInput = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement)) return;

    if (target.matches('[data-notes-search]')) {
      searchQuery = target.value;
      persistSettings();
      applyDimmedState();
      return;
    }

    if (target.matches('[data-note-title]')) return updateNoteTitle(target.dataset.noteTitle || '', target.value);
    if (target.matches('[data-note-content]')) return updateNoteContent(target.dataset.noteContent || '', target.value);
    if (target.matches('[data-note-list-input]')) {
      return updateListItemText(target.dataset.noteListInput || '', target.dataset.listItemId || '', target.value);
    }
  };

  onChange = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches('[data-note-list-toggle]')) return;
    toggleListItem(target.dataset.noteListToggle || '', target.dataset.listItemId || '');
  };

  onKeyDown = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches('[data-note-list-input]')) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      insertListItemAfter(target.dataset.noteListInput || '', target.dataset.listItemId || '');
      return;
    }
    if (event.key === 'Backspace' && !target.value.trim()) {
      event.preventDefault();
      removeListItem(target.dataset.noteListInput || '', target.dataset.listItemId || '');
    }
  };

  onPointerDown = (event) => {
    if (isArchiveView || !(event.target instanceof HTMLElement) || event.button !== 0) return;
    const resizeHandle = event.target.closest('[data-note-resize]');
    const blockedTarget = event.target.closest('textarea, input, .notes__palette, .notes__actions');
    if (blockedTarget) return;
    if (event.target.closest('button') && !resizeHandle) return;

    const noteElement = event.target.closest('[data-note-id]');
    if (!(noteElement instanceof HTMLElement)) return;
    const noteId = noteElement.dataset.noteId;
    if (!noteId) return;

    const desk = rootContainer?.querySelector('[data-notes-desk]');
    if (!(desk instanceof HTMLElement)) return;
    const note = notes.find((item) => item.id === noteId && !item.archived);
    if (!note) return;

    settleNoteRotation(noteId);
    const deskRect = desk.getBoundingClientRect();
    const noteRect = noteElement.getBoundingClientRect();
    dragState = {
      mode: resizeHandle ? 'resize' : 'move',
      noteId,
      deskRect,
      offsetX: event.clientX - noteRect.left,
      offsetY: event.clientY - noteRect.top,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: note.width || NOTE_SIZE,
      startHeight: note.height || NOTE_SIZE
    };
    noteElement.classList.add('notes__item--dragging');
  };

  onPointerMove = (event) => {
    if (!dragState || isArchiveView) return;
    const note = notes.find((item) => item.id === dragState.noteId && !item.archived);
    if (!note) return;
    const desk = rootContainer?.querySelector('[data-notes-desk]');
    const noteElement = rootContainer?.querySelector(`[data-note-id="${dragState.noteId}"]`);
    if (!(desk instanceof HTMLElement) || !(noteElement instanceof HTMLElement)) return;

    if (dragState.mode === 'resize') {
      const deltaX = event.clientX - dragState.startClientX;
      const deltaY = event.clientY - dragState.startClientY;
      const maxWidth = Math.max(NOTE_MIN_SIZE, desk.clientWidth - (Number(note.x) || 0));
      const maxHeight = Math.max(NOTE_MIN_SIZE, desk.clientHeight - (Number(note.y) || 0));
      let nextWidth = Math.min(Math.max(NOTE_MIN_SIZE, dragState.startWidth + deltaX), Math.min(NOTE_MAX_SIZE, maxWidth));
      let nextHeight = Math.min(Math.max(NOTE_MIN_SIZE, dragState.startHeight + deltaY), Math.min(NOTE_MAX_SIZE, maxHeight));
      if (snapToGrid) {
        nextWidth = snapValue(nextWidth);
        nextHeight = snapValue(nextHeight);
      }
      note.width = Math.round(nextWidth);
      note.height = Math.round(nextHeight);
      noteElement.style.setProperty('--note-width', `${note.width}px`);
      noteElement.style.setProperty('--note-height', `${note.height}px`);
    } else {
      const width = Number(note.width) || NOTE_SIZE;
      const height = Number(note.height) || NOTE_SIZE;
      const maxX = Math.max(0, desk.clientWidth - width);
      const maxY = Math.max(0, desk.clientHeight - height);
      let nextX = Math.min(Math.max(0, event.clientX - dragState.deskRect.left - dragState.offsetX), maxX);
      let nextY = Math.min(Math.max(0, event.clientY - dragState.deskRect.top - dragState.offsetY), maxY);
      if (snapToGrid) {
        nextX = snapValue(nextX);
        nextY = snapValue(nextY);
      }
      note.x = Math.round(nextX);
      note.y = Math.round(nextY);
      noteElement.style.setProperty('--note-x', `${note.x}px`);
      noteElement.style.setProperty('--note-y', `${note.y}px`);
    }
    updateDeskHeight();
  };

  onPointerUp = () => {
    if (!dragState) return;
    const noteElement = rootContainer?.querySelector(`[data-note-id="${dragState.noteId}"]`);
    if (noteElement instanceof HTMLElement) noteElement.classList.remove('notes__item--dragging');
    if (dragState.mode === 'resize') {
      noteElement?.classList.add('notes__item--resizing');
      requestAnimationFrame(() => noteElement?.classList.remove('notes__item--resizing'));
    }
    persistNotes();
    dragState = null;
  };

  rootContainer.addEventListener('click', onClick);
  rootContainer.addEventListener('input', onInput);
  rootContainer.addEventListener('change', onChange);
  rootContainer.addEventListener('keydown', onKeyDown);
  rootContainer.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

const notesModule = {
  id: 'notes',
  label: 'Bloc-notes',
  icon: '🗒️',

  init(container) {
    rootContainer = container;
    notes = readNotes();
    const settings = readSettings();
    snapToGrid = settings.snapToGrid;
    activeColorFilter = settings.activeColorFilter;
    searchQuery = settings.searchQuery;
    isArchiveView = false;
    openColorMenuNoteId = null;
    renderView();
    bindEvents();
  },

  destroy() {
    if (rootContainer && onClick) rootContainer.removeEventListener('click', onClick);
    if (rootContainer && onInput) rootContainer.removeEventListener('input', onInput);
    if (rootContainer && onChange) rootContainer.removeEventListener('change', onChange);
    if (rootContainer && onKeyDown) rootContainer.removeEventListener('keydown', onKeyDown);
    if (rootContainer && onPointerDown) rootContainer.removeEventListener('pointerdown', onPointerDown);
    if (onPointerMove) window.removeEventListener('pointermove', onPointerMove);
    if (onPointerUp) window.removeEventListener('pointerup', onPointerUp);

    onClick = null;
    onInput = null;
    onChange = null;
    onKeyDown = null;
    onPointerDown = null;
    onPointerMove = null;
    onPointerUp = null;
    notes = [];
    snapToGrid = false;
    activeColorFilter = '';
    searchQuery = '';
    isArchiveView = false;
    dragState = null;
    justCreatedNoteId = null;
    openColorMenuNoteId = null;

    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    const pinnedNotes = readNotes().filter((note) => note.pinned && !note.archived).slice(0, 4);
    if (!pinnedNotes.length) return null;

    const content = `
      <ul class="notes-widget__list">
        ${pinnedNotes
          .map((note) => {
            const title = (note.title || 'Sans titre').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
            const bodySource =
              note.mode === 'list'
                ? (note.listItems || []).map((item) => (item.done ? `✓ ${item.text}` : item.text)).join(' • ')
                : note.content || '';
            const body = bodySource.replaceAll('<', '&lt;').replaceAll('>', '&gt;').slice(0, 120);
            return `<li class="notes-widget__item"><strong>${title}</strong><br /><span>${body || 'Post-it vide'}</span></li>`;
          })
          .join('')}
      </ul>
    `;

    return { title: 'Post-its épinglés', content };
  }
};

export default notesModule;
