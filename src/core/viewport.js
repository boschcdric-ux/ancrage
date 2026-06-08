export const DESKTOP_MIN_WIDTH = 768;

export function isMobileViewport() {
  return window.innerWidth < DESKTOP_MIN_WIDTH;
}

export function prefersReducedMotionModules() {
  return window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
}
