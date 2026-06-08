import './style.css';
import { save, load, generateUUID } from '../../core/storage.js';
import {
  createBudgetShell,
  renderBudgetOnboarding,
  renderHero,
  renderSettings,
  renderFixedList,
  renderCategorySettings,
  renderExpenseCategoryPicker,
  renderProjectsSection,
  renderSavingsBalance,
  renderDistribution,
  renderHistoryToolbar,
  renderCategoryTotals,
  renderHistoryList,
  renderDashboardWidget,
  formatMoneyEUR
} from './view.js';

const CONFIG_KEY = 'budget:config';
const ONBOARDED_KEY = 'budget:onboarded';
const EXPENSES_KEY = 'budget:expenses';
const SAVINGS_KEY = 'budget:savings';
/** Même stockage que `shopping:history`, clé explicite pour sync PocketBase */
const SHOPPING_HISTORY_FULL_KEY = 'adhd-app:shopping:history';

const DEFAULT_MONTHLY = 0;
const DEFAULT_SAVINGS_GOAL = 0;

function nowMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthLabelFr(ym) {
  if (!ym || ym.length < 7) return ym || '';
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const mo = [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre'
  ][m - 1];
  return `${mo} ${y}`;
}

const MONTHS_LONG_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre'
];

/** Affiche une date ISO AAAA-MM-JJ en français (ex. 11 avril 2026). */
function formatDateLongFr(iso) {
  const s = String(iso || '').slice(0, 10);
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return s;
  const name = MONTHS_LONG_FR[m - 1];
  return name ? `${d} ${name} ${y}` : s;
}

function defaultPeriodStartFirstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function normalizePeriodStartDate(value) {
  if (typeof value !== 'string') return null;
  const s = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function parseDecimal(value) {
  const t = String(value ?? '').trim().replace(',', '.');
  if (t === '') return null;
  const n = parseFloat(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return round2(n);
}

function slugId(label) {
  const s = String(label)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'categorie';
}

function defaultCategories() {
  return [
    { id: 'courses', emoji: '🛒', label: 'Courses' },
    { id: 'animaux', emoji: '🐾', label: 'Animaux' },
    { id: 'transport', emoji: '🚗', label: 'Transport' },
    { id: 'resto', emoji: '🍽', label: 'Resto / sorties' },
    { id: 'impulsif', emoji: '⚡', label: 'Achats impulsifs' },
    { id: 'divers', emoji: '🛠', label: 'Divers' }
  ];
}

function defaultFixedCharges() {
  const t = Date.now();
  return [
    {
      id: generateUUID(),
      name: 'Loyer',
      amount: 0,
      category: 'logement',
      icon: '🏠',
      active: true,
      createdAt: t
    },
    {
      id: generateUUID(),
      name: 'Abonnements',
      amount: 0,
      category: 'abonnements',
      icon: '📱',
      active: true,
      createdAt: t
    },
    {
      id: generateUUID(),
      name: 'Factures',
      amount: 0,
      category: 'factures',
      icon: '⚡',
      active: true,
      createdAt: t
    }
  ];
}

function defaultSavings() {
  const t = Date.now();
  return {
    totalBalance: 0,
    projects: [
      { id: generateUUID(), emoji: '🎯', name: 'Mon projet', target: 500, current: 0, createdAt: t }
    ]
  };
}

function normalizeFixedCharge(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.name !== 'string') return null;
  const amount = parseDecimal(raw.amount);
  return {
    id: typeof raw.id === 'string' ? raw.id : generateUUID(),
    name: raw.name.trim() || 'Charge',
    amount: amount ?? 0,
    category: String(raw.category || 'divers').trim() || 'divers',
    icon: String(raw.icon || '📌').trim().slice(0, 4) || '📌',
    active: raw.active !== false,
    createdAt: Number(raw.createdAt) || Date.now()
  };
}

function normalizeCategory(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id ? raw.id : slugId(raw.label || 'cat');
  const label = String(raw.label || id).trim() || id;
  return {
    id,
    emoji: String(raw.emoji || '📁').trim().slice(0, 4) || '📁',
    label
  };
}

function normalizeConfig(raw) {
  const monthly = Number(raw?.monthlyBudget);
  const savingsGoal = Number(raw?.savingsGoal);
  let fixedCharges = Array.isArray(raw?.fixedCharges)
    ? raw.fixedCharges.map(normalizeFixedCharge).filter(Boolean)
    : [];
  if (!fixedCharges.length) fixedCharges = defaultFixedCharges();

  let categories = Array.isArray(raw?.categories) ? raw.categories.map(normalizeCategory).filter(Boolean) : [];
  if (!categories.length) categories = defaultCategories();

  let currentPeriodStartDate = normalizePeriodStartDate(raw?.currentPeriodStartDate);
  if (!currentPeriodStartDate) currentPeriodStartDate = defaultPeriodStartFirstOfMonth();

  return {
    monthlyBudget: Number.isFinite(monthly) && monthly >= 0 ? round2(monthly) : DEFAULT_MONTHLY,
    savingsGoal: Number.isFinite(savingsGoal) && savingsGoal >= 0 ? round2(savingsGoal) : DEFAULT_SAVINGS_GOAL,
    fixedCharges,
    categories,
    currentPeriodStartDate
  };
}

function normalizeExpense(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const amount = parseDecimal(raw.amount);
  if (amount == null || amount <= 0) return null;
  if (typeof raw.category !== 'string') return null;
  const date = typeof raw.date === 'string' && raw.date.length >= 10 ? raw.date.slice(0, 10) : todayISO();
  const month = typeof raw.month === 'string' && raw.month.length >= 7 ? raw.month.slice(0, 7) : date.slice(0, 7);
  return {
    id: typeof raw.id === 'string' ? raw.id : generateUUID(),
    amount,
    category: raw.category,
    description: String(raw.description || '').trim(),
    date,
    month,
    source: raw.source === 'shopping' ? 'shopping' : 'manual',
    shoppingCreatedAt: raw.shoppingCreatedAt != null ? Number(raw.shoppingCreatedAt) : undefined,
    createdAt: Number(raw.createdAt) || Date.now()
  };
}

function normalizeProject(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const target = parseDecimal(raw.target);
  const current = parseDecimal(raw.current) ?? 0;
  return {
    id: typeof raw.id === 'string' ? raw.id : generateUUID(),
    emoji: String(raw.emoji || '🎯').trim().slice(0, 4) || '🎯',
    name: String(raw.name || 'Projet').trim() || 'Projet',
    target: target && target > 0 ? target : 100,
    current: Math.max(0, current || 0),
    createdAt: Number(raw.createdAt) || Date.now()
  };
}

function normalizeSavings(raw) {
  const base = defaultSavings();
  if (!raw || typeof raw !== 'object') return base;
  const totalBalance = parseDecimal(raw.totalBalance) ?? 0;
  let projects = Array.isArray(raw.projects) ? raw.projects.map(normalizeProject).filter(Boolean) : [];
  if (!projects.length) projects = base.projects;
  return {
    totalBalance: Math.max(0, totalBalance),
    projects
  };
}

function readConfig() {
  const data = load(CONFIG_KEY, null);
  return normalizeConfig(data && typeof data === 'object' ? data : {});
}

function persistConfig(cfg) {
  save(CONFIG_KEY, cfg);
}

function readExpenses() {
  const data = load(EXPENSES_KEY, []);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeExpense).filter(Boolean);
}

