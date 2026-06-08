import './style.css';
import { save, load, remove } from '../../core/storage.js';
import { createWeatherView, createWeatherContent, createWeatherWidgetLine, createSearchResults } from './view.js';

const CITY_STORAGE_KEY = 'weather:selected-city';
const ONBOARDED_KEY = 'weather:onboarded';
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

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

let rootContainer = null;
let refreshTimer = null;
let geocodeDebounceTimer = null;
let weatherAbortController = null;
let geocodeAbortController = null;
let onInput = null;
let onClick = null;
let onDocumentClick = null;

let state = {
  status: 'loading',
  errorMessage: '',
  selectedCity: null,
  searchQuery: '',
  searchResults: [],
  current: null,
  forecast: [],
  selectedForecastIndex: 0,
  onboardingGeoStatus: 'idle'
};

function getWeatherMeta(code) {
  return WEATHER_MAP[Number(code)] || { emoji: '⛅', description: 'Nuageux' };
}

function normalizeCity(city) {
  if (!city || typeof city.latitude !== 'number' || typeof city.longitude !== 'number') return null;
  const name = typeof city.name === 'string' ? city.name : '';
  const country = typeof city.country === 'string' ? city.country : '';
  if (!name || !country) return null;

  return {
    id: `${name.toLowerCase()}-${country.toLowerCase()}-${city.latitude}-${city.longitude}`,
    name,
    admin1: typeof city.admin1 === 'string' ? city.admin1 : '',
    country,
    latitude: city.latitude,
    longitude: city.longitude
  };
}

function getCityLabel(city) {
  if (!city) return '';
  return `${city.name}${city.admin1 ? `, ${city.admin1}` : ''}, ${city.country}`;
}

