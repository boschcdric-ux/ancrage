import { escapeHtml } from '../../core/format.js';

const TYPE_LABELS = {
  vegetarian: 'Végétarien',
  fish: 'Poisson',
  vegan: 'Vegan',
  other: 'Autre'
};

function starsHtml(n) {
  const d = Math.min(3, Math.max(1, Number(n) || 1));
  return '⭐'.repeat(d);
}

function typeBadge(type) {
  const t = TYPE_LABELS[type] ? type : 'other';
  const cls =
    t === 'fish'
      ? 'recipes__badge--fish'
      : t === 'vegan'
        ? 'recipes__badge--vegan'
        : t === 'vegetarian'
          ? 'recipes__badge--veg'
          : 'recipes__badge--other';
  return `<span class="recipes__badge ${cls}">${escapeHtml(TYPE_LABELS[t])}</span>`;
}

function formatIngredientLine(ing) {
  const q = ing.quantity != null && ing.quantity !== '' ? String(ing.quantity).trim() : '';
  const u = ing.unit != null && String(ing.unit).trim() ? String(ing.unit).trim() : '';
  const name = escapeHtml(ing.name || '');
  if (q && u) return `${name} · ${escapeHtml(q)} ${escapeHtml(u)}`;
  if (q) return `${name} · ${escapeHtml(q)}`;
  return name;
}

function shoppingLabelForIngredient(ing) {
  const name = String(ing.name || '').trim();
  const q = ing.quantity != null && ing.quantity !== '' ? String(ing.quantity).trim() : '';
  const u = ing.unit != null && String(ing.unit).trim() ? String(ing.unit).trim() : '';
  if (!name) return 'Sans nom';
  if (q && u) return `${name} (${q} ${u})`;
  if (q) return `${name} (${q})`;
  return name;
}

function recipeCard(recipe) {
  const id = escapeHtml(recipe.id);
  return `
    <article class="recipes__card card" data-recipes-card="${id}">
      <button type="button" class="recipes__card-hit" data-recipes-open="${id}" aria-label="Ouvrir ${escapeHtml(recipe.name)}">
        <span class="recipes__card-visual" aria-hidden="true">${escapeHtml(recipe.emoji || '🍽️')}</span>
        <div class="recipes__card-body">
          <h3 class="recipes__card-title">${escapeHtml(recipe.name)}</h3>
          <p class="recipes__card-meta">
            <span>${Number(recipe.prepTime) || 0} min</span>
            <span class="recipes__card-sep">·</span>
            <span class="recipes__card-stars" aria-label="Difficulté ${Number(recipe.difficulty) || 1} sur 3">${starsHtml(recipe.difficulty)}</span>
          </p>
          <div class="recipes__card-badges">${typeBadge(recipe.type)}</div>
        </div>
      </button>
    </article>
  `;
}

function renderRecipeGrid(list) {
  if (!list.length) {
    return `<div class="recipes__empty card"><p>Aucune recette ici — essaie un autre filtre ou crée-en une nouvelle ✨</p></div>`;
  }
  return `<div class="recipes__grid" role="list">${list.map((r) => recipeCard(r)).join('')}</div>`;
}

function filterChips(activeId) {
  const chips = [
    { id: 'all', label: 'Toutes' },
    { id: 'quick', label: 'Rapide (&lt;15 min)' },
    { id: 'vegetarian', label: 'Végétarien' },
    { id: 'fish', label: 'Poisson' },
    { id: 'mine', label: 'Mes recettes' }
  ];
  return `
    <div class="recipes__filters" role="tablist" aria-label="Filtrer les recettes">
      ${chips
        .map(
          (c) => `
        <button
          type="button"
          class="recipes__chip btn ${activeId === c.id ? 'is-active' : ''}"
          data-recipes-filter="${c.id}"
          role="tab"
          aria-selected="${activeId === c.id ? 'true' : 'false'}"
        >${c.label}</button>
      `
        )
        .join('')}
    </div>
  `;
}