function persistExpenses(arr) {
  save(EXPENSES_KEY, arr);
}

function readSavings() {
  const data = load(SAVINGS_KEY, null);
  return normalizeSavings(data);
}

function persistSavings(s) {
  save(SAVINGS_KEY, s);
}

function hasPersistedBudgetConfig() {
  return load(CONFIG_KEY, null) != null;
}

function isBudgetOnboarded() {
  return load(ONBOARDED_KEY, null) === true;
}

/** Utilisateurs déjà équipés d’une config : pas d’onboarding, drapeau posé une fois. */
function migrateBudgetOnboardingFlag() {
  if (hasPersistedBudgetConfig() && !isBudgetOnboarded()) {
    save(ONBOARDED_KEY, true);
  }
}

function readShoppingHistory() {
  const data = load(SHOPPING_HISTORY_FULL_KEY, []);
  return Array.isArray(data) ? data : [];
}

function persistShoppingHistory(arr) {
  save(SHOPPING_HISTORY_FULL_KEY, arr);
}

function importShoppingToBudget(expenses) {
  const hist = readShoppingHistory();
  let changedHist = false;
  const next = [...expenses];

  for (const entry of hist) {
    if (entry && entry.importedToBudget === true) continue;
    const total = round2(Number(entry?.total));
    if (!Number.isFinite(total) || total <= 0) {
      if (entry && typeof entry === 'object') {
        entry.importedToBudget = true;
        changedHist = true;
      }
      continue;
    }
    const date = typeof entry.date === 'string' && entry.date.length >= 10 ? entry.date.slice(0, 10) : todayISO();
    const month = date.slice(0, 7);
    const storeName = typeof entry.storeName === 'string' ? entry.storeName.trim() : '';
    next.push({
      id: generateUUID(),
      amount: total,
      category: 'courses',
      description: storeName ? `Courses ${storeName}` : 'Courses',
      date,
      month,
      source: 'shopping',
      shoppingCreatedAt: Number(entry.createdAt) || undefined,
      createdAt: Date.now()
    });
    entry.importedToBudget = true;
    changedHist = true;
  }

  if (changedHist) {
    persistShoppingHistory(hist);
    persistExpenses(next);
    return next;
  }
  return expenses;
}

function realBudgetAmount(cfg) {
  const r = round2(cfg.monthlyBudget - cfg.savingsGoal);
  return Math.max(0, r);
}

function fixedTotalActive(cfg) {
  return cfg.fixedCharges.filter((c) => c.active).reduce((a, c) => a + (Number(c.amount) || 0), 0);
}

/** Dépenses variables comptées pour la barre du haut : depuis la date de début de période (reset manuel). */
function variableSpentSincePeriodStart(expenses, periodStartIso) {
  const start = String(periodStartIso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return 0;
  return expenses
    .filter((e) => typeof e.date === 'string' && e.date.slice(0, 10) >= start)
    .reduce((a, e) => a + e.amount, 0);
}

function computeMonthSnapshot(cfg, expenses) {
  const real = realBudgetAmount(cfg);
  const fixed = fixedTotalActive(cfg);
  const variable = variableSpentSincePeriodStart(expenses, cfg.currentPeriodStartDate);
  const totalUsed = fixed + variable;
  const remaining = round2(real - totalUsed);
  const barPct = real > 0 ? (totalUsed / real) * 100 : totalUsed > 0 ? 100 : 0;
  const ratioLeft = real > 0 ? remaining / real : remaining >= 0 ? 1 : -1;

  let tone = 'success';
  if (real <= 0) {
    tone = totalUsed > 0 ? 'danger' : 'success';
  } else if (ratioLeft < 0) {
    tone = 'danger';
  } else if (ratioLeft < 0.2) {
    tone = 'danger';
  } else if (ratioLeft <= 0.5) {
    tone = 'warning';
  } else {
    tone = 'success';
  }

  return {
    remaining,
    tone,
    barPct,
    realBudget: real,
    fixedTotal: round2(fixed),
    variableSpent: round2(variable),
    totalUsed: round2(totalUsed)
  };
}

function monthsForSelect() {
  const out = [];
  const d = new Date();
  for (let i = 0; i < 18; i++) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const ym = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
    out.push(ym);
  }
  return out;
}

