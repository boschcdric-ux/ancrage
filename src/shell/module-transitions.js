// shell/module-transitions.js — renderModule et transitions entre couches module

import { isMobileViewport, prefersReducedMotionModules } from '../core/viewport.js';
import { MODULES_HELP, showModuleHelp } from '../core/module-help.js';
import { resetModulePanVisuals } from './swipe-detection.js';

/**
 * @typedef {object} ModuleTransitionsConfig
 * @property {(moduleId: string) => boolean} isModuleEnabledForNav
 * @property {(modules: unknown[]) => { id: string }[]} getNavModulesOrdered
 * @property {(moduleId: string) => void} renderNavigation
 * @property {unknown[]} modules
 * @property {(moduleId: string) => void} pushModuleNavigation
 * @property {() => HTMLElement | null} getModuleContainer
 * @property {() => HTMLElement | null} getModuleMount
 * @property {() => HTMLElement | null} getModulePanLayer
 * @property {() => { id: string; destroy?: () => void; init: (el: HTMLElement) => void } | null} getActiveModule
 * @property {(module: { id: string; destroy?: () => void; init: (el: HTMLElement) => void } | null) => void} setActiveModule
 */

export const MODULE_TRANSITION_MS = 280;
export const MODULE_DESKTOP_FADE_MS = 200;

/** @type {ModuleTransitionsConfig | null} */
let transitionsConfig = null;

/** `forward` | `back` — consommé par `renderModule`. */
let pendingModuleTransitionDir = 'forward';

let moduleTransitionTimer = null;
/** Navigation par swipe : après la transition module, centrer le bouton actif dans la barre scrollable. */
let pendingMobileNavScrollAfterSwipe = false;
let mobileNavScrollAfterSwipeTimer = null;

/**
 * @param {ModuleTransitionsConfig} config
 */
export function initModuleTransitions(config) {
  transitionsConfig = config;
}

export function setPendingModuleTransitionDir(dir) {
  pendingModuleTransitionDir = dir;
}

/** Swipe horizontal : direction de transition + scroll barre mobile après `renderModule`. */
export function notifySwipeModuleNavigation(direction) {
  pendingModuleTransitionDir = direction;
  pendingMobileNavScrollAfterSwipe = true;
}

export function isModuleLayerTransitionTimerActive() {
  return moduleTransitionTimer !== null;
}

function getNavModuleIdsOrdered() {
  if (!transitionsConfig) return [];
  return transitionsConfig.getNavModulesOrdered(transitionsConfig.modules).map((m) => m.id);
}

function getModuleById(moduleId) {
  if (!transitionsConfig) return null;
  return (
    transitionsConfig.modules.find((module) => module.id === moduleId) || transitionsConfig.modules[0] || null
  );
}

function clearModuleTransitionClasses(el) {
  if (!(el instanceof HTMLElement)) return;
  el.classList.remove(
    'module-enter',
    'module-enter-active',
    'module-exit',
    'module-exit-active',
    'module-enter-back',
    'module-enter-back-active',
    'module-exit-back',
    'module-exit-back-active',
    'module-enter-desktop',
    'module-enter-desktop-active',
    'module-exit-desktop',
    'module-exit-desktop-active'
  );
}

function resetModuleScrollPositions() {
  const moduleContainer = transitionsConfig?.getModuleContainer?.();
  const moduleMount = transitionsConfig?.getModuleMount?.();
  if (moduleContainer instanceof HTMLElement) {
    moduleContainer.scrollTop = 0;
  }
  if (moduleMount instanceof HTMLElement) {
    moduleMount.scrollTop = 0;
  }
  window.scrollTo(0, 0);
}

/** @type {MutationObserver | null} */
let focusHelpObserver = null;

function teardownFocusHelpObserver() {
  if (focusHelpObserver) {
    focusHelpObserver.disconnect();
    focusHelpObserver = null;
  }
}

function isFocusModeActive() {
  return (
    document.documentElement.dataset.focusActive === 'true' ||
    document.querySelector('.focus--active') != null
  );
}

function syncFocusHelpTriggerVisibility() {
  const helpBtn = document.querySelector('.module-help-trigger');
  if (!(helpBtn instanceof HTMLElement)) return;
  helpBtn.hidden = isFocusModeActive();
}

function setupFocusHelpObserver() {
  teardownFocusHelpObserver();
  const moduleMount = transitionsConfig?.getModuleMount?.();
  const focusRoot = moduleMount?.querySelector('.focus[data-focus-root]');
  if (!(focusRoot instanceof HTMLElement)) return;

  syncFocusHelpTriggerVisibility();

  focusHelpObserver = new MutationObserver(syncFocusHelpTriggerVisibility);
  focusHelpObserver.observe(focusRoot, { attributes: true, attributeFilter: ['class'] });
  focusHelpObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-focus-active']
  });
}

