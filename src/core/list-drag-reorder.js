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

  function onDragMove(ev) {
    if (!drag) return;
    const dy = ev.clientY - drag.startY;
    drag.row.style.transform = `translateY(${dy}px)`;

    const others = [...listEl.querySelectorAll(rowSelector)].filter((r) => r !== drag.row);
    const pointerY = ev.clientY;
    let curIndex = drag.order.indexOf(drag.id);
    let targetIndex = curIndex;

    others.forEach((row) => {
      const rect = row.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const idx = drag.order.indexOf(row.dataset.id);
      if (pointerY < mid && idx < curIndex) targetIndex = Math.min(targetIndex, idx);
      if (pointerY > mid && idx > curIndex) targetIndex = Math.max(targetIndex, idx);
    });

    if (targetIndex === curIndex) return;

    const before = new Map(others.map((row) => [row, row.getBoundingClientRect()]));
    const [moved] = drag.order.splice(curIndex, 1);
    drag.order.splice(targetIndex, 0, moved);

    drag.order.forEach((id) => {
      if (id === drag.id) return;
      const row = listEl.querySelector(`${rowSelector}[data-id="${id}"]`);
      if (row) listEl.appendChild(row);
    });
    listEl.appendChild(drag.row);

    others.forEach((row) => {
      const prev = before.get(row);
      const next = row.getBoundingClientRect();
      const deltaY = prev.top - next.top;
      if (!deltaY) return;
      row.style.transition = 'none';
      row.style.transform = `translateY(${deltaY}px)`;
      requestAnimationFrame(() => {
        row.style.transition = '';
        row.classList.add('list-drag-reorder__row--settle');
        row.style.transform = '';
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
      startY: ev.clientY,
      row,
      order: getOrder()
    };
    row.setPointerCapture(ev.pointerId);
    row.classList.add('list-drag-reorder__row--dragging');
    row.style.transform = 'translateY(0)';
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
