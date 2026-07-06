// main.js — Point d'entrée de l'application

import './core/styles.css';
import {
  syncFromPocketBase,
  getSyncIndicatorState,
} from './core/storage.js';
import { initTheme } from './core/theme.js';
import { navigate, getCurrentModule, onNavigate } from './core/router.js';
import { isOnboardingDone, mountOnboarding } from './shell/onboarding.js';
import {
  initNavigation,
  renderNavigation,
  updateSyncIndicatorInNav,
  updateNavigationLayout
} from './shell/navigation.js';
import {
  initializeModulesSettingsIfNeeded,
  getNavModulesOrdered,
  isModuleEnabledForNav
} from './shell/nav-modules.js';
import dashboard from './modules/dashboard/index.js';
import nowModule from './modules/now/index.js';
import capture from './modules/capture/index.js';
import tasks from './modules/tasks/index.js';
import habits from './modules/habits/index.js';
import memo from './modules/memo/index.js';
import pomodoro from './modules/pomodoro/index.js';
import weather from './modules/weather/index.js';
import mood from './modules/mood/index.js';
import focus from './modules/focus/index.js';
import breathing from './modules/breathing/index.js';
import settingsModule from './modules/settings/index.js';

const MODULE_LOADERS = {
  budget: () => import('./modules/budget/index.js'),
  calendar: () => import('./modules/calendar/index.js'),
  recipes: () => import('./modules/recipes/index.js'),
  shopping: () => import('./modules/shopping/index.js'),
  'planning-boulot': () => import('./modules/planning-boulot/index.js'),
  notes: () => import('./modules/notes/index.js'),
  medications: () => import('./modules/medications/index.js'),
  journal: () => import('./modules/journal/index.js')
};

const MODULE_LOADING_HTML = `
  <div class="module-loading">
    <div class="module-loading__spinner"></div>
  </div>
`;

function createLazyModuleProxy({ id, label, icon, loaderKey }) {
  const loader = MODULE_LOADERS[loaderKey];
  return {
    id,
    label,
    icon,
    _lazy: true,
    _loader: loader,
    _loaded: null,
    _loadToken: 0,
    init(container) {
      if (this._loaded) {
        return this._loaded.init(container);
      }
      this._loadToken += 1;
      const token = this._loadToken;
      container.innerHTML = MODULE_LOADING_HTML;
      return loader().then((m) => {
        if (token !== this._loadToken) return;
        this._loaded = m.default;
        return this._loaded.init(container);
      });
    },
    destroy() {
      this._loadToken += 1;
      return this._loaded?.destroy?.();
    },
    getDashboardWidget() {
      return this._loaded?.getDashboardWidget?.() ?? null;
    }
  };
}

function prefetchLazyModules() {
  const scheduleIdle = window.requestIdleCallback ?? ((cb) => window.setTimeout(cb, 1));
  scheduleIdle(() => {
    window.setTimeout(() => {
      MODULE_LOADERS.budget?.();
      MODULE_LOADERS.calendar?.();
    }, 2000);
  });
}
import {
  initGestures,
  renderModule,
  initNativeTouchShell,
  isMobileViewport
} from './shell/gestures.js';

let undoToastHost = null;
let undoToastState = null;

// =============================================
// RENDU PRINCIPAL
// =============================================
const app = document.getElementById('app');
const NAV_CONTAINER_ID = 'app-module-nav';
const MODULE_CONTAINER_ID = 'app-module-content';
const MODULE_MOUNT_ID = 'app-module-mount';
const MODULE_PAN_LAYER_ID = 'app-module-pan-layer';
const MODULE_PARALLAX_ID = 'app-module-parallax';
/** Premier lancement : onboarding plein écran une seule fois. */

let activeModule = null;
/** Retour de `initGestures` : direction de transition pour la navigation par la barre / deep links. */
let gesturesNavHelpers = null;
let navContainer = null;
let moduleContainer = null;
/** Contenu réel des modules (enfant de `#app-module-content`) pour transitions sans casser destroy(). */
let moduleMount = null;
let modulePanLayer = null;
let moduleParallaxInner = null;
let moduleEdgeGlowEl = null;

function ensureUndoToastHost() {
  if (undoToastHost instanceof HTMLElement && undoToastHost.isConnected) return undoToastHost;
  undoToastHost = document.createElement('div');
  undoToastHost.className = 'app-undo-toast-host';
  undoToastHost.setAttribute('aria-live', 'polite');
  undoToastHost.setAttribute('aria-atomic', 'true');
  document.body.appendChild(undoToastHost);
  return undoToastHost;
}

