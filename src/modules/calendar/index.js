import './style.css';
import { load, save, generateUUID } from '../../core/storage.js';
import { createCalendarView, createCalendarWidget, createDefaultForm, formatInputDate } from './view.js';
import {
  assignLanes,
  computeTideNowY,
  dateToMinutes,
  DAY_END_HOUR,
  DAY_START_HOUR,
  eventHeightPx,
  eventTopPx,
  isEventCompact,
  occurrenceEndMinutes,
  occurrenceStartMinutes
} from './tide.js';

const STORAGE_KEY = 'calendar:events';
const TASKS_STORAGE_KEY = 'tasks:items';
const NOTIFICATION_PROMPT_KEY = 'calendar:notifications:prompted';
const SEMANTIC_COLORS = ['accent', 'success', 'warning', 'danger', 'info'];

let rootContainer = null;
let events = [];
let viewMode = 'day';
let referenceDate = new Date();
let detailPanel = { open: false, eventId: null };
let eventForm = { open: false, mode: 'create', eventId: null, form: createDefaultForm(new Date()) };
let clickHandler = null;
let submitHandler = null;
let changeHandler = null;
let closeHandler = null;
let notificationTimers = [];
let midnightRefreshTimer = null;
let tideTicker = null;
let didAutoScrollToday = false;
let newEventHighlightKey = null;

function toDateTime(dateStr, timeStr) {
  const time = timeStr || '00:00';
  return new Date(`${dateStr}T${time}`);
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfWeek(date) {
  const base = startOfDay(date);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + diff);
  return base;
}

function endOfWeek(date) {
  return endOfDay(addDays(startOfWeek(date), 6));
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function toYmd(date) {
  return formatInputDate(date);
}

function parseReminder(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), 1440);
}

function normalizeEvent(item) {
  if (!item || typeof item.id !== 'string' || typeof item.title !== 'string') return null;
  if (!item.startDate || !item.startTime) return null;

  const recurrenceType = item.recurrence?.type;
  const safeRecurrence = ['none', 'daily', 'weekly', 'monthly'].includes(recurrenceType)
    ? recurrenceType
    : 'none';
  const color = SEMANTIC_COLORS.includes(item.color) ? item.color : 'accent';

  return {
    id: item.id,
    title: item.title.trim(),
    description: typeof item.description === 'string' ? item.description : '',
    startDate: item.startDate,
    startTime: item.startTime,
    endDate: item.endDate || '',
    endTime: item.endTime || '',
    color,
    taskId: typeof item.taskId === 'string' && item.taskId ? item.taskId : null,
    recurrence: {
      type: safeRecurrence,
      endDate: item.recurrence?.endDate || null
    },
    reminder: parseReminder(item.reminder),
    createdAt: Number(item.createdAt) || Date.now(),
    updatedAt: Number(item.updatedAt) || Date.now()
  };
}

function readEvents() {
  const data = load(STORAGE_KEY, []);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeEvent).filter(Boolean);
}

function persistEvents() {
  save(STORAGE_KEY, events);
}

function readIncompleteTasks() {
  const list = load(TASKS_STORAGE_KEY, []);
  if (!Array.isArray(list)) return [];
  return list.filter((task) => task && typeof task.id === 'string' && !task.completed && typeof task.text === 'string');
}

function getOccurrenceEnd(event, startDateTime) {
  if (event.endDate && event.endTime) {
    return toDateTime(event.endDate, event.endTime);
  }
  return startDateTime;
}

function getMonthlyOccurrenceDate(eventStart, targetYear, targetMonth) {
  const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(eventStart.getDate(), maxDay);
  return new Date(targetYear, targetMonth, day);
}

