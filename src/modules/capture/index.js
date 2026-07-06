import './style.css';
import { save, load, generateUUID } from '../../core/storage.js';
import {
  createCaptureView,
  createCaptureListBlock,
  createCaptureFilterBar,
  createCaptureTagTrigger,
  createCaptureTagPopoverItems,
  CAPTURE_TAG_POPOVER_ID,
  PREDEFINED_TAGS
} from './view.js';

const STORAGE_KEY = 'capture:items';
const MAX_VISIBLE_CAPTURES = 5;
const POPOVER_MARGIN = 8;
const POPOVER_MAX_WIDTH = 280;

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
let formTagId = null;
let useNativePopover = false;
let fallbackTagMenuOpen = false;
let tagPopoverEl = null;
let onFormSubmit = null;
let onCaptureRootClick = null;
let onInputInput = null;
let onKeyDown = null;
let onPointerDown = null;
let onTagPopoverToggle = null;
let onTagPopoverKeyDown = null;
let onPopoverReposition = null;

/** Export test : la persistance ne tronque plus la liste. */
export function getCapturesToPersist(items) {
  return items;
}

function supportsNativePopover() {
  return typeof HTMLElement.prototype.showPopover === 'function';
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  save(STORAGE_KEY, getCapturesToPersist(captures));
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
  return {
    visible,
    remaining,
    expanded: listExpanded,
    filteredTotal: filtered.length,
    maxVisible: MAX_VISIBLE_CAPTURES
  };
}

function getFormElements() {
  if (!rootContainer) {
    return { form: null, input: null, submit: null, counter: null, ack: null, capCard: null, capLayer: null, surface: null };
  }
  return {
    form: rootContainer.querySelector('[data-capture-form]'),
    input: rootContainer.querySelector('[data-capture-input]'),
    submit: rootContainer.querySelector('[data-capture-submit]'),
    counter: rootContainer.querySelector('[data-capture-counter]'),
    ack: rootContainer.querySelector('[data-capture-ack]'),
    capCard: rootContainer.querySelector('[data-cap-card]'),
    capLayer: rootContainer.querySelector('[data-cap-layer]'),
    surface: rootContainer.querySelector('[data-cap-surface]')
  };
}

function getTagToggleButton() {
  return rootContainer?.querySelector('[data-capture-tag-toggle]') ?? null;
}

function getTagPopoverElement() {
  return tagPopoverEl ?? document.getElementById(CAPTURE_TAG_POPOVER_ID) ?? null;
}

function isTagPopoverOpen() {
  const popover = getTagPopoverElement();
  if (!popover) return false;
  if (useNativePopover) return popover.matches(':popover-open');
  return fallbackTagMenuOpen;
}

function getInputAriaLabel() {
  return editingCaptureId ? LABEL_EDIT_CAPTURE : LABEL_NEW_CAPTURE;
}

function resetEditingState() {
  editingCaptureId = null;
  const { input, submit } = getFormElements();
  if (input) input.setAttribute('aria-label', LABEL_NEW_CAPTURE);
  if (submit) submit.textContent = BTN_CAPTURE;
}

