const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const FREQUENCY_DISPLAY_LABELS = {
  daily: 'Chaque jour',
  weekdays: 'En semaine',
  weekend: 'Le week-end',
  every2days: 'Un jour sur deux'
};

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysDiffLocal(fromDate, toDate) {
  const a = startOfLocalDay(fromDate).getTime();
  const b = startOfLocalDay(toDate).getTime();
  return Math.round((b - a) / 86400000);
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function habitScheduledOnDate(habit, date) {
  if (habit.frequency === 'every2days') {
    const anchor = new Date(Number(habit.createdAt) || Date.now());
    const diff = daysDiffLocal(anchor, date);
    if (diff < 0) return false;
    return diff % 2 === 0;
  }
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekdays') return !isWeekend(date);
  return isWeekend(date);
}

function isCompletedOnDate(habitId, dateKey, completions) {
  return completions.some((item) => item.habitId === habitId && item.date === dateKey);
}

function getReturnsCount(habitId, completions, daysBack = 30) {
  const today = new Date();
  let count = 0;
  for (let i = 0; i < daysBack; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateKey = toDateKey(date);
    if (isCompletedOnDate(habitId, dateKey, completions)) count += 1;
  }
  return count;
}

function twinkleDelay(habitId, dateKey) {
  let hash = 0;
  const seed = `${habitId}|${dateKey}`;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000;
  }
  return `${(hash % 300) / 100}s`;
}

function buildConstellationStars(habit, completions, today = new Date()) {
  const todayKey = toDateKey(today);
  const stars = [];

  for (let i = 34; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateKey = toDateKey(date);
    const pos = 34 - i;
    const x = 4 + (pos / 34) * 92;
    const y = 50 + Math.sin(pos * 0.55) * 26;
    const scheduled = habitScheduledOnDate(habit, date);
    const done = isCompletedOnDate(habit.id, dateKey, completions);

    let kind = 'off';
    if (done) kind = 'done';
    else if (scheduled) kind = 'waiting';

    stars.push({
      x,
      y,
      kind,
      dateKey,
      isToday: dateKey === todayKey,
      twinkle: done ? twinkleDelay(habit.id, dateKey) : null
    });
  }

  return stars;
}

function getTodayBannerCopy(doneCount, totalCount) {
  if (totalCount === 0) {
    return {
      gaugeText: '0/0',
      subtitle: 'Reviens à tes mouillages quand tu peux.'
    };
  }
  if (doneCount === 0) {
    return {
      gaugeText: `0/${totalCount}`,
      subtitle: 'Reviens à tes mouillages quand tu peux.'
    };
  }
  if (doneCount === totalCount) {
    return {
      gaugeText: `${doneCount}/${totalCount}`,
      subtitle: 'Tous rejoints aujourd\u2019hui. Belle traversée.'
    };
  }
  const plural = doneCount > 1 ? 's' : '';
  return {
    gaugeText: `${doneCount}/${totalCount}`,
    subtitle: `${doneCount} mouillage${plural} rejoint${plural} — sans pression pour le reste.`
  };
}

function getGaugeOffset(doneCount, totalCount) {
  const ratio = totalCount > 0 ? doneCount / totalCount : 0;
  return 126 * (1 - ratio);
}

export {
  DAY_NAMES,
  FREQUENCY_DISPLAY_LABELS,
  toDateKey,
  parseDateKey,
  habitScheduledOnDate,
  isCompletedOnDate,
  getReturnsCount,
  buildConstellationStars,
  getTodayBannerCopy,
  getGaugeOffset
};