function clearUndoToastState() {
  if (!undoToastState) return;
  if (undoToastState.expireTimer) {
    clearTimeout(undoToastState.expireTimer);
  }
  if (undoToastState.dismissTimer) {
    clearTimeout(undoToastState.dismissTimer);
  }
  if (undoToastState.toastEl?.isConnected) {
    undoToastState.toastEl.remove();
  }
  undoToastState = null;
}

function showUndoToast(message, onUndo, delay = 4000) {
  if (typeof message !== 'string' || !message.trim()) return;
  const host = ensureUndoToastHost();
  const safeDelay = Number.isFinite(delay) ? Math.max(1000, Number(delay)) : 4000;

  clearUndoToastState();

  const toast = document.createElement('div');
  toast.className = 'app-undo-toast is-entering';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <div class="app-undo-toast__row">
      <span class="app-undo-toast__text"></span>
      <button type="button" class="app-undo-toast__action">Annuler</button>
    </div>
    <div class="app-undo-toast__progress" aria-hidden="true">
      <span class="app-undo-toast__progress-bar"></span>
    </div>
  `;

  const textNode = toast.querySelector('.app-undo-toast__text');
  const undoBtn = toast.querySelector('.app-undo-toast__action');
  const progressBar = toast.querySelector('.app-undo-toast__progress-bar');
  if (textNode instanceof HTMLElement) textNode.textContent = message.trim();
  if (progressBar instanceof HTMLElement) {
    progressBar.style.animationDuration = `${safeDelay}ms`;
  }

  let isDone = false;
  const finish = () => {
    if (isDone) return;
    isDone = true;
    toast.classList.remove('is-entering');
    toast.classList.add('is-leaving');
    const dismissTimer = window.setTimeout(() => {
      if (undoToastState?.toastEl === toast) {
        clearUndoToastState();
      } else if (toast.isConnected) {
        toast.remove();
      }
    }, 260);
    if (undoToastState?.toastEl === toast) {
      undoToastState.dismissTimer = dismissTimer;
    }
  };

  if (undoBtn instanceof HTMLButtonElement) {
    undoBtn.addEventListener('click', () => {
      if (isDone) return;
      if (typeof onUndo === 'function') onUndo();
      finish();
    });
  }

  host.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('is-entering');
  });

  undoToastState = {
    toastEl: toast,
    expireTimer: window.setTimeout(() => {
      finish();
    }, safeDelay),
    dismissTimer: null
  };
}

window.showUndoToast = showUndoToast;

let lastSaveFailedToastAt = 0;
const SAVE_FAILED_TOAST_COOLDOWN_MS = 10_000;

document.addEventListener('ancrage:save-failed', () => {
  const now = Date.now();
  if (now - lastSaveFailedToastAt < SAVE_FAILED_TOAST_COOLDOWN_MS) return;
  lastSaveFailedToastAt = now;
  showUndoToast(
    "La sauvegarde a échoué — l'espace local est plein. Tes données récentes sont à risque : fais un export depuis Réglages.",
    () => {},
    8000
  );
});

// Initialisation du thème automatique
initTheme();

const modules = [
  nowModule,
  dashboard,
  weather,
  capture,
  createLazyModuleProxy({ id: 'shopping', label: 'Courses', icon: '🛒', loaderKey: 'shopping' }),
  createLazyModuleProxy({ id: 'recipes', label: 'Recettes', icon: '📖', loaderKey: 'recipes' }),
  createLazyModuleProxy({ id: 'budget', label: 'Budget', icon: '💶', loaderKey: 'budget' }),
  createLazyModuleProxy({ id: 'calendar', label: 'Calendrier', icon: '📅', loaderKey: 'calendar' }),
  tasks,
  habits,
  createLazyModuleProxy({ id: 'medications', label: 'Médocs', icon: '💊', loaderKey: 'medications' }),
  mood,
  createLazyModuleProxy({ id: 'journal', label: 'Journal', icon: '📔', loaderKey: 'journal' }),
  memo,
  createLazyModuleProxy({ id: 'notes', label: 'Bloc-notes', icon: '🗒️', loaderKey: 'notes' }),
  pomodoro,
  focus,
  breathing,
  createLazyModuleProxy({
    id: 'planning-boulot',
    label: 'Planning',
    icon: '🏢',
    loaderKey: 'planning-boulot'
  }),
  settingsModule
];

const SHORT_LABELS_BY_MODULE_ID = {
  dashboard: 'Accueil',
  now: 'Que faire ?',
  weather: 'Météo',
  capture: 'Capture',
  shopping: 'Courses',
  recipes: 'Recettes',
  budget: 'Budget',
  calendar: 'Agenda',
  tasks: 'Tâches',
  memo: 'Mémo',
  pomodoro: 'Pomodoro',
  mood: 'Humeur',
  habits: 'Habitudes',
  medications: 'Médocs',
  journal: 'Journal',
  notes: 'Post-its',
  focus: 'Focus',
  breathing: 'Respiration',
  'planning-boulot': 'Planning',
  settings: 'Réglages'
};

function getModuleById(moduleId) {
  return modules.find((module) => module.id === moduleId) || modules[0] || null;
}

function pushModuleNavigation(moduleId) {
  if (activeModule?.id === moduleId && location.hash === `#${moduleId}`) {
    return;
  }
  gesturesNavHelpers?.prepareModuleTransitionForPush(activeModule, moduleId);
  navigate(moduleId);
}

