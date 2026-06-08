function resolveBottomSheetFromTarget(target) {
  if (!(target instanceof Element)) return null;
  const dash = target.closest('.dashboard-customize-panel');
  if (dash) {
    const root = dash.closest('.dashboard-customize-sheet');
    return {
      movable: dash,
      scrollRoot:
        dash.querySelector('.dashboard-customize-scroll') instanceof HTMLElement
          ? dash.querySelector('.dashboard-customize-scroll')
          : dash,
      close: () =>
        root?.querySelector('[data-dashboard-customize-close]')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        )
    };
  }
  const cal = target.closest('.calendar-panel');
  if (cal) {
    const overlay = cal.closest('.calendar-panel-overlay');
    return {
      movable: cal,
      scrollRoot:
        cal.querySelector('.calendar-panel__scroll') instanceof HTMLElement
          ? cal.querySelector('.calendar-panel__scroll')
          : cal,
      close: () =>
        overlay?.querySelector('.calendar-panel__backdrop')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        )
    };
  }
  const budgetSheet = target.closest('.budget__modal-sheet');
  if (budgetSheet) {
    const modal = budgetSheet.closest('.budget__modal');
    return {
      movable: budgetSheet,
      scrollRoot:
        budgetSheet.querySelector('.budget__modal-panel--body') instanceof HTMLElement
          ? budgetSheet.querySelector('.budget__modal-panel--body')
          : budgetSheet,
      close: () =>
        modal?.querySelector('.budget__modal-backdrop')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        )
    };
  }
  const shop = target.closest('.shopping__modal-panel');
  if (shop) {
    const modal = shop.closest('[data-shopping-modal]');
    return {
      movable: shop,
      scrollRoot:
        shop.querySelector('.shopping__modal-body') instanceof HTMLElement
          ? shop.querySelector('.shopping__modal-body')
          : shop,
      close: () =>
        modal?.querySelector('[data-shopping-modal-dismiss]')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        )
    };
  }
  const journalEd = target.closest('.journal__panel--editor');
  if (journalEd) {
    return {
      movable: journalEd,
      scrollRoot:
        journalEd.querySelector('.journal__editor-content') instanceof HTMLElement
          ? journalEd.querySelector('.journal__editor-content')
          : journalEd,
      close: () =>
        journalEd.querySelector('[data-journal-back]')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        )
    };
  }
  const nowPrompt = target.closest('.now__task-prompt');
  if (nowPrompt instanceof HTMLElement && !nowPrompt.hidden) {
    return {
      movable: nowPrompt,
      scrollRoot: nowPrompt,
      close: () =>
        nowPrompt.querySelector('[data-now-task-no]')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        )
    };
  }
  return null;
}

function isSheetVerticalDragAllowed(target, ctx) {
  const dragHandle = target.closest(
    '.dashboard-customize-handle, .dashboard-customize-header, .calendar-panel__handle, .calendar-panel__header, .budget__sheet-handle, .shopping__modal-title, .journal__editor-top, .now__task-prompt-text, .now__task-prompt-actions'
  );
  if (dragHandle) return true;
  if (ctx.scrollRoot.scrollTop > 0 && ctx.scrollRoot.contains(target)) return false;
  return true;
}

export { resolveBottomSheetFromTarget, isSheetVerticalDragAllowed };