function renderDetailBody(recipe) {
  const ings = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const ingRows = ings
    .map(
      (ing) => `
    <li class="recipes__ing-row">
      <span class="recipes__ing-bullet" aria-hidden="true">·</span>
      <span>${formatIngredientLine(ing)}</span>
    </li>
  `
    )
    .join('');
  const stepRows = steps
    .map(
      (s, i) => `
    <li class="recipes__step">
      <span class="recipes__step-num">${i + 1}</span>
      <span class="recipes__step-text">${escapeHtml(s)}</span>
    </li>
  `
    )
    .join('');

  return `
    <div class="recipes__detail-toolbar">
      <button
        type="button"
        class="btn btn-secondary recipes__detail-back"
        data-recipes-sheet-dismiss
        aria-label="Retour à la liste des recettes"
      >← Retour</button>
    </div>
    <div class="recipes__detail-hero">
      <span class="recipes__detail-emoji" aria-hidden="true">${escapeHtml(recipe.emoji || '🍽️')}</span>
      <h2 id="recipes-detail-title" class="recipes__detail-title">${escapeHtml(recipe.name)}</h2>
      <div class="recipes__detail-meta card recipes__detail-meta-card">
        <span><strong>${Number(recipe.prepTime) || 0}</strong> min</span>
        <span class="recipes__detail-sep">·</span>
        <span aria-label="Difficulté">${starsHtml(recipe.difficulty)}</span>
        <span class="recipes__detail-sep">·</span>
        ${typeBadge(recipe.type)}
      </div>
    </div>
    <section class="recipes__detail-section">
      <h3 class="recipes__detail-h">Ingrédients</h3>
      <ul class="recipes__ing-list">${ingRows || '<li class="recipes__muted">Aucun ingrédient</li>'}</ul>
    </section>
    <section class="recipes__detail-section">
      <h3 class="recipes__detail-h">Étapes</h3>
      <ol class="recipes__step-list">${stepRows || '<li class="recipes__muted">Aucune étape</li>'}</ol>
    </section>
    <div class="recipes__detail-actions">
      <button type="button" class="btn recipes__cta" data-recipes-add-shopping="${escapeHtml(recipe.id)}">🛒 Ajouter à mes courses</button>
      <button type="button" class="btn btn-secondary recipes__cta" data-recipes-edit-open="${escapeHtml(recipe.id)}">✏️ Modifier</button>
    </div>
  `;
}

function ingredientFormRow(ing, index) {
  return `
    <li class="recipes__form-dynamic card" data-recipes-ing-row="${index}">
      <div class="recipes__form-ing-grid">
        <label class="recipes__field">
          <span class="recipes__field-label">Nom</span>
          <input type="text" class="recipes__input" data-recipes-ing-name="${index}" value="${escapeHtml(ing.name || '')}" autocomplete="off" />
        </label>
        <label class="recipes__field recipes__field--qty">
          <span class="recipes__field-label">Quantité</span>
          <input type="text" class="recipes__input" data-recipes-ing-qty="${index}" value="${escapeHtml(ing.quantity != null ? String(ing.quantity) : '')}" inputmode="decimal" />
        </label>
        <label class="recipes__field recipes__field--unit">
          <span class="recipes__field-label">Unité</span>
          <input type="text" class="recipes__input" data-recipes-ing-unit="${index}" value="${escapeHtml(ing.unit || '')}" placeholder="g, ml…" />
        </label>
        <label class="recipes__field recipes__field--cat">
          <span class="recipes__field-label">Rayon (courses)</span>
          <select class="recipes__select" data-recipes-ing-cat="${index}" aria-label="Catégorie magasin">
            <option value="fruits_legumes" ${ing.category === 'fruits_legumes' ? 'selected' : ''}>🥦 Fruits &amp; Légumes</option>
            <option value="frais" ${ing.category === 'frais' ? 'selected' : ''}>🧀 Frais</option>
            <option value="viande_poisson" ${ing.category === 'viande_poisson' ? 'selected' : ''}>🥩 Viande / Poisson</option>
            <option value="epicerie" ${ing.category === 'epicerie' || !ing.category ? 'selected' : ''}>🥫 Épicerie</option>
            <option value="surgeles" ${ing.category === 'surgeles' ? 'selected' : ''}>❄️ Surgelés</option>
            <option value="boissons" ${ing.category === 'boissons' ? 'selected' : ''}>🍷 Boissons</option>
            <option value="hygiene" ${ing.category === 'hygiene' ? 'selected' : ''}>🧴 Hygiène</option>
            <option value="autre" ${ing.category === 'autre' ? 'selected' : ''}>🛒 Autre</option>
          </select>
        </label>
      </div>
      <button type="button" class="btn btn-secondary recipes__row-remove" data-recipes-ing-remove="${index}" aria-label="Retirer cet ingrédient">Retirer</button>
    </li>
  `;
}

