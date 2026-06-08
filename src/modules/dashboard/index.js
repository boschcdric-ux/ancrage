import './style.css';
import { createDashboardView, formatCurrentDate, formatCurrentTime } from './view.js';
import { escapeHtml } from '../../core/format.js';
import { navigate } from '../../core/router.js';
import { load, save } from '../../core/storage.js';
import { getDisabledModuleIdsSet } from '../../shell/nav-modules.js';
import pomodoroModule from '../pomodoro/index.js';
import weatherModule from '../weather/index.js';
import moodModule from '../mood/index.js';
import habitsModule from '../habits/index.js';
import medicationsModule from '../medications/index.js';
import journalModule from '../journal/index.js';
import calendarModule from '../calendar/index.js';
import recipesModule from '../recipes/index.js';
import nowModule from '../now/index.js';

let rootContainer = null;
let refreshTimer = null;
let onClick = null;
let onPomodoroStateChange = null;
let dashboardConfig = [];
let onSyncComplete = null;

const DASHBOARD_WIDGET_MODULE_BY_ID = {
  weather: 'weather',
  tada: null,
  tasks: 'tasks',
  memo: 'memo',
  mood: 'mood',
  habits: 'habits',
  medications: 'medications',
  pomodoro: 'pomodoro',
  capture: 'capture',
  calendar: 'calendar',
  journal: 'journal',
  recipes: 'recipes'
};

const WIDGET_REGISTRY = [
  { id: 'weather', icon: '🌤', label: 'Météo' },
  { id: 'tada', icon: '🎉', label: 'Ta-Da !' },
  { id: 'tasks', icon: '✅', label: 'Tâches' },
  { id: 'memo', icon: '🗒️', label: 'Mémo' },
  { id: 'mood', icon: '😊', label: 'Humeur' },
  { id: 'habits', icon: '🌱', label: 'Habitudes' },
  { id: 'medications', icon: '💊', label: 'Médicaments' },
  { id: 'pomodoro', icon: '🍅', label: 'Pomodoro' },
  { id: 'capture', icon: '⚡', label: 'Capture' },
  { id: 'calendar', icon: '📅', label: 'Calendrier' },
  { id: 'journal', icon: '📓', label: 'Journal' },
  { id: 'recipes', icon: '📖', label: 'Recettes' }
];

function getDefaultWidgetConfig() {
  return WIDGET_REGISTRY.map((widget, index) => ({
    id: widget.id,
    icon: widget.icon,
    label: widget.label,
    visible: true,
    order: index
  }));
}

function normalizeWidgetConfig(config) {
  const persistedWidgets = Array.isArray(config?.widgets) ? config.widgets : [];
  const persistedMap = new Map();
  const defaultConfig = getDefaultWidgetConfig();
  const defaultIndexById = new Map(defaultConfig.map((widget, index) => [widget.id, index]));

  for (const widget of persistedWidgets) {
    if (!widget || typeof widget.id !== 'string') continue;
    if (!WIDGET_REGISTRY.some((item) => item.id === widget.id)) continue;
    persistedMap.set(widget.id, {
      visible: widget.visible !== false,
      order: Number.isFinite(Number(widget.order)) ? Number(widget.order) : Number.POSITIVE_INFINITY
    });
  }

  return defaultConfig
    .map((widget, defaultIndex) => {
      const persisted = persistedMap.get(widget.id);
      return {
        ...widget,
        visible: persisted ? persisted.visible : true,
        order: persisted ? persisted.order : defaultIndex
      };
    })
    .sort((a, b) => {
      if (a.order === b.order) {
        return (defaultIndexById.get(a.id) ?? 0) - (defaultIndexById.get(b.id) ?? 0);
      }
      return a.order - b.order;
    })
    .map((widget, index) => ({ ...widget, order: index }));
}

function persistWidgetConfig(config) {
  save('dashboard:config', {
    widgets: config.map((widget, index) => ({
      id: widget.id,
      visible: widget.visible !== false,
      order: index
    }))
  });
}

