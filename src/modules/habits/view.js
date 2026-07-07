import { escapeHtml } from '../../core/format.js';
import { FREQUENCY_DISPLAY_LABELS } from './logic.js';
import { createManagePanel, createOnboardingView, createPetSettingsPanel } from './view-panels.js';

function createViewSwitcher(viewMode) {
  return `
    <div class="habits__seg" role="group" aria-label="Vue">
      <button type="button" class="habits__seg-btn" data-habits-view="day" aria-pressed="${viewMode === 'day'}">Aujourd'hui</button>
      <button type="button" class="habits__seg-btn" data-habits-view="regularity" aria-pressed="${viewMode === 'regularity'}">Régularité</button>
    </div>
  `;
}

function createTodayBanner({ doneCount = 0, totalCount = 0, gaugeText = '0/0', subtitle = '' }) {
  const offset = totalCount > 0 ? 126 * (1 - doneCount / totalCount) : 126;
  return `
    <div class="habits__banner" data-habits-banner>
      <div class="habits__banner-gauge" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="var(--bg-tertiary)" stroke-width="5"/>
          <circle
            class="habits__banner-arc"
            data-habits-gauge-arc
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="var(--accent)"
            stroke-width="5"
            stroke-linecap="round"
            stroke-dasharray="126"
            stroke-dashoffset="${offset}"
          />
        </svg>
        <span class="habits__banner-gauge-txt" data-habits-gauge-txt>${escapeHtml(gaugeText)}</span>
      </div>
      <div class="habits__banner-copy">
        <div class="habits__banner-title">Tes mouillages du jour</div>
        <div class="habits__banner-sub" data-habits-banner-sub>${escapeHtml(subtitle)}</div>
      </div>
    </div>
  `;
}

function createMooringCard(item, index) {
  const { habit, completed, returnsCount, frequencyLabel } = item;
  const doneClass = completed ? 'done' : '';
  const pressed = completed ? 'true' : 'false';

  return `
    <button
      type="button"
      class="habits__mooring ${doneClass}"
      data-mooring="${escapeHtml(habit.id)}"
      aria-pressed="${pressed}"
      style="--i:${index}"
    >
      <div class="habits__mooring-water" aria-hidden="true"></div>
      <span class="habits__mooring-ripple" aria-hidden="true"></span>
      <span class="habits__mooring-ripple habits__mooring-ripple--2" aria-hidden="true"></span>
      <div class="habits__mooring-row">
        <div class="habits__mooring-anchor" aria-hidden="true">
          <span class="habits__mooring-face habits__mooring-face--emoji">${escapeHtml(habit.emoji)}</span>
          <span class="habits__mooring-face habits__mooring-face--anchor">⚓</span>
        </div>
        <div class="habits__mooring-body">
          <div class="habits__mooring-name">${escapeHtml(habit.name)}</div>
          <div class="habits__mooring-meta">${escapeHtml(frequencyLabel)}</div>
        </div>
        <div class="habits__mooring-returns">
          <div class="habits__mooring-returns-n" data-returns-for="${escapeHtml(habit.id)}">${returnsCount}</div>
          <div class="habits__mooring-returns-l">retours / mois</div>
        </div>
      </div>
    </button>
  `;
}

function createTodayView(todayHabits) {
  if (!todayHabits.length) {
    return `
      <section class="habits__day-view" data-habits-day-view>
        <div class="habits__day-empty">
          <div class="habits__day-empty-t">Aucun mouillage aujourd\u2019hui.</div>
          <div class="habits__day-empty-s">Rien de prévu ce jour. Repose-toi, la mer attend.</div>
        </div>
      </section>
    `;
  }

  return `
    <section class="habits__day-view" data-habits-day-view>
      <div class="habits__moorings" data-habits-moorings>
        ${todayHabits.map((item, index) => createMooringCard(item, index)).join('')}
      </div>
    </section>
  `;
}

function createStar(star) {
  const classes = ['habits__star', `habits__star--${star.kind}`];
  if (star.isToday) classes.push('habits__star--today');
  const style = `--tw:${star.twinkle || '0s'};left:${star.x}%;top:${star.y}%`;
  return `<span class="${classes.join(' ')}" style="${style}" title="${escapeHtml(star.dateKey)}"></span>`;
}