function stepFormRow(text, index) {
  return `
    <li class="recipes__form-dynamic card" data-recipes-step-row="${index}">
      <label class="recipes__field recipes__field--step">
        <span class="recipes__field-label">Étape ${index + 1}</span>
        <textarea class="recipes__textarea recipes__textarea--step" data-recipes-step-text="${index}" rows="2">${escapeHtml(text || '')}</textarea>
      </label>
      <button type="button" class="btn btn-secondary recipes__row-remove" data-recipes-step-remove="${index}" aria-label="Retirer cette étape">Retirer</button>
    </li>
  `;
}

function renderEditForm(recipe) {
  const ings = Array.isArray(recipe.ingredients) && recipe.ingredients.length ? recipe.ingredients : [{ name: '', quantity: '', unit: '', category: 'epicerie' }];
  const steps = Array.isArray(recipe.steps) && recipe.steps.length ? recipe.steps : [''];
  const d = Math.min(3, Math.max(1, Number(recipe.difficulty) || 1));
  const t = recipe.type || 'vegetarian';
  const pt = Math.min(60, Math.max(5, Number(recipe.prepTime) || 15));

  const starBtns = [1, 2, 3]
    .map(
      (i) => `
    <button type="button" class="recipes__star-btn ${d === i ? 'is-active' : ''}" data-recipes-form-diff="${i}" aria-label="Difficulté ${i}" aria-pressed="${d === i ? 'true' : 'false'}">${'⭐'.repeat(i)}</button>
  `
    )
    .join('');

  return `
    <input type="hidden" data-recipes-form-id value="${escapeHtml(recipe.id)}" />
    <div class="recipes__form-scroll">
      <label class="recipes__field">
        <span class="recipes__field-label">Nom</span>
        <input type="text" class="recipes__input" data-recipes-form-name value="${escapeHtml(recipe.name || '')}" required maxlength="120" />
      </label>
      <label class="recipes__field">
        <span class="recipes__field-label">Emoji</span>
        <input type="text" class="recipes__input recipes__input--emoji" data-recipes-form-emoji value="${escapeHtml(recipe.emoji || '🍽️')}" maxlength="4" />
      </label>
      <div class="recipes__field">
        <span class="recipes__field-label" id="recipes-prep-label">Temps : <strong data-recipes-form-time-val>${pt}</strong> min</span>
        <input type="range" class="recipes__range" data-recipes-form-time min="5" max="60" step="5" value="${pt}" aria-labelledby="recipes-prep-label" />
      </div>
      <div class="recipes__field">
        <span class="recipes__field-label">Difficulté</span>
        <div class="recipes__star-row" role="group" aria-label="Difficulté">${starBtns}</div>
      </div>
      <label class="recipes__field">
        <span class="recipes__field-label">Type</span>
        <select class="recipes__select" data-recipes-form-type>
          <option value="vegetarian" ${t === 'vegetarian' ? 'selected' : ''}>Végétarien</option>
          <option value="fish" ${t === 'fish' ? 'selected' : ''}>Poisson</option>
          <option value="vegan" ${t === 'vegan' ? 'selected' : ''}>Vegan</option>
          <option value="other" ${t === 'other' ? 'selected' : ''}>Autre</option>
        </select>
      </label>
      <section class="recipes__form-section">
        <div class="recipes__form-section-head">
          <h3 class="recipes__form-section-title">Ingrédients</h3>
          <button type="button" class="btn btn-secondary recipes__add-row" data-recipes-add-ing>+ Ingrédient</button>
        </div>
        <ul class="recipes__dynamic-list" data-recipes-ing-list>
          ${ings.map((ing, i) => ingredientFormRow(ing, i)).join('')}
        </ul>
      </section>
      <section class="recipes__form-section">
        <div class="recipes__form-section-head">
          <h3 class="recipes__form-section-title">Étapes</h3>
          <button type="button" class="btn btn-secondary recipes__add-row" data-recipes-add-step>+ Étape</button>
        </div>
        <ol class="recipes__dynamic-list recipes__dynamic-list--steps" data-recipes-step-list>
          ${steps.map((s, i) => stepFormRow(s, i)).join('')}
        </ol>
      </section>
      <p class="recipes__autosave-hint" data-recipes-autosave-status>Sauvegarde automatique</p>
    </div>
  `;
}

