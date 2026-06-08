import './style.css';
import { save, load, generateUUID } from '../../core/storage.js';
import {
  createShoppingOnboardingShell,
  createShoppingShell,
  createCategorySelect,
  renderShoppingTabs,
  renderShoppingBudget,
  renderShoppingList,
  renderQuickChips,
  formatMoneyEUR,
  normalizeCategoryId,
  PRESET_NAME_SET,
  QUICK_PRESETS
} from './view.js';

const STORES_KEY = 'shopping:stores';
const HISTORY_KEY = 'shopping:history';
const BUDGET_CONFIG_KEY = 'budget:config';
const ONBOARDED_KEY = 'shopping:onboarded';

const DEFAULT_NEW_STORE_BUDGET = 100;

let rootContainer = null;
let stores = [];
let activeStoreId = null;
let addCategory = 'autre';
/** @type {Set<string>} */
let bounceIds = new Set();
let editingItemId = null;
let onRootClick = null;
let onRootChange = null;
let onRootInput = null;
let onRootFocusOut = null;
let onRootPointerDown = null;
let onFormSubmit = null;
let onAnimEnd = null;
let onKeyDown = null;
let onboardingMounted = false;
let onOnboardingClick = null;

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

/** Même ancrage que le budget (Nouveau mois) : réinitialise le cumul courses si la période change. */
function getBudgetPeriodAnchor() {
  const cfg = load(BUDGET_CONFIG_KEY, null);
  if (cfg && typeof cfg === 'object') {
    const s = typeof cfg.currentPeriodStartDate === 'string' ? cfg.currentPeriodStartDate.slice(0, 10) : '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function alignStoreToBudgetPeriod(store) {
  const anchor = getBudgetPeriodAnchor();
  if (store.budgetPeriodAnchor !== anchor) {
    store.budgetCycleSpent = 0;
    store.budgetPeriodAnchor = anchor;
    return true;
  }
  return false;
}

function alignAllStoresBudgetPeriod() {
  let dirty = false;
  for (const s of stores) {
    if (alignStoreToBudgetPeriod(s)) dirty = true;
  }
  if (dirty) persistStores();
}

function normalizeItem(raw) {
  if (!raw || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  const priceRaw = raw.price;
  let price = null;
  if (priceRaw != null && priceRaw !== '') {
    const n = Number(priceRaw);
    if (Number.isFinite(n) && n >= 0) price = Math.round(n * 100) / 100;
  }
  return {
    id: raw.id,
    name: raw.name.trim() || 'Sans nom',
    category: normalizeCategoryId(raw.category),
    price,
    checked: !!raw.checked,
    isFavorite: !!raw.isFavorite,
    createdAt: Number(raw.createdAt) || Date.now()
  };
}

function normalizeStore(raw) {
  if (!raw || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  const items = Array.isArray(raw.items) ? raw.items.map(normalizeItem).filter(Boolean) : [];
  const favorites = Array.isArray(raw.favorites)
    ? raw.favorites.map((f) => String(f).trim()).filter(Boolean)
    : [];
  const budget = Number(raw.budget);
  const cSpent = Number(raw.budgetCycleSpent);
  const budgetCycleSpent =
    Number.isFinite(cSpent) && cSpent >= 0 ? round2(cSpent) : 0;
  let budgetPeriodAnchor = null;
  if (typeof raw.budgetPeriodAnchor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.budgetPeriodAnchor.slice(0, 10))) {
    budgetPeriodAnchor = raw.budgetPeriodAnchor.slice(0, 10);
  }
  return {
    id: raw.id,
    name: raw.name.trim() || 'Magasin',
    budget: Number.isFinite(budget) && budget >= 0 ? budget : DEFAULT_NEW_STORE_BUDGET,
    items,
    favorites,
    budgetCycleSpent,
    budgetPeriodAnchor,
    createdAt: Number(raw.createdAt) || Date.now()
  };
}

function loadStoresFromDisk() {
  const data = load(STORES_KEY, null);
  if (!Array.isArray(data) || data.length === 0) return [];
  return data.map(normalizeStore).filter(Boolean);
}

/** Utilisateurs déjà équipés de magasins : pas d’onboarding, drapeau posé une fois. */
function ensureShoppingOnboardedForExistingStores() {
  if (loadStoresFromDisk().length > 0) {
    save(ONBOARDED_KEY, true);
  }
}

function makeNewStore(name, budgetAmount) {
  const t = Date.now();
  const b =
    Number.isFinite(budgetAmount) && budgetAmount >= 0 ? round2(budgetAmount) : DEFAULT_NEW_STORE_BUDGET;
  const label = typeof name === 'string' && name.trim() ? name.trim() : 'Mon magasin';
  return {
    id: generateUUID(),
    name: label,
    budget: b,
    items: [],
    favorites: [],
    budgetCycleSpent: 0,
    budgetPeriodAnchor: getBudgetPeriodAnchor(),
    createdAt: t
  };
}

function parseOnboardingNameInput(el) {
  const v = el instanceof HTMLInputElement ? el.value.trim() : '';
  return v || 'Mon magasin';
}

function parseOnboardingBudgetInput(el) {
  const raw = el instanceof HTMLInputElement ? String(el.value ?? '').trim() : '';
  if (raw === '') return DEFAULT_NEW_STORE_BUDGET;
  const n = parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return DEFAULT_NEW_STORE_BUDGET;
  return round2(n);
}

function finalizeOnboardingFromStores(newStores) {
  if (!rootContainer || !Array.isArray(newStores) || newStores.length === 0) return;
  save(ONBOARDED_KEY, true);
  stores = newStores;
  save(STORES_KEY, stores);
  activeStoreId = stores[0].id;
  addCategory = 'autre';
  bounceIds = new Set();
  editingItemId = null;
  unbindOnboarding();
  onboardingMounted = false;
  rootContainer.innerHTML = createShoppingShell(addCategory);
  bindEvents();
  syncAll();
}

function unbindOnboarding() {
  if (!rootContainer || !onOnboardingClick) return;
  rootContainer.removeEventListener('click', onOnboardingClick);
  onOnboardingClick = null;
}

function bindOnboardingEvents() {
  unbindOnboarding();
  onOnboardingClick = (event) => {
    const t = event.target;
    if (!(t instanceof Element)) return;

    if (t.closest('[data-shopping-onboard-add-second]')) {
      const wrap = rootContainer.querySelector('[data-shopping-onboard-second-wrap]');
      const btn = rootContainer.querySelector('[data-shopping-onboard-add-second]');
      wrap?.classList.remove('shopping__onboard-second--hidden');
      if (btn instanceof HTMLElement) btn.hidden = true;
      return;
    }

    if (t.closest('[data-shopping-onboard-skip]')) {
      finalizeOnboardingFromStores([makeNewStore('Mon magasin', DEFAULT_NEW_STORE_BUDGET)]);
      return;
    }

    if (t.closest('[data-shopping-onboard-start]')) {
      const name1 = rootContainer.querySelector('[data-shopping-onboard-name-1]');
      const budget1 = rootContainer.querySelector('[data-shopping-onboard-budget-1]');
      const list = [makeNewStore(parseOnboardingNameInput(name1), parseOnboardingBudgetInput(budget1))];

      const wrap2 = rootContainer.querySelector('[data-shopping-onboard-second-wrap]');
      const secondVisible =
        wrap2 instanceof HTMLElement && !wrap2.classList.contains('shopping__onboard-second--hidden');
      if (secondVisible) {
        const name2 = rootContainer.querySelector('[data-shopping-onboard-name-2]');
        const budget2 = rootContainer.querySelector('[data-shopping-onboard-budget-2]');
        list.push(makeNewStore(parseOnboardingNameInput(name2), parseOnboardingBudgetInput(budget2)));
      }

      finalizeOnboardingFromStores(list);
    }
  };
  rootContainer.addEventListener('click', onOnboardingClick);
}

/** Persiste les magasins et déclenche tout de suite la sync PocketBase via save(). */
function persistStores() {
  save(STORES_KEY, stores);
}

function readHistory() {
  const data = load(HISTORY_KEY, []);
  return Array.isArray(data) ? data : [];
}

function appendHistory(entry) {
  const hist = readHistory();
  hist.unshift(entry);
  save(HISTORY_KEY, hist.slice(0, 200));
}

function getCurrentStore() {
  return stores.find((s) => s.id === activeStoreId) || null;
}

function computeBudgetTotals(store) {
  if (!store) {
    return { remaining: 0, totalSpent: 0, budget: 0, pct: 0, barTone: 'safe' };
  }
  const budget = Number(store.budget);
  const safeBudget = Number.isFinite(budget) && budget >= 0 ? budget : 0;
  let listSpent = 0;
  for (const it of store.items) {
    if (it.price != null && Number.isFinite(it.price)) listSpent += it.price;
  }
  listSpent = round2(listSpent);
  const cycle = round2(Number(store.budgetCycleSpent) || 0);
  const totalSpent = round2(cycle + listSpent);
  const remaining = safeBudget - totalSpent;
  const ratio = safeBudget > 0 ? totalSpent / safeBudget : 0;
  const pct = safeBudget > 0 ? Math.min(100, ratio * 100) : 0;
  let barTone = 'safe';
  if (ratio >= 1) barTone = 'danger';
  else if (ratio >= 0.75) barTone = 'warn';
  return { remaining, totalSpent, budget: safeBudget, pct, barTone, ratio };
}

function syncTabs() {
  const el = rootContainer?.querySelector('[data-shopping-tabs]');
  if (el) el.innerHTML = renderShoppingTabs(stores, activeStoreId);
}

function syncBudget() {
  alignAllStoresBudgetPeriod();
  const el = rootContainer?.querySelector('[data-shopping-budget-wrap]');
  const store = getCurrentStore();
  if (el) el.innerHTML = renderShoppingBudget(computeBudgetTotals(store));
}

function syncList() {
  const el = rootContainer?.querySelector('[data-shopping-list-wrap]');
  const store = getCurrentStore();
  if (!el) return;
  if (!store) {
    el.innerHTML = '<div class="shopping__list card"><p class="shopping__empty">Aucun magasin.</p></div>';
    return;
  }
  el.innerHTML = renderShoppingList(store, bounceIds, editingItemId);
}

function commitItemNameEdit(input) {
  if (!(input instanceof HTMLInputElement)) {
    editingItemId = null;
    syncList();
    return;
  }
  const id = input.dataset.shoppingEditName;
  if (!id) {
    editingItemId = null;
    syncList();
    return;
  }
  const store = getCurrentStore();
  const item = store?.items.find((i) => i.id === id);
  const v = input.value.trim();
  if (item && v) item.name = v;
  editingItemId = null;
  persistStores();
  syncList();
}

function commitAnyNameEdit() {
  if (!editingItemId || !rootContainer) return;
  const input = rootContainer.querySelector(`[data-shopping-edit-name="${CSS.escape(editingItemId)}"]`);
  if (input instanceof HTMLInputElement) commitItemNameEdit(input);
  else {
    editingItemId = null;
    syncList();
  }
}

function syncQuick() {
  const el = rootContainer?.querySelector('[data-shopping-quick-wrap]');
  const store = getCurrentStore();
  if (!el) return;
  el.innerHTML = store ? renderQuickChips(store) : '';
}

function syncCategorySelect() {
  const field = rootContainer?.querySelector('.shopping__add-field');
  if (field) field.innerHTML = createCategorySelect(addCategory);
}

function syncAll() {
  syncTabs();
  syncBudget();
  syncList();
  syncQuick();
}

function parsePriceFromInput(value) {
  const t = String(value ?? '').trim();
  if (t === '') return null;
  const n = parseFloat(t.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function addItemToStore(store, name, category, options = {}) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  store.items.push({
    id: generateUUID(),
    name: trimmed,
    category: normalizeCategoryId(category),
    price: null,
    checked: false,
    isFavorite: !!options.isFavorite,
    createdAt: Date.now()
  });
  return true;
}

function getPresetCategory(name) {
  const p = QUICK_PRESETS.find((x) => x.name === name);
  return p ? p.category : 'autre';
}

function openModal() {
  const modal = rootContainer?.querySelector('[data-shopping-modal]');
  const store = getCurrentStore();
  if (!(modal instanceof HTMLElement) || !store) return;

  const checked = store.items.filter((i) => i.checked);
  if (!checked.length) {
    const btn = rootContainer.querySelector('[data-shopping-finish-open]');
    if (btn) {
      btn.classList.remove('animate-shake');
      requestAnimationFrame(() => btn.classList.add('animate-shake'));
    }
    return;
  }

  let spent = 0;
  for (const it of checked) {
    if (it.price != null && Number.isFinite(it.price)) spent += it.price;
  }
  const budget = Number(store.budget) || 0;
  const delta = budget - spent;
  let lineEco = '';
  if (delta > 0) {
    lineEco = `<p class="shopping__modal-line shopping__modal-line--success">Économie vs budget : ${formatMoneyEUR(delta)}</p>`;
  } else if (delta < 0) {
    lineEco = `<p class="shopping__modal-line shopping__modal-line--danger">Dépassement : ${formatMoneyEUR(Math.abs(delta))}</p>`;
  } else {
    lineEco = `<p class="shopping__modal-line">Budget utilisé au centime près.</p>`;
  }

  const body = modal.querySelector('[data-shopping-modal-body]');
  if (body) {
    body.innerHTML = `
      <p class="shopping__modal-line"><strong>Total dépensé</strong> : ${formatMoneyEUR(spent)}</p>
      <p class="shopping__modal-line"><strong>Articles achetés</strong> : ${checked.length}</p>
      ${lineEco}
    `;
  }

  const saveCb = modal.querySelector('[data-shopping-save-budget]');
  if (saveCb instanceof HTMLInputElement) saveCb.checked = false;

  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  const modal = rootContainer?.querySelector('[data-shopping-modal]');
  if (modal instanceof HTMLElement) {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
  }
}

function confirmFinish() {
  const store = getCurrentStore();
  const modal = rootContainer?.querySelector('[data-shopping-modal]');
  if (!store || !modal) return;

  const checked = store.items.filter((i) => i.checked);
  if (!checked.length) {
    closeModal();
    return;
  }

  let spent = 0;
  for (const it of checked) {
    if (it.price != null && Number.isFinite(it.price)) spent += it.price;
  }
  spent = round2(spent);

  alignStoreToBudgetPeriod(store);
  store.budgetCycleSpent = round2((Number(store.budgetCycleSpent) || 0) + spent);
  store.budgetPeriodAnchor = getBudgetPeriodAnchor();

  const saveCb = modal.querySelector('[data-shopping-save-budget]');
  const savedToBudget = saveCb instanceof HTMLInputElement && saveCb.checked;

  appendHistory({
    storeId: store.id,
    storeName: store.name,
    date: todayISO(),
    total: Math.round(spent * 100) / 100,
    budget: Number(store.budget) || 0,
    itemCount: checked.length,
    savedToBudget,
    createdAt: Date.now()
  });

  store.items = store.items.filter((i) => !i.checked);
  editingItemId = null;
  persistStores();
  closeModal();
  syncAll();
}

function bindEvents() {
  if (!rootContainer) return;

  onFormSubmit = (event) => {
    event.preventDefault();
    const store = getCurrentStore();
    if (!store) return;

    const nameInput = rootContainer.querySelector('[data-shopping-name]');
    const catSelect = rootContainer.querySelector('[data-shopping-category]');
    const name = nameInput instanceof HTMLInputElement ? nameInput.value : '';
    const cat =
      catSelect instanceof HTMLSelectElement ? catSelect.value : addCategory;

    if (!addItemToStore(store, name, cat, { isFavorite: false })) {
      if (nameInput) {
        nameInput.classList.remove('animate-shake');
        requestAnimationFrame(() => nameInput.classList.add('animate-shake'));
      }
      return;
    }

    addCategory = normalizeCategoryId(cat);
    persistStores();
    if (nameInput) nameInput.value = '';
    syncCategorySelect();
    syncList();
    syncBudget();
    nameInput?.focus();
  };

  onRootClick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('[data-shopping-modal-dismiss]') || target.closest('[data-shopping-modal-cancel]')) {
      closeModal();
      return;
    }

    if (target.closest('[data-shopping-modal-confirm]')) {
      confirmFinish();
      return;
    }

    const tab = target.closest('[data-shopping-store-tab]');
    if (tab instanceof HTMLButtonElement) {
      const id = tab.dataset.shoppingStoreTab;
      if (id && stores.some((s) => s.id === id)) {
        commitAnyNameEdit();
        activeStoreId = id;
        editingItemId = null;
        bounceIds.clear();
        persistStores();
        syncAll();
      }
      return;
    }

    if (target.closest('[data-shopping-delete]')) {
      const del = target.closest('[data-shopping-delete]');
      if (!(del instanceof HTMLButtonElement)) return;
      const id = del.dataset.shoppingDelete;
      if (!id) return;
      const store = getCurrentStore();
      if (!store) return;
      commitAnyNameEdit();
      store.items = store.items.filter((i) => i.id !== id);
      if (editingItemId === id) editingItemId = null;
      persistStores();
      syncList();
      syncBudget();
      return;
    }

    const editTrig = target.closest('[data-shopping-edit-name-trigger]');
    if (editTrig instanceof HTMLButtonElement) {
      const id = editTrig.dataset.shoppingEditNameTrigger;
      if (!id) return;
      if (editingItemId === id) {
        const input = rootContainer.querySelector(`[data-shopping-edit-name="${CSS.escape(id)}"]`);
        if (input instanceof HTMLInputElement) commitItemNameEdit(input);
        return;
      }
      commitAnyNameEdit();
      editingItemId = id;
      syncList();
      queueMicrotask(() => {
        const inp = rootContainer?.querySelector(`[data-shopping-edit-name="${CSS.escape(id)}"]`);
        if (inp instanceof HTMLInputElement) {
          inp.focus();
          inp.select();
        }
      });
      return;
    }

    if (target.closest('[data-shopping-add-store]')) {
      const name = window.prompt('Nom du nouveau magasin ?', 'Magasin');
      if (name == null) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      commitAnyNameEdit();
      const ns = {
        id: generateUUID(),
        name: trimmed,
        budget: DEFAULT_NEW_STORE_BUDGET,
        items: [],
        favorites: [],
        budgetCycleSpent: 0,
        budgetPeriodAnchor: getBudgetPeriodAnchor(),
        createdAt: Date.now()
      };
      stores.push(ns);
      activeStoreId = ns.id;
      editingItemId = null;
      persistStores();
      syncAll();
      return;
    }

    if (target.closest('[data-shopping-rename-store]')) {
      const store = getCurrentStore();
      if (!store) return;
      commitAnyNameEdit();
      const name = window.prompt('Nouveau nom du magasin', store.name);
      if (name == null) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      store.name = trimmed;
      persistStores();
      syncTabs();
      return;
    }

    if (target.closest('[data-shopping-edit-budget]')) {
      const store = getCurrentStore();
      if (!store) return;
      commitAnyNameEdit();
      const raw = window.prompt('Budget cible (€)', String(store.budget));
      if (raw == null) return;
      const n = parseFloat(String(raw).replace(',', '.'));
      if (!Number.isFinite(n) || n < 0) return;
      store.budget = Math.round(n * 100) / 100;
      persistStores();
      syncBudget();
      return;
    }

    const quick = target.closest('[data-shopping-quick]');
    if (quick instanceof HTMLButtonElement) {
      const store = getCurrentStore();
      if (!store) return;
      const itemName = quick.dataset.shoppingQuick;
      if (!itemName) return;
      const catAttr = quick.getAttribute('data-shopping-quick-cat');
      const cat = normalizeCategoryId(catAttr || getPresetCategory(itemName));
      addItemToStore(store, itemName, cat, { isFavorite: true });
      persistStores();
      syncList();
      syncBudget();
      return;
    }

    const rem = target.closest('[data-shopping-fav-remove]');
    if (rem instanceof HTMLButtonElement) {
      const store = getCurrentStore();
      if (!store) return;
      const n = rem.dataset.shoppingFavRemove;
      if (!n) return;
      store.favorites = store.favorites.filter((f) => f !== n);
      persistStores();
      syncQuick();
      return;
    }

    if (target.closest('[data-shopping-fav-add]')) {
      const store = getCurrentStore();
      if (!store) return;
      const input = rootContainer.querySelector('[data-shopping-fav-input]');
      const raw = input instanceof HTMLInputElement ? input.value : '';
      const trimmed = raw.trim();
      if (!trimmed) {
        input?.classList.remove('animate-shake');
        requestAnimationFrame(() => input?.classList.add('animate-shake'));
        return;
      }
      if (PRESET_NAME_SET.has(trimmed)) {
        input?.classList.remove('animate-shake');
        requestAnimationFrame(() => input?.classList.add('animate-shake'));
        return;
      }
      if (!store.favorites.includes(trimmed)) store.favorites.push(trimmed);
      if (input) input.value = '';
      persistStores();
      syncQuick();
      return;
    }

    if (target.closest('[data-shopping-finish-open]')) {
      openModal();
    }
  };

  onRootChange = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.matches('[data-shopping-category]')) {
      addCategory = normalizeCategoryId(target.value);
      return;
    }

    if (target.matches('[data-shopping-toggle]')) {
      const store = getCurrentStore();
      if (!store) return;
      const id = target.dataset.shoppingToggle;
      if (!id) return;
      const item = store.items.find((i) => i.id === id);
      if (!item) return;
      const nowChecked = target.checked;
      item.checked = nowChecked;
      if (nowChecked) {
        bounceIds.add(id);
        window.setTimeout(() => {
          bounceIds.delete(id);
          const li = rootContainer?.querySelector(`[data-shopping-item="${CSS.escape(id)}"]`);
          li?.classList.remove('animate-bounce-in');
        }, 700);
      } else bounceIds.delete(id);
      persistStores();
      syncList();
      syncBudget();
      return;
    }
  };

  onRootFocusOut = (event) => {
    const t = event.target;
    if (!(t instanceof HTMLInputElement) || !t.matches('[data-shopping-edit-name]')) return;
    const rel = event.relatedTarget;
    const row = t.closest('[data-shopping-item]');
    if (rel instanceof Element && row?.contains(rel)) {
      const trig = rel.closest('[data-shopping-edit-name-trigger]');
      if (trig && trig.dataset.shoppingEditNameTrigger === t.dataset.shoppingEditName) return;
    }
    commitItemNameEdit(t);
  };

  onRootPointerDown = (event) => {
    const btn = event.target.closest('[data-shopping-edit-name-trigger]');
    if (!(btn instanceof HTMLButtonElement)) return;
    const id = btn.dataset.shoppingEditNameTrigger;
    if (id && editingItemId === id) {
      event.preventDefault();
    }
  };

  onRootInput = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches('[data-shopping-price]')) return;
    const store = getCurrentStore();
    if (!store) return;
    const id = target.dataset.shoppingPrice;
    if (!id) return;
    const item = store.items.find((i) => i.id === id);
    if (!item) return;
    item.price = parsePriceFromInput(target.value);
    persistStores();
    syncBudget();
  };

  onAnimEnd = (event) => {
    const el = event.target;
    if (!(el instanceof HTMLElement)) return;
    if (event.animationName !== 'bounce-in') return;
    if (!el.classList.contains('shopping__item')) return;
    el.classList.remove('animate-bounce-in');
    const id = el.dataset.shoppingItem;
    if (id) bounceIds.delete(id);
  };

  onKeyDown = (event) => {
    const modal = rootContainer?.querySelector('[data-shopping-modal]');
    if (event.key === 'Escape') {
      if (modal instanceof HTMLElement && !modal.hidden) {
        event.preventDefault();
        closeModal();
        return;
      }
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement &&
        active.matches('[data-shopping-edit-name]') &&
        rootContainer?.contains(active)
      ) {
        event.preventDefault();
        commitItemNameEdit(active);
      }
      return;
    }
    if (event.key === 'Enter') {
      const t = event.target;
      if (
        t instanceof HTMLInputElement &&
        t.matches('[data-shopping-edit-name]') &&
        rootContainer?.contains(t)
      ) {
        event.preventDefault();
        commitItemNameEdit(t);
      }
    }
  };

  const form = rootContainer.querySelector('[data-shopping-add-form]');
  form?.addEventListener('submit', onFormSubmit);
  rootContainer.addEventListener('click', onRootClick);
  rootContainer.addEventListener('change', onRootChange);
  rootContainer.addEventListener('input', onRootInput);
  rootContainer.addEventListener('focusout', onRootFocusOut, true);
  rootContainer.addEventListener('pointerdown', onRootPointerDown);
  rootContainer.addEventListener('animationend', onAnimEnd);
  document.addEventListener('keydown', onKeyDown);
}

