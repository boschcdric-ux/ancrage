import { save, load, generateUUID } from '../../core/storage.js';
import { PREDEFINED_TAGS } from './view.js';

const STORAGE_KEY = 'journal:entries';

const FRENCH_DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const TAG_ID_SET = new Set(PREDEFINED_TAGS.map((t) => t.id));

function normalizeTagId(value) {
  if (value == null || value === '') return null;
  const id = String(value);
  return TAG_ID_SET.has(id) ? id : null;
}

function stripHtml(html = '') {
  const temp = document.createElement('div');
  temp.innerHTML = String(html || '');
  return temp.textContent || temp.innerText || '';
}

function countWords(text = '') {
  const words = String(text || '')
    .trim()
    .match(/\S+/g);
  return words ? words.length : 0;
}

function formatDateValue(timestamp) {
  const date = new Date(Number(timestamp) || Date.now());
  return date.toISOString().slice(0, 10);
}

function formatDateFullFr(date) {
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(dt);
}

function normalizeEntry(entry) {
  if (!entry || typeof entry.id !== 'string') return null;
  const createdAt = Number(entry.createdAt) || Date.now();
  const updatedAt = Number(entry.updatedAt) || createdAt;
  const content = typeof entry.content === 'string' ? entry.content : '<p></p>';
  const contentText = stripHtml(content);
  const date = typeof entry.date === 'string' && entry.date ? entry.date : formatDateValue(createdAt);
  const dateObject = new Date(date);

  return {
    id: entry.id,
    title: typeof entry.title === 'string' ? entry.title : '',
    content,
    createdAt,
    updatedAt,
    date,
    dayOfWeek:
      typeof entry.dayOfWeek === 'string' && entry.dayOfWeek
        ? entry.dayOfWeek
        : FRENCH_DAY_NAMES[Number.isNaN(dateObject.getDay()) ? new Date(createdAt).getDay() : dateObject.getDay()],
    wordCount: Number(entry.wordCount) || countWords(contentText),
    contentText,
    tagId: normalizeTagId(entry.tagId)
  };
}

function readEntries() {
  const data = load(STORAGE_KEY, []);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeEntry).filter(Boolean);
}

function persistEntries(entries) {
  save(
    STORAGE_KEY,
    entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      date: entry.date,
      dayOfWeek: entry.dayOfWeek,
      wordCount: entry.wordCount,
      tagId: entry.tagId
    }))
  );
}

function getSortedEntries(entries, dateSort = 'desc') {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) {
      return dateSort === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
    }
    return dateSort === 'desc' ? b.updatedAt - a.updatedAt : a.updatedAt - b.updatedAt;
  });
}

function getVisibleEntries(entries, { searchQuery = '', tagFilter = 'all', dateSort = 'desc' } = {}) {
  const query = searchQuery.trim().toLowerCase();
  let source = getSortedEntries(entries, dateSort);
  if (tagFilter !== 'all') {
    source = source.filter((entry) => entry.tagId === tagFilter);
  }
  const list = query
    ? source.filter(
        (entry) =>
          entry.title.toLowerCase().includes(query) || entry.contentText.toLowerCase().includes(query)
      )
    : source;

  return list.map((entry) => ({
    ...entry,
    formattedDate: formatDateFullFr(entry.date)
  }));
}

function createEntry() {
  const now = Date.now();
  const nowDate = new Date(now);
  return {
    id: generateUUID(),
    title: '',
    content: '<p></p>',
    createdAt: now,
    updatedAt: now,
    date: formatDateValue(now),
    dayOfWeek: FRENCH_DAY_NAMES[nowDate.getDay()],
    wordCount: 0,
    contentText: '',
    tagId: null
  };
}

export {
  STORAGE_KEY,
  FRENCH_DAY_NAMES,
  TAG_ID_SET,
  normalizeTagId,
  stripHtml,
  countWords,
  formatDateValue,
  formatDateFullFr,
  normalizeEntry,
  readEntries,
  persistEntries,
  getSortedEntries,
  getVisibleEntries,
  createEntry
};
