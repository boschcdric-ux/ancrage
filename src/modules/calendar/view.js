import { escapeHtml, formatInputDate, formatInputTime } from '../../core/format.js';

const REMINDER_MINUTE_PRESETS = [0, 5, 10, 15, 30, 60, 120, 1440];

function buildReminderMinuteOptions(currentRaw) {
  const n = Number(currentRaw);
  const set = new Set(REMINDER_MINUTE_PRESETS);
  if (Number.isFinite(n) && n >= 0 && n <= 1440) {
    set.add(Math.min(1440, Math.floor(n)));
  }
  return [...set].sort((a, b) => a - b);
}

function buildEventFormFields(form, state) {
  const reminderOptions = buildReminderMinuteOptions(form.reminder);
  const colorRadios = state.colorOptions
    .map(
      (opt) => `
        <label class="calendar-panel__color-swatch">
          <input
            type="radio"
            name="color"
            value="${escapeHtml(opt.value)}"
            class="calendar-panel__color-input"
            ${opt.value === form.color ? 'checked' : ''}
          />
          <span class="calendar-panel__sr-only">${escapeHtml(opt.label)}</span>
          <span class="calendar-panel__color-dot calendar-panel__color-dot--${escapeHtml(opt.value)}" aria-hidden="true"></span>
        </label>
      `
    )
    .join('');

  const reminderSelect = reminderOptions
    .map(
      (m) =>
        `<option value="${m}" ${Number(form.reminder) === m ? 'selected' : ''}>${m === 0 ? 'Aucun' : `${m} min`}</option>`
    )
    .join('');

  return `
    <div class="calendar-panel__form-step">
      <label class="calendar-panel__field">
        <span>Titre *</span>
        <input type="text" name="title" value="${escapeHtml(form.title)}" maxlength="180" required />
      </label>
      <div class="calendar-panel__grid calendar-panel__grid--start-row">
        <label class="calendar-panel__field">
          <span>Date début</span>
          <input type="date" name="startDate" value="${escapeHtml(form.startDate)}" required />
        </label>
        <label class="calendar-panel__field">
          <span>Heure début</span>
          <input type="time" name="startTime" value="${escapeHtml(form.startTime)}" required />
        </label>
      </div>
      <fieldset class="calendar-panel__color-fieldset">
        <legend class="calendar-panel__fieldset-legend" id="calendar-form-color-legend">Couleur</legend>
        <div class="calendar-panel__color-swatches" role="radiogroup" aria-labelledby="calendar-form-color-legend">
          ${colorRadios}
        </div>
      </fieldset>
      <label class="calendar-panel__field">
        <span>Rappel (minutes)</span>
        <select name="reminder">${reminderSelect}</select>
      </label>
    </div>
    <button
      type="button"
      class="calendar-panel__form-more-toggle btn"
      data-calendar-form-more
      aria-expanded="false"
      aria-controls="calendar-form-more-panel"
    >
      + Plus d'options ▾
    </button>
    <div
      class="calendar-panel__form-more"
      id="calendar-form-more-panel"
      data-calendar-form-more-panel
      role="region"
      aria-label="Options supplémentaires"
    >
      <div class="calendar-panel__grid">
        <label class="calendar-panel__field">
          <span>Date fin</span>
          <input type="date" name="endDate" value="${escapeHtml(form.endDate)}" data-calendar-more-first />
        </label>
        <label class="calendar-panel__field">
          <span>Heure fin</span>
          <input type="time" name="endTime" value="${escapeHtml(form.endTime)}" />
        </label>
      </div>
      <label class="calendar-panel__field">
        <span>Description</span>
        <textarea name="description" rows="3" maxlength="500">${escapeHtml(form.description)}</textarea>
      </label>
      <label class="calendar-panel__field">
        <span>Tâche associée</span>
        <select name="taskId">
          <option value="">Aucune</option>
          ${state.taskOptions
            .map(
              (task) =>
                `<option value="${task.id}" ${task.id === form.taskId ? 'selected' : ''}>${escapeHtml(task.text)}</option>`
            )
            .join('')}
        </select>
      </label>
      <div class="calendar-panel__grid">
        <label class="calendar-panel__field">
          <span>Récurrence</span>
          <select name="recurrenceType">
            <option value="none" ${form.recurrenceType === 'none' ? 'selected' : ''}>Aucune</option>
            <option value="daily" ${form.recurrenceType === 'daily' ? 'selected' : ''}>Quotidien</option>
            <option value="weekly" ${form.recurrenceType === 'weekly' ? 'selected' : ''}>Hebdomadaire</option>
            <option value="monthly" ${form.recurrenceType === 'monthly' ? 'selected' : ''}>Mensuel</option>
          </select>
        </label>
        <label class="calendar-panel__field">
          <span>Fin récurrence</span>
          <input type="date" name="recurrenceEndDate" value="${escapeHtml(form.recurrenceEndDate)}" />
        </label>
      </div>
    </div>
  `;
}

