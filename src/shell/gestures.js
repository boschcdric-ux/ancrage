// shell/gestures.js — Gestes tactiles natifs et transitions entre modules

import { getCurrentModule } from '../core/router.js';
import { resolveBottomSheetFromTarget, isSheetVerticalDragAllowed } from './bottom-sheets.js';
import {
  initSwipeDetection,
  resetModulePanVisuals,
  setModulePanFromDx,
  springModulePanToZero,
  isEditableTouchTarget,
  getAdjacentNavModuleIds,
  MODULE_H_SWIPE_THRESHOLD_PX,
  MODULE_H_SWIPE_DIRECTION_MIN_DX_PX,
  MODULE_H_SWIPE_DIRECTION_RATIO,
  MODULE_VERTICAL_SCROLL_PRIORITY_RATIO,
  MODULE_H_SWIPE_DIRECTION_MIN_DX_JOURNAL_PX,
  MODULE_H_SWIPE_DIRECTION_RATIO_JOURNAL,
  MODULE_V_SCROLL_DIRECTION_MIN_DY_JOURNAL_PX
} from './swipe-detection.js';
import {
  initModuleTransitions,
  renderModule,
  MODULE_TRANSITION_MS,
  setPendingModuleTransitionDir as applyPendingModuleTransitionDir,
  notifySwipeModuleNavigation,
  isModuleLayerTransitionTimerActive
} from './module-transitions.js';
import {
  isMobileViewport,
  prefersReducedMotionModules
} from '../core/viewport.js';

export { isMobileViewport };

/**
 * @typedef {object} GesturesConfig
 * @property {(moduleId: string) => void} navigate
 * @property {() => { id: string; destroy?: () => void; init: (el: HTMLElement) => void } | null} getActiveModule
 * @property {(module: { id: string; destroy?: () => void; init: (el: HTMLElement) => void } | null) => void} setActiveModule
 * @property {(moduleId: string) => boolean} isModuleEnabledForNav
 * @property {(modules: unknown[]) => { id: string }[]} getNavModulesOrdered
 * @property {(moduleId: string) => void} renderNavigation
 * @property {unknown[]} modules
 * @property {(moduleId: string) => void} pushModuleNavigation
 * @property {() => HTMLElement | null} getNavContainer
 * @property {() => HTMLElement | null} getModuleContainer
 * @property {() => HTMLElement | null} getModuleMount
 * @property {() => HTMLElement | null} getModulePanLayer
 * @property {() => HTMLElement | null} getModuleParallaxInner
 * @property {() => HTMLElement | null} getModuleEdgeGlowEl
 */

const SHEET_SWIPE_CLOSE_THRESHOLD_PX = 80;
const GESTURE_DIRECTION_LOCK_PX = 8;

/** @type {{ touchId: number; x0: number; y0: number; mode: 'undecided' | 'horizontal' | 'vertical' } | null} */
let moduleHorizontalPan = null;

/** @type {{ touchId: number; y0: number; x0: number; ctx: { movable: HTMLElement; scrollRoot: HTMLElement; close: () => void }; mode: 'undecided' | 'vertical' | 'horizontal'; startScrollTop: number } | null} */
let sheetVerticalPan = null;

let touchShellReady = false;

/** @type {GesturesConfig | null} */
let config = null;

function getNavModuleIdsOrdered() {
  if (!config) return [];
  return config.getNavModulesOrdered(config.modules).map((m) => m.id);
}

function applyModuleNavFromSwipe(moduleId, direction) {
  notifySwipeModuleNavigation(direction);
  if (!config) return;
  config.navigate(moduleId);
}

function isInsideBlockingOverlay(target) {
  if (!(target instanceof Element)) return false;
  if (target.closest('.dashboard__customize-sheet-root')) return true;
  if (target.closest('.calendar-panel-overlay')) return true;
  if (target.closest('.budget__modal:not([hidden])')) return true;
  if (target.closest('[data-shopping-modal]:not([hidden])')) return true;
  if (target.closest('.app-onboarding')) return true;
  return false;
}