function formatForecastDetailLabel(dateString) {
  if (!dateString) return '';
  const date = new Date(`${dateString}T12:00:00`);
  const raw = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(date);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function readOnboardedFlag() {
  return load(ONBOARDED_KEY) === true;
}

function migrateWeatherOnboarding() {
  if (readOnboardedFlag()) return;
  const saved = load(CITY_STORAGE_KEY, null);
  if (normalizeCity(saved)) {
    save(ONBOARDED_KEY, true);
  }
}

function readSelectedCity() {
  const saved = load(CITY_STORAGE_KEY, null);
  return normalizeCity(saved);
}

function persistSelectedCity(city) {
  save(CITY_STORAGE_KEY, city);
}

function buildDisplayWeather() {
  if (state.status !== 'ready' || !state.forecast.length) return state.current;
  const maxIdx = state.forecast.length - 1;
  const idx = Math.min(Math.max(0, state.selectedForecastIndex), maxIdx);

  if (idx === 0 && state.current) {
    return { ...state.current };
  }

  const day = state.forecast[idx];
  if (!day || !state.current) return state.current;

  return {
    cityLabel: state.current.cityLabel,
    description: day.description,
    emoji: day.emoji,
    temperature: day.representativeTemp,
    apparentTemperature: day.apparentAvg,
    humidity: null,
    windSpeed: day.windMax,
    detailHint: day.detailLabel
  };
}

function render() {
  if (!rootContainer) return;
  rootContainer.innerHTML = createWeatherView({
    showOnboarding: !readOnboardedFlag(),
    onboardingGeoStatus: state.onboardingGeoStatus,
    status: state.status,
    errorMessage: state.errorMessage,
    searchQuery: state.searchQuery,
    searchResults: state.searchResults,
    displayWeather: buildDisplayWeather(),
    forecast: state.forecast,
    selectedForecastIndex: state.selectedForecastIndex
  });
}

function renderContentOnly() {
  if (!rootContainer) return;
  const contentNode = rootContainer.querySelector('[data-weather-content]');
  if (!contentNode) {
    render();
    return;
  }
  contentNode.innerHTML = createWeatherContent({
    status: state.status,
    errorMessage: state.errorMessage,
    displayWeather: buildDisplayWeather(),
    forecast: state.forecast,
    selectedForecastIndex: state.selectedForecastIndex
  });
}

function renderSearchResultsOnly() {
  if (!rootContainer) return;
  const resultsContainer = rootContainer.querySelector('[data-weather-results-container]');
  if (!resultsContainer) {
    render();
    return;
  }
  resultsContainer.innerHTML = createSearchResults(state.searchResults);
}

async function fetchWeatherForCity(city) {
  if (!city) return;

  if (weatherAbortController) weatherAbortController.abort();
  weatherAbortController = new AbortController();

  state.status = 'loading';
  state.errorMessage = '';
  renderContentOnly();

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(city.latitude));
  url.searchParams.set('longitude', String(city.longitude));
  url.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m'
  );
  url.searchParams.set(
    'daily',
    'weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,wind_speed_10m_max'
  );
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '5');

  try {
    const response = await fetch(url.toString(), { signal: weatherAbortController.signal });
    if (!response.ok) throw new Error('Le service météo est indisponible.');
    const payload = await response.json();

    const current = payload?.current;
    const daily = payload?.daily;
    const dates = Array.isArray(daily?.time) ? daily.time : [];
    const weathercodes = Array.isArray(daily?.weathercode) ? daily.weathercode : [];
    const maxTemps = Array.isArray(daily?.temperature_2m_max) ? daily.temperature_2m_max : [];
    const minTemps = Array.isArray(daily?.temperature_2m_min) ? daily.temperature_2m_min : [];
    const apparentMax = Array.isArray(daily?.apparent_temperature_max) ? daily.apparent_temperature_max : [];
    const apparentMin = Array.isArray(daily?.apparent_temperature_min) ? daily.apparent_temperature_min : [];
    const windMaxDaily = Array.isArray(daily?.wind_speed_10m_max) ? daily.wind_speed_10m_max : [];

    if (!current || !dates.length) throw new Error('Données météo incomplètes.');

    const currentMeta = getWeatherMeta(current.weathercode);
    state.current = {
      cityLabel: getCityLabel(city),
      temperature: Number(current.temperature_2m) || 0,
      apparentTemperature: Number(current.apparent_temperature) || 0,
      humidity: Number(current.relativehumidity_2m) || 0,
      windSpeed: Number(current.windspeed_10m) || 0,
      emoji: currentMeta.emoji,
      description: currentMeta.description
    };

    state.forecast = dates.map((date, index) => {
      const meta = getWeatherMeta(weathercodes[index]);
      const max = Number(maxTemps[index]) || 0;
      const min = Number(minTemps[index]) || 0;
      const appMx = Number(apparentMax[index]);
      const appMn = Number(apparentMin[index]);
      const hasApparent = Number.isFinite(appMx) && Number.isFinite(appMn);
      const windM = Number(windMaxDaily[index]);
      return {
        date,
        emoji: meta.emoji,
        description: meta.description,
        min,
        max,
        representativeTemp: (max + min) / 2,
        apparentAvg: hasApparent ? (appMx + appMn) / 2 : (max + min) / 2,
        windMax: Number.isFinite(windM) ? windM : 0,
        detailLabel: formatForecastDetailLabel(date)
      };
    });

    state.selectedForecastIndex = 0;
    state.status = 'ready';
    state.errorMessage = '';
    renderContentOnly();
  } catch (error) {
    if (error?.name === 'AbortError') return;
    state.status = 'error';
    state.errorMessage = 'Impossible de charger la météo. Vérifie ta connexion puis réessaie.';
    renderContentOnly();
  }
}

