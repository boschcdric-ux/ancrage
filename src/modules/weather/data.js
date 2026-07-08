const WEATHER_MAP = {
  0: { emoji: '☀️', description: 'Ensoleillé' },
  1: { emoji: '🌤', description: 'Peu nuageux' },
  2: { emoji: '🌤', description: 'Peu nuageux' },
  3: { emoji: '☁️', description: 'Couvert' },
  45: { emoji: '🌫', description: 'Brouillard' },
  48: { emoji: '🌫', description: 'Brouillard' },
  51: { emoji: '🌦', description: 'Bruine' },
  53: { emoji: '🌦', description: 'Bruine' },
  55: { emoji: '🌦', description: 'Bruine' },
  61: { emoji: '🌧', description: 'Pluie' },
  63: { emoji: '🌧', description: 'Pluie' },
  65: { emoji: '🌧', description: 'Pluie' },
  71: { emoji: '🌨', description: 'Neige' },
  73: { emoji: '🌨', description: 'Neige' },
  75: { emoji: '🌨', description: 'Neige' },
  80: { emoji: '🌧', description: 'Averses' },
  81: { emoji: '🌧', description: 'Averses' },
  82: { emoji: '🌧', description: 'Averses' },
  95: { emoji: '⛈', description: 'Orage' },
  96: { emoji: '⛈', description: 'Orage' },
  99: { emoji: '⛈', description: 'Orage' }
};

const THERMAL_STOPS = [
  [-5, '#2b6fb3'],
  [5, '#4aa3d4'],
  [14, '#3fb8a4'],
  [24, '#e8b24d'],
  [31, '#e07a4d'],
  [40, '#d1503f']
];

const LUNAR_REFERENCE_MS = Date.UTC(2000, 0, 6, 18, 14, 0, 0);
const SYNODIC_MONTH_DAYS = 29.530588853;

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeCity(city) {
  if (!city || typeof city.latitude !== 'number' || typeof city.longitude !== 'number') return null;
  if (typeof city.name !== 'string' || typeof city.country !== 'string') return null;
  if (!city.name || !city.country) return null;
  return {
    id: `${city.name.toLowerCase()}-${city.country.toLowerCase()}-${city.latitude}-${city.longitude}`,
    name: city.name,
    admin1: typeof city.admin1 === 'string' ? city.admin1 : '',
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude
  };
}

function getCityLabel(city) {
  return city ? `${city.name}${city.admin1 ? `, ${city.admin1}` : ''}, ${city.country}` : '';
}

function getWeatherMeta(code) {
  return WEATHER_MAP[toNumber(code)] || { emoji: '⛅', description: 'Nuageux' };
}