function syncTagToggleExpanded(isOpen) {
  const toggle = getTagToggleButton();
  if (toggle) toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function positionTagPopover() {
  const toggle = getTagToggleButton();
  const menu = getTagPopoverElement();
  if (!(toggle instanceof HTMLElement) || !(menu instanceof HTMLElement)) return;

  const rect = toggle.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxWidth = Math.min(POPOVER_MAX_WIDTH, vw - POPOVER_MARGIN * 2);
  menu.style.width = `${maxWidth}px`;

  const menuWidth = menu.offsetWidth;
  let left = rect.left;
  if (left + menuWidth > vw - POPOVER_MARGIN) left = vw - POPOVER_MARGIN - menuWidth;
  if (left < POPOVER_MARGIN) left = POPOVER_MARGIN;

  const menuHeight = menu.offsetHeight;
  const below = rect.bottom + 6;
  const above = rect.top - 6 - menuHeight;
  let top;
  if (below + menuHeight <= vh - POPOVER_MARGIN) {
    top = below;
  } else if (above >= POPOVER_MARGIN) {
    top = above;
  } else {
    top = Math.max(POPOVER_MARGIN, vh - POPOVER_MARGIN - menuHeight);
  }

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function clearTagPopoverPosition() {
  const menu = getTagPopoverElement();
  if (!(menu instanceof HTMLElement)) return;
  menu.style.top = '';
  menu.style.left = '';
  menu.style.width = '';
}

function startPopoverTracking() {
  if (onPopoverReposition) return;
  onPopoverReposition = () => {
    if (isTagPopoverOpen()) requestAnimationFrame(positionTagPopover);
  };
  window.addEventListener('resize', onPopoverReposition);
  window.addEventListener('scroll', onPopoverReposition, true);
}

function stopPopoverTracking() {
  if (!onPopoverReposition) return;
  window.removeEventListener('resize', onPopoverReposition);
  window.removeEventListener('scroll', onPopoverReposition, true);
  onPopoverReposition = null;
}

function openTagPopover() {
  const popover = getTagPopoverElement();
  if (!(popover instanceof HTMLElement)) return;

  if (useNativePopover) {
    if (!popover.matches(':popover-open')) popover.showPopover();
    startPopoverTracking();
    requestAnimationFrame(positionTagPopover);
    return;
  }

  if (!fallbackTagMenuOpen) {
    fallbackTagMenuOpen = true;
    syncTagToggleExpanded(true);
    popover.classList.add('is-open');
    startPopoverTracking();
    requestAnimationFrame(positionTagPopover);
  }
}

function closeTagPopover({ restoreFocus = true } = {}) {
  const popover = getTagPopoverElement();
  const toggle = getTagToggleButton();

  stopPopoverTracking();

  if (useNativePopover) {
    if (popover instanceof HTMLElement && popover.matches(':popover-open')) {
      popover.hidePopover();
    }
    clearTagPopoverPosition();
    return;
  }

  if (!fallbackTagMenuOpen) return;
  fallbackTagMenuOpen = false;
  if (popover instanceof HTMLElement) {
    popover.classList.remove('is-open');
    clearTagPopoverPosition();
  }
  syncTagToggleExpanded(false);
  if (restoreFocus && toggle instanceof HTMLElement) toggle.focus();
}

function refreshCaptureTagPicker() {
  if (!rootContainer) return;

  const wrap = rootContainer.querySelector('[data-capture-tag-wrap]');
  if (wrap) wrap.outerHTML = createCaptureTagTrigger(formTagId || '', useNativePopover);

  const popover = getTagPopoverElement();
  if (popover) popover.innerHTML = createCaptureTagPopoverItems(formTagId || '');

  syncTagToggleExpanded(isTagPopoverOpen());
}

function refreshCaptureList() {
  if (!rootContainer) return;
  const filtersNode = rootContainer.querySelector('[data-capture-filters]');
  const listContainer = rootContainer.querySelector('[data-capture-list]');
  if (!listContainer) return;

  const { visible, remaining, expanded, filteredTotal, maxVisible } = getListDisplayState();
  if (filtersNode) filtersNode.innerHTML = createCaptureFilterBar(listFilter, captures);
  listContainer.innerHTML = createCaptureListBlock(visible, {
    noCapturesInStorage: captures.length === 0,
    remaining,
    expanded,
    filteredTotal,
    maxVisible
  });
}

function updateCharCounter() {
  const { input, counter } = getFormElements();
  if (!(input instanceof HTMLTextAreaElement) || !(counter instanceof HTMLElement)) return;
  const length = input.value.length;
  if (length >= 200) {
    counter.textContent = `${length} caractères`;
    counter.classList.add('is-visible');
  } else {
    counter.textContent = '';
    counter.classList.remove('is-visible');
  }
}

function playDropAck() {
  const { ack } = getFormElements();
  if (!(ack instanceof HTMLElement)) return;
  ack.classList.remove('is-playing');
  void ack.offsetWidth;
  ack.classList.add('is-playing');
}

function playDropAnimation() {
  playDropAck();

  if (prefersReducedMotion()) return;

  const { input, capCard, capLayer, surface } = getFormElements();
  if (!(input instanceof HTMLTextAreaElement) || !(capCard instanceof HTMLElement) || !(capLayer instanceof HTMLElement)) {
    return;
  }

  const cardRect = capCard.getBoundingClientRect();
  const inputRect = input.getBoundingClientRect();
  const startY = inputRect.bottom - cardRect.top;
  const fall = cardRect.height - startY - 14;

  const drop = document.createElement('span');
  drop.className = 'cap__drop';
  drop.style.top = `${startY}px`;
  drop.style.setProperty('--fall', `${fall}px`);
  capLayer.appendChild(drop);

  drop.addEventListener(
    'animationend',
    () => {
      drop.remove();
      for (const cls of ['cap__impact', 'cap__impact cap__impact--2']) {
        const ring = document.createElement('span');
        ring.className = cls;
        capLayer.appendChild(ring);
        ring.addEventListener('animationend', () => ring.remove(), { once: true });
      }
      if (surface instanceof HTMLElement) {
        surface.classList.remove('is-bob');
        void surface.offsetWidth;
        surface.classList.add('is-bob');
      }
    },
    { once: true }
  );
}

function createCapture(text, tagId) {
  return {
    id: generateUUID(),
    text: text.trim(),
    createdAt: Date.now(),
    tagId: normalizeTagId(tagId)
  };
}

function focusTagMenuItem(offset) {
  const popover = getTagPopoverElement();
  if (!(popover instanceof HTMLElement)) return;
  const items = [...popover.querySelectorAll('[data-capture-tag-pick]')];
  if (!items.length) return;

  const active = document.activeElement;
  const currentIndex = items.findIndex((item) => item === active);
  const nextIndex = currentIndex < 0
    ? (offset > 0 ? 0 : items.length - 1)
    : (currentIndex + offset + items.length) % items.length;

  const next = items[nextIndex];
  if (next instanceof HTMLElement) next.focus();
}

function setupTagPopover() {
  tagPopoverEl = rootContainer?.querySelector(`#${CAPTURE_TAG_POPOVER_ID}`) ?? null;
  if (!(tagPopoverEl instanceof HTMLElement)) return;

  if (!useNativePopover) {
    tagPopoverEl.removeAttribute('popover');
    tagPopoverEl.classList.add('tagpick__popover--fallback');
    if (tagPopoverEl.parentElement !== document.body) {
      document.body.appendChild(tagPopoverEl);
    }
  }

  onTagPopoverToggle = (event) => {
    const isOpen = event.newState === 'open';
    syncTagToggleExpanded(isOpen);
    if (!isOpen) {
      stopPopoverTracking();
      clearTagPopoverPosition();
      const toggle = getTagToggleButton();
      if (toggle instanceof HTMLElement) toggle.focus();
      return;
    }
    startPopoverTracking();
    requestAnimationFrame(positionTagPopover);
  };

  onTagPopoverKeyDown = (event) => {
    if (!(event.target instanceof Element) || !event.target.closest(`#${CAPTURE_TAG_POPOVER_ID}`)) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeTagPopover();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusTagMenuItem(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusTagMenuItem(-1);
    }
  };

  if (useNativePopover) {
    tagPopoverEl.addEventListener('toggle', onTagPopoverToggle);
  }

  document.addEventListener('keydown', onTagPopoverKeyDown);
}

function teardownTagPopover() {
  stopPopoverTracking();

  if (tagPopoverEl instanceof HTMLElement && onTagPopoverToggle) {
    tagPopoverEl.removeEventListener('toggle', onTagPopoverToggle);
  }
  if (onTagPopoverKeyDown) {
    document.removeEventListener('keydown', onTagPopoverKeyDown);
  }

  if (!useNativePopover && tagPopoverEl instanceof HTMLElement && tagPopoverEl.parentElement === document.body) {
    tagPopoverEl.remove();
  }

  tagPopoverEl = null;
  onTagPopoverToggle = null;
  onTagPopoverKeyDown = null;
  fallbackTagMenuOpen = false;
}

function finalizeDelete(captureId, captureIndex, removedCapture, form) {
  if (captureId === editingCaptureId) {
    resetEditingState();
    form.reset();
    formTagId = null;
    closeTagPopover({ restoreFocus: false });
    refreshCaptureTagPicker();
    updateCharCounter();
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

function deleteCapture(captureId, form) {
  const captureIndex = captures.findIndex((capture) => capture.id === captureId);
  if (captureIndex < 0) return;
  const removedCapture = normalizeCapture(captures[captureIndex]);
  if (!removedCapture) return;

  const itemEl = rootContainer?.querySelector(`[data-capture-item="${captureId}"]`);
  if (itemEl instanceof HTMLElement && !prefersReducedMotion()) {
    itemEl.classList.add('capture__item--leaving');
    itemEl.addEventListener(
      'animationend',
      () => finalizeDelete(captureId, captureIndex, removedCapture, form),
      { once: true }
    );
    return;
  }

  finalizeDelete(captureId, captureIndex, removedCapture, form);
}

function bindEvents() {
  if (!rootContainer) return;

  const { form, input } = getFormElements();
  if (!form || !input) return;

  onFormSubmit = (event) => {
    event.preventDefault();
    const value = input.value.trim();

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
        formTagId = null;
        closeTagPopover({ restoreFocus: false });
        refreshCaptureTagPicker();
        updateCharCounter();
        return;
      }
      captures[index] = { ...captures[index], text: value, tagId: formTagId };
      persistCaptures();
      refreshCaptureList();
      form.reset();
      formTagId = null;
      closeTagPopover({ restoreFocus: false });
      refreshCaptureTagPicker();
      resetEditingState();
      updateCharCounter();
      input.focus();
      return;
    }

    captures.unshift(createCapture(value, formTagId));
    persistCaptures();
    form.reset();
    formTagId = null;
    closeTagPopover({ restoreFocus: false });
    refreshCaptureTagPicker();
    updateCharCounter();
    playDropAnimation();
    setTimeout(() => refreshCaptureList(), 480);
    input.focus();
  };

  onInputInput = () => updateCharCounter();

  onKeyDown = (event) => {
    if (!(event.target instanceof HTMLTextAreaElement) || !event.target.matches('[data-capture-input]')) {
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      form.requestSubmit();
    }
  };

  onCaptureRootClick = (event) => {
    const target = event.target;
    const origin = target instanceof Element ? target : target.parentElement;
    if (!origin) return;

    const tagToggle = origin.closest('[data-capture-tag-toggle]');
    if (tagToggle instanceof HTMLButtonElement && !useNativePopover) {
      event.preventDefault();
      if (isTagPopoverOpen()) closeTagPopover();
      else openTagPopover();
      return;
    }

    const tagPick = origin.closest('[data-capture-tag-pick]');
    if (tagPick instanceof HTMLButtonElement) {
      const raw = tagPick.dataset.tagId ?? '';
      formTagId = normalizeTagId(raw || null);
      closeTagPopover({ restoreFocus: false });
      refreshCaptureTagPicker();
      getTagToggleButton()?.focus();
      return;
    }

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
      formTagId = item.tagId;
      closeTagPopover({ restoreFocus: false });
      input.value = item.text;
      input.setAttribute('aria-label', LABEL_EDIT_CAPTURE);
      const { submit } = getFormElements();
      if (submit) submit.textContent = BTN_SAVE_EDIT;
      refreshCaptureTagPicker();
      updateCharCounter();
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

  onPointerDown = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (!isTagPopoverOpen()) return;

    const insideTagUi =
      target.closest('[data-capture-tag-wrap]') ||
      target.closest('[data-capture-tag-toggle]') ||
      target.closest(`#${CAPTURE_TAG_POPOVER_ID}`) ||
      target.closest('[data-capture-tag-pick]');
    if (!insideTagUi) closeTagPopover();
  };

  form.addEventListener('submit', onFormSubmit);
  input.addEventListener('input', onInputInput);
  rootContainer.addEventListener('click', onCaptureRootClick);
  rootContainer.addEventListener('keydown', onKeyDown);
  rootContainer.addEventListener('pointerdown', onPointerDown);
}

const capture = {
  id: 'capture',
  label: 'Capture Rapide',
  icon: '⚡',

  init(container) {
    rootContainer = container;
    useNativePopover = supportsNativePopover();
    captures = readCaptures();
    listFilter = 'all';
    listExpanded = false;
    editingCaptureId = null;
    formTagId = null;
    fallbackTagMenuOpen = false;
    const { visible, remaining, expanded, filteredTotal, maxVisible } = getListDisplayState();
    rootContainer.innerHTML = createCaptureView(
      visible,
      listFilter,
      formTagId || '',
      captures,
      { remaining, expanded, filteredTotal, maxVisible },
      getInputAriaLabel(),
      useNativePopover
    );
    setupTagPopover();
    bindEvents();
  },

  destroy() {
    closeTagPopover({ restoreFocus: false });
    teardownTagPopover();

    if (rootContainer && onCaptureRootClick) {
      rootContainer.removeEventListener('click', onCaptureRootClick);
    }
    if (rootContainer && onKeyDown) {
      rootContainer.removeEventListener('keydown', onKeyDown);
    }
    if (rootContainer && onPointerDown) {
      rootContainer.removeEventListener('pointerdown', onPointerDown);
    }

    const { form, input } = getFormElements();
    if (form && onFormSubmit) form.removeEventListener('submit', onFormSubmit);
    if (input && onInputInput) input.removeEventListener('input', onInputInput);

    onFormSubmit = null;
    onCaptureRootClick = null;
    onInputInput = null;
    onKeyDown = null;
    onPointerDown = null;
    editingCaptureId = null;
    formTagId = null;
    fallbackTagMenuOpen = false;
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
