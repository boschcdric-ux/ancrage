import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachListDragReorder } from './list-drag-reorder.js';

describe('attachListDragReorder', () => {
  let listEl;

  beforeEach(() => {
    listEl = document.createElement('ul');
    listEl.innerHTML = `
      <li class="row" data-id="a"><span class="handle"></span></li>
      <li class="row" data-id="b"><span class="handle"></span></li>
    `;
    document.body.appendChild(listEl);
  });

  afterEach(() => {
    listEl.remove();
  });

  it('retourne une fonction cleanup sans erreur', () => {
    const cleanup = attachListDragReorder({
      listEl,
      rowSelector: '.row',
      handleSelector: '.handle',
      getOrder: () => ['a', 'b'],
      onReorderEnd: vi.fn()
    });
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('appelle onReorderEnd avec l’ordre courant au relâché', () => {
    const onReorderEnd = vi.fn();
    attachListDragReorder({
      listEl,
      rowSelector: '.row',
      handleSelector: '.handle',
      getOrder: () => ['a', 'b'],
      onReorderEnd
    });

    const row = listEl.querySelector('[data-id="a"]');
    const handle = row.querySelector('.handle');
    row.setPointerCapture = vi.fn();

    handle.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientY: 10, pointerId: 1 })
    );
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));

    expect(onReorderEnd).toHaveBeenCalledWith(['a', 'b']);
  });
});