function matchesRecurrence(event, date) {
  const eventStart = toDateTime(event.startDate, event.startTime);
  const dayStart = startOfDay(date);
  if (dayStart < startOfDay(eventStart)) return false;

  const recurrenceEnd = event.recurrence.endDate ? endOfDay(new Date(event.recurrence.endDate)) : null;
  if (recurrenceEnd && dayStart > recurrenceEnd) return false;

  switch (event.recurrence.type) {
    case 'none':
      return toYmd(dayStart) === event.startDate;
    case 'daily':
      return true;
    case 'weekly':
      return dayStart.getDay() === eventStart.getDay();
    case 'monthly': {
      const occurrence = getMonthlyOccurrenceDate(eventStart, dayStart.getFullYear(), dayStart.getMonth());
      return toYmd(dayStart) === toYmd(occurrence);
    }
    default:
      return false;
  }
}

function getOccurrencesInRange(rangeStart, rangeEnd) {
  const occurrences = [];
  const cursor = startOfDay(rangeStart);
  const end = endOfDay(rangeEnd);

  while (cursor <= end) {
    for (const event of events) {
      if (!matchesRecurrence(event, cursor)) continue;

      const startDateTime = toDateTime(toYmd(cursor), event.startTime);
      const endDateTime = getOccurrenceEnd(event, startDateTime);
      occurrences.push({
        id: `${event.id}:${toYmd(cursor)}`,
        baseEventId: event.id,
        occurrenceDate: toYmd(cursor),
        occurrenceDateTime: startDateTime.toISOString(),
        startDateTime,
        endDateTime: endDateTime >= startDateTime ? endDateTime : startDateTime,
        title: event.title,
        color: event.color,
        hasTask: Boolean(event.taskId),
        isRecurring: event.recurrence.type !== 'none',
        event
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return occurrences.sort((a, b) => a.startDateTime - b.startDateTime);
}

function getVisibleRange() {
  if (viewMode === 'day') {
    return { start: startOfDay(referenceDate), end: endOfDay(referenceDate) };
  }
  if (viewMode === 'week') return { start: startOfWeek(referenceDate), end: endOfWeek(referenceDate) };

  const startMonth = startOfMonth(referenceDate);
  const endMonth = endOfMonth(referenceDate);
  return { start: startOfWeek(startMonth), end: endOfWeek(endMonth) };
}

function createMonthModel(occurrences, range) {
  const today = toYmd(new Date());
  const map = new Map();
  for (const occurrence of occurrences) {
    const key = occurrence.occurrenceDate;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(occurrence);
  }

  const days = [];
  const cursor = new Date(range.start);
  const monthIndex = referenceDate.getMonth();

  while (cursor <= range.end) {
    const ymd = toYmd(cursor);
    days.push({
      date: ymd,
      dayNumber: cursor.getDate(),
      inMonth: cursor.getMonth() === monthIndex,
      isToday: ymd === today,
      events: (map.get(ymd) || []).map((item) => ({
        id: item.baseEventId,
        color: item.color
      }))
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weekdays = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(referenceDate), index));
  const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(referenceDate);
  return { days, weekdays, monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) };
}

function parseYmdLocal(ymd) {
  const parts = String(ymd).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatTimeLabel(date) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function createDayModel(occurrences, dayDate) {
  const dayYmd = toYmd(startOfDay(dayDate));
  const today = toYmd(new Date());
  const dayOccurrences = occurrences.filter((item) => item.occurrenceDate === dayYmd);
  const lanes = assignLanes(dayOccurrences);

  const dayStartMin = DAY_START_HOUR * 60;
  const dayEndMin = DAY_END_HOUR * 60 + 30;

  const mappedEvents = dayOccurrences
    .map((item) => {
      const startMin = occurrenceStartMinutes(item);
      const endMin = occurrenceEndMinutes(item);
      if (endMin < dayStartMin || startMin > dayEndMin) return null;

      const laneInfo = lanes.get(item.id) || { lane: 0, lanes: 1 };
      const topPx = eventTopPx(startMin);
      const heightPx = eventHeightPx(startMin, endMin);
      const endTimeLabel =
        item.endDateTime > item.startDateTime ? formatTimeLabel(item.endDateTime).replace(':', 'h') : '';

      return {
        id: item.baseEventId,
        occurrenceDateTime: item.occurrenceDateTime,
        title: item.title,
        color: item.color,
        timeLabel: formatTimeLabel(item.startDateTime),
        endTimeLabel,
        lane: laneInfo.lane,
        lanes: laneInfo.lanes,
        topPx,
        heightPx,
        compact: isEventCompact(heightPx),
        startMin,
        endMin,
        isNew: newEventHighlightKey === `${item.baseEventId}:${item.occurrenceDateTime}`
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.topPx - b.topPx);

  return { dayYmd, isToday: dayYmd === today, events: mappedEvents };
}

function createWeekListModel(occurrences, range) {
  const today = toYmd(new Date());
  const now = new Date();
  const dowFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(range.start, index);
    const ymd = toYmd(date);
    const dayEvents = occurrences
      .filter((item) => item.occurrenceDate === ymd)
      .sort((a, b) => a.startDateTime - b.startDateTime)
      .map((item) => ({
        id: item.baseEventId,
        occurrenceDateTime: item.occurrenceDateTime,
        title: item.title,
        color: item.color,
        timeLabel: formatTimeLabel(item.startDateTime),
        isPast: ymd === today && item.endDateTime <= now
      }));

    return {
      date: ymd,
      dateObject: date,
      isToday: ymd === today,
      dow: dowFormatter.format(date).replace('.', ''),
      dayNum: date.getDate(),
      events: dayEvents
    };
  });

  const weekLabel = (() => {
    const end = addDays(range.start, 6);
    const sameMonth = range.start.getMonth() === end.getMonth();
    const startPart = `${range.start.getDate()}${sameMonth ? '' : ` ${new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(range.start).replace('.', '')}`}`;
    const endPart = `${end.getDate()} ${new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(end)}`;
    return `Semaine du ${startPart} au ${endPart}`;
  })();

  return { days, weekLabel };
}

function getTaskLabel(taskId) {
  if (!taskId) return '';
  const task = readIncompleteTasks().find((item) => item.id === taskId);
  return task?.text || '';
}

function recurrenceLabel(type) {
  switch (type) {
    case 'daily':
      return 'Quotidien';
    case 'weekly':
      return 'Hebdomadaire';
    case 'monthly':
      return 'Mensuel';
    default:
      return 'Aucune';
  }
}

function getUpcoming(limit = 3) {
  const now = new Date();
  const rangeEnd = addDays(now, 45);
  return getOccurrencesInRange(now, rangeEnd)
    .filter((item) => item.startDateTime >= now)
    .slice(0, limit);
}

function getApproachEvents(limit = 6) {
  const now = new Date();
  const todayYmd = toYmd(now);
  const todayStart = startOfDay(now);
  const rangeEnd = addDays(now, 45);

  return getOccurrencesInRange(now, rangeEnd)
    .filter((item) => {
      if (item.occurrenceDate === todayYmd) return item.endDateTime > now;
      return item.startDateTime >= todayStart;
    })
    .slice(0, limit)
    .map((occ) => {
      const dayDiff = Math.round((startOfDay(occ.startDateTime) - todayStart) / 86400000);
      let whenLabel;
      if (dayDiff === 0) whenLabel = "aujourd'hui";
      else if (dayDiff === 1) whenLabel = 'demain';
      else {
        whenLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric' }).format(occ.startDateTime);
      }
      const distanceClass = dayDiff > 7 ? 'horizon' : dayDiff > 2 ? 'far' : '';
      return {
        id: occ.baseEventId,
        title: occ.title,
        color: occ.color,
        whenLabel,
        timeLabel: formatTimeLabel(occ.startDateTime),
        dayDiff,
        distanceClass,
        occurrenceDate: occ.occurrenceDate
      };
    });
}

function isAnchorHot() {
  const today = startOfDay(new Date());
  if (viewMode === 'day') return toYmd(referenceDate) !== toYmd(today);
  if (viewMode === 'week') return toYmd(startOfWeek(referenceDate)) !== toYmd(startOfWeek(today));
  return (
    referenceDate.getFullYear() !== today.getFullYear() || referenceDate.getMonth() !== today.getMonth()
  );
}

function openCreatePanel(date, time) {
  const draftDate = toDateTime(date, time || formatTimeLabel(new Date()));
  const form = createDefaultForm(draftDate);
  detailPanel = { open: false, eventId: null };
  eventForm = { open: true, mode: 'create', eventId: null, form };
  render();
  openComposerDialog();
}

function openDetailPanel(eventId) {
  detailPanel = { open: true, eventId };
  eventForm = { ...eventForm, open: false };
  render();
  openDetailDialog();
}

function openEditPanel(eventId) {
  const event = events.find((item) => item.id === eventId);
  if (!event) return;
  detailPanel = { open: false, eventId: null };
  closeDetailDialogElement();
  eventForm = {
    open: true,
    mode: 'edit',
    eventId,
    form: {
      title: event.title,
      startDate: event.startDate,
      startTime: event.startTime,
      endDate: event.endDate,
      endTime: event.endTime,
      description: event.description,
      color: event.color,
      taskId: event.taskId || '',
      recurrenceType: event.recurrence.type,
      recurrenceEndDate: event.recurrence.endDate || '',
      reminder: event.reminder
    }
  };
  render();
  openComposerDialog();
}

function closeDetailPanel() {
  closeDetailDialogElement();
  detailPanel = { open: false, eventId: null };
}

function closeEventForm() {
  closeComposerDialogElement();
  eventForm = { open: false, mode: 'create', eventId: null, form: createDefaultForm(new Date()) };
}

function closeDetailDialogElement() {
  const dialog = rootContainer?.querySelector('[data-cal-detail-dialog]');
  if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
}

function closeComposerDialogElement() {
  const dialog = rootContainer?.querySelector('[data-cal-composer-dialog]');
  if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
}

function openDetailDialog() {
  requestAnimationFrame(() => {
    const dialog = rootContainer?.querySelector('[data-cal-detail-dialog]');
    if (dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal();
  });
}

function openComposerDialog() {
  requestAnimationFrame(() => {
    const dialog = rootContainer?.querySelector('[data-cal-composer-dialog]');
    if (dialog instanceof HTMLDialogElement && !dialog.open) {
      dialog.showModal();
      const titleInput = dialog.querySelector('input[name="title"]');
      if (titleInput instanceof HTMLInputElement) titleInput.focus();
    }
  });
}

function createEventFromForm(formData, eventId = null) {
  const title = String(formData.get('title') || '').trim();
  if (!title) return null;

  const startDate = String(formData.get('startDate') || '');
  const startTime = String(formData.get('startTime') || '');
  if (!startDate || !startTime) return null;

  const endDate = String(formData.get('endDate') || '');
  const endTime = String(formData.get('endTime') || '');
  const recurrenceType = String(formData.get('recurrenceType') || 'none');
  const reminder = parseReminder(formData.get('reminder'));
  const now = Date.now();

  return {
    id: eventId || generateUUID(),
    title,
    description: String(formData.get('description') || '').trim(),
    startDate,
    startTime,
    endDate,
    endTime,
    color: SEMANTIC_COLORS.includes(String(formData.get('color'))) ? String(formData.get('color')) : 'accent',
    taskId: String(formData.get('taskId') || '') || null,
    recurrence: {
      type: ['none', 'daily', 'weekly', 'monthly'].includes(recurrenceType) ? recurrenceType : 'none',
      endDate: String(formData.get('recurrenceEndDate') || '') || null
    },
    reminder,
    createdAt: eventId ? events.find((item) => item.id === eventId)?.createdAt || now : now,
    updatedAt: now
  };
}

function savePanelEvent(formElement) {
  const payload = createEventFromForm(
    new FormData(formElement),
    eventForm.mode === 'edit' ? eventForm.eventId : null
  );
  if (!payload) {
    const titleInput = formElement.querySelector('input[name="title"]');
    if (titleInput instanceof HTMLInputElement) {
      titleInput.classList.remove('animate-shake');
      requestAnimationFrame(() => titleInput.classList.add('animate-shake'));
      titleInput.focus();
    }
    return;
  }

  const wasCreate = eventForm.mode === 'create';
  if (eventForm.mode === 'edit') {
    events = events.map((item) => (item.id === payload.id ? payload : item));
  } else {
    events.push(payload);
    newEventHighlightKey = `${payload.id}:${toDateTime(payload.startDate, payload.startTime).toISOString()}`;
  }
  persistEvents();
  scheduleNotifications();
  closeComposerDialogElement();
  eventForm = { open: false, mode: 'create', eventId: null, form: createDefaultForm(new Date()) };
  referenceDate = parseYmdLocal(payload.startDate);
  viewMode = 'day';
  render();
  if (wasCreate) {
    requestAnimationFrame(() => {
      newEventHighlightKey = null;
    });
  }
}

function deleteEvent(eventId) {
  const before = events.length;
  events = events.filter((item) => item.id !== eventId);
  if (events.length === before) return;
  persistEvents();
  scheduleNotifications();
  closeDetailDialogElement();
  closeComposerDialogElement();
  detailPanel = { open: false, eventId: null };
  eventForm = { open: false, mode: 'create', eventId: null, form: createDefaultForm(new Date()) };
  render();
}

function requestNotificationPermissionOnce() {
  if (typeof Notification === 'undefined') return;
  const alreadyPrompted = load(NOTIFICATION_PROMPT_KEY, false);
  if (alreadyPrompted) return;
  save(NOTIFICATION_PROMPT_KEY, true);
  Notification.requestPermission().catch(() => {});
}

function clearNotificationTimers() {
  notificationTimers.forEach((timerId) => clearTimeout(timerId));
  notificationTimers = [];
}

function scheduleNotifications() {
  clearNotificationTimers();
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const now = new Date();
  const future = addDays(now, 7);
  const upcoming = getOccurrencesInRange(now, future).filter((occ) => occ.event.reminder > 0);
  for (const occ of upcoming) {
    const notifyAt = new Date(occ.startDateTime.getTime() - occ.event.reminder * 60 * 1000);
    const delay = notifyAt.getTime() - Date.now();
    if (delay <= 0) continue;
    const messageTime = formatTimeLabel(occ.startDateTime);
    const timerId = setTimeout(() => {
      new Notification(occ.title, { body: `Début à ${messageTime}` });
    }, delay);
    notificationTimers.push(timerId);
  }
}

function scheduleMidnightRefresh() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();

  midnightRefreshTimer = setTimeout(() => {
    scheduleNotifications();
    if (viewMode === 'day' && toYmd(referenceDate) === toYmd(new Date())) {
      updateTideDom();
    }
    scheduleMidnightRefresh();
  }, msUntilMidnight);
}

function stopTideTicker() {
  if (tideTicker != null) {
    clearInterval(tideTicker);
    tideTicker = null;
  }
}

function startTideTicker() {
  stopTideTicker();
  tideTicker = window.setInterval(() => updateTideDom(), 60000);
}

function updateTideDom() {
  if (!rootContainer || viewMode !== 'day') return;
  const tide = rootContainer.querySelector('[data-cal-tide]');
  if (!(tide instanceof HTMLElement)) return;

  const dayYmd = toYmd(referenceDate);
  const isToday = dayYmd === toYmd(new Date());
  const now = new Date();
  const nowMin = dateToMinutes(now);
  const y = isToday ? `${computeTideNowY(nowMin)}px` : '0px';

  tide.style.setProperty('--now-y', y);

  const tidePast = rootContainer.querySelector('[data-cal-tide-past]');
  const tideLine = rootContainer.querySelector('[data-cal-tide-line]');
  const tideNow = rootContainer.querySelector('[data-cal-tide-now]');
  if (tidePast instanceof HTMLElement) tidePast.hidden = !isToday;
  if (tideLine instanceof HTMLElement) tideLine.hidden = !isToday;
  if (tideNow instanceof HTMLElement) {
    tideNow.hidden = !isToday;
    if (isToday) tideNow.textContent = formatTimeLabel(now);
  }

  rootContainer.querySelectorAll('[data-cal-evt]').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const timeEl = node.querySelector('.cal__evt-time');
    const timeText = timeEl?.textContent || '';
    const startPart = timeText.split('–')[0].trim();
    const [sh, sm] = startPart.split(':').map((v) => Number(v.replace('h', '')));
    const startMin = Number.isFinite(sh) ? sh * 60 + (sm || 0) : 0;
    const endPart = timeText.includes('–') ? timeText.split('–')[1]?.trim() : '';
    const endMin = endPart
      ? (() => {
          const [eh, em] = endPart.split(':').map((v) => Number(v.replace('h', '')));
          return Number.isFinite(eh) ? eh * 60 + (em || 0) : startMin + 45;
        })()
      : startMin + 45;

    node.classList.toggle('cal__evt--past', isToday && endMin <= nowMin);
    node.classList.toggle('cal__evt--now', isToday && nowMin >= startMin && nowMin < endMin);
  });
}

function scrollToNowLine() {
  const line = rootContainer?.querySelector('[data-cal-tide-line]');
  if (line instanceof HTMLElement) {
    line.scrollIntoView({ block: 'center', behavior: 'auto' });
  }
}

function navigatePeriod(direction) {
  if (direction === 'today') {
    referenceDate = new Date();
    didAutoScrollToday = false;
    render();
    return;
  }
  const copy = new Date(referenceDate);
  if (viewMode === 'month') {
    copy.setMonth(copy.getMonth() + (direction === 'next' ? 1 : -1));
  } else if (viewMode === 'day') {
    copy.setDate(copy.getDate() + (direction === 'next' ? 1 : -1));
  } else {
    copy.setDate(copy.getDate() + (direction === 'next' ? 7 : -7));
  }
  referenceDate = copy;
  render();
}

const FORM_COLOR_OPTIONS = [
  { value: 'accent', label: 'Accent' },
  { value: 'success', label: 'Succès' },
  { value: 'warning', label: 'Attention' },
  { value: 'danger', label: 'Important' },
  { value: 'info', label: 'Information' }
];

function buildDetailPanelModel() {
  if (!detailPanel.open) return { open: false };
  const event = events.find((item) => item.id === detailPanel.eventId);
  if (!event) return { open: false };
  return {
    open: true,
    event: {
      ...event,
      taskLabel: getTaskLabel(event.taskId),
      recurrenceLabel: recurrenceLabel(event.recurrence.type)
    }
  };
}

function buildEventFormModel() {
  return {
    open: eventForm.open,
    mode: eventForm.mode,
    eventId: eventForm.eventId,
    form: eventForm.form,
    colorOptions: FORM_COLOR_OPTIONS,
    taskOptions: readIncompleteTasks()
  };
}

function buildViewModel() {
  const range = getVisibleRange();
  const occurrences = getOccurrencesInRange(range.start, range.end);

  return {
    eventForm: buildEventFormModel(),
    viewMode,
    referenceDate: referenceDate.toISOString(),
    month: viewMode === 'month' ? createMonthModel(occurrences, range) : null,
    week: viewMode === 'week' ? createWeekListModel(occurrences, range) : null,
    day: viewMode === 'day' ? createDayModel(occurrences, referenceDate) : null,
    approach: getApproachEvents(6),
    detailPanel: buildDetailPanelModel(),
    anchorHot: isAnchorHot()
  };
}

function syncCalendarFormMorePanelAfterRender() {
  const panel = rootContainer?.querySelector('[data-calendar-form-more-panel]');
  const btn = rootContainer?.querySelector('[data-calendar-form-more]');
  if (!(panel instanceof HTMLElement) || !(btn instanceof HTMLButtonElement)) return;
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
  btn.setAttribute('aria-expanded', 'false');
  btn.textContent = "Plus d'options";
}

function syncDialogsAfterRender() {
  if (detailPanel.open) openDetailDialog();
  if (eventForm.open) openComposerDialog();
}

function afterDayRender() {
  updateTideDom();
  const isToday = toYmd(referenceDate) === toYmd(new Date());
  if (isToday) {
    startTideTicker();
    if (!didAutoScrollToday) {
      didAutoScrollToday = true;
      requestAnimationFrame(() => scrollToNowLine());
    }
  } else {
    stopTideTicker();
  }
}

function render() {
  if (!rootContainer) return;
  rootContainer.innerHTML = createCalendarView(buildViewModel());
  syncCalendarFormMorePanelAfterRender();
  syncDialogsAfterRender();
  if (viewMode === 'day') afterDayRender();
  else stopTideTicker();
}

function bindEvents() {
  if (!rootContainer) return;

  clickHandler = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const colorBtn = target.closest('[data-cal-color]');
    if (colorBtn instanceof HTMLButtonElement) {
      const value = colorBtn.dataset.calColor;
      const hidden = rootContainer?.querySelector('[data-cal-color-input]');
      if (hidden instanceof HTMLInputElement && value) {
        hidden.value = value;
        rootContainer?.querySelectorAll('[data-cal-color]').forEach((btn) => {
          if (btn instanceof HTMLButtonElement) {
            btn.setAttribute('aria-pressed', btn === colorBtn ? 'true' : 'false');
          }
        });
      }
      return;
    }

    const viewBtn = target.closest('[data-view-mode]');
    if (viewBtn instanceof HTMLButtonElement) {
      const nextMode = viewBtn.dataset.viewMode;
      if (nextMode === 'month' || nextMode === 'week' || nextMode === 'day') {
        viewMode = nextMode;
        render();
      }
      return;
    }

    const navBtn = target.closest('[data-nav]');
    if (navBtn instanceof HTMLButtonElement) {
      navigatePeriod(navBtn.dataset.nav);
      return;
    }

    const composerOpen = target.closest('[data-cal-open-composer]');
    if (composerOpen) {
      const dialog = rootContainer?.querySelector('[data-cal-composer-dialog]');
      if (dialog instanceof HTMLDialogElement && dialog.open) {
        closeEventForm();
        render();
      } else {
        openCreatePanel(toYmd(referenceDate));
      }
      return;
    }

    const approachBtn = target.closest('[data-approach-open]');
    if (approachBtn instanceof HTMLElement && approachBtn.dataset.approachOpen) {
      referenceDate = parseYmdLocal(approachBtn.dataset.approachOpen);
      viewMode = 'day';
      render();
      return;
    }

    const openEvent = target.closest('[data-event-open]');
    if (openEvent instanceof HTMLElement && openEvent.dataset.eventOpen) {
      event.stopPropagation();
      openDetailPanel(openEvent.dataset.eventOpen);
      return;
    }

    const dayCell = target.closest('[data-day-cell]');
    if (dayCell instanceof HTMLElement && dayCell.dataset.dayCell) {
      referenceDate = parseYmdLocal(dayCell.dataset.dayCell);
      viewMode = 'day';
      render();
      return;
    }

    const moreBtn = target.closest('[data-calendar-form-more]');
    if (moreBtn instanceof HTMLButtonElement) {
      const panel = rootContainer?.querySelector('[data-calendar-form-more-panel]');
      if (panel instanceof HTMLElement) {
        const open = !panel.classList.contains('is-open');
        panel.classList.toggle('is-open', open);
        moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        moreBtn.textContent = open ? "Moins d'options" : "Plus d'options";
        panel.toggleAttribute('aria-hidden', !open);
        if (open) {
          const first = panel.querySelector('[data-calendar-more-first]');
          if (first instanceof HTMLElement) requestAnimationFrame(() => first.focus());
        }
      }
      return;
    }

    const closeBtn = target.closest('[data-panel-close]');
    if (closeBtn) {
      closeDetailPanel();
      render();
      return;
    }

    const formBackBtn = target.closest('[data-calendar-form-back]');
    if (formBackBtn) {
      closeEventForm();
      render();
      return;
    }

    const formDeleteBtn = target.closest('[data-calendar-form-delete]');
    if (formDeleteBtn instanceof HTMLButtonElement && formDeleteBtn.dataset.calendarFormDelete) {
      deleteEvent(formDeleteBtn.dataset.calendarFormDelete);
      return;
    }

    const editBtn = target.closest('[data-event-edit]');
    if (editBtn instanceof HTMLButtonElement && editBtn.dataset.eventEdit) {
      openEditPanel(editBtn.dataset.eventEdit);
      return;
    }

    const deleteBtn = target.closest('[data-event-delete]');
    if (deleteBtn instanceof HTMLButtonElement && deleteBtn.dataset.eventDelete) {
      deleteEvent(deleteBtn.dataset.eventDelete);
    }
  };

  submitHandler = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;
    if (!target.matches('[data-calendar-form]')) return;
    event.preventDefault();
    savePanelEvent(target);
  };

  changeHandler = () => {};

  closeHandler = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLDialogElement)) return;
    if (target.matches('[data-cal-detail-dialog]')) {
      detailPanel = { open: false, eventId: null };
    }
    if (target.matches('[data-cal-composer-dialog]')) {
      eventForm = { open: false, mode: 'create', eventId: null, form: createDefaultForm(new Date()) };
    }
  };

  rootContainer.addEventListener('click', clickHandler);
  rootContainer.addEventListener('submit', submitHandler);
  rootContainer.addEventListener('change', changeHandler);
  rootContainer.addEventListener('close', closeHandler);
}

