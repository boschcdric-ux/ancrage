import { escapeHtml } from '../../core/format.js';

export function formatMoneyEUR(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return (
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: v % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    }).format(v)
  );
}

/** Premier lancement : collecte budget / épargne cible avant la vue principale. */
export function renderBudgetOnboarding() {
  return `
    <div class="budget budget--onboarding">
      <header class="budget__header budget__onboard-header">
        <h1 class="budget__title">Budget 💰</h1>
        <p class="budget__subtitle budget__onboard-lead">
          Garde un œil sur tes finances<br />
          sans stress. Vois ce qu'il te reste,<br />
          mets de côté pour ce qui compte.
        </p>
      </header>
      <div class="budget__onboard-card card animate-fade-in">
        <label class="budget__field">
          <span class="budget__label">Quel est ton budget mensuel disponible ?</span>
          <span class="budget__hint budget__onboard-hint">Après charges fixes</span>
          <input
            type="number"
            class="budget__input"
            data-budget-onboard-monthly
            min="0"
            step="any"
            inputmode="decimal"
            placeholder="Ex: 400"
            autocomplete="off"
          />
        </label>
        <label class="budget__field">
          <span class="budget__label">Combien veux-tu mettre de côté chaque mois ?</span>
          <input
            type="number"
            class="budget__input"
            data-budget-onboard-savings
            min="0"
            step="any"
            inputmode="decimal"
            placeholder="Ex: 100"
            autocomplete="off"
          />
        </label>
        <div class="budget__onboard-actions">
          <button type="button" class="btn btn-primary budget__onboard-primary" data-budget-onboard-start>Commencer 💰</button>
          <button type="button" class="budget__onboard-skip" data-budget-onboard-skip>Passer →</button>
        </div>
      </div>
    </div>
  `;
}

function toneClass(tone) {
  if (tone === 'success') return 'budget__hero-amount--success';
  if (tone === 'warning') return 'budget__hero-amount--warning';
  return 'budget__hero-amount--danger';
}