function filterWidgetsByEnabledModules(config) {
  const disabledModuleIds = getDisabledModuleIdsSet();
  return config.filter((widget) => {
    const moduleId = DASHBOARD_WIDGET_MODULE_BY_ID[widget.id];
    return !moduleId || !disabledModuleIds.has(moduleId);
  });
}

function localDateString(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Victoires du jour : tâches complétées aujourd'hui (adhd-app:tasks:items) + habitudes cochées (habits:completions).
 */
function readTaDaData(referenceDate = new Date()) {
  const todayKey = localDateString(referenceDate.getTime());

  const tasksRaw = load('tasks:items', []);
  const safeTasks = Array.isArray(tasksRaw) ? tasksRaw : [];
  const entries = [];

  for (const task of safeTasks) {
    if (!task || typeof task.text !== 'string') continue;
    if (task.completed === true && task.completedAt != null) {
      const at = Number(task.completedAt);
      if (!Number.isFinite(at)) continue;
      if (localDateString(at) !== todayKey) continue;
      const text = task.text.trim();
      entries.push({ label: text || 'Tâche', at });
    }
  }

  const habitsRaw = load('habits:list', []);
  const habitById = new Map();
  if (Array.isArray(habitsRaw)) {
    for (const h of habitsRaw) {
      if (!h || typeof h.id !== 'string') continue;
      const emoji = typeof h.emoji === 'string' && h.emoji.trim() ? h.emoji.trim() : '✨';
      const name = typeof h.name === 'string' ? h.name.trim() : '';
      habitById.set(h.id, { emoji, name: name || 'Habitude' });
    }
  }

  const completionsRaw = load('habits:completions', []);
  const completions = Array.isArray(completionsRaw) ? completionsRaw : [];
  const habitBest = new Map();
  for (const c of completions) {
    if (!c || typeof c.habitId !== 'string' || c.date !== todayKey) continue;
    const at = Number(c.timestamp) || 0;
    const prev = habitBest.get(c.habitId);
    if (!prev || at >= prev.at) {
      const habit = habitById.get(c.habitId);
      const label = habit ? `${habit.emoji} ${habit.name}` : 'Habitude';
      habitBest.set(c.habitId, { label, at });
    }
  }
  for (const item of habitBest.values()) {
    entries.push(item);
  }

  entries.sort((a, b) => b.at - a.at);

  return { entries, total: entries.length };
}

function readTasksData() {
  const tasks = load('tasks:items', []);
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const incomplete = safeTasks.filter((task) => task && typeof task.text === 'string' && task.completed !== true);
  const completed = safeTasks.filter((task) => task && task.completed === true).length;

  return {
    nextTasks: incomplete
      .sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0))
      .slice(0, 3),
    completed,
    total: safeTasks.length
  };
}

function readMemoData() {
  const memoData = load('memo:data', { sections: [] });
  const sections = Array.isArray(memoData?.sections) ? memoData.sections : [];
  const allCards = sections.flatMap((section) => (Array.isArray(section?.cards) ? section.cards : []));
  const pinnedCards = allCards
    .filter((card) => card && card.pinned)
    .slice(0, 3)
    .map((card) => ({
      title: typeof card.title === 'string' ? card.title : '',
      preview:
        typeof card.preview === 'string'
          ? card.preview
          : typeof card.content === 'string'
            ? card.content
            : ''
    }));

  return { pinnedCards, totalCards: allCards.length };
}

function readPomodoroData(moduleWidget) {
  const content = typeof moduleWidget?.content === 'string' ? moduleWidget.content : '';
  const activeLabel = content.includes('en cours') ? content : '';
  return { activeLabel };
}

function readCaptureData() {
  const captures = load('capture:items', []);
  const safeCaptures = Array.isArray(captures) ? captures : [];
  const latestCaptures = safeCaptures
    .sort((a, b) => (Number(b?.createdAt) || 0) - (Number(a?.createdAt) || 0))
    .filter((capture) => capture && typeof capture.text === 'string')
    .slice(0, 3);

  return { latestCaptures };
}

