import './style.css';
import { load, remove, save } from '../../core/storage.js';
import { fetchWeatherSnapshot, mapWeatherSnapshot, normalizeCity } from './data.js';
import { createSearchResults, createWeatherView, createWeatherWidgetLine } from './view.js';

const CITY_STORAGE_KEY = 'weather:selected-city';
const ONBOARDED_KEY = 'weather:onboarded';
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

let rootContainer = null;
let refreshTimer = null;
let geocodeDebounceTimer = null;
let weatherAbortController = null;
let geocodeAbortController = null;
let onInput = null;
let onClick = null;
let onDocumentClick = null;

let state = {};

function readOnboardedFlag() {
  return load(ONBOARDED_KEY) === true;
}

function readSelectedCity() {
  return normalizeCity(load(CITY_STORAGE_KEY, null));
}

function render() {
  if (!rootContainer) return;
  rootContainer.innerHTML = createWeatherView({
    showOnboarding: !readOnboardedFlag(),
    onboardingGeoStatus: state.onboardingGeoStatus,
    searchQuery: state.search.default.query,
    searchResults: state.search.default.results,
    status: state.status,
    errorMessage: state.errorMessage,
    snapshot: {
      ...(state.snapshots[state.activeLocation] || state.snapshots.here),
      activeLocation: state.activeLocation,
      elsewhereQuery: state.search.elsewhere.query,
      elsewhereResults: state.search.elsewhere.results
    }
  });
}

function renderSearchResults(scope) {
  const host = rootContainer?.querySelector(`[data-weather-search-scope="${scope}"]`)?.closest('.elsewhere, .weather__onboarding-col');
  const target = host?.querySelector('[data-weather-results-container]');
  if (!target) return render();
  target.innerHTML = createSearchResults(state.search[scope].results, scope);
}

async function fetchGeocodingResults(scope) {
  if (geocodeAbortController) geocodeAbortController.abort();
  geocodeAbortController = new AbortController();
  const query = state.search[scope].query.trim();
  if (!query) {
    state.search[scope].results = [];
    return renderSearchResults(scope);
  }
  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', query);
    url.searchParams.set('count', '5');
    url.searchParams.set('language', 'fr');
    const response = await fetch(url.toString(), { signal: geocodeAbortController.signal });
    if (!response.ok) throw new Error('Service indisponible');
    const payload = await response.json();
    state.search[scope].results = (Array.isArray(payload?.results) ? payload.results : [])
      .map((item) => normalizeCity({ name: item.name, admin1: item.admin1, country: item.country, latitude: Number(item.latitude), longitude: Number(item.longitude) }))
      .filter(Boolean)
      .slice(0, 5);
    renderSearchResults(scope);
  } catch (error) {
    if (error?.name !== 'AbortError') {
      state.search[scope].results = [];
      renderSearchResults(scope);
    }
  }
}

async function fetchAndStoreWeather(city, scope) {
  if (!city) return;
  if (weatherAbortController) weatherAbortController.abort();
  weatherAbortController = new AbortController();
  state.status = 'loading';
  state.errorMessage = '';
  render();
  try {
    const payload = await fetchWeatherSnapshot(city, weatherAbortController.signal);
    state.snapshots[scope] = mapWeatherSnapshot(payload, city);
    state.status = 'ready';
    state.errorMessage = '';
    render();
  } catch (error) {
    if (error?.name === 'AbortError') return;
    state.status = 'error';
    state.errorMessage = 'Impossible de charger la meteo. Verifie ta connexion puis reessaie.';
    render();
  }
}

function selectDefaultCity(city) {
  save(ONBOARDED_KEY, true);
  state.selectedCity = city;
  state.activeLocation = 'here';
  state.search.default.query = city.name;
  state.search.default.results = [];
  save(CITY_STORAGE_KEY, city);
  render();
  fetchAndStoreWeather(city, 'here');
  startAutoRefresh();
}

function selectElsewhereCity(city) {
  state.elsewhereCity = city;
  state.activeLocation = 'elsewhere';
  state.search.elsewhere.query = city.name;
  state.search.elsewhere.results = [];
  render();
  fetchAndStoreWeather(city, 'elsewhere');
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  if (!state.selectedCity) return;
  refreshTimer = setInterval(() => fetchAndStoreWeather(state.selectedCity, 'here'), REFRESH_INTERVAL_MS);
}

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
  if (!name || !p.country) return null;
  return normalizeCity({ name, admin1: p.state || p.county || '', country: p.country, latitude, longitude });
}

