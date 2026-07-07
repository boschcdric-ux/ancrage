/**
 * Liste réordonnable par glisser-déposer (Pointer Events + FLIP).
 * Patron réutilisable — voir chantier/annexes/composant-liste-drag-reorder.html
 */

/**
 * @param {Object} options
 * @param {HTMLElement} options.listEl
 * @param {string} options.rowSelector
 * @param {string} options.handleSelector
 * @param {() => string[]} options.getOrder
 * @param {(orderedIds: string[]) => void} options.onReorderEnd
 * @returns {() => void} cleanup
 */
function attachListDragReorder({ listEl, rowSelector, handleSelector, getOrder, onReorderEnd }) {
  if (!listEl) return () => {};

  let drag = null;

  function currentLayoutTop(row, parentListEl) {
    return row.offsetTop - parentListEl.offsetTop + parentListEl.getBoundingClientRect().top;
  }

  function applyDragTransform(ev) {
    const parentListEl = drag.row.parentElement;
    const targetVisualTop = ev.clientY - drag.grabOffset;
    const layoutTop = currentLayoutTop(drag.row, parentListEl);
    drag.row.style.transform = `translateY(${targetVisualTop - layoutTop}px)`;
  }

  function onDragMove(ev) {
    if (!drag) return;
    const parentListEl = drag.row.parentElement;
    applyDragTransform(ev);

    const rows = [...parentListEl.querySelectorAll(rowSelector)];
    const others = rows.filter((r) => r !== drag.row);
    const pointerY = ev.clientY;
    const curIndex = drag.order.indexOf(drag.id);
    let targetIndex = curIndex;

    others.forEach((r) => {
      const rect = r.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const idx = drag.order.indexOf(r.dataset.id);
      if (pointerY < mid && idx < curIndex) targetIndex = Math.min(targetIndex, idx);
      if (pointerY > mid && idx > curIndex) targetIndex = Math.max(targetIndex, idx);
    });
    if (targetIndex === curIndex) return;

    const before = new Map(others.map((r) => [r, r.getBoundingClientRect()]));

    const [moved] = drag.order.splice(curIndex, 1);
    drag.order.splice(targetIndex, 0, moved);

    const nextId = drag.order[targetIndex + 1];
    const nextEl = nextId
      ? parentListEl.querySelector(`${rowSelector}[data-id="${nextId}"]`)
      : null;
    parentListEl.insertBefore(drag.row, nextEl);

    applyDragTransform(ev);

    others.forEach((r) => {
      const prev = before.get(r);
      const next = r.getBoundingClientRect();
      const deltaY = prev.top - next.top;
      if (!deltaY) return;
      r.style.transition = 'none';
      r.style.transform = `translateY(${deltaY}px)`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          r.style.transition = '';
          r.classList.add('list-drag-reorder__row--settle');
          r.style.transform = '';
        });
      });
    });
  }

  function onDragEnd() {
    if (!drag) return;
    window.removeEventListener('pointermove', onDragMove);
    drag.row.classList.remove('list-drag-reorder__row--dragging');
    drag.row.style.transform = '';
    onReorderEnd([...drag.order]);
    drag = null;
  }

  function startDrag(ev, row) {
    ev.preventDefault();
    const id = row.dataset.id;
    if (!id) return;

    drag = {
      id,
      row,
      pointerId: ev.pointerId,
      grabOffset: ev.clientY - row.getBoundingClientRect().top,
      order: getOrder()
    };
    row.setPointerCapture(ev.pointerId);
    row.classList.add('list-drag-reorder__row--dragging');
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd, { once: true });
  }

  const onHandlePointerDown = (ev) => {
    const handle = ev.target instanceof Element ? ev.target.closest(handleSelector) : null;
    if (!handle || !listEl.contains(handle)) return;
    const row = handle.closest(rowSelector);
    if (row instanceof HTMLElement) startDrag(ev, row);
  };

  listEl.addEventListener('pointerdown', onHandlePointerDown);

  return () => {
    window.removeEventListener('pointermove', onDragMove);
    listEl.removeEventListener('pointerdown', onHandlePointerDown);
    drag = null;
  };
}

export { attachListDragReorder };
