function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const MOMENT_ORDER = ['morning', 'noon', 'evening'];

function createMedicationRow(med, moment, momentLabel, checked, slotKey) {
  const strike = checked ? 'meds__row--done' : '';
  const bounce = checked ? 'animate-bounce-in' : '';
  return `
    <li class="meds__row card ${strike} ${bounce}">
      <label class="meds__check-label">
        <input
          class="meds__checkbox"
          type="checkbox"
          data-med-toggle="${escapeHtml(slotKey)}"
          ${checked ? 'checked' : ''}
        />
        <span class="meds__checkbox-ui" aria-hidden="true"></span>
      </label>
      <div class="meds__row-body">
        <p class="meds__name">${escapeHtml(med.name)}</p>
        <p class="meds__meta">
          <span class="meds__dosage">${escapeHtml(med.dosage || '')}</span>
          <span class="meds__moment">${escapeHtml(momentLabel)}</span>
        </p>
      </div>
    </li>
  `;
}

function createMainView(model) {
  const { formattedDate, rows, footerMessage, hasMeds } = model;
  const listHtml = rows.length
    ? `<ul class="meds__list">${rows.map((r) => createMedicationRow(r.med, r.moment, r.momentLabel, r.checked, r.slotKey)).join('')}</ul>`
    : `<p class="meds__empty">Ajoute un médicament pour recevoir des rappels doux.</p>`;

  return `
    <section class="meds meds--main animate-fade-in">
      <header class="meds__header">
        <h1 class="meds__title">Médicaments 💊</h1>
        <p class="meds__date">${escapeHtml(formattedDate)}</p>
      </header>
      ${listHtml}
      <p class="meds__footer-msg" role="status">${escapeHtml(footerMessage)}</p>
      ${
        hasMeds
          ? `<button type="button" class="btn meds__link" data-med-open-config>⚙️ Gérer mes médicaments</button>`
          : `<button type="button" class="btn meds__link" data-med-open-config>⚙️ Configurer mes médicaments</button>`
      }
    </section>
  `;
}

function momentCheckbox(moment, label, checked, disabled) {
  const id = `med-moment-${moment}`;
  return `
    <label class="meds__moment-check" for="${id}">
      <input type="checkbox" id="${id}" data-med-config-moment="${moment}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} />
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function createConfigRow(med) {
  const m = med.moments || [];
  const hasMorning = m.includes('morning');
  const hasNoon = m.includes('noon');
  const hasEvening = m.includes('evening');
  const r = med.reminders || {};
  return `
    <li class="meds-config__item card" data-med-config-row="${escapeHtml(med.id)}">
      <div class="meds-config__fields">
        <label class="meds-config__field">
          <span class="meds-config__label">Nom</span>
          <input class="meds-config__input" type="text" data-med-field="name" data-med-id="${escapeHtml(med.id)}" value="${escapeHtml(med.name)}" placeholder="Ex. Ritalin" />
        </label>
        <label class="meds-config__field">
          <span class="meds-config__label">Dosage</span>
          <input class="meds-config__input" type="text" data-med-field="dosage" data-med-id="${escapeHtml(med.id)}" value="${escapeHtml(med.dosage || '')}" placeholder="10mg" />
        </label>
      </div>
      <fieldset class="meds-config__moments">
        <legend class="meds-config__legend">Moments</legend>
        <div class="meds-config__moment-row">
          ${momentCheckbox('morning', 'Matin', hasMorning, false)}
          ${momentCheckbox('noon', 'Midi', hasNoon, false)}
          ${momentCheckbox('evening', 'Soir', hasEvening, false)}
        </div>
      </fieldset>
      <div class="meds-config__times">
        <label class="meds-config__time" ${hasMorning ? '' : 'hidden'}>
          <span class="meds-config__label">Rappel matin</span>
          <input class="meds-config__input" type="time" data-med-reminder="${escapeHtml(med.id)}" data-moment="morning" value="${escapeHtml(r.morning || '08:00')}" ${hasMorning ? '' : 'disabled'} />
        </label>
        <label class="meds-config__time" ${hasNoon ? '' : 'hidden'}>
          <span class="meds-config__label">Rappel midi</span>
          <input class="meds-config__input" type="time" data-med-reminder="${escapeHtml(med.id)}" data-moment="noon" value="${escapeHtml(r.noon || '13:00')}" ${hasNoon ? '' : 'disabled'} />
        </label>
        <label class="meds-config__time" ${hasEvening ? '' : 'hidden'}>
          <span class="meds-config__label">Rappel soir</span>
          <input class="meds-config__input" type="time" data-med-reminder="${escapeHtml(med.id)}" data-moment="evening" value="${escapeHtml(r.evening || '21:00')}" ${hasEvening ? '' : 'disabled'} />
        </label>
      </div>
      <button type="button" class="btn meds-config__delete" data-med-delete="${escapeHtml(med.id)}">Supprimer</button>
    </li>
  `;
}

function createConfigView(meds) {
  const rows = meds.map((med) => createConfigRow(med)).join('');
  return `
    <section class="meds meds--config animate-fade-in">
      <header class="meds__header meds-config__header">
        <button type="button" class="btn meds-config__back" data-med-config-back>← Retour</button>
        <h1 class="meds__title">Mes médicaments</h1>
        <p class="meds__subtitle">Rappels doux, sans pression.</p>
      </header>
      <ul class="meds-config__list">
        ${rows || ''}
      </ul>
      <button type="button" class="btn meds-config__add" data-med-add>+ Ajouter un médicament</button>
    </section>
  `;
}

export { escapeHtml, MOMENT_ORDER, createMainView, createConfigView };