function categoryTotalsForMonth(expenses, month) {
  const totals = {};
  for (const e of expenses) {
    if (e.month !== month) continue;
    totals[e.category] = round2((totals[e.category] || 0) + e.amount);
  }
  return totals;
}

function nextSavingsProject(savings) {
  const list = savings.projects || [];
  const incomplete = list.filter((p) => (Number(p.current) || 0) < (Number(p.target) || 0));
  const pick = incomplete[0] || list[0];
  if (!pick) return { label: 'Aucun projet', pct: 0 };
  const t = Number(pick.target) || 1;
  const c = Number(pick.current) || 0;
  const pct = Math.min(100, Math.round((c / t) * 100));
  return { label: `${pick.emoji} ${pick.name}`, pct };
}

let rootContainer = null;
/** Modales attachées à `body` pour éviter découpage iOS (fixed dans main / flex). */
let budgetModalPortal = null;
let config = readConfig();
let expenses = readExpenses();
let savings = readSavings();
let historyMonth = nowMonth();
let historyFilterCat = '';
let expensePickCategory = 'divers';

let onClick = null;
let onChange = null;
let onBlur = null;
let onKeyDown = null;
let onSheetPointerDown = null;
let onSheetPointerUp = null;
/** @type {{ startY: number, pointerId: number, el: HTMLElement } | null} */
let sheetDrag = null;

let onStorageSync = null;
let onOnboardingClick = null;

function qs(sel) {
  return rootContainer?.querySelector(sel) ?? budgetModalPortal?.querySelector(sel) ?? null;
}

function mountBudgetModalsToBody() {
  if (budgetModalPortal || !rootContainer) return;
  const shell = rootContainer.querySelector('.budget');
  if (!shell) return;
  const modals = shell.querySelectorAll('.budget__modal');
  if (!modals.length) return;
  budgetModalPortal = document.createElement('div');
  budgetModalPortal.id = 'budget-modal-portal';
  budgetModalPortal.className = 'budget-modal-portal';
  budgetModalPortal.setAttribute('aria-hidden', 'true');
  modals.forEach((node) => budgetModalPortal.appendChild(node));
  document.body.appendChild(budgetModalPortal);
}

function modalPointerRoot() {
  return budgetModalPortal ?? rootContainer;
}

function syncHero() {
  const el = qs('[data-budget-hero]');
  if (!el) return;
  const snap = computeMonthSnapshot(config, expenses);
  const periodSince = `Mois en cours depuis le ${formatDateLongFr(config.currentPeriodStartDate)}`;
  el.innerHTML = renderHero({
    ...snap,
    monthLabel: monthLabelFr(nowMonth()),
    periodSinceLine: periodSince
  });
}

function syncSettings() {
  const el = qs('[data-budget-settings]');
  if (!el) return;
  el.innerHTML = renderSettings(config, realBudgetAmount(config));
}

function syncFixed() {
  const el = qs('[data-budget-fixed]');
  if (!el) return;
  el.innerHTML = renderFixedList(config.fixedCharges);
}

function syncCategoriesSettings() {
  const el = qs('[data-budget-categories]');
  if (!el) return;
  el.innerHTML = renderCategorySettings(config.categories);
}

function syncSavings() {
  const sumProj = savings.projects.reduce((a, p) => a + (Number(p.current) || 0), 0);
  const balEl = qs('[data-budget-savings-balance]');
  if (balEl) balEl.innerHTML = renderSavingsBalance(savings.totalBalance, sumProj);
  const distEl = qs('[data-budget-distribution]');
  if (distEl) distEl.innerHTML = renderDistribution(savings.projects, savings.totalBalance);
  const projEl = qs('[data-budget-projects]');
  if (projEl) projEl.innerHTML = renderProjectsSection(savings.projects);
}

function syncHistory() {
  const months = monthsForSelect();
  if (!months.includes(historyMonth)) historyMonth = months[0];

  const toolbar = qs('[data-budget-history-toolbar]');
  if (toolbar) {
    toolbar.innerHTML = renderHistoryToolbar(months, historyMonth, config.categories, historyFilterCat);
  }

  let list = expenses.filter((e) => e.month === historyMonth);
  if (historyFilterCat) list = list.filter((e) => e.category === historyFilterCat);
  list = [...list].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt - a.createdAt;
  });

  const totals = categoryTotalsForMonth(expenses, historyMonth);
  const totEl = qs('[data-budget-history-totals]');
  if (totEl) totEl.innerHTML = renderCategoryTotals(totals, config.categories, historyMonth);

  const listEl = qs('[data-budget-history-list]');
  if (listEl) listEl.innerHTML = renderHistoryList(list, config.categories);
}

function syncExpensePicker() {
  const el = qs('[data-budget-expense-categories]');
  if (!el) return;
  if (!config.categories.some((c) => c.id === expensePickCategory)) {
    expensePickCategory = config.categories[0]?.id || 'divers';
  }
  el.innerHTML = renderExpenseCategoryPicker(config.categories, expensePickCategory);
}

