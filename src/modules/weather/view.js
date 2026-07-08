import { escapeHtml } from '../../core/format.js';

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

function createSearchResults(results = [], scope = 'default') {
  if (!results.length) return '';
  return `<ul class="weather__results card" data-weather-results role="listbox" aria-label="Résultats de villes">${results
    .map((item, idx) => {
      const label = `${item.name}${item.admin1 ? `, ${item.admin1}` : ''}, ${item.country}`;
      return `<li><button type="button" class="weather__result-btn" data-weather-result="${item.id}" data-weather-scope="${scope}" role="option" aria-selected="${idx === 0 ? 'true' : 'false'}">${escapeHtml(label)}</button></li>`;
    })
    .join('')}</ul>`;
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
                data-weather-search-scope="default"
                type="search"
                placeholder="Paris, Lyon…"
                value="${escapeHtml(searchQuery || '')}"
                autocomplete="off"
              />
              <div data-weather-results-container>
                ${createSearchResults(searchResults, 'default')}
              </div>
            </div>
          </div>
        </div>
        <button type="button" class="weather__onboarding-skip" data-weather-onboarding-skip>Passer →</button>
      </article>
    </section>
  `;
}

function createThermalTideChart(tide) {
  const points = tide?.points || [];
  if (!points.length) return '';
  const width = 400;
  const height = 120;
  const pad = 10;
  const minTemp = Math.min(...points.map((p) => p.temperature));
  const maxTemp = Math.max(...points.map((p) => p.temperature));
  const spread = Math.max(1, maxTemp - minTemp);
  const xPos = (idx) => pad + (idx / (points.length - 1 || 1)) * (width - 2 * pad);
  const yPos = (temp) => height - pad - ((temp - minTemp) / spread) * (height - 2 * pad - 14);
  let linePath = `M ${xPos(0)} ${yPos(points[0].temperature)}`;
  for (let idx = 1; idx < points.length; idx += 1) {
    const x0 = xPos(idx - 1);
    const y0 = yPos(points[idx - 1].temperature);
    const x1 = xPos(idx);
    const y1 = yPos(points[idx].temperature);
    const mid = (x0 + x1) / 2;
    linePath += ` Q ${x0} ${y0} ${mid} ${(y0 + y1) / 2} T ${x1} ${y1}`;
  }
  const areaPath = `${linePath} L ${xPos(points.length - 1)} ${height} L ${xPos(0)} ${height} Z`;
  const marker = points.find((p) => p.hour === tide.nowHour) || points[Math.min(points.length - 1, tide.nowHour)];
  const markerIndex = Math.max(0, points.indexOf(marker));
  const markerX = xPos(markerIndex);
  const markerY = yPos(marker.temperature);
  const gradient = points.filter((_, idx) => idx % 3 === 0).map((point, idx, list) => `<stop offset="${Math.round((idx / Math.max(1, list.length - 1)) * 100)}%" stop-color="${point.color}" />`).join('');
  return `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Courbe des températures sur 24 heures">
      <defs>
        <linearGradient id="weather-tide-stroke" x1="0" y1="0" x2="1" y2="0">${gradient}</linearGradient>
        <linearGradient id="weather-tide-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.22" />
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#weather-tide-fill)" />
      <path d="${linePath}" fill="none" stroke="url(#weather-tide-stroke)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <line x1="${markerX}" y1="${pad}" x2="${markerX}" y2="${height - pad}" stroke="var(--text-muted)" stroke-width="1" stroke-dasharray="3 3" opacity="0.5" />
      <circle cx="${markerX}" cy="${markerY}" r="5" fill="var(--accent) " stroke="var(--bg-secondary)" stroke-width="2" />
      <text x="${markerX}" y="${markerY - 10}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-primary)">${Math.round(marker.temperature)}°</text>
    </svg>
  `;
}

function createWeatherContent(snapshot) {
  if (!snapshot) return '<div class="weather__state card"><p>Choisis une ville pour afficher la météo.</p></div>';
  const activeHere = snapshot.activeLocation === 'here';
  return `
    <section class="weather__content-grid" data-weather-content>
      <div class="place">
        <div class="place__main">
          <div class="place__row">
            <h2 class="place__name">${escapeHtml(snapshot.cityName || snapshot.cityLabel)}</h2>
            <span class="place__sky" aria-hidden="true">${snapshot.emoji}</span>
          </div>
          <p class="place__desc">${escapeHtml(snapshot.locationDescription)}</p>
        </div>
        <div class="place__switch">
          <button type="button" class="place__btn" data-weather-location="here" aria-pressed="${activeHere ? 'true' : 'false'}">📍 Ici</button>
          <button type="button" class="place__btn" data-weather-location="elsewhere" aria-pressed="${activeHere ? 'false' : 'true'}">Ailleurs</button>
        </div>
      </div>
      <div class="elsewhere ${activeHere ? '' : 'show'}">
        <input type="search" class="weather__search-input" data-weather-search data-weather-search-scope="elsewhere" value="${escapeHtml(snapshot.elsewhereQuery || '')}" placeholder="Une ville pour ta rando..." autocomplete="off" />
        <button type="button" data-weather-elsewhere-reset>Fermer</button>
        <div class="elsewhere__results" data-weather-results-container>${createSearchResults(snapshot.elsewhereResults, 'elsewhere')}</div>
      </div>
      <div class="now">
        <article class="conditions">
          <div class="conditions__temps">
            <div class="temp-block"><p class="temp-block__label">Réelle</p><p class="temp-block__val">${Math.round(snapshot.currentTemp)}<small>°C</small></p></div>
            <div class="temp-block"><p class="temp-block__label">Ressentie</p><p class="temp-block__val">${Math.round(snapshot.apparentTemp)}<small>°C</small></p></div>
          </div>
          <div class="conditions__grid">
            <div class="stat"><span class="stat__icon">☀️</span><div class="stat__body"><p class="stat__label">Soleil</p><p class="stat__val">↑${escapeHtml(snapshot.sunrise)} <small>↓${escapeHtml(snapshot.sunset)}</small></p></div></div>
            <div class="stat"><span class="stat__icon">🌙</span><div class="stat__body"><p class="stat__label">Lune · ${escapeHtml(snapshot.moon.phaseLabel)}</p><p class="stat__val">${Math.round(snapshot.moon.illumination)} <small>% éclairée</small></p></div></div>
            <div class="stat"><span class="stat__icon">💨</span><div class="stat__body"><p class="stat__label">Vent</p><p class="stat__val">${Math.round(snapshot.windSpeed)} <small>km/h</small></p></div></div>
            <div class="stat"><span class="stat__icon">💧</span><div class="stat__body"><p class="stat__label">Humidité</p><p class="stat__val">${Math.round(snapshot.humidity)} <small>%</small></p></div></div>
          </div>
          <div class="stargaze"><span class="stargaze__icon">🔭</span><p class="stargaze__text"><b>${escapeHtml(snapshot.stargazing.title)}</b> — ${escapeHtml(snapshot.stargazing.detail)}</p></div>
        </article>
        <aside class="thermo" role="img" aria-label="Jauge thermique du jour">
          <p class="thermo__minmax">${Math.round(snapshot.thermo.max)}°</p>
          <div class="thermo__scale"><span class="thermo__marker" style="bottom:${snapshot.thermo.level.toFixed(0)}%; --marker-color:${snapshot.thermo.currentColor};"></span></div>
          <p class="thermo__minmax">${Math.round(snapshot.thermo.min)}°</p>
          <p class="thermo__caption">${snapshot.currentTemp >= snapshot.thermo.max - 2 ? 'chaud' : 'modéré'}</p>
        </aside>
      </div>
      <div class="advice"><span class="advice__icon">${snapshot.advice.icon}</span><p class="advice__text">${escapeHtml(snapshot.advice.text)}</p></div>
      <section class="tide card">
        <div class="tide__head"><p class="tide__title">La marée thermique du jour</p><p class="tide__now">Maintenant · ${escapeHtml(snapshot.tide.nowLabel)}</p></div>
        <div class="tide__chart">${createThermalTideChart(snapshot.tide)}</div>
        <div class="tide__hours"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span></div>
      </section>
      <section class="days card">${snapshot.forecast
        .map(
          (day) => `<article class="day"><span class="day__name">${escapeHtml(day.label)}</span><span class="day__icon">${day.emoji}</span><span class="day__bar"><span class="day__bar-fill" style="left:${day.barStart.toFixed(1)}%; right:${(100 - day.barEnd).toFixed(1)}%;"></span></span><span class="day__temps"><span class="day__max">${Math.round(day.max)}°</span><span class="day__min">${Math.round(day.min)}°</span></span></article>`
        )
        .join('')}</section>
    </section>
  `;
}

function createLoadingState() {
  return '<div class="weather__state card"><span class="weather__spinner" aria-hidden="true"></span><p>Chargement de la météo...</p></div>';
}

function createErrorState(message) {
  return `<div class="weather__state weather__state--error card"><p>${escapeHtml(message || 'Impossible de récupérer la météo pour le moment.')}</p><button type="button" class="btn btn-secondary" data-weather-retry>Réessayer</button></div>`;
}

function createMainView(state) {
  if (state.status === 'loading') return createLoadingState();
  if (state.status === 'error') return createErrorState(state.errorMessage);
  return `
    <section class="weather animate-fade-in">
      <div data-weather-content>${createWeatherContent(state.snapshot)}</div>
    </section>
  `;
}

function createWeatherView(state) {
  if (state.showOnboarding) return createWeatherOnboardingView(state);
  return createMainView(state);
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

export { createWeatherView, createWeatherWidgetLine, createSearchResults };