async function fetchGeocodingResults(query) {
  if (geocodeAbortController) geocodeAbortController.abort();
  geocodeAbortController = new AbortController();

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    state.searchResults = [];
    renderSearchResultsOnly();
    return;
  }

  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', trimmedQuery);
    url.searchParams.set('count', '5');
    url.searchParams.set('language', 'fr');

    const response = await fetch(url.toString(), { signal: geocodeAbortController.signal });
    if (!response.ok) throw new Error('Service indisponible');
    const payload = await response.json();
    const nextResults = Array.isArray(payload?.results) ? payload.results : [];

    state.searchResults = nextResults
      .map((item) =>
        normalizeCity({
          name: item.name,
          admin1: item.admin1,
          country: item.country,
          latitude: Number(item.latitude),
          longitude: Number(item.longitude)
        })
      )
      .filter(Boolean)
      .slice(0, 5);
    renderSearchResultsOnly();
  } catch (error) {
    if (error?.name === 'AbortError') return;
    state.searchResults = [];
    renderSearchResultsOnly();
  }
}

function selectCity(city) {
  const normalized = normalizeCity(city);
  if (!normalized) return;

  save(ONBOARDED_KEY, true);
  state.onboardingGeoStatus = 'idle';
  state.selectedCity = normalized;
  state.searchQuery = normalized.name;
  state.searchResults = [];
  persistSelectedCity(normalized);
  render();
  fetchWeatherForCity(normalized);
  startAutoRefresh();
}

function startAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (!state.selectedCity) return;
  refreshTimer = setInterval(() => {
    fetchWeatherForCity(state.selectedCity);
  }, REFRESH_INTERVAL_MS);
}

/**
 * Open-Meteo ne documente pas d'endpoint reverse public ; Photon (OSM) résout lat/lon → lieu.
 */
async function reverseGeocodeCoords(latitude, longitude) {
  const url = new URL('https://photon.komoot.io/reverse');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('lang', 'fr');
  const response = await fetch(url.toString());
  if (!response.ok) return null;
  const payload = await response.json();
  const feature = Array.isArray(payload?.features) ? payload.features[0] : null;
  const p = feature?.properties;
  if (!p) return null;
  const name = p.city || p.town || p.village || p.name || p.locality;
  const country = p.country;
  if (!name || !country) return null;
  const coords = feature.geometry?.coordinates;
  const lon = Array.isArray(coords) ? Number(coords[0]) : longitude;
  const lat = Array.isArray(coords) ? Number(coords[1]) : latitude;
  return normalizeCity({
    name,
    admin1: typeof p.state === 'string' ? p.state : typeof p.county === 'string' ? p.county : '',
    country,
    latitude: Number.isFinite(lat) ? lat : latitude,
    longitude: Number.isFinite(lon) ? lon : longitude
  });
}

function requestOnboardingGeolocation() {
  if (!navigator.geolocation) {
    state.onboardingGeoStatus = 'denied';
    render();
    return;
  }
  state.onboardingGeoStatus = 'loading';
  render();

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const city = await reverseGeocodeCoords(pos.coords.latitude, pos.coords.longitude);
        if (city) {
          state.onboardingGeoStatus = 'idle';
          selectCity(city);
          return;
        }
        state.onboardingGeoStatus = 'error';
        render();
      } catch {
        state.onboardingGeoStatus = 'error';
        render();
      }
    },
    () => {
      state.onboardingGeoStatus = 'denied';
      render();
    },
    { enableHighAccuracy: false, timeout: 14000, maximumAge: 300000 }
  );
}

function skipWeatherOnboarding() {
  save(ONBOARDED_KEY, true);
  remove(CITY_STORAGE_KEY);
  state.selectedCity = null;
  state.searchQuery = '';
  state.searchResults = [];
  state.current = null;
  state.forecast = [];
  state.selectedForecastIndex = 0;
  state.status = 'idle';
  state.errorMessage = '';
  state.onboardingGeoStatus = 'idle';
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  render();
}