function syncAll() {
  syncHero();
  syncSettings();
  syncFixed();
  syncCategoriesSettings();
  syncSavings();
  syncHistory();
}

function openModal(name) {
  const map = {
    expense: '[data-budget-modal-expense]',
    fixed: '[data-budget-modal-fixed]',
    cat: '[data-budget-modal-cat]',
    verse: '[data-budget-modal-verse]',
    project: '[data-budget-modal-project]'
  };
  const sel = map[name];
  const m = sel ? qs(sel) : null;
  if (m instanceof HTMLElement) {
    m.hidden = false;
    m.setAttribute('aria-hidden', 'false');
    if (budgetModalPortal) budgetModalPortal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }
}

function closeModal(name) {
  const map = {
    expense: '[data-budget-modal-expense]',
    fixed: '[data-budget-modal-fixed]',
    cat: '[data-budget-modal-cat]',
    verse: '[data-budget-modal-verse]',
    project: '[data-budget-modal-project]'
  };
  const m = qs(map[name]);
  if (m instanceof HTMLElement) {
    m.hidden = true;
    m.setAttribute('aria-hidden', 'true');
  }
  const anyOpen = ['expense', 'fixed', 'cat', 'verse', 'project'].some((n) => {
    const el = qs(map[n]);
    return el instanceof HTMLElement && !el.hidden;
  });
  if (!anyOpen) {
    document.documentElement.style.overflow = '';
    if (budgetModalPortal) budgetModalPortal.setAttribute('aria-hidden', 'true');
  }
}

function openExpenseModal() {
  syncExpensePicker();
  const amt = qs('[data-budget-expense-amount]');
  const desc = qs('[data-budget-expense-desc]');
  if (desc instanceof HTMLInputElement) desc.value = '';
  if (amt instanceof HTMLInputElement) {
    amt.value = '';
  }
  openModal('expense');
  queueMicrotask(() => {
    const input = qs('[data-budget-expense-amount]');
    if (input instanceof HTMLInputElement) {
      input.focus();
    }
  });
}

function saveExpenseFromModal() {
  const amtIn = qs('[data-budget-expense-amount]');
  const descIn = qs('[data-budget-expense-desc]');
  const amount = amtIn instanceof HTMLInputElement ? parseDecimal(amtIn.value) : null;
  if (amount == null || amount <= 0) {
    amtIn?.classList.remove('animate-shake');
    requestAnimationFrame(() => amtIn?.classList.add('animate-shake'));
    return;
  }
  const description = descIn instanceof HTMLInputElement ? descIn.value.trim() : '';
  const date = todayISO();
  const month = date.slice(0, 7);
  expenses.push({
    id: generateUUID(),
    amount,
    category: expensePickCategory,
    description,
    date,
    month,
    source: 'manual',
    createdAt: Date.now()
  });
  persistExpenses(expenses);
  closeModal('expense');
  syncAll();
}

function openFixedModal(id = null) {
  const heading = qs('[data-budget-fixed-modal-heading]');
  const idIn = qs('[data-budget-fixed-edit-id]');
  const nameIn = qs('[data-budget-fixed-name]');
  const amtIn = qs('[data-budget-fixed-amount]');
  const catIn = qs('[data-budget-fixed-category]');
  const iconIn = qs('[data-budget-fixed-icon]');
  const actIn = qs('[data-budget-fixed-active]');
  const delBtn = qs('[data-budget-fixed-delete]');

  if (id) {
    const c = config.fixedCharges.find((x) => x.id === id);
    if (!c) return;
    if (heading) heading.textContent = 'Modifier la charge';
    if (idIn instanceof HTMLInputElement) idIn.value = id;
    if (nameIn instanceof HTMLInputElement) nameIn.value = c.name;
    if (amtIn instanceof HTMLInputElement) amtIn.value = String(c.amount);
    if (catIn instanceof HTMLInputElement) catIn.value = c.category;
    if (iconIn instanceof HTMLInputElement) iconIn.value = c.icon;
    if (actIn instanceof HTMLInputElement) actIn.checked = c.active;
    if (delBtn instanceof HTMLButtonElement) delBtn.hidden = false;
  } else {
    if (heading) heading.textContent = 'Nouvelle charge fixe';
    if (idIn instanceof HTMLInputElement) idIn.value = '';
    if (nameIn instanceof HTMLInputElement) nameIn.value = '';
    if (amtIn instanceof HTMLInputElement) amtIn.value = '';
    if (catIn instanceof HTMLInputElement) catIn.value = '';
    if (iconIn instanceof HTMLInputElement) iconIn.value = '📌';
    if (actIn instanceof HTMLInputElement) actIn.checked = true;
    if (delBtn instanceof HTMLButtonElement) delBtn.hidden = true;
  }
  openModal('fixed');
}

