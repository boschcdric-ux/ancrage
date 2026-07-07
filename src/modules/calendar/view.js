import { escapeHtml, formatInputDate, formatInputTime } from '../../core/format.js';
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  DAY_TIMELINE_HOUR_COUNT,
  HOUR_HEIGHT_PX
} from './tide.js';

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
  const colorSwatches = state.colorOptions
    .map(
      (opt) => `
        <button
          type="button"
          class="cal__swatch cal__swatch--${escapeHtml(opt.value)}"
          data-cal-color="${escapeHtml(opt.value)}"
          aria-label="${escapeHtml(opt.label)}"
          aria-pressed="${opt.value === form.color ? 'true' : 'false'}"
        ></button>
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
    <input type="hidden" name="color" value="${escapeHtml(form.color)}" data-cal-color-input />
    <input
      type="text"
      name="title"
      class="cal__composer-title"
      value="${escapeHtml(form.title)}"
      placeholder="Quoi ?"
      maxlength="180"
      required
      aria-label="Titre de l'événement"
    />
    <div class="cal__composer-row">
      <input type="date" name="startDate" value="${escapeHtml(form.startDate)}" required aria-label="Date" />
      <input type="time" name="startTime" value="${escapeHtml(form.startTime)}" required aria-label="Heure de début" />
    </div>
    <button
      type="button"
      class="cal__composer-more-toggle"
      data-calendar-form-more
      aria-expanded="false"
      aria-controls="calendar-form-more-panel"
    >
      Plus d'options
    </button>
    <div
      class="cal__composer-more"
      id="calendar-form-more-panel"
      data-calendar-form-more-panel
      role="region"
      aria-label="Options supplémentaires"
      aria-hidden="true"
    >
      <span class="cal__composer-label">Heure de fin</span>
      <div class="cal__composer-row">
        <input type="date" name="endDate" value="${escapeHtml(form.endDate)}" aria-label="Date fin" data-calendar-more-first />
        <input type="time" name="endTime" value="${escapeHtml(form.endTime)}" aria-label="Heure fin" />
      </div>
      <label class="cal__composer-field">
        <span class="cal__composer-label">Description</span>
        <textarea name="description" rows="3" maxlength="500">${escapeHtml(form.description)}</textarea>
      </label>
      <label class="cal__composer-field">
        <span class="cal__composer-label">Tâche associée</span>
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
      <span class="cal__composer-label">Se répète / Rappel</span>
      <div class="cal__composer-row">
        <select name="recurrenceType" aria-label="Récurrence">
          <option value="none" ${form.recurrenceType === 'none' ? 'selected' : ''}>Jamais</option>
          <option value="daily" ${form.recurrenceType === 'daily' ? 'selected' : ''}>Chaque jour</option>
          <option value="weekly" ${form.recurrenceType === 'weekly' ? 'selected' : ''}>Chaque semaine</option>
          <option value="monthly" ${form.recurrenceType === 'monthly' ? 'selected' : ''}>Chaque mois</option>
        </select>
        <select name="reminder" aria-label="Rappel">${reminderSelect}</select>
      </div>
      <label class="cal__composer-field">
        <span class="cal__composer-label">Fin récurrence</span>
        <input type="date" name="recurrenceEndDate" value="${escapeHtml(form.recurrenceEndDate)}" />
      </label>
      <span class="cal__composer-label">Couleur</span>
      <div class="cal__swatches" role="group" aria-label="Couleur">${colorSwatches}</div>
    </div>
  `;
}