function formatWidgetLine(occurrence) {
  const day = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })
    .format(occurrence.startDateTime)
    .replace('.', '');
  const hour = formatTimeLabel(occurrence.startDateTime).replace(':', 'h');
  return `${day} · ${hour} · ${occurrence.title}`;
}

const calendarModule = {
  id: 'calendar',
  label: 'Calendrier',
  icon: '📅',

  init(container) {
    rootContainer = container;
    events = readEvents();
    requestNotificationPermissionOnce();
    render();
    bindEvents();
    scheduleNotifications();
    scheduleMidnightRefresh();
  },

  destroy() {
    stopTideTicker();
    if (rootContainer && clickHandler) rootContainer.removeEventListener('click', clickHandler);
    if (rootContainer && submitHandler) rootContainer.removeEventListener('submit', submitHandler);
    if (rootContainer && changeHandler) rootContainer.removeEventListener('change', changeHandler);
    if (rootContainer && closeHandler) rootContainer.removeEventListener('close', closeHandler);
    clearNotificationTimers();
    if (midnightRefreshTimer != null) {
      clearTimeout(midnightRefreshTimer);
      midnightRefreshTimer = null;
    }

    clickHandler = null;
    submitHandler = null;
    changeHandler = null;
    closeHandler = null;
    didAutoScrollToday = false;
    newEventHighlightKey = null;
    detailPanel = { open: false, eventId: null };
    eventForm = { open: false, mode: 'create', eventId: null, form: createDefaultForm(new Date()) };
    events = [];

    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    const lines = getUpcoming(3).map(formatWidgetLine);
    return {
      title: 'Prochains rendez-vous',
      content: createCalendarWidget(lines)
    };
  }
};

export default calendarModule;
