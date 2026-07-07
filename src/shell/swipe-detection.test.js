import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initSwipeDetection,
  resetModulePanVisuals,
  setModulePanFromDx,
  springModulePanToZero
} from './swipe-detection.js';

describe('swipe-detection — will-change conditionnel parallax (M12g)', () => {
  let panLayer;
  let parallax;
  let edgeGlow;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="app-module-pan-layer"></div>
      <div id="app-module-parallax"></div>
      <div id="app-module-edge-glow"></div>
    `;
    panLayer = document.getElementById('app-module-pan-layer');
    parallax = document.getElementById('app-module-parallax');
    edgeGlow = document.getElementById('app-module-edge-glow');
    initSwipeDetection({
      getModulePanLayer: () => panLayer,
      getModuleParallaxInner: () => parallax,
      getModuleEdgeGlowEl: () => edgeGlow,
      getNavModuleIdsOrdered: () => []
    });
  });

  afterEach(() => {
    resetModulePanVisuals();
  });

  it('ne pose pas will-change sur le parallax au repos', () => {
    expect(parallax.classList.contains('app-module-parallax--will-change')).toBe(false);
  });

  it('active will-change pendant le pan horizontal', () => {
    setModulePanFromDx(40);
    expect(parallax.classList.contains('app-module-parallax--will-change')).toBe(true);
  });

  it('retire will-change après resetModulePanVisuals', () => {
    setModulePanFromDx(40);
    resetModulePanVisuals();
    expect(parallax.classList.contains('app-module-parallax--will-change')).toBe(false);
  });

  it('retire will-change après springModulePanToZero (transitionend)', () => {
    setModulePanFromDx(40);
    springModulePanToZero();
    panLayer.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'transform' }));
    expect(parallax.classList.contains('app-module-parallax--will-change')).toBe(false);
  });
});