function bindEvents() {
  if (!rootContainer) return;

  onInput = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches('[data-weather-search]')) return;

    state.searchQuery = target.value;
    if (geocodeDebounceTimer) clearTimeout(geocodeDebounceTimer);
    geocodeDebounceTimer = setTimeout(() => {
      fetchGeocodingResults(state.searchQuery);
    }, 280);
  };

  onClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const resultButton = target.closest('[data-weather-result]');
    if (resultButton instanceof HTMLButtonElement) {
      const cityId = resultButton.dataset.weatherResult;
      const selected = state.searchResults.find((item) => item.id === cityId);
      if (selected) selectCity(selected);
      return;
    }

    const onboardingGeo = target.closest('[data-weather-onboarding-geo]');
    if (onboardingGeo) {
      requestOnboardingGeolocation();
      return;
    }

    const onboardingSkip = target.closest('[data-weather-onboarding-skip]');
    if (onboardingSkip) {
      skipWeatherOnboarding();
      return;
    }

    const retryButton = target.closest('[data-weather-retry]');
    if (retryButton instanceof HTMLButtonElement) {
      if (state.selectedCity) fetchWeatherForCity(state.selectedCity);
      return;
    }

    const forecastDayBtn = target.closest('[data-weather-forecast-day]');
    if (forecastDayBtn instanceof HTMLButtonElement) {
      const idx = Number(forecastDayBtn.dataset.weatherForecastDay);
      if (Number.isFinite(idx) && idx >= 0 && idx < state.forecast.length) {
        state.selectedForecastIndex = idx;
        renderContentOnly();
      }
    }
  };

  onDocumentClick = (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!rootContainer?.contains(target)) {
      if (state.searchResults.length) {
        state.searchResults = [];
        renderSearchResultsOnly();
      }
      return;
    }

    const elementTarget = target instanceof Element ? target : null;
    if (
      elementTarget?.closest('[data-weather-search]') ||
      elementTarget?.closest('[data-weather-results]') ||
      elementTarget?.closest('[data-weather-onboarding]')
    )
      return;

    if (state.searchResults.length) {
      state.searchResults = [];
      renderSearchResultsOnly();
    }
  };

  rootContainer.addEventListener('input', onInput);
  rootContainer.addEventListener('click', onClick);
  document.addEventListener('click', onDocumentClick);
}

const weatherModule = {
  id: 'weather',
  label: 'Météo',
  icon: '🌤',

  init(container) {
    rootContainer = container;
    migrateWeatherOnboarding();
    const city = readSelectedCity();
    const needsOnboarding = !readOnboardedFlag();

    state = {
      status: needsOnboarding ? 'idle' : city ? 'loading' : 'idle',
      errorMessage: '',
      selectedCity: needsOnboarding ? null : city,
      searchQuery: needsOnboarding ? '' : city?.name || '',
      searchResults: [],
      current: null,
      forecast: [],
      selectedForecastIndex: 0,
      onboardingGeoStatus: 'idle'
    };
    render();
    bindEvents();
    if (!needsOnboarding && city) {
      fetchWeatherForCity(city);
      startAutoRefresh();
    }
  },

  destroy() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    if (geocodeDebounceTimer) {
      clearTimeout(geocodeDebounceTimer);
      geocodeDebounceTimer = null;
    }
    if (weatherAbortController) weatherAbortController.abort();
    if (geocodeAbortController) geocodeAbortController.abort();

    if (rootContainer && onInput) rootContainer.removeEventListener('input', onInput);
    if (rootContainer && onClick) rootContainer.removeEventListener('click', onClick);
    if (onDocumentClick) document.removeEventListener('click', onDocumentClick);

    onInput = null;
    onClick = null;
    onDocumentClick = null;
    weatherAbortController = null;
    geocodeAbortController = null;
    state.searchResults = [];

    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    if (!state.selectedCity || !state.current) {
      return {
        title: 'Météo',
        content: 'Configure ta ville dans le module Météo.'
      };
    }

    const city = state.selectedCity?.name || 'Ville';
    const line = createWeatherWidgetLine({
      city,
      temperature: state.current.temperature,
      emoji: state.current.emoji,
      description: state.current.description
    });

    return {
      title: 'Météo',
      content: line
    };
  }
};

export default weatherModule;
