let navigationConfig = null;

let lastRenderedMobileNav = null;
let resizeRafId = null;
const mobileNavButtonsByModuleId = new Map();
let resizeListenerBound = false;

function getConfig() {
  return navigationConfig;
}

function renderDesktopNavigation(activeModuleId) {
  const cfg = getConfig();
  if (!cfg) return '';
  const navModules = cfg.getNavModulesOrdered(cfg.modules);
  const moduleButtonsMarkup = navModules
    .map((module) => {
      const isActive = module.id === activeModuleId;
      return `
          <button
            type="button"
            class="btn module-nav__btn ${isActive ? 'is-active' : ''}"
            data-module-nav="${module.id}"
            aria-pressed="${isActive}"
            aria-current="${isActive ? 'page' : 'false'}"
          >
            <span class="module-nav__icon" aria-hidden="true">${module.icon || '•'}</span>
            <span class="module-nav__label">${cfg.shortLabelsByModuleId[module.id] || module.label || module.id}</span>
          </button>
        `;
    })
    .join('');

  return `
      <div class="module-nav__items">
        ${moduleButtonsMarkup}
      </div>
      <div class="module-sync-footer" data-sync-footer>
        <span
          class="module-sync-indicator"
          data-sync-indicator
          role="status"
          aria-live="polite"
        >${cfg.getSyncIndicatorState().emoji}</span>
      </div>
    `;
}

function renderMobileNavigation(activeModuleId) {
  const cfg = getConfig();
  if (!cfg) return '';
  const navModules = cfg.getNavModulesOrdered(cfg.modules);
  const barButtons = navModules
    .map((module) => {
      const isActive = module.id === activeModuleId;
      return `
        <button
          type="button"
          class="btn mobile-bar__btn ${isActive ? 'is-active' : ''}"
          data-module-nav="${module.id}"
          aria-pressed="${isActive}"
          aria-current="${isActive ? 'page' : 'false'}"
        >
          <span class="mobile-bar__icon" aria-hidden="true">${module.icon || '•'}</span>
          <span class="mobile-bar__label">${cfg.shortLabelsByModuleId[module.id] || module.label || module.id}</span>
        </button>
      `;
    })
    .join('');

  return `
    <div class="mobile-bar" role="presentation">
      <div class="mobile-bar__scroll" role="tablist" aria-label="Navigation principale">
        ${barButtons}
      </div>
      <div class="mobile-bar__sync" data-sync-footer>
        <span
          class="module-sync-indicator mobile-bar__sync-indicator"
          data-sync-indicator
          role="status"
          aria-live="polite"
        >${cfg.getSyncIndicatorState().emoji}</span>
      </div>
    </div>
  `;
}

function isMobileNavBarMounted() {
  const cfg = getConfig();
  if (!cfg) return false;
  const navContainer = cfg.getNavContainer();
  const navMods = cfg.getNavModulesOrdered(cfg.modules);
  if (!navContainer?.querySelector('.mobile-bar__scroll')) return false;
  if (mobileNavButtonsByModuleId.size !== navMods.length) return false;
  for (const m of navMods) {
    const btn = mobileNavButtonsByModuleId.get(m.id);
    if (!(btn instanceof HTMLElement) || !btn.isConnected) return false;
  }
  return true;
}

function mountMobileNavBar(activeModuleId) {
  const cfg = getConfig();
  if (!cfg) return;
  const navContainer = cfg.getNavContainer();
  if (!navContainer) return;
  navContainer.innerHTML = renderMobileNavigation(activeModuleId);
  mobileNavButtonsByModuleId.clear();
  for (const el of navContainer.querySelectorAll('[data-module-nav]')) {
    if (el instanceof HTMLButtonElement && el.dataset.moduleNav) {
      mobileNavButtonsByModuleId.set(el.dataset.moduleNav, el);
    }
  }
}

function updateMobileNavActiveState(activeModuleId) {
  for (const [moduleId, btn] of mobileNavButtonsByModuleId) {
    const isActive = moduleId === activeModuleId;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  }
}

function renderNavigation(activeModuleId) {
  const cfg = getConfig();
  if (!cfg) return;
  const navContainer = cfg.getNavContainer();
  if (!navContainer) return;

  if (cfg.isMobileViewport()) {
    if (isMobileNavBarMounted()) {
      updateMobileNavActiveState(activeModuleId);
    } else {
      mountMobileNavBar(activeModuleId);
    }
    lastRenderedMobileNav = true;
  } else {
    mobileNavButtonsByModuleId.clear();
    navContainer.innerHTML = renderDesktopNavigation(activeModuleId);
    lastRenderedMobileNav = false;
  }

  updateNavigationLayout();
  updateSyncIndicatorInNav();
}

function updateSyncIndicatorInNav() {
  const cfg = getConfig();
  if (!cfg) return;
  const navContainer = cfg.getNavContainer();
  if (!navContainer) return;
  const el = navContainer.querySelector('[data-sync-indicator]');
  if (!(el instanceof HTMLElement)) return;
  const s = cfg.getSyncIndicatorState();
  el.textContent = s.emoji;
  el.title = s.label;
  el.setAttribute('aria-label', s.label);
}

function applyNavigationLayout(layout) {
  const cfg = getConfig();
  if (!cfg) return;
  const app = cfg.getApp();
  if (!app) return;
  app.dataset.navLayout = layout;
}

function shouldUseSidebarLayout() {
  const cfg = getConfig();
  if (!cfg) return false;
  const navContainer = cfg.getNavContainer();
  if (!navContainer || cfg.isMobileViewport()) return false;

  applyNavigationLayout('bottom');

  const navBounds = navContainer.getBoundingClientRect();
  const horizontalPadding = 16;
  const navCount = cfg.getNavModulesOrdered(cfg.modules).length;
  const totalGap = Math.max(0, (navCount - 1) * 8);
  const buttonsWidth = Array.from(navContainer.querySelectorAll('.module-nav__btn')).reduce(
    (acc, button) => acc + button.getBoundingClientRect().width,
    0
  );

  const requiredWidth = buttonsWidth + totalGap + (horizontalPadding * 2);
  return requiredWidth > navBounds.width;
}

function updateNavigationLayout() {
  const cfg = getConfig();
  if (!cfg) return;
  const app = cfg.getApp();
  const navContainer = cfg.getNavContainer();
  if (!app || !navContainer) return;

  if (cfg.isMobileViewport()) {
    applyNavigationLayout('mobile-bar');
    return;
  }

  applyNavigationLayout(shouldUseSidebarLayout() ? 'sidebar' : 'bottom');
}

function handleWindowResize() {
  const cfg = getConfig();
  if (!cfg) return;
  if (resizeRafId !== null) cancelAnimationFrame(resizeRafId);
  resizeRafId = requestAnimationFrame(() => {
    resizeRafId = null;
    const wasMobile = lastRenderedMobileNav === true;
    const nowMobile = cfg.isMobileViewport();
    updateNavigationLayout();
    if (wasMobile !== nowMobile) {
      renderNavigation(cfg.getActiveModule()?.id || cfg.getCurrentModule());
    }
  });
}

function initNavigation(config) {
  navigationConfig = config;
  if (!resizeListenerBound) {
    window.addEventListener('resize', handleWindowResize, { passive: true });
    resizeListenerBound = true;
  }
}

export {
  initNavigation,
  renderNavigation,
  updateSyncIndicatorInNav,
  updateNavigationLayout
};