function initNativeTouchShell() {
  if (touchShellReady) return;
  touchShellReady = true;

  const onTouchStart = (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const isInEditorContent = target.closest('.journal__editor-content');
    if (isInEditorContent) return;

    if (!isMobileViewport() || prefersReducedMotionModules()) return;
    const touch = e.changedTouches?.[0];
    if (!touch) return;

    const moduleContainer = config?.getModuleContainer?.();
    const navContainer = config?.getNavContainer?.();

    const sheetCtx = resolveBottomSheetFromTarget(target);
    if (sheetCtx && isSheetVerticalDragAllowed(target, sheetCtx)) {
      sheetVerticalPan = {
        touchId: touch.identifier,
        x0: touch.clientX,
        y0: touch.clientY,
        ctx: sheetCtx,
        mode: 'undecided',
        startScrollTop: sheetCtx.scrollRoot.scrollTop
      };
      return;
    }

    if (
      !moduleContainer?.contains(target) ||
      navContainer?.contains(target) ||
      isEditableTouchTarget(target) ||
      isInsideBlockingOverlay(target)
    ) {
      return;
    }

    moduleHorizontalPan = {
      touchId: touch.identifier,
      x0: touch.clientX,
      y0: touch.clientY,
      mode: 'undecided'
    };
  };

  const onTouchMove = (e) => {
    if (!isMobileViewport() || prefersReducedMotionModules()) return;

    if (sheetVerticalPan) {
      const touch = [...e.changedTouches].find((t) => t.identifier === sheetVerticalPan.touchId);
      if (!touch) return;
      const sp = sheetVerticalPan;
      const dx = touch.clientX - sp.x0;
      const dy = touch.clientY - sp.y0;

      if (sp.mode === 'undecided') {
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        if (ady < GESTURE_DIRECTION_LOCK_PX && adx < GESTURE_DIRECTION_LOCK_PX) return;
        if (ady > adx + 4) {
          sp.mode = 'vertical';
        } else if (adx > ady + 4) {
          sheetVerticalPan = null;
          return;
        } else {
          return;
        }
      }

      if (sp.mode === 'vertical') {
        if (sp.startScrollTop > 0 && sp.ctx.scrollRoot.scrollTop > 0) {
          sheetVerticalPan = null;
          return;
        }
        const pull = Math.max(0, dy);
        sp.ctx.movable.style.transform = `translateY(${pull}px) translateZ(0)`;
        e.preventDefault();
      }
      return;
    }

    if (!moduleHorizontalPan) return;
    const touch = [...e.changedTouches].find((t) => t.identifier === moduleHorizontalPan.touchId);
    if (!touch) return;
    const mp = moduleHorizontalPan;
    const dx = touch.clientX - mp.x0;
    const dy = touch.clientY - mp.y0;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const activeModule = config?.getActiveModule?.() ?? null;
    const activeModuleId = activeModule?.id || getCurrentModule();
    const isJournalActive = activeModuleId === 'journal';
    const requiredHorizontalDx = isJournalActive
      ? MODULE_H_SWIPE_DIRECTION_MIN_DX_JOURNAL_PX
      : MODULE_H_SWIPE_DIRECTION_MIN_DX_PX;
    const requiredHorizontalRatio = isJournalActive
      ? MODULE_H_SWIPE_DIRECTION_RATIO_JOURNAL
      : MODULE_H_SWIPE_DIRECTION_RATIO;

    if (mp.mode === 'undecided') {
      if (adx < GESTURE_DIRECTION_LOCK_PX && ady < GESTURE_DIRECTION_LOCK_PX) return;
      if (isJournalActive) {
        if (ady > MODULE_V_SCROLL_DIRECTION_MIN_DY_JOURNAL_PX) {
          moduleHorizontalPan = null;
          resetModulePanVisuals();
          return;
        }
        if (adx >= requiredHorizontalDx && adx > ady * requiredHorizontalRatio) {
          mp.mode = 'horizontal';
        }
        return;
      }
      // Sur iOS/PWA, prioriser le scroll vertical si le geste monte/descend significativement.
      if (ady > adx * MODULE_VERTICAL_SCROLL_PRIORITY_RATIO) {
        moduleHorizontalPan = null;
        resetModulePanVisuals();
        return;
      }
      if (adx >= requiredHorizontalDx && adx > ady * requiredHorizontalRatio) {
        mp.mode = 'horizontal';
      } else {
        return;
      }
    }

    if (mp.mode === 'horizontal') {
      if (isModuleLayerTransitionTimerActive()) return;
      if (ady > adx * MODULE_VERTICAL_SCROLL_PRIORITY_RATIO) {
        moduleHorizontalPan = null;
        resetModulePanVisuals();
        return;
      }
      setModulePanFromDx(dx);
      e.preventDefault();
    }
  };

  const endSheetPan = (touch) => {
    if (!sheetVerticalPan) return;
    const sp = sheetVerticalPan;
    sheetVerticalPan = null;
    const dy = touch ? touch.clientY - sp.y0 : 0;
    const movable = sp.ctx.movable;
    if (sp.mode !== 'vertical') {
      movable.style.transform = '';
      return;
    }
    if (dy >= SHEET_SWIPE_CLOSE_THRESHOLD_PX) {
      if (prefersReducedMotionModules()) {
        movable.style.transform = '';
        sp.ctx.close();
        return;
      }
      movable.style.transition = `transform ${MODULE_TRANSITION_MS}ms cubic-bezier(0.4,0,0.2,1)`;
      movable.style.transform = `translateY(${window.innerHeight}px) translateZ(0)`;
      const done = () => {
        movable.removeEventListener('transitionend', done);
        movable.style.transition = '';
        movable.style.transform = '';
        sp.ctx.close();
      };
      movable.addEventListener('transitionend', done, { once: true });
      window.setTimeout(done, MODULE_TRANSITION_MS + 80);
    } else {
      if (prefersReducedMotionModules()) {
        movable.style.transform = '';
        return;
      }
      movable.style.transition = `transform 220ms cubic-bezier(0.34,1.56,0.64,1)`;
      movable.style.transform = 'translateY(0) translateZ(0)';
      const clean = () => {
        movable.removeEventListener('transitionend', clean);
        movable.style.transition = '';
        movable.style.transform = '';
      };
      movable.addEventListener('transitionend', clean, { once: true });
    }
  };

  const onTouchEnd = (e) => {
    const activeModule = config?.getActiveModule?.() ?? null;
    for (const touch of [...e.changedTouches]) {
      if (sheetVerticalPan && touch.identifier === sheetVerticalPan.touchId) {
        endSheetPan(touch);
      }
      if (moduleHorizontalPan && touch.identifier === moduleHorizontalPan.touchId) {
        const mp = moduleHorizontalPan;
        moduleHorizontalPan = null;
        const dx = touch.clientX - mp.x0;
        if (mp.mode === 'horizontal' && activeModule) {
          const { prevId, nextId } = getAdjacentNavModuleIds(activeModule.id);
          if (
            dx <= -MODULE_H_SWIPE_THRESHOLD_PX &&
            nextId &&
            config?.isModuleEnabledForNav?.(nextId)
          ) {
            resetModulePanVisuals();
            applyModuleNavFromSwipe(nextId, 'forward');
          } else if (
            dx >= MODULE_H_SWIPE_THRESHOLD_PX &&
            prevId &&
            config?.isModuleEnabledForNav?.(prevId)
          ) {
            resetModulePanVisuals();
            applyModuleNavFromSwipe(prevId, 'back');
          } else {
            springModulePanToZero();
          }
        } else {
          resetModulePanVisuals();
        }
      }
    }
  };

  const onTouchCancel = (e) => {
    for (const touch of [...e.changedTouches]) {
      if (sheetVerticalPan && touch.identifier === sheetVerticalPan.touchId) {
        endSheetPan(null);
      }
      if (moduleHorizontalPan && touch.identifier === moduleHorizontalPan.touchId) {
        moduleHorizontalPan = null;
        resetModulePanVisuals();
      }
    }
  };

  document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
  document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
  document.addEventListener('touchcancel', onTouchCancel, { passive: true, capture: true });
}