function capitalizeFrLabel(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function formatHeaderLabel(referenceDate, viewMode) {
  if (viewMode === 'day') {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(referenceDate);
  }
  if (viewMode === 'week') {
    const formatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long' });
    const start = new Date(referenceDate);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }

  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(referenceDate);
}

function formatDetailDateRange(event) {
  const start = new Date(`${event.startDate}T${event.startTime || '00:00'}`);
  const hasEnd = Boolean(event.endDate && event.endTime);
  const dateLabel = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(start);
  const startTime = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
    .format(start)
    .replace(':', 'h');

  if (!hasEnd) return `${dateLabel} · ${startTime}`;

  const end = new Date(`${event.endDate}T${event.endTime}`);
  const endTime = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
    .format(end)
    .replace(':', 'h');

  if (event.startDate === event.endDate) {
    return `${dateLabel} · ${startTime}-${endTime}`;
  }

  const endDateLabel = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(end);
  return `${dateLabel} · ${startTime} - ${endDateLabel} · ${endTime}`;
}

function createMiniUpcoming(upcomingEvents) {
  if (!upcomingEvents.length) {
    return '<p class="calendar-mini__empty">Aucun événement à venir.</p>';
  }

  return `
    <ul class="calendar-mini__list">
      ${upcomingEvents
        .map(
          (item) => `
            <li class="calendar-mini__item">
              <span class="calendar-mini__when">
                <span class="calendar-mini__when-day">${escapeHtml(item.whenLabel)}</span>
                <span class="calendar-mini__when-time">${escapeHtml(item.timeLabel)}</span>
              </span>
              <span class="calendar-mini__title">${escapeHtml(item.title)}</span>
            </li>
          `
        )
        .join('')}
    </ul>
  `;
}

function createMonthCell(dayData) {
  const classes = ['calendar-month__cell'];
  if (!dayData.inMonth) classes.push('calendar-month__cell--muted');
  if (dayData.isToday) classes.push('calendar-month__cell--today');

  const eventItems = dayData.events.slice(0, 3);
  const hiddenCount = dayData.events.length - eventItems.length;

  return `
    <button
      type="button"
      class="${classes.join(' ')}"
      data-day-cell="${dayData.date}"
      aria-label="Jour ${dayData.date}"
    >
      <span class="calendar-month__date">${dayData.dayNumber}</span>
      <span class="calendar-month__events">
        ${eventItems
          .map(
            (event) => `
              <span
                class="calendar-dot calendar-dot--${event.color}"
                data-event-open="${event.id}"
                data-occurrence="${event.occurrenceDateTime}"
                title="${escapeHtml(event.title)}"
              >
                ${event.hasTask ? '<span class="calendar-dot__task">🔗</span>' : ''}
                ${event.isRecurring ? '<span class="calendar-dot__recurrence">🔄</span>' : ''}
                <span class="calendar-dot__label">${escapeHtml(event.title)}</span>
              </span>
            `
          )
          .join('')}
        ${
          hiddenCount > 0
            ? `<span class="calendar-month__more" data-day-cell="${dayData.date}">+${hiddenCount} autres</span>`
            : ''
        }
      </span>
    </button>
  `;
}

function createMonthView(model) {
  const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  const weekdayNames = model.weekdays.map((date) =>
    weekdayFormatter.format(date).replace('.', '').slice(0, 3)
  );

  return `
    <section class="calendar-month card animate-fade-in" aria-label="Vue mois">
      <div class="calendar-month__weekdays">
        ${weekdayNames.map((name) => `<span>${escapeHtml(name)}</span>`).join('')}
      </div>
      <div class="calendar-month__grid">
        ${model.days.map((day) => createMonthCell(day)).join('')}
      </div>
    </section>
  `;
}

function formatDayViewHeaderLines(referenceDate) {
  const weekday = capitalizeFrLabel(
    new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(referenceDate).replaceAll('.', '')
  );
  const dateLine = capitalizeFrLabel(
    new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(referenceDate).replaceAll('.', '')
  );
  return { weekday, dateLine };
}

function createDayView(referenceDate, dayModel) {
  const { weekday, dateLine } = formatDayViewHeaderLines(referenceDate);
  const emptyBlock =
    dayModel.events.length === 0
      ? `
    <div class="calendar-day__empty">
      <p class="calendar-day__empty-text">Aucun événement ce jour 🌿</p>
      <button type="button" class="btn btn-primary calendar-day__empty-btn" data-day-empty-add="${escapeHtml(dayModel.dayYmd)}">
        Ajouter un événement
      </button>
    </div>
  `
      : '';

  const hourRows = dayModel.hours
    .map(
      (hour) => `
      <div class="calendar-day__hour-label">${hour}h</div>
      <button
        type="button"
        class="calendar-day__slot"
        data-slot-date="${escapeHtml(dayModel.dayYmd)}"
        data-slot-time="${String(hour).padStart(2, '0')}:00"
        aria-label="Créer événement ${escapeHtml(dayModel.dayYmd)} ${hour}h"
      ></button>
    `
    )
    .join('');

  const nowLine =
    dayModel.nowLinePercent == null
      ? ''
      : `<div class="calendar-day__now-line" style="top:${dayModel.nowLinePercent}%"></div>`;

  const eventBlocks = dayModel.events
    .map(
      (event) => `
      <button
        type="button"
        class="calendar-day__event calendar-day__event--${event.color}"
        style="top:${event.topPercent}%;height:${event.heightPercent}%;"
        data-event-open="${escapeHtml(event.id)}"
        data-occurrence="${escapeHtml(event.occurrenceDateTime)}"
        title="${escapeHtml(event.title)}"
      >
        <span class="calendar-day__event-title">${escapeHtml(event.title)}</span>
        <span class="calendar-day__event-time">${escapeHtml(event.timeLabel)}</span>
        ${event.hasTask ? '<span class="calendar-day__event-task">🔗</span>' : ''}
        ${event.isRecurring ? '<span class="calendar-day__event-rec">🔄</span>' : ''}
      </button>
    `
    )
    .join('');

  return `
    <section class="calendar-day card animate-fade-in" aria-label="Vue jour">
      <header class="calendar-day__header">
        <div class="calendar-day__header-row">
          <button type="button" class="btn calendar-day__nav-btn" data-nav="prev" aria-label="Jour précédent">←</button>
          <div class="calendar-day__headline">
            <div class="calendar-day__headline-weekday">${escapeHtml(weekday)}</div>
            <div class="calendar-day__headline-date">${escapeHtml(dateLine)}</div>
          </div>
          <button type="button" class="btn calendar-day__nav-btn" data-nav="next" aria-label="Jour suivant">→</button>
        </div>
        <button type="button" class="btn calendar-day__today-btn" data-nav="today">Aujourd'hui</button>
      </header>
      ${emptyBlock}
      <div class="calendar-day__scroll">
        <div class="calendar-day__body">
          <div class="calendar-day__grid">
            ${hourRows}
          </div>
          <div class="calendar-day__events-layer">
            ${nowLine}
            ${eventBlocks}
          </div>
        </div>
      </div>
    </section>
  `;
}

function createWeekView(model) {
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  const hourLabels = model.hours;
  const weekTimelineStartHour = hourLabels[0] ?? 8;
  const weekTimelineHourCount = hourLabels.length || 15;
  const weekTimelineMinutes = weekTimelineHourCount * 60;

  const weekEventStyle = (event) => {
    const start = new Date(event.occurrenceDateTime);
    const startMinutes = Number.isNaN(start.getTime())
      ? Math.max(0, event.rowStart - 1) * 30
      : Math.max(0, (start.getHours() - weekTimelineStartHour) * 60 + start.getMinutes());
    const topPercent = Math.min(100, (startMinutes / weekTimelineMinutes) * 100);
    const heightPercent = Math.max((30 / weekTimelineMinutes) * 100, (event.rowSpan * 30 / weekTimelineMinutes) * 100);
    return { topPercent, heightPercent };
  };

  return `
    <section class="calendar-week card animate-fade-in" aria-label="Vue semaine">
      <div class="calendar-week__header">
        <span class="calendar-week__corner"></span>
        ${model.days
          .map(
            (day) => `
              <button
                type="button"
                class="calendar-week__day ${day.isToday ? 'calendar-week__day--today' : ''}"
                data-day-cell="${day.date}"
              >
                ${escapeHtml(dayFormatter.format(day.dateObject))}
              </button>
            `
          )
          .join('')}
      </div>
      <div class="calendar-week__body">
        ${hourLabels
          .map(
            (hour) => `
              <div class="calendar-week__hour-label">${hour}h</div>
              ${model.days
                .map(
                  (day) => `
                    <button
                      type="button"
                      class="calendar-week__slot"
                      data-slot-date="${day.date}"
                      data-slot-time="${String(hour).padStart(2, '0')}:00"
                      aria-label="Créer événement ${day.date} ${hour}h"
                    ></button>
                  `
                )
                .join('')}
            `
          )
          .join('')}
        <div class="calendar-week__events-layer">
          ${model.events
            .map((event) => {
              const { topPercent, heightPercent } = weekEventStyle(event);
              return `
                <button
                  type="button"
                  class="calendar-week__event calendar-week__event--${event.color}"
                  style="--event-col:${event.column};top:${topPercent}%;height:${heightPercent}%;"
                  data-event-open="${event.id}"
                  data-occurrence="${event.occurrenceDateTime}"
                  title="${escapeHtml(event.title)}"
                >
                  <span class="calendar-week__event-title">${escapeHtml(event.title)}</span>
                  <span class="calendar-week__event-time">${escapeHtml(event.timeLabel)}</span>
                  ${event.hasTask ? '<span class="calendar-week__event-task">🔗</span>' : ''}
                  ${event.isRecurring ? '<span class="calendar-week__event-rec">🔄</span>' : ''}
                </button>
              `;
            })
            .join('')}
        </div>
      </div>
    </section>
  `;
}

function createDetailPanel(state) {
  if (!state.open || !state.event) return '';

  const event = state.event;
  return `
      <div class="calendar-panel-overlay">
        <div class="calendar-panel-sheet-root">
        <button type="button" class="calendar-panel__backdrop" data-panel-close aria-label="Fermer"></button>
        <aside class="calendar-panel card" data-calendar-panel>
          <div class="calendar-panel__handle" aria-hidden="true"></div>
          <div class="calendar-panel__scroll">
            <header class="calendar-panel__header">
              <h2>${escapeHtml(event.title)}</h2>
              <button type="button" class="calendar-panel__close btn" data-panel-close>Fermer</button>
            </header>
            <p class="calendar-panel__meta">${escapeHtml(formatDetailDateRange(event))}</p>
            ${event.description ? `<p class="calendar-panel__description">${escapeHtml(event.description)}</p>` : ''}
            ${
              event.taskLabel
                ? `<p class="calendar-panel__task">🔗 Tâche associée : ${escapeHtml(event.taskLabel)}</p>`
                : ''
            }
            <p class="calendar-panel__recurrence">Récurrence : ${escapeHtml(event.recurrenceLabel)}</p>
          </div>
          <div class="calendar-panel__actions">
            <button type="button" class="btn btn-primary" data-event-edit="${event.id}">Modifier</button>
            <button type="button" class="btn calendar-panel__btn-danger-outline" data-event-delete="${event.id}">Supprimer</button>
          </div>
        </aside>
        </div>
      </div>
    `;
}

function createEventFormScreen(state) {
  const form = state.form;
  const formState = {
    colorOptions: state.colorOptions,
    taskOptions: state.taskOptions
  };
  const titleText = state.mode === 'edit' ? 'Modifier' : 'Nouvel événement';
  const deleteBlock =
    state.mode === 'edit' && state.eventId
      ? `
    <div class="calendar-form-screen__danger-zone">
      <button type="button" class="calendar-form-screen__delete-btn" data-calendar-form-delete="${escapeHtml(state.eventId)}">Supprimer</button>
    </div>
  `
      : '';

  return `
    <section class="calendar calendar--event-form animate-fade-in" aria-label="${escapeHtml(titleText)}">
      <div class="calendar-form-screen">
        <header class="calendar-form-screen__header">
          <button type="button" class="calendar-form-screen__back" data-calendar-form-back>← Retour</button>
          <h1 class="calendar-form-screen__title">${escapeHtml(titleText)}</h1>
          <button type="submit" class="calendar-form-screen__save" form="calendar-event-form">Enregistrer</button>
        </header>
        <div class="calendar-form-screen__body">
          <form class="calendar-panel__form" id="calendar-event-form" data-calendar-form>
            ${buildEventFormFields(form, formState)}
          </form>
          ${deleteBlock}
        </div>
      </div>
    </section>
  `;
}

function createCalendarView(model) {
  if (model.eventForm?.open) {
    return createEventFormScreen(model.eventForm);
  }

  const referenceDate = new Date(model.referenceDate);
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long' });
  const monthOptions = Array.from({ length: 12 }, (_, month) => {
    const label = monthFormatter.format(new Date(currentYear, month, 1));
    return `<option value="${month}" ${month === currentMonth ? 'selected' : ''}>${escapeHtml(
      label.charAt(0).toUpperCase() + label.slice(1)
    )}</option>`;
  }).join('');
  const yearOptions = Array.from({ length: 21 }, (_, offset) => currentYear - 10 + offset)
    .map((year) => `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`)
    .join('');

  return `
    <section class="calendar animate-fade-in">
      <div class="calendar__header card">
        <div class="calendar__top">
          <h1 class="calendar__title">Calendrier</h1>
          <div class="calendar__view-toggle" role="tablist" aria-label="Changer de vue">
            <button type="button" class="btn ${model.viewMode === 'month' ? 'btn-primary' : ''}" data-view-mode="month">Mois</button>
            <button type="button" class="btn ${model.viewMode === 'week' ? 'btn-primary' : ''}" data-view-mode="week">Semaine</button>
            <button type="button" class="btn ${model.viewMode === 'day' ? 'btn-primary' : ''}" data-view-mode="day">Jour</button>
          </div>
        </div>
        <div class="calendar__toolbar">
          <button type="button" class="btn" data-nav="prev">←</button>
          <div class="calendar__period-wrap">
            <button
              type="button"
              class="calendar__period-btn"
              data-open-jump-menu
              aria-label="Choisir un mois"
              aria-expanded="${model.jumpMenuOpen ? 'true' : 'false'}"
            >
              <span class="calendar__period">${escapeHtml(formatHeaderLabel(referenceDate, model.viewMode))}</span>
            </button>
            <div class="calendar__jump-menu ${model.jumpMenuOpen ? 'is-open' : ''}" data-jump-menu>
              <label class="calendar__jump-label" for="calendar-jump-month">Mois</label>
              <select id="calendar-jump-month" class="calendar__jump-select" data-jump-month>
                ${monthOptions}
              </select>
              <label class="calendar__jump-label" for="calendar-jump-year">Année</label>
              <select id="calendar-jump-year" class="calendar__jump-select" data-jump-year>
                ${yearOptions}
              </select>
              <button type="button" class="btn calendar__jump-apply" data-jump-apply>Aller</button>
            </div>
          </div>
          <button type="button" class="btn" data-nav="next">→</button>
        </div>
        <div class="calendar-mini">
          <h3>Prochains événements</h3>
          ${createMiniUpcoming(model.upcoming)}
        </div>
      </div>

      ${
        model.viewMode === 'month'
          ? createMonthView(model.month)
          : model.viewMode === 'week'
            ? createWeekView(model.week)
            : createDayView(referenceDate, model.day)
      }
      ${createDetailPanel(model.detailPanel)}
    </section>
  `;
}

function createCalendarWidget(events) {
  if (!events.length) return '<p class="calendar-widget__empty">Aucun événement à venir.</p>';

  return `
    <ul class="calendar-widget__list">
      ${events.map((line) => `<li class="calendar-widget__item">${escapeHtml(line)}</li>`).join('')}
    </ul>
  `;
}

function createDefaultForm(date = new Date()) {
  const start = new Date(date);
  start.setMinutes(0, 0, 0);
  if (start.getHours() < 7) start.setHours(7);
  if (start.getHours() > 23) start.setHours(23);
  const end = new Date(start);
  if (start.getHours() < 23) {
    end.setHours(start.getHours() + 1);
  } else {
    end.setHours(23);
    end.setMinutes(59);
  }

  return {
    title: '',
    startDate: formatInputDate(start),
    startTime: formatInputTime(start),
    endDate: formatInputDate(end),
    endTime: formatInputTime(end),
    description: '',
    color: 'accent',
    taskId: '',
    recurrenceType: 'none',
    recurrenceEndDate: '',
    reminder: 15
  };
}

export { createCalendarView, createCalendarWidget, createDefaultForm, formatInputDate };
