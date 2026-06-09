import './style.css';
import { save, load, generateUUID } from '../../core/storage.js';
import { createCaptureView, createCaptureListBlock, createCaptureFilterBar, PREDEFINED_TAGS } from './view.js';

const STORAGE_KEY = 'capture:items';
const MAX_STORED_CAPTURES = 100;
const MAX_VISIBLE_CAPTURES = 5;

const TAG_ID_SET = new Set(PREDEFINED_TAGS.map((t) => t.id));

const LABEL_NEW_CAPTURE = 'Nouvelle capture';
const LABEL_EDIT_CAPTURE = 'Modifier la capture';
const BTN_CAPTURE = 'Capturer';
const BTN_SAVE_EDIT = 'Enregistrer';

let rootContainer = null;
let captures = [];
let listFilter = 'all';
let listExpanded = false;
let editingCaptureId = null;
let onFormSubmit = null;
let onCaptureRootClick = null;
let captureToastTimer = null;
let captureToastHost = null;

function ensureCaptureToastHost() {
  if (captureToastHost instanceof HTMLElement && captureToastHost.isConnected) {
    return captureToastHost;
  }

  captureToastHost = document.createElement('div');
  captureToastHost.className = 'app-capture-toast-host';
  captureToastHost.setAttribute('aria-live', 'polite');
  captureToastHost.setAttribute('aria-atomic', 'true');
  Object.assign(captureToastHost.style, {
    position: 'fixed',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(calc(100vw - 32px), 560px)',
    zIndex: '60',
    pointerEvents: 'none',
    top: 'calc(env(safe-area-inset-top, 0px) + 60px)',
    bottom: 'auto'
  });
  document.body.appendChild(captureToastHost);
  return captureToastHost;
}

function positionCaptureToastHost() {
  if (!(captureToastHost instanceof HTMLElement)) return;

  const vv = window.visualViewport;
  if (vv) {
    const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
    if (keyboardHeight > 80) {
      captureToastHost.style.top = 'auto';
      captureToastHost.style.bottom = `${keyboardHeight + 16}px`;
      return;
    }
  }

  captureToastHost.style.bottom = 'auto';
  captureToastHost.style.top = 'calc(env(safe-area-inset-top, 0px) + 60px)';
}

function showCaptureToast(message) {
  if (typeof message !== 'string' || !message.trim()) return;

  const host = ensureCaptureToastHost();
  positionCaptureToastHost();

  if (captureToastTimer) {
    clearTimeout(captureToastTimer);
    captureToastTimer = null;
  }

  const existing = host.querySelector('[data-capture-toast]');
  if (existing instanceof HTMLElement) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'app-undo-toast';
  toast.setAttribute('role', 'status');
  toast.dataset.captureToast = 'true';
  toast.innerHTML = `
    <div class="app-undo-toast__row">
      <span class="app-undo-toast__text"></span>
    </div>
  `;

  const textNode = toast.querySelector('.app-undo-toast__text');
  if (textNode instanceof HTMLElement) textNode.textContent = message.trim();

  host.appendChild(toast);

  captureToastTimer = window.setTimeout(() => {
    captureToastTimer = null;
    toast.classList.add('is-leaving');
    window.setTimeout(() => {
      if (toast.isConnected) toast.remove();
    }, 220);
  }, 1500);
}

function normalizeTagId(value) {
  if (value == null || value === '') return null;
  const id = String(value);
  return TAG_ID_SET.has(id) ? id : null;
}

function normalizeCapture(item) {
  if (!item || typeof item.id !== 'string' || typeof item.text !== 'string') return null;
  return {
    ...item,
    tagId: normalizeTagId(item.tagId)
  };
}

function readCaptures() {
  const data = load(STORAGE_KEY, []);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeCapture).filter(Boolean);
}

function persistCaptures() {
  save(STORAGE_KEY, captures.slice(0, MAX_STORED_CAPTURES));
}

function filterCapturesForList(items) {
  if (listFilter === 'all') return items;
  return items.filter((c) => c.tagId === listFilter);
}

function getFilteredCaptures() {
  return filterCapturesForList(captures);
}

function getListDisplayState() {
  const filtered = getFilteredCaptures();
  const visible = listExpanded ? filtered : filtered.slice(0, MAX_VISIBLE_CAPTURES);
  const remaining = listExpanded ? 0 : Math.max(0, filtered.length - MAX_VISIBLE_CAPTURES);
  return { visible, remaining, expanded: listExpanded };
}

function getFormElements() {
  if (!rootContainer) return { form: null, input: null, label: null, submit: null, tagSelect: null };
  return {
    form: rootContainer.querySelector('[data-capture-form]'),
    input: rootContainer.querySelector('[data-capture-input]'),
    label: rootContainer.querySelector('[data-capture-label]'),
    submit: rootContainer.querySelector('[data-capture-submit]'),
    tagSelect: rootContainer.querySelector('[data-capture-tag]')
  };
}

function resetEditingState() {
  editingCaptureId = null;
  const { label, submit } = getFormElements();
  if (label) label.textContent = LABEL_NEW_CAPTURE;
  if (submit) submit.textContent = BTN_CAPTURE;
}

function refreshCaptureList() {
  if (!rootContainer) return;
  const filtersNode = rootContainer.querySelector('[data-capture-filters]');
  const listContainer = rootContainer.querySelector('[data-capture-list]');
  if (!listContainer) return;

  const { visible, remaining, expanded } = getListDisplayState();
  if (filtersNode) filtersNode.innerHTML = createCaptureFilterBar(listFilter);
  listContainer.innerHTML = createCaptureListBlock(visible, {
    noCapturesInStorage: captures.length === 0,
    remaining,
    expanded
  });
}