function createRegularityCard(card, index) {
  const { habit, returnsCount, stars } = card;
  return `
    <article class="habits__reg-card" style="--i:${index}">
      <div class="habits__reg-head">
        <div class="habits__reg-emoji" aria-hidden="true">${escapeHtml(habit.emoji)}</div>
        <div class="habits__reg-name">${escapeHtml(habit.name)}</div>
        <div class="habits__reg-count">${returnsCount} retours</div>
      </div>
      <div class="habits__sky" aria-label="Constellation des 35 derniers jours">
        ${stars.map((star) => createStar(star)).join('')}
      </div>
    </article>
  `;
}

function createRegularityView(regularityCards) {
  const cardsMarkup = regularityCards.length
    ? `
      <div class="habits__regularity">
        ${regularityCards.map((card, index) => createRegularityCard(card, index)).join('')}
      </div>
      <div class="habits__reg-legend" aria-hidden="true">
        <span><i class="habits__legend-dot habits__legend-dot--done"></i>Revenu</span>
        <span><i class="habits__legend-dot habits__legend-dot--wait"></i>T\u2019attend</span>
        <span><i class="habits__legend-dot habits__legend-dot--off"></i>Non prévu</span>
      </div>
    `
    : `
      <div class="habits__day-empty">
        <div class="habits__day-empty-t">Aucun mouillage pour l\u2019instant.</div>
        <div class="habits__day-empty-s">Ajoute une habitude quand tu es prêt.</div>
      </div>
    `;

  return `
    <section class="habits__reg-view" data-habits-reg-view>
      <p class="habits__reg-intro">Chaque carte est un petit ciel : les jours où tu es revenu s\u2019illuminent. Les autres n\u2019attendent que toi — sans crier.</p>
      ${cardsMarkup}
    </section>
  `;
}

function createHabitsView({
  viewMode = 'day',
  todayHabits = [],
  regularityCards = [],
  banner = {},
  showOnboarding = false,
  onboardingPetKind = null,
  petSettingsOpen = false,
  petProfile = null,
  panelOpen = false,
  manageHabits = [],
  editHabit = null,
  bulkEditMode = false
}) {
  if (showOnboarding) {
    return createOnboardingView(onboardingPetKind);
  }

  return `
    <section class="habits animate-fade-in">
      <header class="habits__head">
        <h1 class="habits__head-title">Habitudes</h1>
        <span class="habits__head-spacer" aria-hidden="true"></span>
        ${createViewSwitcher(viewMode)}
      </header>

      <div class="habits__banner-wrap" ${viewMode !== 'day' ? 'hidden' : ''} data-habits-banner-wrap>
        ${createTodayBanner(banner)}
      </div>

      <div class="habits__views">
        <div ${viewMode !== 'day' ? 'hidden' : ''} data-habits-day-wrap>
          ${createTodayView(todayHabits)}
        </div>
        <div ${viewMode !== 'regularity' ? 'hidden' : ''} data-habits-reg-wrap>
          ${createRegularityView(regularityCards)}
        </div>
      </div>

      <div class="habits__actions">
        <button type="button" class="habits__add-btn" data-open-habits-panel>+ Nouveau mouillage</button>
        <button type="button" class="habits__pet-link" data-open-pet-settings>⚙️ Mon animal</button>
      </div>

      ${panelOpen ? createManagePanel(manageHabits, editHabit, bulkEditMode) : ''}
      ${petSettingsOpen ? createPetSettingsPanel(petProfile) : ''}
    </section>
  `;
}

function createDashboardPreview({ completionRate = 0, habits = [] }) {
  if (!habits.length) {
    return `<p class="habits-widget__empty">${completionRate}% aujourd'hui · aucune habitude prévue.</p>`;
  }

  return `
    <div class="habits-widget">
      <p class="habits-widget__rate">${completionRate}% aujourd'hui</p>
      <ul class="habits-widget__list">
        ${habits
          .map(
            (habit) => `
              <li class="habits-widget__item">
                <span aria-hidden="true">${escapeHtml(habit.emoji)}</span>
                <span>${escapeHtml(habit.name)}</span>
                <span>${habit.done ? '✓' : '•'}</span>
              </li>
            `
          )
          .join('')}
      </ul>
    </div>
  `;
}

export { createHabitsView, createDashboardPreview, FREQUENCY_DISPLAY_LABELS };