function syncModuleHelpTrigger(moduleId) {
  document.querySelector('.module-help-trigger')?.remove();
  teardownFocusHelpObserver();
  if (!MODULES_HELP[moduleId]) return;

  const helpBtn = document.createElement('button');
  helpBtn.type = 'button';
  helpBtn.className = `module-help-trigger module-help-trigger--${moduleId}`;
  helpBtn.setAttribute('aria-label', 'En savoir plus sur cet outil');
  helpBtn.textContent = '?';
  helpBtn.addEventListener('click', () => showModuleHelp(moduleId));
  document.body.appendChild(helpBtn);

  if (moduleId === 'focus') {
    setupFocusHelpObserver();
  }
}

export function renderModule(moduleId, navMeta) {
  const config = transitionsConfig;
  if (!config) return;
  if (!config.isModuleEnabledForNav(moduleId)) {
    config.pushModuleNavigation('now');
    return;
  }

  const moduleMount = config.getModuleMount();
  const moduleContainer = config.getModuleContainer();
  const modulePanLayer = config.getModulePanLayer();

  const nextModule = getModuleById(moduleId);
  if (!nextModule || !moduleMount || !moduleContainer) return;

  const activeModule = config.getActiveModule();

  if (navMeta?.fromPopstate && activeModule?.id) {
    const ids = getNavModuleIdsOrdered();
    const io = ids.indexOf(activeModule.id);
    const in_ = ids.indexOf(moduleId);
    if (io !== -1 && in_ !== -1) {
      pendingModuleTransitionDir = in_ < io ? 'back' : 'forward';
    }
  }

  const direction = pendingModuleTransitionDir;
  pendingModuleTransitionDir = 'forward';

  if (moduleTransitionTimer !== null) {
    clearTimeout(moduleTransitionTimer);
    moduleTransitionTimer = null;
  }

  const staleOutgoing = moduleContainer.querySelector('.module-layer-outgoing');
  if (staleOutgoing instanceof HTMLElement) {
    staleOutgoing.remove();
  }

  const hadPrevious = activeModule != null;
  const useMotion = !prefersReducedMotionModules();
  let moduleTransitionDurationForNavScroll = 0;

  if (hadPrevious && useMotion) {
    const outLayer = document.createElement('div');
    outLayer.className = 'module-layer-outgoing';
    outLayer.setAttribute('aria-hidden', 'true');
    while (moduleMount.firstChild) {
      outLayer.appendChild(moduleMount.firstChild);
    }
    const panBefore =
      modulePanLayer instanceof HTMLElement && moduleContainer.contains(modulePanLayer)
        ? modulePanLayer
        : moduleMount;
    moduleContainer.insertBefore(outLayer, panBefore);

    if (activeModule && typeof activeModule.destroy === 'function') {
      activeModule.destroy();
    }

    nextModule.init(moduleMount);
    resetModuleScrollPositions();

    const useSlideTransition = isMobileViewport();
    let enterA;
    let enterB;
    let exitA;
    let exitB;
    let transitionMs;
    if (useSlideTransition) {
      const forward = direction !== 'back';
      enterA = forward ? 'module-enter' : 'module-enter-back';
      enterB = forward ? 'module-enter-active' : 'module-enter-back-active';
      exitA = forward ? 'module-exit' : 'module-exit-back';
      exitB = forward ? 'module-exit-active' : 'module-exit-back-active';
      transitionMs = MODULE_TRANSITION_MS;
    } else {
      enterA = 'module-enter-desktop';
      enterB = 'module-enter-desktop-active';
      exitA = 'module-exit-desktop';
      exitB = 'module-exit-desktop-active';
      transitionMs = MODULE_DESKTOP_FADE_MS;
    }

    moduleTransitionDurationForNavScroll = transitionMs;

    clearModuleTransitionClasses(moduleMount);
    moduleMount.classList.add(enterA);
    void moduleMount.offsetWidth;
    moduleMount.classList.add(enterB);

    outLayer.classList.add(exitA);
    void outLayer.offsetWidth;
    outLayer.classList.add(exitB);

    moduleTransitionTimer = window.setTimeout(() => {
      outLayer.remove();
      clearModuleTransitionClasses(moduleMount);
      moduleTransitionTimer = null;
    }, transitionMs);
  } else {
    if (activeModule && typeof activeModule.destroy === 'function') {
      activeModule.destroy();
    }
    clearModuleTransitionClasses(moduleMount);
    nextModule.init(moduleMount);
    resetModuleScrollPositions();
  }

  const scrollNavAfterSwipe = pendingMobileNavScrollAfterSwipe;
  if (pendingMobileNavScrollAfterSwipe) {
    pendingMobileNavScrollAfterSwipe = false;
  }

  config.setActiveModule(nextModule);
  config.renderNavigation(nextModule.id);
  syncModuleHelpTrigger(nextModule.id);
  resetModulePanVisuals();

  if (mobileNavScrollAfterSwipeTimer !== null) {
    clearTimeout(mobileNavScrollAfterSwipeTimer);
    mobileNavScrollAfterSwipeTimer = null;
  }
  if (scrollNavAfterSwipe && isMobileViewport()) {
    mobileNavScrollAfterSwipeTimer = window.setTimeout(() => {
      mobileNavScrollAfterSwipeTimer = null;
      const activeBtn = document.querySelector('.mobile-bar__btn.is-active');
      if (activeBtn instanceof HTMLElement) {
        activeBtn.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }, moduleTransitionDurationForNavScroll);
  }
}