function requestOnboardingGeolocation() {
  if (!navigator.geolocation) {
    state.onboardingGeoStatus = 'denied';
    return render();
  }
  state.onboardingGeoStatus = 'loading';
  render();
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const city = await reverseGeocodeCoords(pos.coords.latitude, pos.coords.longitude);
      if (city) return selectDefaultCity(city);
      state.onboardingGeoStatus = 'error';
      render();
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
  state.status = 'idle';
  state.errorMessage = '';
  state.snapshots = { here: null, elsewhere: null };
  render();
}

function bindEvents() {
  onInput = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches('[data-weather-search]')) return;
    const scope = target.dataset.weatherSearchScope || 'default';
    state.search[scope].query = target.value;
    if (geocodeDebounceTimer) clearTimeout(geocodeDebounceTimer);
    geocodeDebounceTimer = setTimeout(() => fetchGeocodingResults(scope), 260);
  };

  onClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const resultButton = target.closest('[data-weather-result]');
    if (resultButton instanceof HTMLButtonElement) {
      const scope = resultButton.dataset.weatherScope || 'default';
      const cityId = resultButton.dataset.weatherResult;
      const city = state.search[scope].results.find((item) => item.id === cityId);
      if (city) (scope === 'default' ? selectDefaultCity(city) : selectElsewhereCity(city));
      return;
    }
    if (target.closest('[data-weather-onboarding-geo]')) return requestOnboardingGeolocation();
    if (target.closest('[data-weather-onboarding-skip]')) return skipWeatherOnboarding();
    if (target.closest('[data-weather-retry]')) return fetchAndStoreWeather(state.activeLocation === 'elsewhere' ? state.elsewhereCity : state.selectedCity, state.activeLocation);
    const locButton = target.closest('[data-weather-location]');
    if (locButton instanceof HTMLButtonElement) {
      state.activeLocation = locButton.dataset.weatherLocation === 'elsewhere' ? 'elsewhere' : 'here';
      if (state.activeLocation === 'here') state.search.elsewhere.results = [];
      render();
      return;
    }
    if (target.closest('[data-weather-elsewhere-reset]')) {
      state.activeLocation = 'here';
      state.search.elsewhere.results = [];
      state.search.elsewhere.query = '';
      return render();
    }
  };

  onDocumentClick = (event) => {
    const target = event.target;
    if (!(target instanceof Node) || !rootContainer || rootContainer.contains(target)) return;
    state.search.default.results = [];
    state.search.elsewhere.results = [];
    render();
  };

  rootContainer.addEventListener('input', onInput);
  rootContainer.addEventListener('click', onClick);
  document.addEventListener('click', onDocumentClick);
}

const weatherModule = {
  id: 'weather',
  label: 'Meteo',
  icon: '🌤',
  init(container) {
    rootContainer = container;
    const selected = readSelectedCity();
    const needsOnboarding = !readOnboardedFlag();
    state = {
      status: needsOnboarding ? 'idle' : selected ? 'loading' : 'idle',
      errorMessage: '',
      onboardingGeoStatus: 'idle',
      selectedCity: selected,
      elsewhereCity: null,
      activeLocation: 'here',
      snapshots: { here: null, elsewhere: null },
      search: { default: { query: needsOnboarding ? '' : selected?.name || '', results: [] }, elsewhere: { query: '', results: [] } }
    };
    render();
    bindEvents();
    if (!needsOnboarding && selected) {
      fetchAndStoreWeather(selected, 'here');
      startAutoRefresh();
    }
  },
  destroy() {
    if (refreshTimer) clearInterval(refreshTimer);
    if (geocodeDebounceTimer) clearTimeout(geocodeDebounceTimer);
    if (weatherAbortController) weatherAbortController.abort();
    if (geocodeAbortController) geocodeAbortController.abort();
    if (rootContainer && onInput) rootContainer.removeEventListener('input', onInput);
    if (rootContainer && onClick) rootContainer.removeEventListener('click', onClick);
    if (onDocumentClick) document.removeEventListener('click', onDocumentClick);
    if (rootContainer) rootContainer.innerHTML = '';
    rootContainer = null;
  },
  getDashboardWidget() {
    const snapshot = state.snapshots?.here;
    if (!snapshot) return { title: 'Meteo', content: 'Configure ta ville dans Meteo.' };
    return { title: 'Meteo', content: createWeatherWidgetLine({ city: snapshot.cityName, temperature: snapshot.currentTemp, emoji: snapshot.emoji, description: snapshot.locationDescription }) };
  }
};

export default weatherModule;