function readWeatherData(moduleWidget) {
  const content = typeof moduleWidget?.content === 'string' ? moduleWidget.content : '';
  return { content };
}

function readMoodData(moduleWidget) {
  const content = typeof moduleWidget?.content === 'string' ? moduleWidget.content : '';
  return { content };
}

function readHabitsData(moduleWidget) {
  const content = typeof moduleWidget?.content === 'string' ? moduleWidget.content : '';
  return { content };
}

function readMedicationsData(moduleWidget) {
  const content = typeof moduleWidget?.content === 'string' ? moduleWidget.content : '';
  return { content };
}

function readJournalData(moduleWidget) {
  const content = typeof moduleWidget?.content === 'string' ? moduleWidget.content : '';
  return { content };
}

function readCalendarData(moduleWidget) {
  const content = typeof moduleWidget?.content === 'string' ? moduleWidget.content : '';
  return { content };
}

function readRecipesData(moduleWidget) {
  const content = typeof moduleWidget?.content === 'string' ? moduleWidget.content : '';
  return { content };
}

function readNowData(moduleWidget) {
  const content = typeof moduleWidget?.content === 'string' ? moduleWidget.content : '';
  return { content };
}

function collectWidgetsData(now = new Date()) {
  // Appel explicite de tous les widgets des modules actifs.
  const pomodoroWidget = pomodoroModule.getDashboardWidget?.();
  const weatherWidget = weatherModule.getDashboardWidget?.();
  const moodWidget = moodModule.getDashboardWidget?.();
  const habitsWidget = habitsModule.getDashboardWidget?.();
  const medicationsWidget = medicationsModule.getDashboardWidget?.();
  const journalWidget = journalModule.getDashboardWidget?.();
  const calendarWidget = calendarModule.getDashboardWidget?.();
  const recipesWidget = recipesModule.getDashboardWidget?.();
  const nowWidget = nowModule.getDashboardWidget?.();

  return {
    tada: readTaDaData(now),
    tasks: readTasksData(),
    memo: readMemoData(),
    pomodoro: readPomodoroData(pomodoroWidget),
    capture: readCaptureData(),
    weather: readWeatherData(weatherWidget),
    mood: readMoodData(moodWidget),
    habits: readHabitsData(habitsWidget),
    medications: readMedicationsData(medicationsWidget),
    journal: readJournalData(journalWidget),
    calendar: readCalendarData(calendarWidget),
    recipes: readRecipesData(recipesWidget),
    now: readNowData(nowWidget)
  };
}

/**
 * Bloc d’accueil « Que faire ? » : doit être remonté à chaque renderDashboard()
 * (rafraîchissement 30 s inclus), car le innerHTML du dashboard le détruit.
 * @param {{ content?: string }} nowData — issu de collectWidgetsData().now (un seul appel getDashboardWidget).
 */
function hasCustomizeSheet() {
  return Boolean(document.querySelector('.dashboard-customize-sheet'));
}

function buildWidgetList() {
  const widgets = filterWidgetsByEnabledModules(dashboardConfig);
  return widgets
    .map(
      (widget) => `
    <li class="dashboard-customize-item">
      <label class="dashboard-customize-check">
        <input
          type="checkbox"
          data-dashboard-widget-toggle
          data-dashboard-widget-id="${widget.id}"
          ${widget.visible ? 'checked' : ''}
        />
        <span class="dashboard-customize-check-label">${widget.icon} ${escapeHtml(widget.label)}</span>
      </label>
    </li>`
    )
    .join('');
}

function bindCustomizeSheetListeners(sheet) {
  sheet.querySelectorAll('[data-dashboard-customize-close]').forEach((el) => {
    el.addEventListener('click', closeCustomizeSheet);
  });

  sheet.querySelector('[data-dashboard-reset]')?.addEventListener('click', resetWidgets);

  sheet.querySelectorAll('[data-dashboard-widget-toggle]').forEach((el) => {
    el.addEventListener('change', handleWidgetToggle);
  });
}

