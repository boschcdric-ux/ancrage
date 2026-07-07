import { escapeHtml } from '../../core/format.js';
import { describeSea, miniSky, waveShade, waterShade } from './scene.js';

const WEEKDAY_SHORT = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

function formatDateShortFr(dateString) {
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

function createSegmentButtons(items, selectedValue, kind) {
  return items
    .map((item) => {
      const pressed = selectedValue != null && selectedValue === item.value;
      return `
        <button
          type="button"
          class="mood__seg-btn"
          data-mood-select="${kind}"
          data-value="${item.value}"
          aria-pressed="${pressed}"
          aria-label="${escapeHtml(item.label)}"
        >
          ${item.emoji}<span class="mood__seg-cap">${escapeHtml(item.label)}</span>
        </button>
      `;
    })
    .join('');
}

function createPeriodButtons(periodOptions, selectedPeriod) {
  return periodOptions
    .map(
      (option) => `
        <button
          type="button"
          class="mood__periods-btn"
          data-mood-period="${option.id}"
          aria-pressed="${selectedPeriod === option.id}"
        >${escapeHtml(option.label)}</button>
      `
    )
    .join('');
}

function createGalleryDayCell(bucket, moodLevels, energyLevels) {
  if (bucket.empty) {
    return `
      <button type="button" class="mood__day mood__day--empty${bucket.today ? ' mood__day--today' : ''}" data-mood-day-empty>
        <span class="mood__day-dow" style="color:var(--text-muted);text-shadow:none">${escapeHtml(bucket.label)}</span>
      </button>
    `;
  }

  const sky = miniSky(bucket.m);
  const moodLevel = moodLevels.find((item) => item.value === bucket.m) || moodLevels[2];
  const energyLevel = energyLevels.find((item) => item.value === bucket.e) || energyLevels[2];

  return `
    <button
      type="button"
      class="mood__day${bucket.today ? ' mood__day--today' : ''}"
      data-mood-day
      data-mood="${bucket.m}"
      data-energy="${bucket.e}"
      data-note="${escapeHtml(bucket.note || '')}"
      data-date="${bucket.date || ''}"
      data-count="${bucket.count || 1}"
      style="--d-sky-top:${sky.sky[0]};--d-sky-bot:${sky.sky[1]};--d-water:${waterShade(bucket.m)};--d-amp:${2 + bucket.e * 2}px;--d-wave:${waveShade(bucket.e)}"
    >
      <span class="mood__day-dow">${escapeHtml(bucket.label)}</span>
      <div class="mood__day-scene"></div>
      <div class="mood__day-water"></div>
      <div class="mood__day-wave"></div>
      <div class="mood__day-tip">${moodLevel.emoji}${energyLevel.emoji}</div>
    </button>
  `;
}

function createGalleryHtml(buckets, period, moodLevels, energyLevels) {
  const cols = period === 'week' ? 7 : Math.min(12, Math.max(1, buckets.length));
  const title = period === 'week' ? 'La mer des jours' : 'La mer, en moyenne';

  return {
    title,
    gridCols: cols,
    cells: buckets.map((bucket) => createGalleryDayCell(bucket, moodLevels, energyLevels)).join('')
  };
}

function createDetailHtml(bucket, moodLevels, energyLevels) {
  const moodLevel = moodLevels.find((item) => item.value === bucket.m) || moodLevels[2];
  const energyLevel = energyLevels.find((item) => item.value === bucket.e) || energyLevels[2];
  const head = bucket.count > 1 ? `Moyenne sur ${bucket.count} jours` : describeSea(bucket.m, bucket.e);
  const dateLine =
    bucket.date && bucket.count === 1 ? `<div class="mood__detail-date">${escapeHtml(formatDateShortFr(bucket.date))}</div>` : '';

  return `
    ${dateLine || `<div class="mood__detail-date">${escapeHtml(head)}</div>`}
    <div class="mood__detail-meta">
      ${escapeHtml(describeSea(bucket.m, bucket.e))} — ${moodLevel.emoji} ${escapeHtml(moodLevel.label)} · ${energyLevel.emoji} ${escapeHtml(energyLevel.label)}
    </div>
    ${bucket.note ? `<div class="mood__detail-note">« ${escapeHtml(bucket.note)} »</div>` : ''}
  `;
}

function createMoodShell({ moodLevels, energyLevels, selectedMood, selectedEnergy, note, periodOptions, selectedPeriod }) {
  const moodLabel =
    selectedMood != null ? moodLevels.find((item) => item.value === selectedMood)?.label || '' : '—';
  const energyLabel =
    selectedEnergy != null ? energyLevels.find((item) => item.value === selectedEnergy)?.label || '' : '—';
  const canSubmit = selectedMood != null && selectedEnergy != null;

  return `
    <section class="mood animate-fade-in" aria-label="Module Humeur">
      <header class="mood__head">
        <h1 class="mood__head-title">Humeur</h1>
        <p class="mood__head-sub">Compose ta mer du jour. Aucune n'est meilleure qu'une autre.</p>
      </header>

      <div class="mood__stage" data-mood-stage>
        <span class="mood__stage-cap" data-mood-cap></span>
        <span class="mood__stage-sub" data-mood-sub></span>
        <div class="mood__stage-sun" aria-hidden="true"></div>
        <canvas data-mood-canvas></canvas>
        <span class="mood__stage-ack" data-mood-ack>Ta mer est consignée.</span>
      </div>

      <section class="mood__controls">
        <div class="mood__slider">
          <div class="mood__slider-head">
            <span class="mood__slider-name">Humeur — la lumière</span>
            <span class="mood__slider-val" data-mood-val-label>${escapeHtml(moodLabel)}</span>
          </div>
          <div class="mood__seg" data-mood-seg="mood" role="group" aria-label="Humeur">
            ${createSegmentButtons(moodLevels, selectedMood, 'mood')}
          </div>
        </div>

        <div class="mood__slider">
          <div class="mood__slider-head">
            <span class="mood__slider-name">Énergie — la houle</span>
            <span class="mood__slider-val" data-energy-val-label>${escapeHtml(energyLabel)}</span>
          </div>
          <div class="mood__seg" data-mood-seg="energy" role="group" aria-label="Énergie">
            ${createSegmentButtons(energyLevels, selectedEnergy, 'energy')}
          </div>
        </div>

        <div class="mood__note-field">
          <span class="mood__slider-name">Un mot sur ta journée (optionnel)</span>
          <textarea data-mood-note placeholder="Ce qui a coloré ta mer aujourd'hui…" rows="3">${escapeHtml(note || '')}</textarea>
        </div>

        <button type="button" class="mood__save-btn" data-mood-save ${canSubmit ? '' : 'disabled'}>Consigner ma mer</button>
      </section>

      <section class="mood__gallery" data-mood-gallery>
        <div class="mood__gallery-head">
          <h2 class="mood__gallery-title" data-mood-gallery-title>La mer des jours</h2>
          <div class="mood__periods" data-mood-periods role="group" aria-label="Période">
            ${createPeriodButtons(periodOptions, selectedPeriod)}
          </div>
        </div>
        <div class="mood__days" data-mood-days></div>
        <div class="mood__detail" data-mood-detail hidden></div>
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
          <p class="mood-widget__empty">Aucune entrée aujourd'hui. Fais ton check-in 💜</p>
        </div>
      `
    };
  }

  const shortNote = todayEntry.note ? String(todayEntry.note).slice(0, 80) : 'Sans note';
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

export {
  WEEKDAY_SHORT,
  createMoodShell,
  createGalleryHtml,
  createDetailHtml,
  createDashboardMoodWidget,
  formatDateShortFr
};