function handleShellPopstate() {
  const raw = location.hash.slice(1) || 'now';
  if (!isModuleEnabledForNav(raw)) {
    history.replaceState({}, '', '#now');
    renderModule('now', { fromPopstate: true });
    return;
  }
  renderModule(raw, { fromPopstate: true });
}

function initLayout() {
  if (!app) return;

  app.innerHTML = `
    <nav id="${NAV_CONTAINER_ID}" aria-label="Navigation modules"></nav>
    <main id="${MODULE_CONTAINER_ID}" class="module-stage">
      <div class="app-module-edge-glow" data-app-edge-glow aria-hidden="true"></div>
      <div id="${MODULE_PAN_LAYER_ID}" class="app-module-pan-layer">
        <div id="${MODULE_PARALLAX_ID}" class="app-module-parallax">
          <div id="${MODULE_MOUNT_ID}"></div>
        </div>
      </div>
    </main>
  `;

  navContainer = document.getElementById(NAV_CONTAINER_ID);
  moduleContainer = document.getElementById(MODULE_CONTAINER_ID);
  modulePanLayer = document.getElementById(MODULE_PAN_LAYER_ID);
  moduleParallaxInner = document.getElementById(MODULE_PARALLAX_ID);
  moduleMount = document.getElementById(MODULE_MOUNT_ID);
  moduleEdgeGlowEl = moduleContainer?.querySelector('[data-app-edge-glow]') ?? null;

  initNativeTouchShell();

  document.addEventListener('ancrage:modules-updated', () => {
    const id = activeModule?.id || getCurrentModule();
    if (!isModuleEnabledForNav(id)) {
      pushModuleNavigation('now');
      return;
    }
    renderNavigation(id);
  });

  if (navContainer) {
    navContainer.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const button = target.closest('[data-module-nav]');
      if (!(button instanceof HTMLButtonElement)) return;
      const nextModuleId = button.dataset.moduleNav;
      if (!nextModuleId) return;

      pushModuleNavigation(nextModuleId);
    });
  }

  updateNavigationLayout();
}

function startApplication(options = {}) {
  const { fromFreshOnboarding = false } = options;
  gesturesNavHelpers = initGestures({
    navigate,
    getActiveModule: () => activeModule,
    setActiveModule: (mod) => {
      activeModule = mod;
    },
    isModuleEnabledForNav,
    getNavModulesOrdered,
    renderNavigation,
    modules,
    pushModuleNavigation,
    getNavContainer: () => navContainer,
    getModuleContainer: () => moduleContainer,
    getModuleMount: () => moduleMount,
    getModulePanLayer: () => modulePanLayer,
    getModuleParallaxInner: () => moduleParallaxInner,
    getModuleEdgeGlowEl: () => moduleEdgeGlowEl
  });
  initNavigation({
    navigate,
    modules,
    getActiveModule: () => activeModule,
    getCurrentModule,
    isModuleEnabledForNav,
    getNavModulesOrdered,
    isMobileViewport,
    getApp: () => app,
    getNavContainer: () => navContainer,
    shortLabelsByModuleId: SHORT_LABELS_BY_MODULE_ID,
    getSyncIndicatorState
  });
  initializeModulesSettingsIfNeeded(modules, fromFreshOnboarding);
  initLayout();
  window.addEventListener('adhd-storage-sync', () => updateSyncIndicatorInNav());
  onNavigate(renderModule);
  window.addEventListener('popstate', handleShellPopstate);

  const initialModule = getModuleById(getCurrentModule())?.id || 'now';
  if (location.hash) {
    gesturesNavHelpers?.setPendingModuleTransitionDir('forward');
    renderModule(initialModule);
  } else {
    pushModuleNavigation('now');
  }
  updateSyncIndicatorInNav();
  prefetchLazyModules();

  syncFromPocketBase()
    .then(() => {
      updateSyncIndicatorInNav();
      document.dispatchEvent(new CustomEvent('ancrage:sync-complete'));
    })
    .catch(() => {
      updateSyncIndicatorInNav();
    });
}

if (isOnboardingDone()) {
  startApplication({ fromFreshOnboarding: false });
} else {
  mountOnboarding(() => {
    startApplication({ fromFreshOnboarding: true });
  });
}