/**
 * @param {GesturesConfig} gesturesConfig
 * @returns {{ prepareModuleTransitionForPush: (activeMod: { id: string } | null, moduleId: string) => void; setPendingModuleTransitionDir: (dir: 'forward' | 'back') => void }}
 */
function initGestures(gesturesConfig) {
  config = gesturesConfig;

  initModuleTransitions(gesturesConfig);

  initSwipeDetection({
    getModulePanLayer: () => config?.getModulePanLayer?.() ?? null,
    getModuleParallaxInner: () => config?.getModuleParallaxInner?.() ?? null,
    getModuleEdgeGlowEl: () => config?.getModuleEdgeGlowEl?.() ?? null,
    getNavModuleIdsOrdered: () => getNavModuleIdsOrdered()
  });

  return {
    prepareModuleTransitionForPush(activeMod, moduleId) {
      if (activeMod) {
        const ids = getNavModuleIdsOrdered();
        const iActive = ids.indexOf(activeMod.id);
        const iTarget = ids.indexOf(moduleId);
        if (iActive !== -1 && iTarget !== -1) {
          applyPendingModuleTransitionDir(
            iTarget > iActive ? 'forward' : iTarget < iActive ? 'back' : 'forward'
          );
        } else {
          applyPendingModuleTransitionDir('forward');
        }
      } else {
        applyPendingModuleTransitionDir('forward');
      }
    },
    setPendingModuleTransitionDir(dir) {
      applyPendingModuleTransitionDir(dir);
    }
  };
}

export { initGestures, renderModule, initNativeTouchShell };