function createRecipesShell() {
  return `
    <div class="recipes">
      <header class="recipes__header">
        <div class="recipes__head-top">
          <h1 class="recipes__title">Recettes</h1>
          <p class="recipes__subtitle">Simple, rapide, sans pression — quand tu as faim, c’est déjà bien 🌿</p>
        </div>
        <button type="button" class="btn recipes__new-btn" data-recipes-new>+ Nouvelle recette</button>
        <label class="recipes__search-wrap">
          <span class="visually-hidden">Rechercher une recette</span>
          <input type="search" class="recipes__search" data-recipes-search placeholder="Rechercher…" autocomplete="off" enterkeyhint="search" />
        </label>
        <div data-recipes-filters-wrap></div>
      </header>
      <div data-recipes-grid-wrap></div>
      <div class="recipes__toast" data-recipes-toast hidden role="status" aria-live="polite"></div>

      <div class="recipes-modal-portal recipes-modal-portal--embedded" aria-hidden="true">
        <div class="recipes__modal" data-recipes-sheet="detail" hidden>
          <div class="recipes__modal-backdrop" data-recipes-sheet-dismiss tabindex="-1" aria-hidden="true"></div>
          <div class="recipes__modal-sheet" role="dialog" aria-modal="true" aria-labelledby="recipes-detail-title">
            <button type="button" class="recipes__sheet-handle" data-recipes-sheet-dismiss aria-label="Fermer"></button>
            <div class="recipes__modal-panel recipes__modal-panel--body" data-recipes-detail-body></div>
          </div>
        </div>
        <div class="recipes__modal" data-recipes-sheet="edit" hidden>
          <div class="recipes__modal-backdrop" data-recipes-sheet-dismiss tabindex="-1" aria-hidden="true"></div>
          <div class="recipes__modal-sheet" role="dialog" aria-modal="true" aria-labelledby="recipes-edit-title">
            <button type="button" class="recipes__sheet-handle" data-recipes-sheet-dismiss aria-label="Fermer"></button>
            <div class="recipes__modal-panel recipes__modal-panel--head">
              <h2 id="recipes-edit-title" class="recipes__modal-title">Recette</h2>
              <button type="button" class="btn btn-secondary recipes__sheet-close-text" data-recipes-sheet-dismiss>Fermer</button>
            </div>
            <form class="recipes__edit-form" data-recipes-edit-form novalidate>
              <div data-recipes-edit-form-wrap></div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
}

function createDashboardWidgetHtml(suggestions) {
  const items = suggestions
    .map(
      (r) => `
    <div class="recipes-widget__suggestion">
      <span class="recipes-widget__emoji" aria-hidden="true">${escapeHtml(r.emoji || '🍽️')}</span>
      <div>
        <p class="recipes-widget__name">${escapeHtml(r.name)}</p>
        <p class="recipes-widget__meta">${Number(r.prepTime) || 0} min · ${starsHtml(r.difficulty)}</p>
      </div>
    </div>
  `
    )
    .join('');

  return `
    <p class="recipes-widget__lead">Que cuisiner ce soir ?</p>
    <div class="recipes-widget__list">${items}</div>
    <button type="button" class="btn dashboard__link" data-dashboard-nav="recipes">Voir toutes les recettes</button>
  `;
}

export {
  escapeHtml,
  TYPE_LABELS,
  starsHtml,
  typeBadge,
  formatIngredientLine,
  shoppingLabelForIngredient,
  renderRecipeGrid,
  filterChips,
  renderDetailBody,
  ingredientFormRow,
  stepFormRow,
  renderEditForm,
  createRecipesShell,
  createDashboardWidgetHtml
};
