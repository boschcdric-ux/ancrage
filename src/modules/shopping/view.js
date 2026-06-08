function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const CATEGORY_ORDER = [
  { id: 'viande_poisson', emoji: '🥩', label: 'Viande / Poisson' },
  { id: 'fruits_legumes', emoji: '🥦', label: 'Fruits & Légumes' },
  { id: 'frais', emoji: '🧀', label: 'Frais' },
  { id: 'epicerie', emoji: '🥫', label: 'Épicerie' },
  { id: 'hygiene', emoji: '🧴', label: 'Hygiène' },
  { id: 'boissons', emoji: '🍷', label: 'Boissons' },
  { id: 'surgeles', emoji: '❄️', label: 'Surgelés' },
  { id: 'autre', emoji: '🛒', label: 'Autre' }
];

const CATEGORY_ID_SET = new Set(CATEGORY_ORDER.map((c) => c.id));

const QUICK_PRESETS = [
  { emoji: '❄️', name: 'Surgelés', category: 'surgeles' },
  { emoji: '🍝', name: 'Pâtes', category: 'epicerie' },
  { emoji: '🍚', name: 'Riz', category: 'epicerie' },
  { emoji: '🫘', name: 'Pois chiches', category: 'epicerie' },
  { emoji: '🫘', name: 'Lentilles', category: 'epicerie' },
  { emoji: '🧀', name: 'Fromage', category: 'frais' },
  { emoji: '🥛', name: 'Yaourts', category: 'frais' }
];

const PRESET_NAME_SET = new Set(QUICK_PRESETS.map((p) => p.name));