function saveFixedModal() {
  const idIn = qs('[data-budget-fixed-edit-id]');
  const nameIn = qs('[data-budget-fixed-name]');
  const amtIn = qs('[data-budget-fixed-amount]');
  const catIn = qs('[data-budget-fixed-category]');
  const iconIn = qs('[data-budget-fixed-icon]');
  const actIn = qs('[data-budget-fixed-active]');
  const name = nameIn instanceof HTMLInputElement ? nameIn.value.trim() : '';
  const amount = amtIn instanceof HTMLInputElement ? parseDecimal(amtIn.value) : 0;
  if (!name) {
    nameIn?.classList.remove('animate-shake');
    requestAnimationFrame(() => nameIn?.classList.add('animate-shake'));
    return;
  }
  const editId = idIn instanceof HTMLInputElement ? idIn.value.trim() : '';
  const charge = {
    id: editId || generateUUID(),
    name,
    amount: amount ?? 0,
    category: catIn instanceof HTMLInputElement ? catIn.value.trim() || 'divers' : 'divers',
    icon: iconIn instanceof HTMLInputElement ? iconIn.value.trim().slice(0, 4) || '📌' : '📌',
    active: actIn instanceof HTMLInputElement ? actIn.checked : true,
    createdAt: Date.now()
  };
  if (editId) {
    const idx = config.fixedCharges.findIndex((x) => x.id === editId);
    if (idx >= 0) {
      charge.createdAt = config.fixedCharges[idx].createdAt;
      config.fixedCharges[idx] = normalizeFixedCharge(charge);
    }
  } else {
    config.fixedCharges.push(normalizeFixedCharge(charge));
  }
  persistConfig(config);
  closeModal('fixed');
  syncAll();
}

function deleteFixedModal() {
  const idIn = qs('[data-budget-fixed-edit-id]');
  const editId = idIn instanceof HTMLInputElement ? idIn.value.trim() : '';
  if (!editId) return;
  config.fixedCharges = config.fixedCharges.filter((x) => x.id !== editId);
  persistConfig(config);
  closeModal('fixed');
  syncAll();
}

function openCatModal(id = null) {
  const heading = qs('[data-budget-cat-modal-heading]');
  const idIn = qs('[data-budget-cat-edit-id]');
  const emoIn = qs('[data-budget-cat-emoji]');
  const labIn = qs('[data-budget-cat-label]');
  const delBtn = qs('[data-budget-cat-delete]');

  if (id) {
    const c = config.categories.find((x) => x.id === id);
    if (!c) return;
    if (heading) heading.textContent = 'Modifier la catégorie';
    if (idIn instanceof HTMLInputElement) idIn.value = id;
    if (emoIn instanceof HTMLInputElement) emoIn.value = c.emoji;
    if (labIn instanceof HTMLInputElement) labIn.value = c.label;
    if (delBtn instanceof HTMLButtonElement) delBtn.hidden = false;
  } else {
    if (heading) heading.textContent = 'Nouvelle catégorie';
    if (idIn instanceof HTMLInputElement) idIn.value = '';
    if (emoIn instanceof HTMLInputElement) emoIn.value = '📁';
    if (labIn instanceof HTMLInputElement) labIn.value = '';
    if (delBtn instanceof HTMLButtonElement) delBtn.hidden = true;
  }
  openModal('cat');
}

function saveCatModal() {
  const idIn = qs('[data-budget-cat-edit-id]');
  const emoIn = qs('[data-budget-cat-emoji]');
  const labIn = qs('[data-budget-cat-label]');
  const label = labIn instanceof HTMLInputElement ? labIn.value.trim() : '';
  const emoji = emoIn instanceof HTMLInputElement ? emoIn.value.trim().slice(0, 4) || '📁' : '📁';
  if (!label) {
    labIn?.classList.remove('animate-shake');
    requestAnimationFrame(() => labIn?.classList.add('animate-shake'));
    return;
  }
  const editId = idIn instanceof HTMLInputElement ? idIn.value.trim() : '';
  if (editId) {
    const idx = config.categories.findIndex((x) => x.id === editId);
    if (idx >= 0) {
      config.categories[idx] = { id: editId, emoji, label };
    }
  } else {
    let newId = slugId(label);
    while (config.categories.some((c) => c.id === newId)) {
      newId = `${newId}-${Math.floor(Math.random() * 999)}`;
    }
    config.categories.push({ id: newId, emoji, label });
  }
  persistConfig(config);
  closeModal('cat');
  syncAll();
}

function deleteCatModal() {
  const idIn = qs('[data-budget-cat-edit-id]');
  const editId = idIn instanceof HTMLInputElement ? idIn.value.trim() : '';
  if (!editId || config.categories.length <= 1) return;
  const fallback = config.categories.find((c) => c.id !== editId)?.id;
  if (!fallback) return;
  for (const e of expenses) {
    if (e.category === editId) e.category = fallback;
  }
  config.categories = config.categories.filter((c) => c.id !== editId);
  persistConfig(config);
  persistExpenses(expenses);
  closeModal('cat');
  syncAll();
}

function openVerseModal(projectId) {
  const p = savings.projects.find((x) => x.id === projectId);
  if (!p) return;
  const idIn = qs('[data-budget-verse-project-id]');
  const lab = qs('[data-budget-verse-label]');
  const amtIn = qs('[data-budget-verse-amount]');
  if (idIn instanceof HTMLInputElement) idIn.value = projectId;
  if (lab) lab.textContent = `${p.emoji} ${p.name} — objectif ${formatMoneyEUR(p.target)}`;
  if (amtIn instanceof HTMLInputElement) amtIn.value = '';
  openModal('verse');
  queueMicrotask(() => amtIn instanceof HTMLInputElement && amtIn.focus());
}