function capitalizeFrLabel(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function formatDetailDateRange(event) {
  const start = new Date(`${event.startDate}T${event.startTime || '00:00'}`);
  const hasEnd = Boolean(event.endDate && event.endTime);
  const dateLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(start);
  const startTime = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(start);

  if (!hasEnd) return `${capitalizeFrLabel(dateLabel)} · ${startTime}`;

  const end = new Date(`${event.endDate}T${event.endTime}`);
  const endTime = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(end);
  if (event.startDate === event.endDate) {
    return `${capitalizeFrLabel(dateLabel)} · ${startTime} → ${endTime}`;
  }
  const endDateLabel = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(end);
  return `${capitalizeFrLabel(dateLabel)} · ${startTime} → ${capitalizeFrLabel(endDateLabel)} · ${endTime}`;
}

function formatDayNavLabel(referenceDate, isToday) {
  const long = capitalizeFrLabel(
    new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      .format(referenceDate)
      .replaceAll('.', '')
  );
  if (isToday) return "Aujourd'hui";
  return long;
}


function createDayView(referenceDate, dayModel) {
  const hours = Array.from({ length: DAY_TIMELINE_HOUR_COUNT }, (_, i) => DAY_START_HOUR + i);
  const hourRows = hours
    .map(
      (hour) => `
      <div class="cal__tide-hour">
        <span class="cal__tide-hour-label">${String(hour).padStart(2, '0')}h</span>
      </div>
    `
    )
    .join('');

  const eventBlocks = dayModel.events
    .map((event) => {
      const endTxt = event.endTimeLabel ? `–${event.endTimeLabel}` : '';
      const classes = ['cal__evt', `cal__evt--${event.color}`];
      if (event.compact) classes.push('cal__evt--compact');
      if (event.isNew) classes.push('cal__evt--new');
      return `
      <button
        type="button"
        class="${classes.join(' ')}"
        style="--lane:${event.lane};--lanes:${event.lanes};top:${event.topPx}px;height:${event.heightPx}px;"
        data-event-open="${escapeHtml(event.id)}"
        data-cal-evt
        data-occurrence="${escapeHtml(event.occurrenceDateTime)}"
        title="${escapeHtml(event.title)}"
      >
        <span class="cal__evt-time">${escapeHtml(event.timeLabel)}${endTxt}</span>
        <span class="cal__evt-title">${escapeHtml(event.title)}</span>
      </button>
    `;
    })
    .join('');

  const emptyBlock =
    dayModel.events.length === 0
      ? `
    <div class="cal__tide-empty">
      <div class="cal__tide-empty-title">Journée en eau libre.</div>
      <div class="cal__tide-empty-hint">Rien d'amarré. L'horizon est à toi.</div>
    </div>
  `
      : '';

  const metaLine = dayModel.isToday
    ? capitalizeFrLabel(
        new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
          .format(referenceDate)
          .replaceAll('.', '')
      )
    : '';

  return `
    <section class="cal__day-card" aria-label="Vue jour">
      <div class="cal__day-nav">
        <div>
          <div class="cal__day-nav-label">${escapeHtml(formatDayNavLabel(referenceDate, dayModel.isToday))}</div>
          ${metaLine ? `<div class="cal__day-nav-meta">${escapeHtml(metaLine)}</div>` : ''}
        </div>
        <div class="cal__day-nav-btns">
          <button type="button" class="cal__iconbtn" data-nav="prev" aria-label="Jour précédent">‹</button>
          <button type="button" class="cal__iconbtn" data-nav="next" aria-label="Jour suivant">›</button>
        </div>
      </div>
      <div class="cal__tide" data-cal-tide style="--hour-h:${HOUR_HEIGHT_PX}px">
        <div class="cal__tide-past" data-cal-tide-past ${dayModel.isToday ? '' : 'hidden'}></div>
        <div class="cal__tide-line cal__tide-line--anim" data-cal-tide-line ${dayModel.isToday ? '' : 'hidden'}>
          <svg viewBox="0 0 1200 14" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,8 C80,3 160,12 300,8 C440,4 520,12 600,8 C680,3 760,12 900,8 C1040,4 1120,12 1200,8 L1200,14 L0,14 Z"/>
          </svg>
        </div>
        <span class="cal__tide-now" data-cal-tide-now ${dayModel.isToday ? '' : 'hidden'}></span>
        <div class="cal__tide-hours">
          ${hourRows}
          ${eventBlocks}
          ${emptyBlock}
        </div>
      </div>
    </section>
  `;
}

function createWeekView(model) {
  return `
    <section class="cal__week" aria-label="Vue semaine">
      <div class="cal__week-nav">
        <button type="button" class="cal__iconbtn" data-nav="prev" aria-label="Semaine précédente">‹</button>
        <span class="cal__week-label">${escapeHtml(model.weekLabel)}</span>
        <button type="button" class="cal__iconbtn" data-nav="next" aria-label="Semaine suivante">›</button>
      </div>
      <div class="cal__week-list">
        ${model.days
          .map((day, index) => {
            const classes = ['cal__wday'];
            if (day.isToday) classes.push('cal__wday--today');
            if (index > 0) classes.push('cal__wday--bordered');
            const eventsHtml = day.events.length
              ? day.events
                  .map(
                    (event) => `
                  <button
                    type="button"
                    class="cal__wchip cal__wchip--${event.color}${event.isPast ? ' cal__wchip--past' : ''}"
                    data-event-open="${escapeHtml(event.id)}"
                    data-occurrence="${escapeHtml(event.occurrenceDateTime)}"
                  >
                    <span class="cal__wchip-time">${escapeHtml(event.timeLabel)}</span>
                    <span class="cal__wchip-title">${escapeHtml(event.title)}</span>
                  </button>
                `
                  )
                  .join('')
              : '<span class="cal__wday-none">—</span>';
            return `
            <div class="${classes.join(' ')}">
              <button type="button" class="cal__wday-head" data-day-cell="${day.date}" aria-label="Ouvrir ${escapeHtml(day.date)}">
                <div class="cal__wday-dow">${escapeHtml(day.dow)}</div>
                <div class="cal__wday-num">${day.dayNum}</div>
              </button>
              <div class="cal__wday-events">${eventsHtml}</div>
            </div>
          `;
          })
          .join('')}
      </div>
    </section>
  `;
}

function createMonthView(model) {
  const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  const weekdayNames = model.weekdays.map((date) =>
    weekdayFormatter.format(date).replace('.', '').slice(0, 1).toUpperCase()
  );

  return `
    <section class="cal__chart" aria-label="Vue mois">
      <div class="cal__chart-nav">
        <button type="button" class="cal__iconbtn" data-nav="prev" aria-label="Mois précédent">‹</button>
        <span class="cal__chart-label">${escapeHtml(model.monthLabel)}</span>
        <button type="button" class="cal__iconbtn" data-nav="next" aria-label="Mois suivant">›</button>
      </div>
      <div class="cal__chart-grid">
        ${weekdayNames.map((name) => `<div class="cal__chart-dow">${escapeHtml(name)}</div>`).join('')}
        ${model.days
          .map((day) => {
            const classes = ['cal__cell'];
            if (!day.inMonth) classes.push('cal__cell--out');
            if (day.isToday) classes.push('cal__cell--today');
            const dots = day.events
              .slice(0, 3)
              .map((event) => `<span class="cal__cell-dot cal__cell-dot--${event.color}"></span>`)
              .join('');
            const more =
              day.events.length > 3
                ? `<span class="cal__cell-more">+${day.events.length - 3}</span>`
                : '';
            return `
            <button type="button" class="${classes.join(' ')}" data-day-cell="${day.date}" aria-label="Jour ${day.date}">
              <span>${day.dayNumber}</span>
              <span class="cal__cell-dots">${dots}${more}</span>
            </button>
          `;
          })
          .join('')}
      </div>
    </section>
  `;
}

function createApproachSection(approachEvents) {
  if (!approachEvents.length) {
    return `
      <section class="cal__approach" aria-label="En approche">
        <h2 class="cal__approach-title">En approche</h2>
        <p class="cal__approach-empty">Horizon dégagé — rien en approche.</p>
      </section>
    `;
  }

  return `
    <section class="cal__approach" aria-label="En approche">
      <h2 class="cal__approach-title">En approche</h2>
      <div class="cal__approach-list">
        ${approachEvents
          .map((item) => {
            const distClass = item.distanceClass ? ` cal__app-item--${item.distanceClass}` : '';
            const distLabel = item.dayDiff > 1 ? `J+${item.dayDiff}` : '';
            return `
            <button
              type="button"
              class="cal__app-item${distClass}"
              data-approach-open="${escapeHtml(item.occurrenceDate)}"
              data-event-open="${escapeHtml(item.id)}"
            >
              <span class="cal__app-dot cal__app-dot--${item.color}"></span>
              <span class="cal__app-body">
                <span class="cal__app-title">${escapeHtml(item.title)}</span>
                <span class="cal__app-when">${escapeHtml(item.whenLabel)} · ${escapeHtml(item.timeLabel)}</span>
              </span>
              ${distLabel ? `<span class="cal__app-dist">${distLabel}</span>` : ''}
            </button>
          `;
          })
          .join('')}
      </div>
    </section>
  `;
}

function createDetailDialog(state) {
  if (!state.open || !state.event) {
    return '<dialog class="cal__detail" data-cal-detail-dialog></dialog>';
  }
  const event = state.event;
  return `
    <dialog class="cal__detail" data-cal-detail-dialog>
      <div class="cal__detail-card cal__detail-card--${event.color}">
        <div class="cal__detail-title">${escapeHtml(event.title)}</div>
        <div class="cal__detail-when">${escapeHtml(formatDetailDateRange(event))}</div>
        ${event.description ? `<p class="cal__detail-desc">${escapeHtml(event.description)}</p>` : ''}
        ${
          event.taskLabel
            ? `<p class="cal__detail-task">🔗 Tâche associée : ${escapeHtml(event.taskLabel)}</p>`
            : ''
        }
        <p class="cal__detail-rec">Récurrence : ${escapeHtml(event.recurrenceLabel)}</p>
        <div class="cal__detail-actions">
          <button type="button" class="cal__btn cal__btn--danger" data-event-delete="${event.id}">Supprimer</button>
          <button type="button" class="cal__btn" data-event-edit="${event.id}">Modifier</button>
          <button type="button" class="cal__btn cal__btn--primary" data-panel-close>Fermer</button>
        </div>
      </div>
    </dialog>
  `;
}

function createComposerDialog(state) {
  const formState = {
    colorOptions: state.colorOptions,
    taskOptions: state.taskOptions
  };
  const saveLabel = state.mode === 'edit' ? 'Enregistrer' : 'Poser';
  const deleteBtn =
    state.mode === 'edit' && state.eventId
      ? `<button type="button" class="cal__btn cal__btn--danger" data-calendar-form-delete="${escapeHtml(state.eventId)}">Supprimer</button>`
      : '';

  return `
    <dialog class="cal__composer" data-cal-composer-dialog>
      <form class="cal__composer-card" data-calendar-form>
        ${buildEventFormFields(state.form, formState)}
        <div class="cal__composer-actions">
          ${deleteBtn}
          <button type="button" class="cal__btn" data-calendar-form-back>Annuler</button>
          <button type="submit" class="cal__btn cal__btn--primary">${saveLabel}</button>
        </div>
      </form>
    </dialog>
  `;
}

function createCalendarView(model) {
  const referenceDate = new Date(model.referenceDate);
  const anchorClass = model.anchorHot ? ' cal__iconbtn--hot' : '';

  const mainView =
    model.viewMode === 'month'
      ? createMonthView(model.month)
      : model.viewMode === 'week'
        ? createWeekView(model.week)
        : createDayView(referenceDate, model.day);

  return `
    <section class="cal animate-fade-in">
      <div class="cal__head">
        <h1 class="cal__head-title">Agenda</h1>
        <span class="cal__head-spacer"></span>
        <button type="button" class="cal__iconbtn${anchorClass}" data-nav="today" title="Revenir à aujourd'hui" aria-label="Revenir à aujourd'hui">⚓</button>
        <div class="cal__seg" role="group" aria-label="Vue">
          <button type="button" class="cal__seg-btn" data-view-mode="day" aria-pressed="${model.viewMode === 'day' ? 'true' : 'false'}">Jour</button>
          <button type="button" class="cal__seg-btn" data-view-mode="week" aria-pressed="${model.viewMode === 'week' ? 'true' : 'false'}">Semaine</button>
          <button type="button" class="cal__seg-btn" data-view-mode="month" aria-pressed="${model.viewMode === 'month' ? 'true' : 'false'}">Mois</button>
        </div>
      </div>

      ${mainView}
      ${createDetailDialog(model.detailPanel)}
      ${createComposerDialog(model.eventForm)}
      ${createApproachSection(model.approach)}
      <button type="button" class="cal__addbtn" data-cal-open-composer>+ Poser</button>
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
  start.setMinutes(Math.ceil(start.getMinutes() / 30) * 30, 0, 0);
  if (start.getHours() < DAY_START_HOUR) start.setHours(DAY_START_HOUR, 0, 0, 0);
  if (start.getHours() > DAY_END_HOUR) start.setHours(DAY_END_HOUR, 0, 0, 0);
  const end = new Date(start);
  if (start.getHours() < DAY_END_HOUR) {
    end.setHours(start.getHours() + 1);
  } else {
    end.setHours(DAY_END_HOUR, 59, 0, 0);
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
