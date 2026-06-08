function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const DAY_LABELS = {
  lundi: 'Lundi',
  mardi: 'Mardi',
  mercredi: 'Mercredi',
  jeudi: 'Jeudi',
  vendredi: 'Vendredi',
  samedi: 'Samedi'
};

const WORK_DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const DEFAULT_SITES = [
  { id: 'site-a', name: 'Site A' },
  { id: 'site-b', name: 'Site B' },
  { id: 'site-c', name: 'Site C' }
];

function siteSelectWithAttrs(selected, attrs, muted = false, sites = DEFAULT_SITES) {
  const value = selected || '';
  const emptySelected = !value ? 'selected' : '';
  const siteOpts = sites.map(
    (s) => `<option value="${escapeHtml(s.name)}" ${value === s.name ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
  ).join('');
  const mutedClass = muted ? ' planning-config-slot--muted' : '';

  return `
    <select class="planning-site-select${mutedClass}" ${attrs}>
      <option value="" ${emptySelected}>— Repos —</option>
      ${siteOpts}
    </select>
  `;
}

function siteFieldHtml(selected, attrs, muted = false) {
  const mutedClass = muted ? ' is-muted' : '';
  return `
    <div class="planning-field${mutedClass}">
      <label>Site</label>
      ${siteSelectWithAttrs(selected, attrs, false)}
    </div>
  `;
}

function timeFieldHtml(labelText, value, attrs, muted = false) {
  const mutedClass = muted ? ' is-muted' : '';
  return `
    <div class="planning-time-field${mutedClass}">
      <label>${escapeHtml(labelText)}</label>
      <input
        type="time"
        class="planning-time-input"
        placeholder="--:--"
        value="${escapeHtml(value || '')}"
        ${attrs}
      />
    </div>
  `;
}

function dateFieldHtml(labelText, value, attrs) {
  return `
    <div class="planning-time-field planning-config__ref">
      <label>${escapeHtml(labelText)}</label>
      <input
        type="date"
        class="planning-time-input"
        value="${escapeHtml(value || '')}"
        ${attrs}
        required
      />
    </div>
  `;
}

function renderTodayBody(card) {
  if (card.off) {
    return '<p class="planning-today-card__status">Repos 😴</p>';
  }
  if (!card.configured) {
    return '<p class="planning-today-card__status">Non configuré</p>';
  }
  const overtimeHtml = card.hasOvertime
    ? '<p class="planning-overtime">⚡ Heure supplémentaire</p>'
    : '';
  const durationHtml = card.durationLabel
    ? `<p class="planning-today-card__duration">⏱ ${escapeHtml(card.durationLabel)}</p>`
    : '';

  return `
    <p class="planning-today-card__slots">📍 ${escapeHtml(card.slotsSummary)}</p>
    ${durationHtml}
    ${overtimeHtml}
  `;
}

function renderWeekRow(row) {
  const classes = ['planning-week-row'];
  if (row.isToday) classes.push('today');
  if (row.isPast) classes.push('past');

  let detail = '';
  if (row.off) {
    detail = '<span class="planning-week-row__off">Repos</span>';
  } else if (!row.configured) {
    detail = '<span class="planning-week-row__empty">—</span>';
  } else {
    const ot = row.hasOvertime ? ' <span class="planning-overtime">⚡</span>' : '';
    detail = `<span class="planning-week-row__slots">${escapeHtml(row.slotsSummary)}</span>${ot}`;
  }

  return `
    <div class="${classes.join(' ')}">
      <span class="planning-week-row__day">${escapeHtml(row.shortLabel)}</span>
      <span class="planning-week-row__detail">${detail}</span>
    </div>
  `;
}

export function createMainView(model) {
  const card = model.todayCard;
  const holidaysOn = model.holidaysMode;
  const holidaysLabel = holidaysOn ? 'Mode Vacances ON' : 'Mode Vacances OFF';

  return `
    <section class="planning planning--main animate-fade-in">
      <article class="planning-today-card card">
        <h1 class="planning-today-card__title">📅 Aujourd'hui — ${escapeHtml(card.dateLabel)}</h1>
        <p class="planning-today-card__meta">${escapeHtml(card.weekLabel)} · ${escapeHtml(card.cycleLabel)}</p>
        <div class="planning-today-card__body">
          ${renderTodayBody(card)}
        </div>
        <button type="button" class="btn btn-secondary planning-today-card__edit" data-planning-edit-day>
          ✏ Modifier ce jour
        </button>
      </article>

      <section class="planning-week" aria-label="Cette semaine">
        <h2 class="planning-week__title">Cette semaine</h2>
        ${model.weekRows.map(renderWeekRow).join('')}
      </section>

      <footer class="planning-actions">
        <button type="button" class="btn btn-secondary planning-actions__btn" data-planning-toggle-holidays>
          🏖 ${escapeHtml(holidaysLabel)}
        </button>
        <button type="button" class="btn btn-primary planning-actions__btn" data-planning-open-config>
          ⚙ Configurer
        </button>
      </footer>
    </section>
  `;
}

function renderConfigSlotRow(weekIndex, dayKey, slotNum, slot, off, muted) {
  const disabledAttr = off ? 'disabled' : '';
  const slotLabel = slotNum === '1' ? 'Plage 1' : 'Plage 2';
  const placeholder =
    slotNum === '2' && !slot.site
      ? '<p class="planning-config-slot__hint">Ajouter une 2e plage</p>'
      : '';
  const attrs = `data-planning-config-site="${weekIndex}" data-day="${dayKey}" data-slot="${slotNum}" ${disabledAttr}`;
  const startAttrs = `data-planning-config-start="${weekIndex}" data-day="${dayKey}" data-slot="${slotNum}" ${disabledAttr}`;
  const endAttrs = `data-planning-config-end="${weekIndex}" data-day="${dayKey}" data-slot="${slotNum}" ${disabledAttr}`;

  return `
    <div class="planning-config-slot ${muted ? 'is-muted' : ''}" ${slotNum === '2' ? 'data-planning-config-slot2' : ''}>
      <span class="planning-config-slot__label">${slotLabel}</span>
      ${placeholder}
      <div class="planning-config-slot__fields">
        ${siteFieldHtml(slot.site, attrs, muted)}
        ${timeFieldHtml('Début', slot.start, startAttrs, muted)}
        ${timeFieldHtml('Fin', slot.end, endAttrs, muted)}
      </div>
    </div>
  `;
}

function renderConfigDayBlock(weekIndex, dayKey, day) {
  const off = day.off === true;
  const slot2Muted = !day.slot2?.site;

  return `
    <article class="planning-config-day card" data-planning-config-day>
      <header class="planning-config-day__header">
        <h3 class="planning-config-day__title">${escapeHtml(DAY_LABELS[dayKey])}</h3>
        <label class="planning-config-day__off">
          <input
            type="checkbox"
            data-planning-config-off="${weekIndex}"
            data-day="${dayKey}"
            ${off ? 'checked' : ''}
          />
          Repos
        </label>
      </header>
      ${renderConfigSlotRow(weekIndex, dayKey, '1', day.slot1, off, false)}
      ${renderConfigSlotRow(weekIndex, dayKey, '2', day.slot2, off, slot2Muted)}
    </article>
  `;
}

function renderHolidayPeriodRow(period, index) {
  const start = period?.start || '';
  const end = period?.end || '';
  return `
    <div class="planning-holiday-period card" data-planning-holiday-row>
      <div class="planning-holiday-period__fields">
        <div class="planning-time-field">
          <label>Début</label>
          <input
            type="date"
            class="planning-time-input"
            data-planning-holiday-start
            value="${escapeHtml(start)}"
          />
        </div>
        <div class="planning-time-field">
          <label>Fin</label>
          <input
            type="date"
            class="planning-time-input"
            data-planning-holiday-end
            value="${escapeHtml(end)}"
          />
        </div>
      </div>
      <button
        type="button"
        class="btn btn-secondary planning-holiday-period__delete"
        data-planning-holiday-delete="${index}"
        aria-label="Supprimer cette période"
      >
        🗑
      </button>
    </div>
  `;
}

function createHolidayPeriodsSection(periods) {
  const list = Array.isArray(periods) ? periods : [];
  const rows = list.map((p, i) => renderHolidayPeriodRow(p, i)).join('');
  return `
    <section class="planning-holiday-periods" aria-labelledby="planning-holiday-periods-heading">
      <h2 id="planning-holiday-periods-heading" class="planning-holiday-periods__title">
        Périodes de vacances
      </h2>
      <p class="planning-holiday-periods__hint">
        Pendant ces dates, le cycle est en pause et le planning vacances s&apos;applique.
      </p>
      <div class="planning-holiday-periods__list">${rows}</div>
      <button type="button" class="btn btn-secondary planning-holiday-periods__add" data-planning-add-holiday-period>
        + Ajouter une période
      </button>
    </section>
  `;
}

export function createConfigView(model) {
  const { configData, configWeekTab } = model;
  const week = configData.weeks[configWeekTab] || configData.weeks[0];
  const holidayPeriods = Array.isArray(configData.holiday_periods) ? configData.holiday_periods : [];

  const tabs = Array.from({ length: 5 }, (_, i) => {
    const active = i === configWeekTab ? 'is-active' : '';
    return `<button type="button" class="planning-config__tab ${active}" data-planning-week-tab="${i}">Semaine ${i + 1}</button>`;
  }).join('');

  const days = WORK_DAYS.map((dayKey) => renderConfigDayBlock(configWeekTab, dayKey, week[dayKey])).join('');

  return `
    <section class="planning planning--config planning-config-container animate-fade-in">
      <header class="planning-config__header">
        <button type="button" class="btn btn-secondary planning-config__back" data-planning-close-config>
          ← Retour
        </button>
        <h1 class="planning-config__title">Configurer le planning</h1>
      </header>

      <nav class="planning-config__tabs" aria-label="Semaines du cycle">${tabs}</nav>

      <form class="planning-config__form" data-planning-config-form>
        <div class="planning-config__days">${days}</div>

        ${createHolidayPeriodsSection(holidayPeriods)}

        ${dateFieldHtml(
          'Date de référence (lundi semaine 1)',
          configData.reference_date,
          'data-planning-ref-date'
        )}

        <button type="submit" class="btn btn-primary planning-config__save">💾 Sauvegarder</button>
      </form>
    </section>
  `;
}

function renderModalSlotSection(title, slotNum, slot, off, fieldsDisabled) {
  const disabled = off || fieldsDisabled ? 'disabled' : '';
  return `
    <div class="planning-modal__slot-section">
      <h3 class="planning-modal__slot-title">${escapeHtml(title)}</h3>
      <div class="planning-field">
        <label>Site</label>
        <select class="planning-site-select" data-planning-day-site="${slotNum}" ${disabled}>
          <option value="" ${!slot.site ? 'selected' : ''}>— Repos —</option>
          ${DEFAULT_SITES.map((s) => `<option value="${escapeHtml(s.name)}" ${slot.site === s.name ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
        </select>
      </div>
      ${timeFieldHtml('Début', slot.start, `data-planning-day-start="${slotNum}" ${disabled}`, false)}
      ${timeFieldHtml('Fin', slot.end, `data-planning-day-end="${slotNum}" ${disabled}`, false)}
    </div>
  `;
}

export function createDayEditModal({ dateKey, dateLabel, schedule, slot2Open }) {
  const off = schedule.off === true;
  const fieldsDisabled = off ? 'disabled' : '';
  const slot2Class = slot2Open ? 'is-open' : '';

  return `
    <div class="planning-modal" data-planning-modal role="dialog" aria-modal="true" aria-labelledby="planning-modal-title">
      <button type="button" class="planning-modal__backdrop" data-planning-modal-backdrop aria-label="Fermer"></button>
      <form class="planning-modal-content" data-planning-day-form>
        <input type="hidden" data-planning-day-date value="${escapeHtml(dateKey)}" />
        <h2 id="planning-modal-title" class="planning-modal__title">Modifier le ${escapeHtml(dateLabel)}</h2>

        <label class="planning-modal__check planning-modal__check--off">
          <input type="checkbox" data-planning-day-off ${off ? 'checked' : ''} />
          <span>Jour de repos</span>
        </label>

        ${renderModalSlotSection('Plage 1', '1', schedule.slot1 || {}, off, fieldsDisabled)}

        <div class="planning-modal__slot2-wrap">
          <button type="button" class="btn btn-secondary planning-modal__slot2-toggle" data-planning-slot2-toggle>
            Plage 2 — optionnelle
          </button>
          <div class="planning-modal__slot2-panel ${slot2Class}" data-planning-slot2-panel>
            ${renderModalSlotSection('Plage 2', '2', schedule.slot2 || {}, off, fieldsDisabled)}
          </div>
        </div>

        <label class="planning-modal__check">
          <input type="checkbox" data-planning-day-overtime ${schedule.overtime ? 'checked' : ''} />
          <span>⚡ Heure supplémentaire</span>
        </label>

        <div class="planning-modal__actions">
          <button type="submit" class="btn btn-primary">Sauvegarder</button>
          <button type="button" class="btn btn-secondary" data-planning-modal-cancel>Annuler</button>
        </div>
      </form>
    </div>
  `;
}

export function createDashboardWidgetHtml({ state, slotsSummary, hasOvertime }) {
  if (state === 'off') {
    return `<div class="planning-widget"><p class="planning-widget__line">😴 Repos aujourd'hui</p></div>`;
  }
  if (state === 'unconfigured') {
    return `<div class="planning-widget"><p class="planning-widget__line">⚙ Configurer le planning</p></div>`;
  }
  const ot = hasOvertime ? '<p class="planning-widget__line planning-overtime">⚡ Heure sup</p>' : '';
  return `
    <div class="planning-widget">
      <p class="planning-widget__line">📍 ${escapeHtml(slotsSummary || '')}</p>
      ${ot}
    </div>
  `;
}