function saveVerseModal() {
  const idIn = qs('[data-budget-verse-project-id]');
  const amtIn = qs('[data-budget-verse-amount]');
  const pid = idIn instanceof HTMLInputElement ? idIn.value.trim() : '';
  const add = amtIn instanceof HTMLInputElement ? parseDecimal(amtIn.value) : null;
  if (!pid || add == null || add <= 0) {
    amtIn?.classList.remove('animate-shake');
    requestAnimationFrame(() => amtIn?.classList.add('animate-shake'));
    return;
  }
  const p = savings.projects.find((x) => x.id === pid);
  if (!p) return;
  p.current = round2((Number(p.current) || 0) + add);
  savings.totalBalance = round2((Number(savings.totalBalance) || 0) + add);
  persistSavings(savings);
  closeModal('verse');
  syncAll();
}

function openProjectModal(projectId = null) {
  const heading = qs('[data-budget-project-modal-heading]');
  const idIn = qs('[data-budget-project-edit-id]');
  const nameIn = qs('[data-budget-project-name]');
  const emoIn = qs('[data-budget-project-emoji]');
  const tgtIn = qs('[data-budget-project-target]');
  const curIn = qs('[data-budget-project-current]');
  const delBtn = qs('[data-budget-project-delete]');

  if (projectId) {
    const p = savings.projects.find((x) => x.id === projectId);
    if (!p) return;
    if (heading) heading.textContent = 'Modifier le projet';
    if (idIn instanceof HTMLInputElement) idIn.value = projectId;
    if (nameIn instanceof HTMLInputElement) nameIn.value = p.name;
    if (emoIn instanceof HTMLInputElement) emoIn.value = p.emoji;
    if (tgtIn instanceof HTMLInputElement) tgtIn.value = String(p.target);
    if (curIn instanceof HTMLInputElement) curIn.value = String(p.current);
    if (delBtn instanceof HTMLButtonElement) delBtn.hidden = false;
  } else {
    if (heading) heading.textContent = 'Nouveau projet';
    if (idIn instanceof HTMLInputElement) idIn.value = '';
    if (nameIn instanceof HTMLInputElement) nameIn.value = '';
    if (emoIn instanceof HTMLInputElement) emoIn.value = '🎯';
    if (tgtIn instanceof HTMLInputElement) tgtIn.value = '100';
    if (curIn instanceof HTMLInputElement) curIn.value = '0';
    if (delBtn instanceof HTMLButtonElement) delBtn.hidden = true;
  }
  openModal('project');
}

function saveProjectModal() {
  const idIn = qs('[data-budget-project-edit-id]');
  const nameIn = qs('[data-budget-project-name]');
  const emoIn = qs('[data-budget-project-emoji]');
  const tgtIn = qs('[data-budget-project-target]');
  const curIn = qs('[data-budget-project-current]');
  const name = nameIn instanceof HTMLInputElement ? nameIn.value.trim() : '';
  const emoji = emoIn instanceof HTMLInputElement ? emoIn.value.trim().slice(0, 4) || '🎯' : '🎯';
  const target = tgtIn instanceof HTMLInputElement ? parseDecimal(tgtIn.value) : null;
  const current = curIn instanceof HTMLInputElement ? parseDecimal(curIn.value) : 0;
  if (!name) {
    nameIn?.classList.remove('animate-shake');
    requestAnimationFrame(() => nameIn?.classList.add('animate-shake'));
    return;
  }
  if (target == null || target <= 0) {
    tgtIn?.classList.remove('animate-shake');
    requestAnimationFrame(() => tgtIn?.classList.add('animate-shake'));
    return;
  }
  const editId = idIn instanceof HTMLInputElement ? idIn.value.trim() : '';
  const payload = {
    id: editId || generateUUID(),
    name,
    emoji,
    target,
    current: Math.max(0, current ?? 0),
    createdAt: Date.now()
  };
  if (editId) {
    const idx = savings.projects.findIndex((x) => x.id === editId);
    if (idx >= 0) {
      payload.createdAt = savings.projects[idx].createdAt;
      savings.projects[idx] = normalizeProject(payload);
    }
  } else {
    savings.projects.push(normalizeProject(payload));
  }
  persistSavings(savings);
  closeModal('project');
  syncAll();
}

function deleteProjectModal() {
  const idIn = qs('[data-budget-project-edit-id]');
  const editId = idIn instanceof HTMLInputElement ? idIn.value.trim() : '';
  if (!editId) return;
  if (!window.confirm('Supprimer ce projet d’épargne ? Cette action est définitive.')) return;
  savings.projects = savings.projects.filter((x) => x.id !== editId);
  persistSavings(savings);
  closeModal('project');
  syncAll();
}

function runShoppingImport() {
  expenses = readExpenses();
  expenses = importShoppingToBudget(expenses);
  syncAll();
}