function createCapture(text, tagId) {
  return {
    id: generateUUID(),
    text: text.trim(),
    createdAt: Date.now(),
    tagId: normalizeTagId(tagId)
  };
}

function deleteCapture(captureId, form) {
  const captureIndex = captures.findIndex((capture) => capture.id === captureId);
  if (captureIndex < 0) return;
  const removedCapture = normalizeCapture(captures[captureIndex]);
  if (!removedCapture) return;

  if (captureId === editingCaptureId) {
    resetEditingState();
    form.reset();
    const { tagSelect } = getFormElements();
    if (tagSelect instanceof HTMLSelectElement) tagSelect.value = '';
  }

  captures.splice(captureIndex, 1);
  persistCaptures();
  refreshCaptureList();

  const undo = window.showUndoToast;
  if (typeof undo === 'function') {
    undo('Capture supprimée', () => {
      const exists = captures.some((capture) => capture.id === removedCapture.id);
      if (exists) return;
      const insertAt = Math.min(Math.max(captureIndex, 0), captures.length);
      captures.splice(insertAt, 0, removedCapture);
      persistCaptures();
      refreshCaptureList();
    });
  }
}

function bindEvents() {
  if (!rootContainer) return;

  const { form, input } = getFormElements();
  if (!form || !input) return;

  onFormSubmit = (event) => {
    event.preventDefault();
    const value = input.value.trim();
    const { tagSelect } = getFormElements();
    const rawTag = tagSelect instanceof HTMLSelectElement ? tagSelect.value : '';
    const tagId = normalizeTagId(rawTag);

    if (!value) {
      input.classList.remove('animate-shake');
      requestAnimationFrame(() => input.classList.add('animate-shake'));
      return;
    }

    if (editingCaptureId) {
      const index = captures.findIndex((item) => item.id === editingCaptureId);
      if (index === -1) {
        resetEditingState();
        form.reset();
        return;
      }
      captures[index] = { ...captures[index], text: value, tagId };
      persistCaptures();
      refreshCaptureList();
      form.reset();
      if (tagSelect instanceof HTMLSelectElement) tagSelect.value = '';
      resetEditingState();
      input.focus();
      return;
    }

    captures.unshift(createCapture(value, tagId));
    persistCaptures();
    refreshCaptureList();
    form.reset();
    if (tagSelect instanceof HTMLSelectElement) tagSelect.value = '';
    input.focus();
    showCaptureToast('✅ Capturé !');
  };

  onCaptureRootClick = (event) => {
    const target = event.target;
    const origin = target instanceof Element ? target : target.parentElement;
    if (!origin) return;

    const filterBtn = origin.closest('[data-capture-filter]');
    if (filterBtn instanceof HTMLButtonElement) {
      const mode = filterBtn.dataset.captureFilter;
      if (mode === 'all') listFilter = 'all';
      else if (mode === 'tag') {
        const tid = filterBtn.dataset.captureFilterTag;
        listFilter = tid && TAG_ID_SET.has(tid) ? tid : 'all';
      }
      listExpanded = false;
      refreshCaptureList();
      return;
    }

    if (origin.closest('[data-capture-list-expand]')) {
      listExpanded = true;
      refreshCaptureList();
      return;
    }

    if (origin.closest('[data-capture-list-collapse]')) {
      listExpanded = false;
      refreshCaptureList();
      return;
    }

    const editBtn = origin.closest('[data-capture-edit]');
    if (editBtn instanceof HTMLButtonElement) {
      const captureId = editBtn.dataset.captureEdit;
      if (!captureId) return;
      const item = captures.find((c) => c.id === captureId);
      if (!item) return;

      editingCaptureId = captureId;
      input.value = item.text;
      const { label, submit, tagSelect } = getFormElements();
      if (label) label.textContent = LABEL_EDIT_CAPTURE;
      if (submit) submit.textContent = BTN_SAVE_EDIT;
      if (tagSelect instanceof HTMLSelectElement) {
        tagSelect.value = item.tagId || '';
      }
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    const deleteBtn = origin.closest('[data-capture-delete]');
    if (!(deleteBtn instanceof HTMLButtonElement)) return;

    const captureId = deleteBtn.dataset.captureDelete;
    if (!captureId) return;
    deleteCapture(captureId, form);
  };

  form.addEventListener('submit', onFormSubmit);
  rootContainer.addEventListener('click', onCaptureRootClick);
}

const capture = {
  id: 'capture',
  label: 'Capture Rapide',
  icon: '⚡',

  init(container) {
    rootContainer = container;
    captures = readCaptures();
    listFilter = 'all';
    listExpanded = false;
    editingCaptureId = null;
    const { visible, remaining, expanded } = getListDisplayState();
    rootContainer.innerHTML = createCaptureView(visible, listFilter, '', captures.length, {
      remaining,
      expanded
    });
    bindEvents();
  },

  destroy() {
    if (rootContainer && onCaptureRootClick) {
      rootContainer.removeEventListener('click', onCaptureRootClick);
    }

    const form = rootContainer?.querySelector('[data-capture-form]');
    if (form && onFormSubmit) {
      form.removeEventListener('submit', onFormSubmit);
    }

    onFormSubmit = null;
    onCaptureRootClick = null;
    if (captureToastTimer) {
      clearTimeout(captureToastTimer);
      captureToastTimer = null;
    }
    if (captureToastHost?.isConnected) {
      captureToastHost.remove();
    }
    captureToastHost = null;
    editingCaptureId = null;
    listFilter = 'all';
    listExpanded = false;
    captures = [];

    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    return null;
  }
};

export default capture;