function formatWeekday(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  const raw = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatTimeLabel(isoDateTime) {
  const date = new Date(isoDateTime);
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatHour(isoDateTime) {
  return isoDateTime?.split('T')[1]?.slice(0, 5) || '';
}

function toRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function mixHex(c1, c2, ratio) {
  const [r1, g1, b1] = toRgb(c1);
  const [r2, g2, b2] = toRgb(c2);
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

function getTempColor(temperature) {
  for (let idx = 0; idx < THERMAL_STOPS.length - 1; idx += 1) {
    const [a, colorA] = THERMAL_STOPS[idx];
    const [b, colorB] = THERMAL_STOPS[idx + 1];
    if (temperature <= b) {
      const k = clamp((temperature - a) / (b - a), 0, 1);
      return mixHex(colorA, colorB, k);
    }
  }
  return THERMAL_STOPS[THERMAL_STOPS.length - 1][1];
}

function getMoonData(dateValue) {
  const date = new Date(dateValue);
  const elapsedDays = (date.getTime() - LUNAR_REFERENCE_MS) / 86400000;
  const age = ((elapsedDays % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  const illumination = Math.round(((1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH_DAYS)) / 2) * 100);
  if (age < 1.84566) return { illumination, phaseLabel: 'Nouvelle lune' };
  if (age < 5.53699) return { illumination, phaseLabel: 'Premier croissant' };
  if (age < 9.22831) return { illumination, phaseLabel: 'Premier quartier' };
  if (age < 12.91963) return { illumination, phaseLabel: 'Gibbeuse croissante' };
  if (age < 16.61096) return { illumination, phaseLabel: 'Pleine lune' };
  if (age < 20.30228) return { illumination, phaseLabel: 'Gibbeuse décroissante' };
  if (age < 23.99361) return { illumination, phaseLabel: 'Dernier quartier' };
  if (age < 27.68493) return { illumination, phaseLabel: 'Dernier croissant' };
  return { illumination, phaseLabel: 'Nouvelle lune' };
}

function describeStargazing(cloudCover, moonIllumination) {
  if (cloudCover > 60) return { title: 'Ciel couvert', detail: "peu d'étoiles visibles ce soir." };
  if (cloudCover > 30) return { title: 'Ciel voilé', detail: 'quelques éclaircies possibles.' };
  if (moonIllumination > 70) return { title: 'Lune brillante', detail: 'ciel laiteux, observation limitée.' };
  return { title: 'Belle nuit pour les étoiles', detail: 'ciel dégagé et lune discrète.' };
}

function buildAdvice(currentTemp, maxTemp, windSpeed) {
  if (maxTemp >= 32) return { icon: '🥵', text: "Grosse chaleur attendue. Sortir tôt ou tard aide à garder ton énergie." };
  if (windSpeed >= 35) return { icon: '💨', text: 'Vent soutenu aujourd’hui. Une couche coupe-vent peut te simplifier la sortie.' };
  if (currentTemp <= 4) return { icon: '🧣', text: 'Air froid. Une couche chaude et des mains couvertes rendent la balade plus douce.' };
  return { icon: '🌿', text: 'Conditions plutôt stables. Bonne fenêtre pour une pause dehors si tu en as envie.' };
}

function extractTodayHourly(payload) {
  const times = Array.isArray(payload?.hourly?.time) ? payload.hourly.time : [];
  const temperatures = Array.isArray(payload?.hourly?.temperature_2m) ? payload.hourly.temperature_2m : [];
  const date = Array.isArray(payload?.daily?.time) && payload.daily.time.length ? payload.daily.time[0] : '';
  const selected = [];
  for (let idx = 0; idx < times.length; idx += 1) {
    if (!times[idx]?.startsWith(date)) continue;
    selected.push({ time: times[idx], temperature: toNumber(temperatures[idx]) });
    if (selected.length === 24) break;
  }
  if (selected.length) return selected;
  return times.slice(0, 24).map((time, idx) => ({ time, temperature: toNumber(temperatures[idx]) }));
}

async function fetchWeatherSnapshot(city, signal) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(city.latitude));
  url.searchParams.set('longitude', String(city.longitude));
  url.searchParams.set('current', 'temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m,cloudcover');
  url.searchParams.set('daily', 'weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,wind_speed_10m_max,sunrise,sunset');
  url.searchParams.set('hourly', 'temperature_2m,apparent_temperature,weathercode,cloudcover');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '5');
  const response = await fetch(url.toString(), { signal });
  if (!response.ok) throw new Error('Le service météo est indisponible.');
  return response.json();
}

function mapWeatherSnapshot(payload, city) {
  const daily = payload?.daily || {};
  const current = payload?.current || {};
  const days = Array.isArray(daily.time) ? daily.time : [];
  if (!days.length || !current.time) throw new Error('Données météo incomplètes.');

  const forecast = days.map((date, idx) => {
    const min = toNumber(daily.temperature_2m_min?.[idx]);
    const max = toNumber(daily.temperature_2m_max?.[idx]);
    const meta = getWeatherMeta(daily.weathercode?.[idx]);
    return { date, label: formatWeekday(date), min, max, emoji: meta.emoji };
  });
  const allMin = Math.min(...forecast.map((item) => item.min));
  const allMax = Math.max(...forecast.map((item) => item.max));
  const spread = Math.max(1, allMax - allMin);
  const forecastBars = forecast.map((item) => ({
    ...item,
    barStart: ((item.min - allMin) / spread) * 100,
    barEnd: ((item.max - allMin) / spread) * 100
  }));

  const hourly = extractTodayHourly(payload);
  const nowHour = new Date(current.time).getHours();
  const tidePoints = hourly.map((entry) => ({
    ...entry,
    hour: new Date(entry.time).getHours(),
    label: formatTimeLabel(entry.time),
    color: getTempColor(entry.temperature)
  }));

  const moon = getMoonData(current.time);
  const cloudCover = toNumber(current.cloudcover);
  const stargazing = describeStargazing(cloudCover, moon.illumination);
  const maxToday = toNumber(daily.temperature_2m_max?.[0]);
  const minToday = toNumber(daily.temperature_2m_min?.[0]);
  const currentTemp = toNumber(current.temperature_2m);
  const thermoSpread = Math.max(1, maxToday - minToday);
  const thermoLevel = clamp(((currentTemp - minToday) / thermoSpread) * 100, 0, 100);

  return {
    cityLabel: getCityLabel(city),
    cityName: city.name,
    locationDescription: getWeatherMeta(current.weathercode).description,
    emoji: getWeatherMeta(current.weathercode).emoji,
    currentTemp,
    apparentTemp: toNumber(current.apparent_temperature),
    humidity: toNumber(current.relativehumidity_2m),
    windSpeed: toNumber(current.windspeed_10m),
    cloudCover,
    sunrise: formatHour(daily.sunrise?.[0]),
    sunset: formatHour(daily.sunset?.[0]),
    moon,
    stargazing,
    advice: buildAdvice(currentTemp, maxToday, toNumber(current.windspeed_10m)),
    thermo: { min: minToday, max: maxToday, level: thermoLevel, currentColor: getTempColor(currentTemp) },
    tide: { points: tidePoints, nowHour, nowLabel: formatTimeLabel(current.time) },
    forecast: forecastBars
  };
}

export { fetchWeatherSnapshot, mapWeatherSnapshot, normalizeCity };
