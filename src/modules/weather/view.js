function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDayLabel(dateString) {
  if (!dateString) return '';
  const date = new Date(`${dateString}T12:00:00`);
  const formatted = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', '');
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function createSearchResults(results = []) {
  if (!results.length) return '';

  return `
    <ul class="weather__results card animate-fade-in" data-weather-results role="listbox" aria-label="Résultats de villes">
      ${results
        .map((item, index) => {
          const label = `${item.name}${item.admin1 ? `, ${item.admin1}` : ''}, ${item.country}`;
          return `
            <li>
              <button
                type="button"
                class="weather__result-btn"
                data-weather-result="${item.id}"
                role="option"
                aria-selected="${index === 0 ? 'true' : 'false'}"
              >
                ${escapeHtml(label)}
              </button>
            </li>
          `;
        })
        .join('')}
    </ul>
  `;
}

function createLoadingState() {
  return `
    <div class="weather__state weather__state--loading card animate-fade-in" data-weather-loading>
      <span class="weather__spinner" aria-hidden="true"></span>
      <p>Chargement de la météo...</p>
    </div>
  `;
}

function createErrorState(message) {
  return `
    <div class="weather__state weather__state--error card animate-fade-in">
      <p>${escapeHtml(message || 'Impossible de récupérer la météo pour le moment.')}</p>
      <button type="button" class="btn btn-secondary" data-weather-retry>Réessayer</button>
    </div>
  `;
}

function createNoCityConfiguredState() {
  return `
    <div class="weather__state weather__state--empty card animate-fade-in" data-weather-empty>
      <p>Choisis une ville ci-dessus pour afficher la météo.</p>
    </div>
  `;
}

function createGeoOnboardingHint(status) {
  if (status === 'loading') {
    return '<p class="weather__onboarding-geo-hint" role="status">Localisation en cours…</p>';
  }
  if (status === 'denied') {
    return '<p class="weather__onboarding-geo-hint weather__onboarding-geo-hint--notice">Position indisponible. Tu peux chercher ta ville à côté.</p>';
  }
  if (status === 'error') {
    return '<p class="weather__onboarding-geo-hint weather__onboarding-geo-hint--notice">Impossible d’identifier la ville ici. Utilise la recherche.</p>';
  }
  return '';
}

function createWeatherOnboardingView({ searchQuery = '', searchResults = [], onboardingGeoStatus = 'idle' }) {
  const geoBusy = onboardingGeoStatus === 'loading';

  return `
    <section class="weather weather--onboarding animate-fade-in" data-weather-onboarding>
      <article class="weather__onboarding card animate-slide-up">
        <h1 class="weather__title">Météo 🌤</h1>
        <p class="weather__subtitle weather__onboarding-lead">La météo de ta ville, pour mieux planifier ta journée.</p>
        <div class="weather__onboarding-grid">
          <div class="weather__onboarding-col">
            <button
              type="button"
              class="btn btn-secondary weather__onboarding-geo-btn"
              data-weather-onboarding-geo
              ${geoBusy ? 'disabled' : ''}
            >
              📍 Utiliser ma position
            </button>
            ${createGeoOnboardingHint(onboardingGeoStatus)}
          </div>
          <div class="weather__onboarding-col weather__onboarding-col--search">
            <label class="weather__search-label" for="weather-onboarding-search">Ta ville ?</label>
            <div class="weather__onboarding-search-wrap">
              <input
                id="weather-onboarding-search"
                class="weather__search-input"
                data-weather-search
                type="search"
                placeholder="Paris, Lyon…"
                value="${escapeHtml(searchQuery || '')}"
                autocomplete="off"
              />
              <div data-weather-results-container>
                ${createSearchResults(searchResults)}
              </div>
            </div>
          </div>
        </div>
        <button type="button" class="weather__onboarding-skip" data-weather-onboarding-skip>Passer →</button>
      </article>
    </section>
  `;
}

function createCurrentCard(data) {
  if (!data) return '';

  const humidityDisplay =
    data.humidity == null || Number.isNaN(Number(data.humidity)) ? '—' : `${Math.round(Number(data.humidity))}%`;

  return `
    <article class="weather__current card animate-slide-up">
      <header class="weather__current-header">
        <div>
          <h2 class="weather__city">${escapeHtml(data.cityLabel)}</h2>
          ${
            data.detailHint
              ? `<p class="weather__detail-hint">${escapeHtml(data.detailHint)}</p>`
              : ''
          }
          <p class="weather__description">${escapeHtml(data.description)}</p>
        </div>
        <span class="weather__icon" aria-hidden="true">${data.emoji}</span>
      </header>

      <p class="weather__temperature">${Math.round(data.temperature)}°C</p>

      <dl class="weather__metrics">
        <div class="weather__metric">
          <dt>Ressenti</dt>
          <dd>${Math.round(data.apparentTemperature)}°C</dd>
        </div>
        <div class="weather__metric">
          <dt>Humidité</dt>
          <dd>${humidityDisplay}</dd>
        </div>
        <div class="weather__metric">
          <dt>Vent</dt>
          <dd>${Math.round(data.windSpeed)} km/h</dd>
        </div>
      </dl>
    </article>
  `;
}

function createForecastCards(forecastDays = [], selectedIndex = 0) {
  if (!forecastDays.length) return '';

  return `
    <section class="weather__forecast animate-fade-in" aria-label="Prévisions sur 5 jours">
      ${forecastDays
        .map((day, index) => {
          const isToday = index === 0;
          const isSelected = index === selectedIndex;
          const dayClasses = ['weather__forecast-day', 'card'];
          if (isToday) dayClasses.push('weather__forecast-day--today');
          if (isSelected) dayClasses.push('weather__forecast-day--selected');
          const dayName = formatDayLabel(day.date);
          const pressed = isSelected ? 'true' : 'false';
          return `
            <button
              type="button"
              class="${dayClasses.join(' ')}"
              data-weather-forecast-day="${index}"
              aria-pressed="${pressed}"
              aria-label="Voir la météo du ${escapeHtml(dayName)}"
            >
              <span class="weather__forecast-label">${escapeHtml(dayName)}</span>
              <span class="weather__forecast-icon" aria-hidden="true">${day.emoji}</span>
              <span class="weather__forecast-temp">
                <span>${Math.round(day.min)}°</span>
                <span>${Math.round(day.max)}°</span>
              </span>
            </button>
          `;
        })
        .join('')}
    </section>
  `;
}

function createWeatherContent(state) {
  if (state.status === 'loading') return createLoadingState();
  if (state.status === 'error') return createErrorState(state.errorMessage);
  if (!state.displayWeather) return createNoCityConfiguredState();

  return `
    ${createCurrentCard(state.displayWeather)}
    ${createForecastCards(state.forecast, state.selectedForecastIndex ?? 0)}
  `;
}

function createWeatherView(state) {
  const {
    showOnboarding = false,
    onboardingGeoStatus = 'idle',
    searchQuery = '',
    searchResults = [],
    ...rest
  } = state;

  if (showOnboarding) {
    return createWeatherOnboardingView({ searchQuery, searchResults, onboardingGeoStatus });
  }

  return `
    <section class="weather animate-fade-in">
      <div class="weather__header card animate-slide-up">
        <h1 class="weather__title">Météo</h1>
        <p class="weather__subtitle">Prévisions claires, sans surcharge visuelle.</p>
        <div class="weather__search">
          <label class="weather__search-label" for="weather-city-search">Ville</label>
          <input
            id="weather-city-search"
            class="weather__search-input"
            data-weather-search
            type="search"
            placeholder="Rechercher une ville..."
            value="${escapeHtml(searchQuery || '')}"
            autocomplete="off"
          />
          <div data-weather-results-container>
            ${createSearchResults(searchResults)}
          </div>
        </div>
      </div>

      <div class="weather__content" data-weather-content>
        ${createWeatherContent(rest)}
      </div>
    </section>
  `;
}

function createWeatherWidgetLine(widgetData) {
  if (!widgetData) return '<p class="weather-widget__line">Météo indisponible</p>';
  return `
    <p class="weather-widget__line">
      ${escapeHtml(widgetData.city)} · ${widgetData.emoji} ${Math.round(widgetData.temperature)}°C · ${escapeHtml(
        widgetData.description
      )}
    </p>
  `;
}

export { createWeatherView, createWeatherContent, createWeatherWidgetLine, createSearchResults };