export function createBudgetShell() {
  return `
    <div class="budget">
      <header class="budget__header">
        <h1 class="budget__title">Budget</h1>
        <p class="budget__subtitle">Ce mois-ci, sans prise de tête</p>
      </header>

      <div class="budget__hero-wrap card" data-budget-hero></div>

      <div class="budget__sticky-cta">
        <button type="button" class="btn btn-primary budget__cta" data-budget-open-expense>
          + Dépense
        </button>
      </div>

      <section class="budget__section card" aria-labelledby="budget-settings-title">
        <h2 id="budget-settings-title" class="budget__section-title">Paramètres</h2>
        <div class="budget__settings-grid" data-budget-settings></div>
      </section>

      <section class="budget__section card" aria-labelledby="budget-fixed-title">
        <div class="budget__section-head">
          <h2 id="budget-fixed-title" class="budget__section-title">Charges fixes</h2>
          <button type="button" class="btn btn-secondary budget__section-action" data-budget-fixed-add>Ajouter</button>
        </div>
        <p class="budget__hint">Déduites automatiquement du budget du mois.</p>
        <ul class="budget__fixed-list" data-budget-fixed></ul>
      </section>

      <section class="budget__section card" aria-labelledby="budget-cat-title">
        <div class="budget__section-head">
          <h2 id="budget-cat-title" class="budget__section-title">Catégories variables</h2>
          <button type="button" class="btn btn-secondary budget__section-action" data-budget-cat-add>+ Catégorie</button>
        </div>
        <div class="budget__cat-settings-grid" data-budget-categories></div>
      </section>

      <section class="budget__section card" aria-labelledby="budget-savings-title">
        <h2 id="budget-savings-title" class="budget__section-title">Compte épargne</h2>
        <div class="budget__savings-balance" data-budget-savings-balance></div>
        <div class="budget__distribution" data-budget-distribution aria-label="Répartition"></div>
        <h3 class="budget__subsection-title">Projets d'épargne</h3>
        <div class="budget__projects-wrap" data-budget-projects></div>
      </section>

      <section class="budget__section card" aria-labelledby="budget-history-title">
        <div class="budget__section-head">
          <h2 id="budget-history-title" class="budget__section-title">Historique</h2>
        </div>
        <div class="budget__history-toolbar" data-budget-history-toolbar></div>
        <div class="budget__history-totals" data-budget-history-totals></div>
        <ul class="budget__history-list" data-budget-history-list></ul>
      </section>

      <div class="budget__modal" data-budget-modal-expense data-budget-modal-name="expense" hidden aria-hidden="true">
        <div class="budget__modal-backdrop" data-budget-dismiss="expense" aria-hidden="true"></div>
        <div class="budget__modal-sheet" data-budget-sheet>
          <button type="button" class="budget__sheet-handle" data-budget-sheet-handle aria-label="Glisser vers le bas pour fermer"></button>
          <div class="budget__modal-panel budget__modal-panel--body" role="dialog" aria-modal="true" aria-labelledby="budget-expense-title">
            <h2 id="budget-expense-title" class="budget__modal-title">Nouvelle dépense</h2>
            <label class="budget__field">
              <span class="budget__label">Montant</span>
              <input type="text" class="budget__input budget__input--amount" data-budget-expense-amount inputmode="decimal" enterkeyhint="done" autocomplete="off" placeholder="0,00" />
            </label>
            <fieldset class="budget__fieldset">
              <legend class="budget__label">Catégorie</legend>
              <div class="budget__cat-picker" data-budget-expense-categories></div>
            </fieldset>
            <label class="budget__field">
              <span class="budget__label">Description <span class="budget__optional">(optionnel)</span></span>
              <input type="text" class="budget__input" data-budget-expense-desc maxlength="120" placeholder="Ex : croquettes chat" />
            </label>
            <div class="budget__modal-actions">
              <button type="button" class="btn btn-secondary" data-budget-dismiss="expense">Annuler</button>
              <button type="button" class="btn btn-primary" data-budget-save-expense>Enregistrer</button>
            </div>
          </div>
        </div>
      </div>

      <div class="budget__modal" data-budget-modal-fixed data-budget-modal-name="fixed" hidden aria-hidden="true">
        <div class="budget__modal-backdrop" data-budget-dismiss="fixed" aria-hidden="true"></div>
        <div class="budget__modal-sheet" data-budget-sheet>
          <button type="button" class="budget__sheet-handle" data-budget-sheet-handle aria-label="Glisser vers le bas pour fermer"></button>
          <div class="budget__modal-panel budget__modal-panel--body" role="dialog" aria-modal="true" aria-labelledby="budget-fixed-modal-title">
            <h2 id="budget-fixed-modal-title" class="budget__modal-title" data-budget-fixed-modal-heading>Charge fixe</h2>
            <input type="hidden" data-budget-fixed-edit-id value="" />
            <label class="budget__field">
              <span class="budget__label">Nom</span>
              <input type="text" class="budget__input" data-budget-fixed-name maxlength="80" />
            </label>
            <label class="budget__field">
              <span class="budget__label">Montant (€)</span>
              <input type="text" class="budget__input" data-budget-fixed-amount inputmode="decimal" />
            </label>
            <label class="budget__field">
              <span class="budget__label">Catégorie</span>
              <input type="text" class="budget__input" data-budget-fixed-category maxlength="40" placeholder="Logement" />
            </label>
            <label class="budget__field">
              <span class="budget__label">Icône (emoji)</span>
              <input type="text" class="budget__input budget__input--emoji" data-budget-fixed-icon maxlength="4" />
            </label>
            <label class="budget__check-row">
              <input type="checkbox" data-budget-fixed-active checked />
              <span>Active ce mois-ci</span>
            </label>
            <div class="budget__modal-actions budget__modal-actions--spread">
              <button type="button" class="btn btn-secondary budget__btn-danger-text" data-budget-fixed-delete hidden>Supprimer</button>
              <div class="budget__modal-actions-inline">
                <button type="button" class="btn btn-secondary" data-budget-dismiss="fixed">Annuler</button>
                <button type="button" class="btn btn-primary" data-budget-save-fixed>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="budget__modal" data-budget-modal-cat data-budget-modal-name="cat" hidden aria-hidden="true">
        <div class="budget__modal-backdrop" data-budget-dismiss="cat" aria-hidden="true"></div>
        <div class="budget__modal-sheet" data-budget-sheet>
          <button type="button" class="budget__sheet-handle" data-budget-sheet-handle aria-label="Glisser vers le bas pour fermer"></button>
          <div class="budget__modal-panel budget__modal-panel--body" role="dialog" aria-modal="true" aria-labelledby="budget-cat-modal-title">
            <h2 id="budget-cat-modal-title" class="budget__modal-title" data-budget-cat-modal-heading>Catégorie</h2>
            <input type="hidden" data-budget-cat-edit-id value="" />
            <label class="budget__field">
              <span class="budget__label">Emoji</span>
              <input type="text" class="budget__input budget__input--emoji" data-budget-cat-emoji maxlength="4" />
            </label>
            <label class="budget__field">
              <span class="budget__label">Nom</span>
              <input type="text" class="budget__input" data-budget-cat-label maxlength="40" />
            </label>
            <div class="budget__modal-actions budget__modal-actions--spread">
              <button type="button" class="btn btn-secondary budget__btn-danger-text" data-budget-cat-delete hidden>Supprimer</button>
              <div class="budget__modal-actions-inline">
                <button type="button" class="btn btn-secondary" data-budget-dismiss="cat">Annuler</button>
                <button type="button" class="btn btn-primary" data-budget-save-cat>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="budget__modal" data-budget-modal-verse data-budget-modal-name="verse" hidden aria-hidden="true">
        <div class="budget__modal-backdrop" data-budget-dismiss="verse" aria-hidden="true"></div>
        <div class="budget__modal-sheet" data-budget-sheet>
          <button type="button" class="budget__sheet-handle" data-budget-sheet-handle aria-label="Glisser vers le bas pour fermer"></button>
          <div class="budget__modal-panel budget__modal-panel--body" role="dialog" aria-modal="true" aria-labelledby="budget-verse-title">
            <h2 id="budget-verse-title" class="budget__modal-title">Verser sur le projet</h2>
            <input type="hidden" data-budget-verse-project-id value="" />
            <p class="budget__verse-target" data-budget-verse-label></p>
            <label class="budget__field">
              <span class="budget__label">Montant (€)</span>
              <input type="text" class="budget__input" data-budget-verse-amount inputmode="decimal" enterkeyhint="done" />
            </label>
            <div class="budget__modal-actions">
              <button type="button" class="btn btn-secondary" data-budget-dismiss="verse">Annuler</button>
              <button type="button" class="btn btn-primary" data-budget-save-verse>Verser</button>
            </div>
          </div>
        </div>
      </div>

      <div class="budget__modal" data-budget-modal-project data-budget-modal-name="project" hidden aria-hidden="true">
        <div class="budget__modal-backdrop" data-budget-dismiss="project" aria-hidden="true"></div>
        <div class="budget__modal-sheet" data-budget-sheet>
          <button type="button" class="budget__sheet-handle" data-budget-sheet-handle aria-label="Glisser vers le bas pour fermer"></button>
          <div class="budget__modal-panel budget__modal-panel--body" role="dialog" aria-modal="true" aria-labelledby="budget-project-modal-title">
            <h2 id="budget-project-modal-title" class="budget__modal-title" data-budget-project-modal-heading>Projet d'épargne</h2>
            <input type="hidden" data-budget-project-edit-id value="" />
            <label class="budget__field">
              <span class="budget__label">Nom</span>
              <input type="text" class="budget__input" data-budget-project-name maxlength="80" />
            </label>
            <label class="budget__field">
              <span class="budget__label">Emoji</span>
              <input type="text" class="budget__input budget__input--emoji" data-budget-project-emoji maxlength="4" />
            </label>
            <label class="budget__field">
              <span class="budget__label">Objectif (€)</span>
              <input type="text" class="budget__input" data-budget-project-target inputmode="decimal" />
            </label>
            <label class="budget__field">
              <span class="budget__label">Montant actuel (€)</span>
              <input type="text" class="budget__input" data-budget-project-current inputmode="decimal" />
            </label>
            <div class="budget__modal-actions budget__modal-actions--spread">
              <button type="button" class="btn btn-secondary budget__btn-danger-text" data-budget-project-delete hidden>Supprimer</button>
              <div class="budget__modal-actions-inline">
                <button type="button" class="btn btn-secondary" data-budget-dismiss="project">Annuler</button>
                <button type="button" class="btn btn-primary" data-budget-save-project>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderHero({
  remaining,
  tone,
  barPct,
  realBudget,
  fixedTotal,
  variableSpent,
  monthLabel,
  periodSinceLine
}) {
  const amountClass = toneClass(tone);
  const line =
    remaining >= 0
      ? `<p class="budget__hero-line" role="status"><span class="budget__hero-lead">Il reste </span><span class="budget__hero-amount ${amountClass}">${formatMoneyEUR(remaining)}</span><span class="budget__hero-tail"> ce mois</span></p>`
      : `<p class="budget__hero-line" role="status"><span class="budget__hero-lead">Dépassé de </span><span class="budget__hero-amount ${amountClass}">${formatMoneyEUR(Math.abs(remaining))}</span><span class="budget__hero-tail"></span></p><p class="budget__hero-caption">par rapport au budget prévu</p>`;
  const since =
    typeof periodSinceLine === 'string' && periodSinceLine.trim()
      ? `<p class="budget__hero-period-since">${escapeHtml(periodSinceLine)}</p>`
      : '';

  return `
    <p class="budget__hero-month">${escapeHtml(monthLabel)}</p>
    ${line}
    <div class="budget__bar-wrap" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(barPct)}" aria-label="Dépenses du mois">
      <div class="budget__bar-track">
        <div class="budget__bar-fill budget__bar-fill--${escapeHtml(tone)}" style="width: ${Math.min(100, barPct)}%"></div>
      </div>
    </div>
    ${since}
    <div class="budget__hero-actions">
      <button type="button" class="btn btn-secondary budget__hero-new-month" data-budget-new-month>
        🔄 Nouveau mois
      </button>
      <p class="budget__hero-actions-hint">Remet à zéro le suivi du mois (budget + barre des courses). Les dépenses restent dans l’historique.</p>
    </div>
    <dl class="budget__hero-meta">
      <div class="budget__hero-meta-row">
        <dt>Budget réel</dt>
        <dd>${formatMoneyEUR(realBudget)}</dd>
      </div>
      <div class="budget__hero-meta-row">
        <dt>Charges fixes</dt>
        <dd>${formatMoneyEUR(fixedTotal)}</dd>
      </div>
      <div class="budget__hero-meta-row">
        <dt>Dépenses variables</dt>
        <dd>${formatMoneyEUR(variableSpent)}</dd>
      </div>
    </dl>
  `;
}

export function renderSettings(config, realBudget) {
  return `
    <label class="budget__field budget__field--inline">
      <span class="budget__label">Budget mensuel (€)</span>
      <input type="text" class="budget__input" data-budget-config-monthly inputmode="decimal" value="${escapeHtml(String(config.monthlyBudget))}" />
    </label>
    <label class="budget__field budget__field--inline">
      <span class="budget__label">Objectif épargne (€)</span>
      <input type="text" class="budget__input" data-budget-config-savings inputmode="decimal" value="${escapeHtml(String(config.savingsGoal))}" />
    </label>
    <p class="budget__real-budget" data-budget-real-line>
      Budget réel (après épargne) : <strong>${formatMoneyEUR(realBudget)}</strong>
    </p>
    <div class="budget__settings-new-month">
      <button type="button" class="btn btn-secondary budget__new-month-btn" data-budget-new-month>
        🔄 Nouveau mois
      </button>
    </div>
  `;
}

export function renderFixedList(charges) {
  if (!charges.length) {
    return '<li class="budget__empty">Aucune charge fixe.</li>';
  }
  return charges
    .map(
      (c) => `
    <li class="budget__fixed-item">
      <button type="button" class="budget__fixed-btn" data-budget-fixed-edit="${escapeHtml(c.id)}">
        <span class="budget__fixed-icon" aria-hidden="true">${escapeHtml(c.icon || '•')}</span>
        <span class="budget__fixed-name">${escapeHtml(c.name)}</span>
        <span class="budget__fixed-amt">${formatMoneyEUR(c.amount)}</span>
        <span class="budget__fixed-badge ${c.active ? 'is-on' : 'is-off'}">${c.active ? 'Actif' : 'Pause'}</span>
      </button>
    </li>
  `
    )
    .join('');
}

export function renderCategorySettings(categories) {
  return categories
    .map(
      (c) => `
    <button type="button" class="budget__cat-tile" data-budget-cat-edit="${escapeHtml(c.id)}">
      <span class="budget__cat-tile-emoji" aria-hidden="true">${escapeHtml(c.emoji)}</span>
      <span class="budget__cat-tile-label">${escapeHtml(c.label)}</span>
    </button>
  `
    )
    .join('');
}

export function renderExpenseCategoryPicker(categories, selectedId) {
  return categories
    .map((c) => {
      const on = c.id === selectedId ? 'is-selected' : '';
      return `
      <button type="button" class="budget__pick ${on}" data-budget-pick-cat="${escapeHtml(c.id)}" aria-pressed="${c.id === selectedId}">
        <span class="budget__pick-emoji" aria-hidden="true">${escapeHtml(c.emoji)}</span>
        <span class="budget__pick-label">${escapeHtml(c.label)}</span>
      </button>
    `;
    })
    .join('');
}

const R = 40;
const CIRC = 2 * Math.PI * R;

export function renderProjectCard(project) {
  const target = Number(project.target) || 0;
  const current = Number(project.current) || 0;
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const done = target > 0 && current >= target;
  const offset = CIRC * (1 - pct / 100);
  const strokeClass = done ? 'budget__ring-stroke--done' : 'budget__ring-stroke--accent';
  const celebrate = done ? 'budget__ring--celebrate' : '';

  return `
    <article class="budget__project card budget__project-card">
      <div class="budget__ring-wrap ${celebrate}" aria-hidden="true">
        <svg class="budget__ring" viewBox="0 0 100 100" width="100%" height="100%">
          <circle class="budget__ring-bg" cx="50" cy="50" r="${R}" fill="none" />
          <circle
            class="budget__ring-progress ${strokeClass}"
            cx="50" cy="50" r="${R}"
            fill="none"
            stroke-dasharray="${CIRC}"
            stroke-dashoffset="${offset}"
          />
        </svg>
        <div class="budget__ring-center">
          <span class="budget__ring-emoji">${escapeHtml(project.emoji)}</span>
          <span class="budget__ring-pct">${Math.round(pct)}%</span>
        </div>
      </div>
      <h3 class="budget__project-name">${escapeHtml(project.name)}</h3>
      <p class="budget__project-numbers">${formatMoneyEUR(current)} / ${formatMoneyEUR(target)}</p>
      <div class="budget__project-actions">
        <button type="button" class="btn btn-secondary budget__project-edit" data-budget-project-edit="${escapeHtml(project.id)}" aria-label="Modifier le projet">✏️</button>
        <button type="button" class="btn btn-secondary budget__project-verse" data-budget-open-verse="${escapeHtml(project.id)}">+ Verser</button>
      </div>
    </article>
  `;
}

export function renderProjectsSection(projects) {
  const gridInner = projects.length ? projects.map((p) => renderProjectCard(p)).join('') : '<p class="budget__empty budget__empty--in-grid">Aucun projet pour l’instant.</p>';
  return `
    <div class="budget__projects-inner">
      <div class="budget__projects-grid">${gridInner}</div>
      <button type="button" class="btn btn-secondary budget__project-new" data-budget-project-add>+ Nouveau projet</button>
    </div>
  `;
}

export function renderSavingsBalance(totalBalance, onProjects) {
  return `
    <label class="budget__field budget__field--balance">
      <span class="budget__label">Solde total épargne</span>
      <div class="budget__balance-row">
        <input type="text" class="budget__input budget__input--balance" data-budget-total-balance inputmode="decimal" value="${escapeHtml(String(totalBalance))}" />
        <span class="budget__balance-hint">Sur les projets : ${formatMoneyEUR(onProjects)}</span>
      </div>
    </label>
  `;
}

export function renderDistribution(projects, totalBalance) {
  const active = projects.filter((p) => (Number(p.current) || 0) > 0);
  const sumCur = active.reduce((a, p) => a + (Number(p.current) || 0), 0);
  const base = sumCur > 0 ? sumCur : Number(totalBalance) || 0;
  if (base <= 0 || !active.length) {
    return '<p class="budget__dist-empty">Ajoute des versements pour voir la répartition.</p>';
  }
  const parts = active
    .map((p) => {
      const cur = Number(p.current) || 0;
      const w = base > 0 ? (cur / base) * 100 : 0;
      return `<span class="budget__dist-seg" style="width: ${w}%" title="${escapeHtml(p.name)} : ${formatMoneyEUR(cur)}"><span class="budget__dist-seg-inner"></span></span>`;
    })
    .join('');
  return `
    <div class="budget__dist-bar" role="img" aria-label="Répartition entre projets">${parts}</div>
    <ul class="budget__dist-legend">
      ${active
        .map(
          (p) => `
        <li><span class="budget__dist-dot" aria-hidden="true">${escapeHtml(p.emoji)}</span> ${escapeHtml(p.name)} — ${formatMoneyEUR(p.current)}</li>
      `
        )
        .join('')}
    </ul>
  `;
}

export function renderHistoryToolbar(months, selectedMonth, categories, filterCatId) {
  const opts = months
    .map((m) => `<option value="${escapeHtml(m)}" ${m === selectedMonth ? 'selected' : ''}>${escapeHtml(m)}</option>`)
    .join('');
  const catOpts = `<option value="">Toutes les catégories</option>${categories
    .map((c) => `<option value="${escapeHtml(c.id)}" ${c.id === filterCatId ? 'selected' : ''}>${escapeHtml(c.emoji)} ${escapeHtml(c.label)}</option>`)
    .join('')}`;

  return `
    <div class="budget__toolbar-grid">
      <label class="budget__field budget__field--grow">
        <span class="budget__label">Mois</span>
        <select class="budget__select" data-budget-history-month>${opts}</select>
      </label>
      <label class="budget__field budget__field--grow">
        <span class="budget__label">Catégorie</span>
        <select class="budget__select" data-budget-history-filter>${catOpts}</select>
      </label>
      <button type="button" class="btn btn-secondary budget__export-btn" data-budget-export>Exporter JSON</button>
    </div>
  `;
}

export function renderCategoryTotals(totals, categories, month) {
  const map = new Map(categories.map((c) => [c.id, c]));
  const rows = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([id, amt]) => {
      const c = map.get(id);
      const label = c ? `${c.emoji} ${c.label}` : id;
      return `<tr><td>${escapeHtml(label)}</td><td class="budget__td-num">${formatMoneyEUR(amt)}</td></tr>`;
    })
    .join('');
  if (!rows) {
    return `<p class="budget__empty">Aucune dépense en ${escapeHtml(month)}.</p>`;
  }
  return `
    <table class="budget__totals-table">
      <caption>Totaux par catégorie — ${escapeHtml(month)}</caption>
      <thead><tr><th>Catégorie</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export function renderHistoryList(expenses, categories) {
  if (!expenses.length) {
    return '<li class="budget__empty">Aucune dépense pour ce filtre.</li>';
  }
  const map = new Map(categories.map((c) => [c.id, c]));
  return expenses
    .map((e) => {
      const c = map.get(e.category);
      const lab = c ? `${c.emoji} ${c.label}` : e.category;
      const src = e.source === 'shopping' ? '<span class="budget__src">Courses</span>' : '';
      return `
      <li class="budget__hist-item">
        <div class="budget__hist-main">
          <span class="budget__hist-cat">${escapeHtml(lab)}</span>
          ${src}
        </div>
        <span class="budget__hist-amt">${formatMoneyEUR(e.amount)}</span>
        <span class="budget__hist-date">${escapeHtml(e.date)}</span>
        <span class="budget__hist-desc">${escapeHtml(e.description || '—')}</span>
        <button type="button" class="budget__hist-del btn btn-secondary" data-budget-del-expense="${escapeHtml(e.id)}" aria-label="Supprimer la dépense">×</button>
      </li>
    `;
    })
    .join('');
}

export function renderDashboardWidget({ remaining, barPct, tone, projectLabel, projectPct }) {
  const barTone = tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'danger';
  return {
    title: 'Budget',
    content: `
      <p class="budget-widget__remain">Reste ce mois : <strong class="budget-widget__strong budget-widget__strong--${escapeHtml(barTone)}">${formatMoneyEUR(remaining)}</strong></p>
      <div class="budget-widget__bar" role="presentation">
        <div class="budget-widget__bar-track">
          <div class="budget-widget__bar-fill budget-widget__bar-fill--${escapeHtml(barTone)}" style="width: ${Math.min(100, barPct)}%"></div>
        </div>
      </div>
      <p class="dashboard__muted budget-widget__next">${escapeHtml(projectLabel)} · ${projectPct}% atteint</p>
      <button type="button" class="btn dashboard__link" data-dashboard-nav="budget">Ouvrir le budget</button>
    `
  };
}