function openCustomizeSheet() {
  document.querySelector('.dashboard-customize-sheet')?.remove();

  const sheet = document.createElement('div');
  sheet.className = 'dashboard-customize-sheet';
  sheet.innerHTML = `
    <div class="dashboard-customize-backdrop" data-dashboard-customize-close></div>
    <div class="dashboard-customize-panel" role="dialog" aria-modal="true" aria-labelledby="dashboard-customize-heading">
      <div class="dashboard-customize-handle">
        <div class="dashboard-customize-handle-bar"></div>
      </div>
      <div class="dashboard-customize-header">
        <h2 id="dashboard-customize-heading">Aperçus</h2>
        <button type="button" class="dashboard-customize-close-btn" data-dashboard-customize-close aria-label="Fermer">✕</button>
      </div>
      <div class="dashboard-customize-scroll">
        <ul class="dashboard-customize-list">
          ${buildWidgetList()}
        </ul>
      </div>
      <div class="dashboard-customize-footer">
        <button type="button" class="btn btn-secondary" data-dashboard-reset>Réinitialiser</button>
      </div>
    </div>
  `;

  document.body.appendChild(sheet);
  bindCustomizeSheetListeners(sheet);

  const toggleBtn = rootContainer?.querySelector('[data-dashboard-customize-toggle]');
  if (toggleBtn instanceof HTMLButtonElement) {
    toggleBtn.setAttribute('aria-expanded', 'true');
  }

  requestAnimationFrame(() => {
    sheet.classList.add('is-open');
  });
}

function closeCustomizeSheet() {
  const sheet = document.querySelector('.dashboard-customize-sheet');
  if (!sheet) return;

  const toggleBtn = rootContainer?.querySelector('[data-dashboard-customize-toggle]');
  if (toggleBtn instanceof HTMLButtonElement) {
    toggleBtn.setAttribute('aria-expanded', 'false');
  }

  sheet.classList.remove('is-open');

  const panel = sheet.querySelector('.dashboard-customize-panel');
  const remove = () => sheet.remove();

  if (panel instanceof HTMLElement) {
    panel.addEventListener(
      'transitionend',
      (event) => {
        if (event.propertyName === 'transform') remove();
      },
      { once: true }
    );
  }

  window.setTimeout(remove, 350);
}

function handleWidgetToggle(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const widgetId = target.dataset.dashboardWidgetId;
  if (!widgetId) return;

  dashboardConfig = dashboardConfig.map((widget) =>
    widget.id === widgetId ? { ...widget, visible: target.checked } : widget
  );
  persistWidgetConfig(dashboardConfig);
  renderDashboard();
}

function resetWidgets() {
  dashboardConfig = getDefaultWidgetConfig();
  persistWidgetConfig(dashboardConfig);
  renderDashboard();

  const list = document.querySelector('.dashboard-customize-list');
  if (list) {
    list.innerHTML = buildWidgetList();
    const sheet = document.querySelector('.dashboard-customize-sheet');
    if (sheet) {
      sheet.querySelectorAll('[data-dashboard-widget-toggle]').forEach((el) => {
        el.addEventListener('change', handleWidgetToggle);
      });
    }
  }
}

function mountNowWelcomeBlock(nowData) {
  if (!rootContainer) return;
  const welcomeMain = rootContainer.querySelector('.dashboard__welcome-main');
  if (!welcomeMain) return;

  welcomeMain.querySelector('.now-dashboard-host')?.remove();

  const compactHtml = typeof nowData?.content === 'string' ? nowData.content : '';

  const host = document.createElement('div');
  host.className = 'now-dashboard-host';
  host.innerHTML = `
    <button type="button" class="btn now-dashboard-cta" data-dashboard-nav="now" aria-label="Ouvrir Que faire maintenant">
      🧭 Que faire ?
    </button>
    ${compactHtml}
  `;

  const dateEl = welcomeMain.querySelector('.dashboard__date');
  if (dateEl) {
    dateEl.insertAdjacentElement('afterend', host);
  } else {
    welcomeMain.appendChild(host);
  }
}

