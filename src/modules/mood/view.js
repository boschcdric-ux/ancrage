import { escapeHtml, truncate } from '../../core/format.js';

const WEEKDAY_SHORT = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

function formatDateFr(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short'
  }).format(date);
}

function valueColorClass(value) {
  const rounded = Math.round(Number(value));
  if (rounded <= 2) return 'mood-chart__point--value-low';
  if (rounded === 3) return 'mood-chart__point--value-mid';
  return 'mood-chart__point--value-high';
}

function buildChartPath(points) {
  const realPoints = points.filter((point) => point.hasData);
  if (!realPoints.length) return '';
  return realPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function buildAreaPath(points, baselineY) {
  const realPoints = points.filter((point) => point.hasData);
  if (!realPoints.length) return '';
  const linePath = realPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const last = realPoints[realPoints.length - 1];
  const first = realPoints[0];
  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

function createChartPoint(point, kind) {
  if (!point.hasData) return '';

  const value = kind === 'mood' ? point.mood : point.energy;
  const colorClass = valueColorClass(value);
  const kindClass = kind === 'mood' ? 'mood-chart__point--mood' : 'mood-chart__point--energy';

  return `
    <circle
      class="mood-chart__point ${kindClass} ${colorClass}"
      cx="${point.x}"
      cy="${point.y}"
      r="6"
      data-mood-point
      data-date="${point.date}"
      data-mood="${point.mood ?? '-'}"
      data-energy="${point.energy ?? '-'}"
      data-mood-emoji="${escapeHtml(point.moodEmoji || '')}"
      data-energy-emoji="${escapeHtml(point.energyEmoji || '')}"
      data-note="${escapeHtml(point.note || '')}"
      data-has-data="true"
      data-is-weekly="${point.isWeekly ? 'true' : 'false'}"
      tabindex="0"
    />
  `;
}

function createChartSvg(chartPoints, { isWeekly = false, periodLabel = '7 jours' } = {}) {
  const width = 720;
  const height = 300;
  const margin = { top: 22, right: 20, bottom: 56, left: 48 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const dayGap = plotWidth / Math.max(1, chartPoints.length - 1);
  const yForValue = (value) => margin.top + ((5 - value) / 4) * plotHeight;
  const baselineY = yForValue(1);

  const moodPoints = chartPoints.map((point, index) => ({
    ...point,
    x: margin.left + dayGap * index,
    y: yForValue(point.mood ?? 1),
    hasData: Boolean(point.hasData)
  }));

  const energyPoints = chartPoints.map((point, index) => ({
    ...point,
    x: margin.left + dayGap * index,
    y: yForValue(point.energy ?? 1),
    hasData: Boolean(point.hasData)
  }));

  const moodPath = buildChartPath(moodPoints);
  const energyPath = buildChartPath(energyPoints);
  const moodArea = buildAreaPath(moodPoints, baselineY);
  const energyArea = buildAreaPath(energyPoints, baselineY);

  const labelStep = chartPoints.length > 14 ? Math.ceil(chartPoints.length / 8) : 1;

  const yGuides = [1, 2, 3, 4, 5]
    .map((value) => {
      const y = yForValue(value);
      return `
        <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" class="mood-chart__grid" />
        <text x="${margin.left - 16}" y="${y + 4}" class="mood-chart__y-label">${value}</text>
      `;
    })
    .join('');

  const xLabels = chartPoints
    .map((point, index) => {
      if (!point.dayShort) return '';
      if (chartPoints.length > 14 && index % labelStep !== 0 && index !== chartPoints.length - 1) return '';
      const x = margin.left + dayGap * index;
      return `<text x="${x}" y="${height - 22}" text-anchor="middle" class="mood-chart__x-label">${escapeHtml(point.dayShort)}</text>`;
    })
    .join('');

  const moodCircles = moodPoints.map((point) => createChartPoint(point, 'mood')).join('');
  const energyCircles = energyPoints.map((point) => createChartPoint(point, 'energy')).join('');

  const ariaLabel = isWeekly
    ? `Évolution humeur et énergie par semaine sur ${periodLabel}`
    : `Évolution humeur et énergie sur ${periodLabel}`;

  return `
    <svg class="mood-chart__svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(ariaLabel)}">
      ${yGuides}
      <line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" class="mood-chart__axis" />
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" class="mood-chart__axis" />
      ${moodArea ? `<path d="${moodArea}" class="mood-chart__area mood-chart__area--mood" />` : ''}
      ${energyArea ? `<path d="${energyArea}" class="mood-chart__area mood-chart__area--energy" />` : ''}
      ${moodPath ? `<path d="${moodPath}" class="mood-chart__line mood-chart__line--mood" />` : ''}
      ${energyPath ? `<path d="${energyPath}" class="mood-chart__line mood-chart__line--energy" />` : ''}
      ${moodCircles}
      ${energyCircles}
      ${xLabels}
    </svg>
  `;
}

function createDashboardMiniChart(chartPoints) {
  const width = 280;
  const height = 72;
  const margin = { top: 10, right: 8, bottom: 10, left: 8 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const gap = plotWidth / Math.max(1, chartPoints.length - 1);
  const yForValue = (value) => margin.top + ((5 - value) / 4) * plotHeight;

  const moodPoints = chartPoints.map((point, index) => ({
    ...point,
    x: margin.left + gap * index,
    y: yForValue(point.mood ?? 1),
    hasData: Boolean(point.hasData)
  }));

  const moodPath = buildChartPath(moodPoints);
  const baselineY = yForValue(1);
  const moodArea = buildAreaPath(moodPoints, baselineY);

  const dots = moodPoints
    .filter((point) => point.hasData)
    .map((point) => {
      const colorClass = valueColorClass(point.mood);
      return `<circle class="mood-widget__dot ${colorClass}" cx="${point.x}" cy="${point.y}" r="3.5" />`;
    })
    .join('');

  return `
    <svg class="mood-widget__chart" viewBox="0 0 ${width} ${height}" role="img" aria-hidden="true">
      ${moodArea ? `<path d="${moodArea}" class="mood-widget__area" />` : ''}
      ${moodPath ? `<path d="${moodPath}" class="mood-widget__line" />` : ''}
      ${dots}
    </svg>
  `;
}

function createTodayState(todayEntry) {
  if (!todayEntry) {
    return `
      <section class="mood__today card animate-slide-up">
        <p class="mood__today-empty">Pas encore d’entrée aujourd’hui. Prends 20 secondes pour te situer 💜</p>
      </section>
    `;
  }

  return `
    <section class="mood__today card animate-slide-up">
      <div class="mood__today-content">
        <p class="mood__today-summary">
          Aujourd'hui : ${todayEntry.moodEmoji} ${escapeHtml(todayEntry.moodLabel)} · ${todayEntry.energyEmoji} ${escapeHtml(todayEntry.energyLabel)}
        </p>
        ${
          String(todayEntry.note || '').trim()
            ? `<p class="mood__today-note">Note : ${escapeHtml(todayEntry.note)}</p>`
            : ''
        }
      </div>
      <button type="button" class="btn btn-secondary" data-mood-edit-today>Modifier</button>
    </section>
  `;
}

function createScaleButtons(items, selectedValue, kind) {
  return `
    <div class="mood__scale-grid" role="radiogroup" aria-label="${kind === 'mood' ? 'Humeur' : 'Énergie'}">
      ${items
        .map((item) => {
          const selected = selectedValue != null && selectedValue === item.value;
          return `
            <button
              type="button"
              class="mood__scale-btn ${selected ? 'is-selected' : ''}"
              data-mood-select="${kind}"
              data-value="${item.value}"
              role="radio"
              aria-checked="${selected}"
            >
              <span class="mood__scale-emoji">${item.emoji}</span>
              <span class="mood__scale-label">${escapeHtml(item.label)}</span>
            </button>
          `;
        })
        .join('')}
    </div>
  `;
}

function createPeriodSelector(periodOptions, selectedPeriod) {
  return `
    <div class="mood__period-wrap">
      <div class="mood__period-filters" role="toolbar" aria-label="Période du graphique">
        ${periodOptions
          .map(
            (option) => `
              <button
                type="button"
                class="mood__period-chip ${selectedPeriod === option.id ? 'is-active' : ''}"
                data-mood-period="${option.id}"
              >${escapeHtml(option.label)}</button>
            `
          )
          .join('')}
      </div>
    </div>
  `;
}

function createHistory(entries, { hasMore = false } = {}) {
  if (!entries.length) {
    return '<p class="mood-history__empty">Aucune entrée pour cette période.</p>';
  }

  return `
    <ul class="mood-history__list" data-mood-history-list data-has-more="${hasMore ? 'true' : 'false'}">
      ${entries
        .map(
          (entry) => `
            <li class="mood-history__item card">
              <div class="mood-history__meta">
                <span class="mood-history__date">${formatDateFr(entry.date)}</span>
                <span class="mood-history__emojis">${entry.moodEmoji} · ${entry.energyEmoji}</span>
              </div>
              <p class="mood-history__note">${escapeHtml(truncate(entry.note || 'Sans note', 60))}</p>
            </li>
          `
        )
        .join('')}
    </ul>
  `;
}

function createMoodView({
  todayEntry,
  moodLevels,
  energyLevels,
  selectedMood,
  selectedEnergy,
  note,
  chartDays,
  history,
  historyTotal = 0,
  periodOptions,
  selectedPeriod,
  chartIsWeekly = false
}) {
  const selectedMoodLabel =
    selectedMood != null
      ? moodLevels.find((item) => item.value === selectedMood)?.label || 'Choisir une humeur'
      : 'Choisir une humeur';
  const selectedEnergyLabel =
    selectedEnergy != null
      ? energyLevels.find((item) => item.value === selectedEnergy)?.label || 'Choisir une énergie'
      : 'Choisir une énergie';
  const canSubmit = selectedMood != null && selectedEnergy != null;
  const periodLabel = periodOptions.find((option) => option.id === selectedPeriod)?.label || '7 jours';
  const hasMoreHistory = historyTotal > history.length;

  return `
    <section class="mood animate-fade-in">
      <header class="mood__header">
        <h1 class="mood__title">Humeur / Énergie</h1>
        <p class="mood__subtitle">Check-in rapide pour te situer sans surcharge.</p>
      </header>

      ${createTodayState(todayEntry)}

      <section class="mood__form card animate-slide-up">
        <h2 class="mood__section-title">Saisie quotidienne</h2>
        <form data-mood-form>
          <div class="mood__field">
            <p class="mood__field-title">Humeur <span class="mood__current-value">${escapeHtml(selectedMoodLabel)}</span></p>
            ${createScaleButtons(moodLevels, selectedMood, 'mood')}
          </div>

          <div class="mood__field">
            <p class="mood__field-title">Énergie <span class="mood__current-value">${escapeHtml(selectedEnergyLabel)}</span></p>
            ${createScaleButtons(energyLevels, selectedEnergy, 'energy')}
          </div>

          <div class="mood__field">
            <label for="mood-note" class="mood__field-title">Note optionnelle</label>
            <textarea
              id="mood-note"
              data-mood-note
              rows="3"
              maxlength="300"
              placeholder="Comment tu te sens ? Qu'est-ce qui influence ta journée ?"
            >${escapeHtml(note || '')}</textarea>
          </div>

          <button type="submit" class="btn btn-primary mood__submit" ${canSubmit ? '' : 'disabled'}>Enregistrer</button>
        </form>
      </section>

      <section class="mood__chart card animate-slide-up">
        <div class="mood__chart-head">
          <h2 class="mood__section-title">Évolution · ${escapeHtml(periodLabel)}</h2>
          <p class="mood__hint">Survole ou clique un point pour les détails.</p>
        </div>
        ${createPeriodSelector(periodOptions, selectedPeriod)}
        ${createChartSvg(chartDays, { isWeekly: chartIsWeekly, periodLabel })}
        <div class="mood__chart-tooltip" data-mood-tooltip>
          Sélectionne un point pour voir la date, les valeurs et la note.
        </div>
        <div class="mood__legend">
          <span><i class="mood__dot mood__dot--mood"></i>Humeur</span>
          <span><i class="mood__dot mood__dot--energy"></i>Énergie</span>
        </div>
      </section>

      <section class="mood__history card animate-slide-up" data-mood-history>
        <h2 class="mood__section-title" data-mood-history-title>Historique · ${escapeHtml(periodLabel)}</h2>
        <div data-mood-history-body>
          ${createHistory(history, { hasMore: hasMoreHistory })}
        </div>
      </section>
    </section>
  `;
}

function trendLabel(trend) {
  if (trend === 'up') return { icon: '↑', text: 'en hausse' };
  if (trend === 'down') return { icon: '↓', text: 'en baisse' };
  return { icon: '→', text: 'stable' };
}

function createDashboardMoodWidget({ todayEntry, chartDays = [], moodTrend = 'stable', dominantMoodEmoji = null }) {
  if (!todayEntry) {
    return {
      title: 'Humeur du jour',
      content: `
        <div class="mood-widget">
          ${createDashboardMiniChart(chartDays)}
          <p class="mood-widget__empty">Aucune entrée aujourd’hui. Fais ton check-in 💜</p>
        </div>
      `
    };
  }

  const shortNote = truncate(todayEntry.note || 'Sans note', 80);
  const trend = trendLabel(moodTrend);
  const dominantLine = dominantMoodEmoji
    ? `<p class="mood-widget__dominant">Emoji dominant : ${dominantMoodEmoji}</p>`
    : '<p class="mood-widget__dominant mood-widget__dominant--empty">Pas assez de données cette semaine</p>';

  return {
    title: 'Humeur du jour',
    content: `
      <div class="mood-widget">
        <div class="mood-widget__content">
          <p class="mood-widget__main">${todayEntry.moodEmoji} ${escapeHtml(todayEntry.moodLabel)} · ${todayEntry.energyEmoji} ${escapeHtml(todayEntry.energyLabel)}</p>
          <p class="mood-widget__note">${escapeHtml(shortNote)}</p>
        </div>
        ${createDashboardMiniChart(chartDays)}
        <div class="mood-widget__insights">
          <p class="mood-widget__trend"><span class="mood-widget__trend-icon" aria-hidden="true">${trend.icon}</span> Tendance humeur : ${trend.text}</p>
          ${dominantLine}
        </div>
      </div>
    `
  };
}

export { WEEKDAY_SHORT, createMoodView, createDashboardMoodWidget, createHistory, formatDateFr };