function unbindEvents() {
  if (!rootContainer) return;
  const form = rootContainer.querySelector('[data-shopping-add-form]');
  if (form && onFormSubmit) form.removeEventListener('submit', onFormSubmit);
  if (onRootClick) rootContainer.removeEventListener('click', onRootClick);
  if (onRootChange) rootContainer.removeEventListener('change', onRootChange);
  if (onRootInput) rootContainer.removeEventListener('input', onRootInput);
  if (onRootFocusOut) rootContainer.removeEventListener('focusout', onRootFocusOut, true);
  if (onRootPointerDown) rootContainer.removeEventListener('pointerdown', onRootPointerDown);
  if (onAnimEnd) rootContainer.removeEventListener('animationend', onAnimEnd);
  if (onKeyDown) document.removeEventListener('keydown', onKeyDown);

  onFormSubmit = null;
  onRootClick = null;
  onRootChange = null;
  onRootInput = null;
  onRootFocusOut = null;
  onRootPointerDown = null;
  onAnimEnd = null;
  onKeyDown = null;
}

const shopping = {
  id: 'shopping',
  label: 'Courses',
  icon: '🛒',

  init(container) {
    rootContainer = container;
    ensureShoppingOnboardedForExistingStores();

    const loaded = loadStoresFromDisk();
    const hasOnboardedFlag = load(ONBOARDED_KEY, false) === true;

    if (loaded.length === 0 && !hasOnboardedFlag) {
      stores = [];
      activeStoreId = null;
      addCategory = 'autre';
      bounceIds = new Set();
      editingItemId = null;
      onboardingMounted = true;
      rootContainer.innerHTML = createShoppingOnboardingShell();
      bindOnboardingEvents();
      return;
    }

    onboardingMounted = false;
    stores = loaded;
    activeStoreId = stores[0]?.id || null;
    addCategory = 'autre';
    bounceIds = new Set();
    editingItemId = null;

    rootContainer.innerHTML = createShoppingShell(addCategory);
    bindEvents();
    syncAll();
  },

  destroy() {
    if (onboardingMounted) {
      unbindOnboarding();
    } else {
      unbindEvents();
    }
    onboardingMounted = false;
    stores = [];
    activeStoreId = null;
    editingItemId = null;
    bounceIds.clear();
    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    const data = load(STORES_KEY, []);
    const safe = Array.isArray(data) ? data.map(normalizeStore).filter(Boolean) : [];
    let totalPending = 0;
    const parts = [];
    for (const s of safe) {
      const n = (s.items || []).filter((i) => !i.checked).length;
      totalPending += n;
      if (n > 0) {
        const label = n === 1 ? 'article' : 'articles';
        parts.push(`${n} ${label} à ${s.name}`);
      }
    }

    if (totalPending === 0) {
      return {
        title: 'Courses',
        content: `
          <p class="shopping-widget__empty">Aucune course prévue</p>
          <button type="button" class="btn dashboard__link" data-dashboard-nav="shopping">Créer une liste</button>
        `
      };
    }

    const head =
      totalPending === 1
        ? '1 article en attente sur tes listes'
        : `${totalPending} articles en attente sur tes listes`;

    return {
      title: 'Courses',
      content: `
        <p class="shopping-widget__summary">${head}</p>
        <p class="dashboard__muted shopping-widget__detail">${parts.join(' · ')}</p>
        <button type="button" class="btn dashboard__link" data-dashboard-nav="shopping">Ouvrir les courses</button>
      `
    };
  }
};

export default shopping;
