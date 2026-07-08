// shell/swipe-detection.js — Pan visuel module et helpers de détection swipe horizontal

import { prefersReducedMotionModules } from '../core/viewport.js';

/** @type {{ getModulePanLayer: () => HTMLElement | null; getModuleParallaxInner: () => HTMLElement | null; getModuleEdgeGlowEl: () => HTMLElement | null; getNavModuleIdsOrdered: () => string[] } | null} */
let swipeRefs = null;

export const MODULE_H_SWIPE_THRESHOLD_PX = 60;
export const MODULE_PAN_MAX_RATIO = 0.42;
export const MODULE_PARALLAX_RATIO = 0.14;
export const MODULE_H_SWIPE_DIRECTION_MIN_DX_PX = 10;
export const MODULE_H_SWIPE_DIRECTION_RATIO = 1.3;
export const MODULE_VERTICAL_SCROLL_PRIORITY_RATIO = 0.8;
export const MODULE_H_SWIPE_DIRECTION_MIN_DX_JOURNAL_PX = 16;
export const MODULE_H_SWIPE_DIRECTION_RATIO_JOURNAL = 2.5;
export const MODULE_V_SCROLL_DIRECTION_MIN_DY_JOURNAL_PX = 8;

/**
 * @param {{ getModulePanLayer: () => HTMLElement | null; getModuleParallaxInner: () => HTMLElement | null; getModuleEdgeGlowEl: () => HTMLElement | null; getNavModuleIdsOrdered: () => string[] }} refs
 */
export function initSwipeDetection(refs) {
  swipeRefs = refs;
}

function setModuleParallaxWillChange(active) {
  const moduleParallaxInner = swipeRefs?.getModuleParallaxInner?.();
  if (!(moduleParallaxInner instanceof HTMLElement)) return;
  moduleParallaxInner.classList.toggle('app-module-parallax--will-change', active);
}

export function resetModulePanVisuals() {
  const modulePanLayer = swipeRefs?.getModulePanLayer?.();
  const moduleParallaxInner = swipeRefs?.getModuleParallaxInner?.();
  const moduleEdgeGlowEl = swipeRefs?.getModuleEdgeGlowEl?.();
  if (!(modulePanLayer instanceof HTMLElement)) return;
  modulePanLayer.classList.remove('app-module-pan-layer--spring');
  modulePanLayer.style.transform = '';
  setModuleParallaxWillChange(false);
  if (moduleParallaxInner instanceof HTMLElement) {
    moduleParallaxInner.style.transform = '';
  }
  if (moduleEdgeGlowEl instanceof HTMLElement) {
    moduleEdgeGlowEl.style.opacity = '0';
    moduleEdgeGlowEl.style.boxShadow = '';
  }
}

export function setModulePanFromDx(dx) {
  const modulePanLayer = swipeRefs?.getModulePanLayer?.();
  const moduleParallaxInner = swipeRefs?.getModuleParallaxInner?.();
  const moduleEdgeGlowEl = swipeRefs?.getModuleEdgeGlowEl?.();
  if (!(modulePanLayer instanceof HTMLElement) || !(moduleParallaxInner instanceof HTMLElement)) return;
  setModuleParallaxWillChange(true);
  const w = window.innerWidth || 360;
  const max = w * MODULE_PAN_MAX_RATIO;
  const clamped = Math.max(Math.min(dx, max), -max);
  modulePanLayer.style.transform = `translateX(${clamped}px) translateZ(0)`;
  moduleParallaxInner.style.transform = `translateX(${-clamped * MODULE_PARALLAX_RATIO}px) translateZ(0)`;
  if (moduleEdgeGlowEl instanceof HTMLElement) {
    const t = Math.min(Math.abs(clamped) / MODULE_H_SWIPE_THRESHOLD_PX, 1);
    moduleEdgeGlowEl.style.opacity = String(0.04 + t * 0.38);
    if (clamped < 0) {
      moduleEdgeGlowEl.style.boxShadow = 'inset -8px 0 18px rgba(0,0,0,0.22)';
    } else if (clamped > 0) {
      moduleEdgeGlowEl.style.boxShadow = 'inset 8px 0 18px rgba(0,0,0,0.22)';
    } else {
      moduleEdgeGlowEl.style.boxShadow = '';
    }
  }
}

export function springModulePanToZero() {
  const modulePanLayer = swipeRefs?.getModulePanLayer?.();
  const moduleParallaxInner = swipeRefs?.getModuleParallaxInner?.();
  const moduleEdgeGlowEl = swipeRefs?.getModuleEdgeGlowEl?.();
  if (!(modulePanLayer instanceof HTMLElement)) return;
  if (prefersReducedMotionModules()) {
    resetModulePanVisuals();
    return;
  }
  modulePanLayer.classList.add('app-module-pan-layer--spring');
  setModuleParallaxWillChange(true);
  modulePanLayer.style.transform = 'translateX(0) translateZ(0)';
  if (moduleParallaxInner instanceof HTMLElement) {
    moduleParallaxInner.style.transform = 'translateX(0) translateZ(0)';
  }
  if (moduleEdgeGlowEl instanceof HTMLElement) {
    moduleEdgeGlowEl.style.opacity = '0';
    moduleEdgeGlowEl.style.boxShadow = '';
  }
  const onEnd = () => {
    modulePanLayer?.removeEventListener('transitionend', onEnd);
    modulePanLayer?.classList.remove('app-module-pan-layer--spring');
    resetModulePanVisuals();
  };
  modulePanLayer.addEventListener('transitionend', onEnd, { once: true });
}

export function isEditableTouchTarget(target) {
  if (!(target instanceof Element)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.closest('[contenteditable="true"]')) return true;
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return true;
  return false;
}

export function isInsideHorizontalScroller(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[data-h-scroll]'));
}

export function getAdjacentNavModuleIds(activeId) {
  const ids = swipeRefs?.getNavModuleIdsOrdered?.() ?? [];
  const i = ids.indexOf(activeId);
  if (i < 0) return { prevId: null, nextId: null };
  return {
    prevId: i > 0 ? ids[i - 1] : null,
    nextId: i < ids.length - 1 ? ids[i + 1] : null
  };
}