function exportHistoryJson() {
  let list = expenses.filter((e) => e.month === historyMonth);
  if (historyFilterCat) list = list.filter((e) => e.category === historyFilterCat);
  const payload = list.map((e) => ({
    id: e.id,
    amount: e.amount,
    category: e.category,
    description: e.description,
    date: e.date,
    month: e.month,
    source: e.source,
    createdAt: e.createdAt
  }));
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `budget-depenses-${historyMonth}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function unbindOnboardingEvents() {
  if (rootContainer && onOnboardingClick) {
    rootContainer.removeEventListener('click', onOnboardingClick);
  }
  onOnboardingClick = null;
}

function finishBudgetOnboarding(skip) {
  if (!rootContainer) return;
  let monthly = 0;
  let savingsGoal = 0;
  if (!skip) {
    const mIn = rootContainer.querySelector('[data-budget-onboard-monthly]');
    const sIn = rootContainer.querySelector('[data-budget-onboard-savings]');
    monthly = mIn instanceof HTMLInputElement ? parseDecimal(mIn.value) ?? 0 : 0;
    savingsGoal = sIn instanceof HTMLInputElement ? parseDecimal(sIn.value) ?? 0 : 0;
  }
  unbindOnboardingEvents();
  config.monthlyBudget = round2(monthly);
  config.savingsGoal = round2(savingsGoal);
  persistConfig(config);
  if (load(SAVINGS_KEY, null) == null) persistSavings(savings);
  save(ONBOARDED_KEY, true);

  rootContainer.innerHTML = createBudgetShell();
  mountBudgetModalsToBody();
  bindEvents();
  syncAll();
  syncExpensePicker();
}

function bindOnboardingEvents() {
  if (!rootContainer) return;
  onOnboardingClick = (event) => {
    const t = event.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-budget-onboard-start]')) {
      finishBudgetOnboarding(false);
      return;
    }
    if (t.closest('[data-budget-onboard-skip]')) {
      finishBudgetOnboarding(true);
    }
  };
  rootContainer.addEventListener('click', onOnboardingClick);
}

function bindEvents() {
  if (!rootContainer) return;

  onClick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const dismiss = target.closest('[data-budget-dismiss]');
    if (dismiss instanceof HTMLElement) {
      closeModal(dismiss.dataset.budgetDismiss || '');
      return;
    }

    if (target.closest('[data-budget-open-expense]')) {
      openExpenseModal();
      return;
    }

    if (target.closest('[data-budget-save-expense]')) {
      saveExpenseFromModal();
      return;
    }

    if (target.closest('[data-budget-fixed-add]')) {
      openFixedModal(null);
      return;
    }

    const fe = target.closest('[data-budget-fixed-edit]');
    if (fe instanceof HTMLElement && fe.dataset.budgetFixedEdit) {
      openFixedModal(fe.dataset.budgetFixedEdit);
      return;
    }

    if (target.closest('[data-budget-save-fixed]')) {
      saveFixedModal();
      return;
    }

    if (target.closest('[data-budget-fixed-delete]')) {
      deleteFixedModal();
      return;
    }

    if (target.closest('[data-budget-cat-add]')) {
      openCatModal(null);
      return;
    }

    const ce = target.closest('[data-budget-cat-edit]');
    if (ce instanceof HTMLElement && ce.dataset.budgetCatEdit) {
      openCatModal(ce.dataset.budgetCatEdit);
      return;
    }

    if (target.closest('[data-budget-save-cat]')) {
      saveCatModal();
      return;
    }

    if (target.closest('[data-budget-cat-delete]')) {
      deleteCatModal();
      return;
    }

    const pick = target.closest('[data-budget-pick-cat]');
    if (pick instanceof HTMLElement && pick.dataset.budgetPickCat) {
      expensePickCategory = pick.dataset.budgetPickCat;
      syncExpensePicker();
      return;
    }

    const vo = target.closest('[data-budget-open-verse]');
    if (vo instanceof HTMLElement && vo.dataset.budgetOpenVerse) {
      openVerseModal(vo.dataset.budgetOpenVerse);
      return;
    }

    if (target.closest('[data-budget-save-verse]')) {
      saveVerseModal();
      return;
    }

    if (target.closest('[data-budget-project-add]')) {
      openProjectModal(null);
      return;
    }

    const pe = target.closest('[data-budget-project-edit]');
    if (pe instanceof HTMLElement && pe.dataset.budgetProjectEdit) {
      openProjectModal(pe.dataset.budgetProjectEdit);
      return;
    }

    if (target.closest('[data-budget-save-project]')) {
      saveProjectModal();
      return;
    }

    if (target.closest('[data-budget-project-delete]')) {
      deleteProjectModal();
      return;
    }

    if (target.closest('[data-budget-export]')) {
      exportHistoryJson();
      return;
    }

    if (target.closest('[data-budget-new-month]')) {
      const ok = window.confirm(
        'Démarrer un nouveau mois ?\n\nLes dépenses du mois en cours seront archivées.'
      );
      if (!ok) return;
      config.currentPeriodStartDate = todayISO();
      persistConfig(config);
      syncAll();
      return;
    }

    const del = target.closest('[data-budget-del-expense]');
    if (del instanceof HTMLElement && del.dataset.budgetDelExpense) {
      const id = del.dataset.budgetDelExpense;
      expenses = expenses.filter((e) => e.id !== id);
      persistExpenses(expenses);
      syncAll();
      return;
    }
  };

  onChange = (event) => {
    const t = event.target;
    if (!(t instanceof HTMLInputElement) && !(t instanceof HTMLSelectElement)) return;

    if (t.matches('[data-budget-config-monthly]')) {
      const n = parseDecimal(t.value);
      if (n != null) {
        config.monthlyBudget = n;
        persistConfig(config);
        syncHero();
        syncSettings();
      }
      return;
    }

    if (t.matches('[data-budget-config-savings]')) {
      const n = parseDecimal(t.value);
      if (n != null) {
        config.savingsGoal = n;
        persistConfig(config);
        syncHero();
        syncSettings();
      }
      return;
    }

    if (t.matches('[data-budget-history-month]')) {
      historyMonth = t.value || nowMonth();
      syncHistory();
      return;
    }

    if (t.matches('[data-budget-history-filter]')) {
      historyFilterCat = t.value;
      syncHistory();
      return;
    }
  };

  onBlur = (event) => {
    const t = event.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (!t.matches('[data-budget-total-balance]')) return;
    const n = parseDecimal(t.value);
    if (n != null) {
      savings.totalBalance = n;
      persistSavings(savings);
      syncSavings();
    }
  };

  onKeyDown = (event) => {
    if (event.key !== 'Escape') return;
    const modalMap = {
      expense: '[data-budget-modal-expense]',
      fixed: '[data-budget-modal-fixed]',
      cat: '[data-budget-modal-cat]',
      verse: '[data-budget-modal-verse]',
      project: '[data-budget-modal-project]'
    };
    for (const name of ['expense', 'fixed', 'cat', 'verse', 'project']) {
      const m = qs(modalMap[name]);
      if (m instanceof HTMLElement && !m.hidden) {
        event.preventDefault();
        closeModal(name);
        break;
      }
    }
  };

  onSheetPointerDown = (event) => {
    const btn = event.target.closest('[data-budget-sheet-handle]');
    const ptrRoot = modalPointerRoot();
    if (!(btn instanceof HTMLElement) || !ptrRoot?.contains(btn)) return;
    sheetDrag = { startY: event.clientY, pointerId: event.pointerId, el: btn };
    try {
      btn.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  };

  onSheetPointerUp = (event) => {
    if (!sheetDrag || event.pointerId !== sheetDrag.pointerId) return;
    const dy = event.clientY - sheetDrag.startY;
    const modal = sheetDrag.el.closest('[data-budget-modal]');
    const name = modal?.dataset.budgetModalName;
    if (typeof name === 'string' && dy > 100) closeModal(name);
    try {
      sheetDrag.el.releasePointerCapture(sheetDrag.pointerId);
    } catch {
      /* ignore */
    }
    sheetDrag = null;
  };

  rootContainer.addEventListener('click', onClick);
  if (budgetModalPortal) {
    budgetModalPortal.addEventListener('click', onClick);
  }
  rootContainer.addEventListener('change', onChange);
  rootContainer.addEventListener('focusout', onBlur, true);
  const ptrRoot = modalPointerRoot();
  if (ptrRoot) {
    ptrRoot.addEventListener('pointerdown', onSheetPointerDown, true);
    ptrRoot.addEventListener('pointerup', onSheetPointerUp, true);
    ptrRoot.addEventListener('pointercancel', onSheetPointerUp, true);
  }
  document.addEventListener('keydown', onKeyDown);

  onStorageSync = () => runShoppingImport();
  window.addEventListener('adhd-storage-sync', onStorageSync);
}

function unbindEvents() {
  unbindOnboardingEvents();
  const ptrRoot = budgetModalPortal ?? rootContainer;
  if (!rootContainer && !ptrRoot) return;
  if (rootContainer && onClick) rootContainer.removeEventListener('click', onClick);
  if (budgetModalPortal && onClick) budgetModalPortal.removeEventListener('click', onClick);
  if (rootContainer && onChange) rootContainer.removeEventListener('change', onChange);
  if (rootContainer && onBlur) rootContainer.removeEventListener('focusout', onBlur, true);
  if (onSheetPointerDown && ptrRoot) ptrRoot.removeEventListener('pointerdown', onSheetPointerDown, true);
  if (onSheetPointerUp && ptrRoot) {
    ptrRoot.removeEventListener('pointerup', onSheetPointerUp, true);
    ptrRoot.removeEventListener('pointercancel', onSheetPointerUp, true);
  }
  if (onKeyDown) document.removeEventListener('keydown', onKeyDown);
  if (onStorageSync) window.removeEventListener('adhd-storage-sync', onStorageSync);
  onClick = null;
  onChange = null;
  onBlur = null;
  onKeyDown = null;
  onSheetPointerDown = null;
  onSheetPointerUp = null;
  sheetDrag = null;
  onStorageSync = null;
}

const budget = {
  id: 'budget',
  label: 'Budget',
  icon: '💶',

  init(container) {
    rootContainer = container;
    migrateBudgetOnboardingFlag();
    const needsOnboarding = !isBudgetOnboarded() && !hasPersistedBudgetConfig();

    config = readConfig();
    expenses = readExpenses();
    savings = readSavings();
    expenses = importShoppingToBudget(expenses);
    historyMonth = nowMonth();
    historyFilterCat = '';
    expensePickCategory = config.categories[0]?.id || 'divers';

    const rawCfg = load(CONFIG_KEY, null);
    if (!needsOnboarding) {
      if (rawCfg == null) persistConfig(config);
      else if (typeof rawCfg === 'object' && !normalizePeriodStartDate(rawCfg.currentPeriodStartDate)) {
        persistConfig(config);
      }
      if (load(SAVINGS_KEY, null) == null) persistSavings(savings);
    }

    if (needsOnboarding) {
      rootContainer.innerHTML = renderBudgetOnboarding();
      bindOnboardingEvents();
      return;
    }

    rootContainer.innerHTML = createBudgetShell();
    mountBudgetModalsToBody();
    bindEvents();
    syncAll();
    syncExpensePicker();
  },

  destroy() {
    unbindEvents();
    document.documentElement.style.overflow = '';
    if (budgetModalPortal?.isConnected) {
      budgetModalPortal.remove();
    }
    budgetModalPortal = null;
    rootContainer = null;
  },

  getDashboardWidget() {
    const cfg = readConfig();
    const ex = readExpenses();
    const sav = readSavings();
    const snap = computeMonthSnapshot(cfg, ex);
    const next = nextSavingsProject(sav);
    return renderDashboardWidget({
      remaining: snap.remaining,
      barPct: snap.barPct,
      tone: snap.tone,
      projectLabel: next.label,
      projectPct: next.pct
    });
  }
};

export default budget;
