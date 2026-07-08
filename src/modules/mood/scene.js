/** Palette de scène par humeur + helpers galerie (maquette M11). */

const SKY_BY_MOOD = {
  1: { sky: ['#141b26', '#0a0f16'], sun: '#7f95c0' },
  2: { sky: ['#1c2836', '#0d1520'], sun: '#c9d2e0' },
  3: { sky: ['#243244', '#101c28'], sun: '#ffe9b0' },
  4: { sky: ['#33526a', '#182838'], sun: '#ffe6a0' },
  5: { sky: ['#4a7a92', '#1f3a48'], sun: '#fff4d0' }
};

const GALLERY_DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const GALLERY_MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.'
];

const PERIOD_OPTIONS = [
  { id: 'week', label: 'Semaine', days: 7 },
  { id: 'month', label: 'Mois', days: 30 },
  { id: 'quarter', label: '3 mois', days: 90 },
  { id: 'year', label: 'Année', days: 365 }
];

function describeSea(moodValue, energyValue) {
  const light =
    moodValue <= 2 ? 'Ciel bas' : moodValue === 3 ? 'Ciel voilé' : moodValue === 4 ? 'Belle lumière' : 'Grand soleil';
  const sea =
    energyValue <= 1
      ? 'mer d\u2019huile'
      : energyValue === 2
        ? 'mer calme'
        : energyValue === 3
          ? 'houle légère'
          : energyValue === 4
            ? 'houle vive'
            : 'grande houle';
  return `${light}, ${sea}`;
}

function miniSky(moodValue) {
  return SKY_BY_MOOD[moodValue] || SKY_BY_MOOD[3];
}

function waveShade(energyValue) {
  const shades = {
    1: 'rgba(255,255,255,.10)',
    2: 'rgba(255,255,255,.16)',
    3: 'rgba(255,255,255,.22)',
    4: 'rgba(255,255,255,.30)',
    5: 'rgba(255,255,255,.4)'
  };
  return shades[energyValue] || shades[3];
}

function waterShade(moodValue) {
  return miniSky(moodValue).sky[1];
}

function getIsoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function parseEntryDate(entry) {
  return new Date(`${entry.date}T12:00:00`);
}

function buildGalleryBuckets(entries, period, todayIso = getIsoDate()) {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]));
  const anchor = new Date(`${todayIso}T12:00:00`);

  if (period === 'week') {
    const days = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(anchor);
      date.setDate(date.getDate() - offset);
      const iso = getIsoDate(date);
      const entry = byDate.get(iso);
      const isToday = iso === todayIso;
      const dowIndex = date.getDay();
      const label = isToday ? 'auj.' : GALLERY_DOW[(dowIndex + 6) % 7];

      if (!entry) {
        days.push({ empty: true, label, today: isToday, date: iso });
      } else {
        days.push({
          empty: false,
          m: entry.mood,
          e: entry.energy,
          note: entry.note || '',
          label,
          today: isToday,
          date: iso,
          count: 1
        });
      }
    }
    return days;
  }

  const config = { month: { days: 30, buckets: 6 }, quarter: { days: 90, buckets: 12 }, year: { days: 365, buckets: 12 } }[
    period
  ];
  const cutoff = new Date(anchor);
  cutoff.setDate(cutoff.getDate() - (config.days - 1));
  const cutoffIso = getIsoDate(cutoff);

  const slice = entries
    .filter((entry) => entry.date >= cutoffIso)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!slice.length) return [];

  const perBucket = Math.ceil(slice.length / config.buckets) || 1;
  const buckets = [];

  for (let i = 0; i < slice.length; i += perBucket) {
    const chunk = slice.slice(i, i + perBucket);
    const moodAvg = Math.round(chunk.reduce((sum, entry) => sum + entry.mood, 0) / chunk.length);
    const energyAvg = Math.round(chunk.reduce((sum, entry) => sum + entry.energy, 0) / chunk.length);
    const first = parseEntryDate(chunk[0]);
    const label =
      period === 'year' ? GALLERY_MONTHS[first.getMonth()].slice(0, 4) : `${first.getDate()}/${first.getMonth() + 1}`;

    buckets.push({
      empty: false,
      m: moodAvg,
      e: energyAvg,
      note: '',
      label,
      today: false,
      date: chunk[0].date,
      count: chunk.length
    });
  }

  return buckets;
}

export {
  SKY_BY_MOOD,
  PERIOD_OPTIONS,
  GALLERY_DOW,
  describeSea,
  miniSky,
  waveShade,
  waterShade,
  buildGalleryBuckets,
  getIsoDate
};