function formatMoneyEUR(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

function normalizeCategoryId(value) {
  if (value == null || value === '') return 'autre';
  const id = String(value);
  return CATEGORY_ID_SET.has(id) ? id : 'autre';
}

function createCategorySelect(selectedId = 'autre') {
  const sel = normalizeCategoryId(selectedId);
  const options = CATEGORY_ORDER.map(
    (c) =>
      `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>${c.emoji} ${escapeHtml(c.label)}</option>`
  ).join('');
  return `
    <label class="shopping__field-label" for="shopping-category">Catégorie</label>
    <select id="shopping-category" class="shopping__select" data-shopping-category aria-label="Catégorie">
      ${options}
    </select>
  `;
}

function renderShoppingTabs(stores, activeStoreId) {
  const tabs = stores
    .map((s) => {
      const active = s.id === activeStoreId;
      return `
        <button
          type="button"
          class="shopping__tab ${active ? 'is-active' : ''}"
          data-shopping-store-tab="${escapeHtml(s.id)}"
          aria-pressed="${active ? 'true' : 'false'}"
        >
          ${escapeHtml(s.name)}
        </button>
      `;
    })
    .join('');

  return `
    <div class="shopping__tabs-row" role="tablist" aria-label="Magasins">
      <div class="shopping__tabs-scroll">
        ${tabs}
      </div>
      <div class="shopping__tabs-actions">
        <button type="button" class="btn shopping__icon-btn" data-shopping-add-store aria-label="Ajouter un magasin" title="Nouveau magasin">+</button>
        <button type="button" class="btn shopping__icon-btn" data-shopping-rename-store aria-label="Renommer le magasin" title="Renommer">✎</button>
      </div>
    </div>
  `;
}

function renderShoppingBudget(totals) {
  const { remaining, totalSpent, budget, pct, barTone } = totals;
  const fillClass =
    barTone === 'danger'
      ? 'shopping__progress-fill--danger'
      : barTone === 'warn'
        ? 'shopping__progress-fill--warn'
        : 'shopping__progress-fill--safe';

  return `
    <div class="shopping__budget card" data-shopping-budget>
      <div class="shopping__budget-top">
        <p class="shopping__budget-label">Budget restant</p>
        <p class="shopping__budget-remaining">${escapeHtml(formatMoneyEUR(remaining))}</p>
      </div>
      <div class="shopping__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="Progression du budget">
        <div class="shopping__progress-track">
          <div class="shopping__progress-fill ${fillClass}" style="width: ${pct}%"></div>
        </div>
      </div>
      <div class="shopping__budget-meta">
        <span>${escapeHtml(formatMoneyEUR(totalSpent))}</span>
        <span class="shopping__budget-sep">/</span>
        <button type="button" class="shopping__budget-target" data-shopping-edit-budget title="Modifier le budget">
          ${escapeHtml(formatMoneyEUR(budget))}
        </button>
      </div>
    </div>
  `;
}

function renderItemRow(item, bounceIds = null, editingItemId = null) {
  const checked = !!item.checked;
  const priceVal =
    item.price != null && Number.isFinite(Number(item.price)) ? String(item.price) : '';
  const animClass = bounceIds instanceof Set && bounceIds.has(item.id) ? 'animate-bounce-in' : '';
  const checkId = `shopping-check-${item.id}`;
  const isEditing = editingItemId === item.id;
  const nameBlock = isEditing
    ? `<input
          type="text"
          class="shopping__item-name-input"
          data-shopping-edit-name="${escapeHtml(item.id)}"
          value="${escapeHtml(item.name)}"
          maxlength="120"
          aria-label="Nom de l'article"
        />`
    : `<span class="shopping__item-name">${escapeHtml(item.name)}</span>`;

  return `
    <li class="shopping__item ${checked ? 'shopping__item--checked' : ''} ${animClass}" data-shopping-item="${escapeHtml(item.id)}">
      <label class="shopping__check-cell" for="${escapeHtml(checkId)}">
        <input
          id="${escapeHtml(checkId)}"
          type="checkbox"
          class="shopping__check"
          data-shopping-toggle="${escapeHtml(item.id)}"
          ${checked ? 'checked' : ''}
          aria-label="Cocher ${escapeHtml(item.name)}"
        />
      </label>
      <div class="shopping__item-name-col">
        ${nameBlock}
      </div>
      <span class="shopping__price-euro" aria-hidden="true">€</span>
      <input
        type="number"
        class="shopping__price-input"
        data-shopping-price="${escapeHtml(item.id)}"
        inputmode="decimal"
        step="0.01"
        min="0"
        placeholder="0.00"
        value="${priceVal ? escapeHtml(priceVal) : ''}"
        aria-label="Prix pour ${escapeHtml(item.name)}"
      />
      <button
        type="button"
        class="shopping__item-action shopping__item-action--edit"
        data-shopping-edit-name-trigger="${escapeHtml(item.id)}"
        aria-label="Modifier le nom"
        title="Modifier"
      >✎</button>
      <button
        type="button"
        class="shopping__item-action shopping__item-action--delete"
        data-shopping-delete="${escapeHtml(item.id)}"
        aria-label="Supprimer ${escapeHtml(item.name)}"
        title="Supprimer"
      >✕</button>
    </li>
  `;
}

function partitionItemsByCategory(store) {
  const byCat = new Map();
  for (const c of CATEGORY_ORDER) {
    byCat.set(c.id, { unchecked: [], checked: [] });
  }
  for (const item of store.items || []) {
    const cat = normalizeCategoryId(item.category);
    const bucket = byCat.get(cat);
    if (!bucket) continue;
    if (item.checked) bucket.checked.push(item);
    else bucket.unchecked.push(item);
  }
  return byCat;
}

function renderShoppingList(store, bounceIds = null, editingItemId = null) {
  const byCat = partitionItemsByCategory(store);
  const blocks = [];

  for (const cat of CATEGORY_ORDER) {
    const { unchecked, checked } = byCat.get(cat.id);
    const all = [...unchecked, ...checked];
    if (!all.length) continue;

    blocks.push(`
      <section class="shopping__cat" aria-labelledby="shopping-cat-${cat.id}">
        <h3 class="shopping__cat-title" id="shopping-cat-${cat.id}">
          <span aria-hidden="true">${cat.emoji}</span> ${escapeHtml(cat.label)}
        </h3>
        <ul class="shopping__item-list">
          ${all.map((it) => renderItemRow(it, bounceIds, editingItemId)).join('')}
        </ul>
      </section>
    `);
  }

  if (!blocks.length) {
    return `
      <div class="shopping__list card" data-shopping-list>
        <p class="shopping__empty">Ta liste est vide. Ajoute un article ou touche un raccourci ci-dessus.</p>
      </div>
    `;
  }

  return `
    <div class="shopping__list card" data-shopping-list>
      ${blocks.join('')}
    </div>
  `;
}

function renderQuickChips(store) {
  const favs = Array.isArray(store.favorites) ? store.favorites : [];
  const customFavs = favs.filter((name) => typeof name === 'string' && name.trim() && !PRESET_NAME_SET.has(name.trim()));

  const presetChips = QUICK_PRESETS.map(
    (p) => `
    <button type="button" class="shopping__chip" data-shopping-quick="${escapeHtml(p.name)}" data-shopping-quick-cat="${p.category}">
      <span class="shopping__chip-emoji" aria-hidden="true">${p.emoji}</span>
      <span>${escapeHtml(p.name)}</span>
    </button>
  `
  ).join('');

  const customChips = customFavs
    .map(
      (name) => `
    <span class="shopping__chip shopping__chip--custom">
      <button type="button" class="shopping__chip-main" data-shopping-quick="${escapeHtml(name)}" data-shopping-quick-cat="autre">
        ${escapeHtml(name)}
      </button>
      <button type="button" class="shopping__chip-remove" data-shopping-fav-remove="${escapeHtml(name)}" aria-label="Retirer ${escapeHtml(name)} des favoris">×</button>
    </span>
  `
    )
    .join('');

  return `
    <div class="shopping__quick">
      <p class="shopping__quick-label">Raccourcis</p>
      <div class="shopping__chips" role="group" aria-label="Articles favoris">
        ${presetChips}
        ${customChips}
      </div>
    </div>
  `;
}

function createShoppingOnboardingShell() {
  return `
    <section class="shopping shopping--onboard animate-fade-in">
      <header class="shopping__header">
        <h1 class="shopping__title">Courses 🛒</h1>
        <p class="shopping__subtitle">
          Ta liste de courses avec budget en temps réel. Zéro prise de tête en rayon.
        </p>
      </header>

      <p class="shopping__onboard-question">Où fais-tu tes courses ?</p>

      <div class="shopping__onboard-card card">
        <div class="shopping__onboard-fields">
          <div class="shopping__onboard-row">
            <label class="shopping__field-label" for="shopping-onboard-name-1">Magasin principal</label>
            <input
              id="shopping-onboard-name-1"
              type="text"
              class="shopping__input"
              data-shopping-onboard-name-1
              placeholder="Ex: Leclerc, Carrefour..."
              maxlength="80"
              autocomplete="organization"
            />
          </div>
          <div class="shopping__onboard-row">
            <label class="shopping__field-label" for="shopping-onboard-budget-1">Budget mensuel courses (€)</label>
            <input
              id="shopping-onboard-budget-1"
              type="number"
              class="shopping__input"
              data-shopping-onboard-budget-1
              placeholder="150"
              min="0"
              step="0.01"
              inputmode="decimal"
            />
          </div>
        </div>

        <div class="shopping__onboard-second shopping__onboard-second--hidden" data-shopping-onboard-second-wrap>
          <div class="shopping__onboard-row">
            <label class="shopping__field-label" for="shopping-onboard-name-2">2e magasin</label>
            <input
              id="shopping-onboard-name-2"
              type="text"
              class="shopping__input"
              data-shopping-onboard-name-2
              placeholder="Ex: Primeur, marché..."
              maxlength="80"
              autocomplete="off"
            />
          </div>
          <div class="shopping__onboard-row">
            <label class="shopping__field-label" for="shopping-onboard-budget-2">Budget mensuel courses (€)</label>
            <input
              id="shopping-onboard-budget-2"
              type="number"
              class="shopping__input"
              data-shopping-onboard-budget-2
              placeholder="100"
              min="0"
              step="0.01"
              inputmode="decimal"
            />
          </div>
        </div>

        <button type="button" class="btn btn-secondary shopping__onboard-add-second" data-shopping-onboard-add-second>
          + Ajouter un 2e magasin
        </button>
      </div>

      <div class="shopping__onboard-actions">
        <button type="button" class="btn btn-primary shopping__onboard-start" data-shopping-onboard-start>
          Commencer 🛒
        </button>
        <button type="button" class="shopping__onboard-skip" data-shopping-onboard-skip>
          Passer →
        </button>
      </div>
    </section>
  `;
}

function createShoppingShell(addCategory = 'autre') {
  return `
    <section class="shopping animate-fade-in">
      <header class="shopping__header">
        <h1 class="shopping__title">Courses</h1>
        <p class="shopping__subtitle">Liste simple, budget clair, zéro prise de tête en rayon.</p>
      </header>

      <div data-shopping-tabs></div>

      <div data-shopping-budget-wrap></div>

      <div class="shopping__add card">
        <h2 class="shopping__add-title">Ajout rapide</h2>
        <form class="shopping__add-form" data-shopping-add-form>
          <div class="shopping__add-row">
            <label class="shopping__field-label" for="shopping-name">Article</label>
            <input
              id="shopping-name"
              type="text"
              class="shopping__input"
              data-shopping-name
              placeholder="Ex. lait demi-écrémé"
              maxlength="120"
              autocomplete="off"
            />
          </div>
          <div class="shopping__add-row shopping__add-row--split">
            <div class="shopping__add-field">${createCategorySelect(addCategory)}</div>
            <div class="shopping__add-actions">
              <button type="submit" class="btn btn-primary shopping__add-btn">Ajouter</button>
            </div>
          </div>
        </form>
        <div data-shopping-quick-wrap></div>
        <div class="shopping__fav-add">
          <label class="shopping__field-label" for="shopping-fav-name">Favori perso</label>
          <div class="shopping__fav-add-row">
            <input
              id="shopping-fav-name"
              type="text"
              class="shopping__input"
              data-shopping-fav-input
              placeholder="Nom du raccourci"
              maxlength="80"
              autocomplete="off"
            />
            <button type="button" class="btn btn-secondary" data-shopping-fav-add>Ajouter aux raccourcis</button>
          </div>
        </div>
      </div>

      <div data-shopping-list-wrap></div>

      <div class="shopping__footer-actions">
        <button type="button" class="btn btn-primary shopping__finish-btn" data-shopping-finish-open>
          ✅ Terminer les courses
        </button>
      </div>

      <div class="shopping__modal" data-shopping-modal hidden aria-hidden="true">
        <div class="shopping__modal-backdrop" data-shopping-modal-dismiss></div>
        <div class="shopping__modal-panel card" role="dialog" aria-modal="true" aria-labelledby="shopping-modal-title">
          <h2 id="shopping-modal-title" class="shopping__modal-title">Résumé</h2>
          <div class="shopping__modal-body" data-shopping-modal-body></div>
          <label class="shopping__modal-check">
            <input type="checkbox" data-shopping-save-budget />
            <span>Ajouter le total aux dépenses du module Budget (facultatif — la barre budget courses ne dépend pas de cette case)</span>
          </label>
          <div class="shopping__modal-actions">
            <button type="button" class="btn btn-secondary" data-shopping-modal-cancel>Annuler</button>
            <button type="button" class="btn btn-primary" data-shopping-modal-confirm>Valider</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

export {
  CATEGORY_ORDER,
  CATEGORY_ID_SET,
  QUICK_PRESETS,
  PRESET_NAME_SET,
  createShoppingOnboardingShell,
  createShoppingShell,
  createCategorySelect,
  renderShoppingTabs,
  renderShoppingBudget,
  renderShoppingList,
  renderQuickChips,
  formatMoneyEUR,
  normalizeCategoryId,
  escapeHtml
};