function renderDashboard() {
  if (!rootContainer) return;
  const now = new Date();
  const widgetsData = collectWidgetsData(now);
  const filteredWidgetConfig = filterWidgetsByEnabledModules(dashboardConfig);
  rootContainer.innerHTML = createDashboardView(now, widgetsData, {
    widgets: filteredWidgetConfig,
    customization: {
      isOpen: hasCustomizeSheet()
    }
  });
  const emptyState = rootContainer.querySelector('.dashboard__empty-state');
  if (emptyState) {
    emptyState.textContent = 'Active des outils dans les Réglages ⚙️';
  }
  mountNowWelcomeBlock(widgetsData.now);
  window.dispatchEvent(new CustomEvent('adhd:dashboard-rendered'));
}

function updatePomodoroWidgetOnly() {
  if (!rootContainer) return;

  const { activeLabel } = readPomodoroData(pomodoroModule.getDashboardWidget?.());
  const hasActiveSession = Boolean(activeLabel);

  const statusElement = rootContainer.querySelector('[data-dashboard-pomodoro-status]');
  if (statusElement) {
    statusElement.textContent = hasActiveSession ? activeLabel : 'Aucune session active';
    statusElement.classList.toggle('dashboard__status', hasActiveSession);
    statusElement.classList.toggle('dashboard__muted', !hasActiveSession);
  }

  const ctaElement = rootContainer.querySelector('[data-dashboard-pomodoro-cta]');
  if (ctaElement instanceof HTMLButtonElement) {
    ctaElement.hidden = hasActiveSession;
  }
}

function updateLiveDateTime() {
  if (!rootContainer) return;

  const now = new Date();
  const timeElement = rootContainer.querySelector('[data-dashboard-time]');
  const dateElement = rootContainer.querySelector('[data-dashboard-date]');

  if (timeElement) timeElement.textContent = formatCurrentTime(now);
  if (dateElement) dateElement.textContent = formatCurrentDate(now);
}

function startClock() {
  renderDashboard();

  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    renderDashboard();
    updateLiveDateTime();
  }, 30_000);
}

function bindEvents() {
  if (!rootContainer) return;

  onClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const customizeToggle = target.closest('[data-dashboard-customize-toggle]');
    if (customizeToggle instanceof HTMLButtonElement) {
      if (hasCustomizeSheet()) {
        closeCustomizeSheet();
      } else {
        openCustomizeSheet();
      }
      return;
    }

    const navButton = target.closest('[data-dashboard-nav]');
    if (!(navButton instanceof HTMLButtonElement)) return;
    const moduleId = navButton.dataset.dashboardNav;
    if (!moduleId) return;
    navigate(moduleId);
  };

  rootContainer.addEventListener('click', onClick);

  onPomodoroStateChange = () => {
    updatePomodoroWidgetOnly();
  };
  window.addEventListener('pomodoro:state-changed', onPomodoroStateChange);

  onSyncComplete = () => {
    renderDashboard();
  };
  document.addEventListener('ancrage:sync-complete', onSyncComplete);
}

const dashboard = {
  id: 'dashboard',
  label: 'Accueil',
  icon: '🏠',

  init(container) {
    rootContainer = container;
    dashboardConfig = normalizeWidgetConfig(load('dashboard:config', { widgets: [] }));
    startClock();
    bindEvents();
  },

  destroy() {
    closeCustomizeSheet();
    document.querySelector('.dashboard-customize-sheet')?.remove();

    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }

    if (rootContainer) {
      if (onClick) {
        rootContainer.removeEventListener('click', onClick);
      }
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
    if (onPomodoroStateChange) {
      window.removeEventListener('pomodoro:state-changed', onPomodoroStateChange);
    }
    if (onSyncComplete) {
      document.removeEventListener('ancrage:sync-complete', onSyncComplete);
    }

    onClick = null;
    onPomodoroStateChange = null;
    onSyncComplete = null;
    dashboardConfig = [];
  },

  getDashboardWidget() {
    return null;
  }
};

export default dashboard;
