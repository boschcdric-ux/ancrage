import { escapeHtml } from '../../core/format.js';

function completionMessage(rate) {
  if (rate <= 0) return "Bonne journée, c'est parti ! 🌅";
  if (rate < 50) return 'Tu es lancé, continue ! ⚡';
  if (rate < 100) return 'Presque là, encore un effort ! 🔥';
  return 'Journée parfaite ! Bravo 🎉';
}

function createWeeklyProgress(dayStatuses = []) {
  const labels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  return `
    <div class="habits__week-progress" aria-label="Progression hebdomadaire">
      ${dayStatuses
        .map((dayStatus, index) => {
          const doneClass = dayStatus?.done ? 'is-done' : '';
          const scheduledClass = dayStatus?.scheduled ? '' : 'is-unscheduled';
          return `<span class="habits__week-cell ${doneClass} ${scheduledClass}" title="${labels[index]}"></span>`;
        })
        .join('')}
    </div>
  `;
}

function createHabitItem(habit, completion, streakLabel, frequencyShortLabel, isScheduledToday) {
  const checked = completion ? 'checked' : '';
  const doneClass = completion ? 'is-completed animate-bounce-in' : '';
  const outsideTodayClass = isScheduledToday ? '' : 'is-outside-today';
  const disabled = isScheduledToday ? '' : 'disabled';
  const weekly = createWeeklyProgress(streakLabel.weekStatuses);

  return `
    <li class="habits__item card ${doneClass} ${outsideTodayClass}">
      <label class="habits__check-label">
        <input
          class="habits__checkbox"
          type="checkbox"
          data-habit-toggle="${habit.id}"
          ${checked}
          ${disabled}
        />
        <span class="habits__checkbox-ui" aria-hidden="true"></span>
      </label>

      <div class="habits__content">
        <p class="habits__name-row">
          <span class="habits__emoji" aria-hidden="true">${escapeHtml(habit.emoji)}</span>
          <span class="habits__name">${escapeHtml(habit.name)}</span>
          <span class="habits__frequency-badge">${escapeHtml(frequencyShortLabel)}</span>
        </p>
        <p class="habits__streak">${escapeHtml(streakLabel.text)}</p>
        ${isScheduledToday ? '' : '<p class="habits__hint">Pas prévue aujourd\'hui</p>'}
        ${weekly}
      </div>
    </li>
  `;
}

function createHabitsList(items, emptyLabel) {
  if (!items.length) {
    return `<p class="habits__empty">${escapeHtml(emptyLabel)}</p>`;
  }

  return `
    <ul class="habits__list">
      ${items
        .map((item) =>
          createHabitItem(
            item.habit,
            item.completed,
            item.streak,
            item.frequencyShortLabel,
            item.isScheduledToday
          )
        )
        .join('')}
    </ul>
  `;
}

function createGroupedHabits(groupedItems) {
  const groups = [
    { key: 'daily', title: 'Quotidiennes', empty: 'Aucune habitude quotidienne.' },
    { key: 'every2days', title: 'Tous les 2 jours', empty: 'Aucune habitude sur ce rythme.' },
    { key: 'weekdays', title: 'Semaine (L-V)', empty: 'Aucune habitude semaine.' },
    { key: 'weekend', title: 'Weekend (S-D)', empty: 'Aucune habitude weekend.' }
  ];

  return groups
    .map((group) => {
      const items = Array.isArray(groupedItems?.[group.key]) ? groupedItems[group.key] : [];
      return `
        <section class="habits__group">
          <h2 class="habits__group-title">${group.title}</h2>
          ${createHabitsList(items, group.empty)}
        </section>
      `;
    })
    .join('');
}

function createHabitManagerItem(habit, index, total) {
  const canMoveUp = index > 0;
  const canMoveDown = index < total - 1;

  return `
    <li class="habits__manage-item card">
      <div class="habits__manage-main">
        <p class="habits__manage-title">
          <span aria-hidden="true">${escapeHtml(habit.emoji)}</span>
          <span>${escapeHtml(habit.name)}</span>
        </p>
        <p class="habits__manage-meta">${escapeHtml(habit.frequencyLabel)}</p>
      </div>
      <div class="habits__manage-actions">
        <button type="button" class="btn btn-secondary habits__icon-btn" data-habit-move-up="${habit.id}" ${canMoveUp ? '' : 'disabled'}>↑</button>
        <button type="button" class="btn btn-secondary habits__icon-btn" data-habit-move-down="${habit.id}" ${canMoveDown ? '' : 'disabled'}>↓</button>
        <button type="button" class="btn btn-secondary habits__icon-btn" data-habit-edit="${habit.id}">✎</button>
        <button type="button" class="btn btn-secondary habits__icon-btn habits__icon-btn--danger" data-habit-delete="${habit.id}">✕</button>
      </div>
    </li>
  `;
}

function createBulkEditRow(habit) {
  return `
    <li class="habits__bulk-item card">
      <input type="hidden" data-bulk-habit-id value="${escapeHtml(habit.id)}" />
      <div class="habits__bulk-row">
        <input data-bulk-habit-emoji type="text" maxlength="3" value="${escapeHtml(habit.emoji)}" />
        <input data-bulk-habit-name type="text" maxlength="120" value="${escapeHtml(habit.name)}" required />
        <select data-bulk-habit-frequency>
          <option value="daily" ${habit.frequency === 'daily' ? 'selected' : ''}>Quotidien</option>
          <option value="every2days" ${habit.frequency === 'every2days' ? 'selected' : ''}>Tous les 2 jours</option>
          <option value="weekdays" ${habit.frequency === 'weekdays' ? 'selected' : ''}>Jours de semaine</option>
          <option value="weekend" ${habit.frequency === 'weekend' ? 'selected' : ''}>Weekend</option>
        </select>
      </div>
    </li>
  `;
}

function createManagePanel(habits, editHabit, bulkEditMode = false) {
  const formTitle = editHabit ? "Modifier l'habitude" : 'Ajouter une habitude';
  const submitLabel = editHabit ? 'Enregistrer' : 'Ajouter';

  return `
    <aside class="habits__panel card animate-slide-up" data-habits-panel>
      <header class="habits__panel-header">
        <h2 class="habits__panel-title">Gérer mes habitudes</h2>
        <div class="habits__panel-header-actions">
          <button type="button" class="btn btn-secondary" data-habits-bulk-edit-toggle>
            ${bulkEditMode ? 'Finir la modification' : 'Modifier toutes les habitudes'}
          </button>
          <button type="button" class="btn btn-secondary habits__panel-close" data-habits-panel-close>Fermer</button>
        </div>
      </header>

      <form class="habits__panel-form" data-habit-form>
        <input type="hidden" data-habit-id value="${editHabit ? escapeHtml(editHabit.id) : ''}" />
        <h3 class="habits__panel-subtitle">${formTitle}</h3>

        <div class="habits__field-row">
          <div class="habits__field">
            <label for="habit-emoji-input">Emoji</label>
            <input id="habit-emoji-input" data-habit-emoji type="text" maxlength="3" placeholder="✨" value="${editHabit ? escapeHtml(editHabit.emoji) : ''}" />
          </div>
          <div class="habits__field habits__field--wide">
            <label for="habit-name-input">Nom</label>
            <input id="habit-name-input" data-habit-name type="text" maxlength="120" placeholder="Ex: 10 min de marche" value="${editHabit ? escapeHtml(editHabit.name) : ''}" required />
          </div>
        </div>

        <div class="habits__field">
          <label for="habit-frequency-input">Fréquence</label>
          <select id="habit-frequency-input" data-habit-frequency>
            <option value="daily" ${editHabit?.frequency === 'daily' ? 'selected' : ''}>Quotidien</option>
            <option value="every2days" ${editHabit?.frequency === 'every2days' ? 'selected' : ''}>Tous les 2 jours</option>
            <option value="weekdays" ${editHabit?.frequency === 'weekdays' ? 'selected' : ''}>Jours de semaine</option>
            <option value="weekend" ${editHabit?.frequency === 'weekend' ? 'selected' : ''}>Weekend</option>
          </select>
        </div>

        <button type="submit" class="btn btn-primary">${submitLabel}</button>
      </form>

      <div class="habits__manage-list-wrap">
        <h3 class="habits__panel-subtitle">Mes habitudes</h3>
        ${
          bulkEditMode
            ? `
              <form class="habits__bulk-form" data-habits-bulk-form>
                <ul class="habits__bulk-list">
                  ${habits.map((habit) => createBulkEditRow(habit)).join('')}
                </ul>
                <button type="submit" class="btn btn-primary">Enregistrer toutes les habitudes</button>
              </form>
            `
            : `
              <ul class="habits__manage-list">
                ${habits.map((habit, index) => createHabitManagerItem(habit, index, habits.length)).join('')}
              </ul>
            `
        }
      </div>
    </aside>
  `;
}

function createHistoryCalendar(days) {
  return `
    <div class="habits__calendar-grid">
      ${days
        .map((day) => {
          if (!day.date) return '<span class="habits__calendar-empty"></span>';
          return `
            <button
              type="button"
              class="habits__calendar-day ${day.toneClass}"
              data-history-day="${day.date}"
              title="${escapeHtml(day.label)}"
            >
              <span>${day.dayNumber}</span>
            </button>
          `;
        })
        .join('')}
    </div>
  `;
}

function createHistoryDetails(details) {
  if (!details) {
    return '<p class="habits__history-empty">Clique un jour pour voir les habitudes complétées.</p>';
  }
  if (!details.items.length) {
    return `<p class="habits__history-empty">Le ${escapeHtml(details.label)}, aucune habitude cochée. C'est ok, on continue.</p>`;
  }
  return `
    <div class="habits__history-details">
      <p class="habits__history-date">${escapeHtml(details.label)}</p>
      <ul class="habits__history-list">
        ${details.items
          .map(
            (item) =>
              `<li class="habits__history-item"><span aria-hidden="true">${escapeHtml(item.emoji)}</span> <span>${escapeHtml(item.name)}</span></li>`
          )
          .join('')}
      </ul>
    </div>
  `;
}

function createOnboardingView(onboardingPetKind) {
  const kind = onboardingPetKind || '';
  const showName = kind && kind !== 'none';
  const pickClass = (value) =>
    `btn ${kind === value ? 'btn-primary' : 'btn-secondary'} habits__onboarding-pick`;

  return `
    <section class="habits habits--onboarding animate-fade-in">
      <article class="habits__onboarding card animate-slide-up">
        <h1 class="habits__onboarding-title">Habitudes 🌱</h1>
        <p class="habits__onboarding-lead">Des routines douces, sans punition. Les streaks ne se cassent pas.</p>
        <p class="habits__onboarding-question">Tu as un animal de compagnie ?</p>
        <div class="habits__onboarding-picks">
          <button type="button" class="${pickClass('dog')}" data-onboarding-pick="dog">🐕 Chien</button>
          <button type="button" class="${pickClass('cat')}" data-onboarding-pick="cat">🐱 Chat</button>
          <button type="button" class="${pickClass('other')}" data-onboarding-pick="other">🐾 Autre</button>
          <button type="button" class="${pickClass('none')}" data-onboarding-pick="none">Pas d'animal</button>
        </div>
        <div class="habits__onboarding-name ${showName ? '' : 'habits__onboarding-name--hidden'}">
          <label for="onboarding-pet-name">Son nom ?</label>
          <input
            id="onboarding-pet-name"
            type="text"
            maxlength="40"
            data-onboarding-pet-name
            placeholder="Rex, Luna…"
            autocomplete="nickname"
          />
        </div>
        <div class="habits__onboarding-actions">
          <button type="button" class="btn btn-primary habits__onboarding-start" data-onboarding-start>Commencer 🌱</button>
          <button type="button" class="habits__onboarding-skip" data-onboarding-skip>Passer →</button>
        </div>
      </article>
    </section>
  `;
}

function createPetSettingsPanel(petProfile) {
  const kind = petProfile?.kind || 'none';
  const name = petProfile?.name || '';

  return `
    <aside class="habits__panel habits__panel--pet card animate-slide-up" data-pet-settings-panel>
      <header class="habits__panel-header">
        <h2 class="habits__panel-title">Mon animal</h2>
        <button type="button" class="btn btn-secondary habits__panel-close" data-pet-settings-close>Fermer</button>
      </header>
      <form class="habits__panel-form" data-pet-settings-form>
        <div class="habits__field">
          <label for="pet-settings-kind">Type</label>
          <select id="pet-settings-kind" data-pet-settings-kind>
            <option value="none" ${kind === 'none' ? 'selected' : ''}>Pas d'animal</option>
            <option value="dog" ${kind === 'dog' ? 'selected' : ''}>🐕 Chien</option>
            <option value="cat" ${kind === 'cat' ? 'selected' : ''}>🐱 Chat</option>
            <option value="other" ${kind === 'other' ? 'selected' : ''}>🐾 Autre</option>
          </select>
        </div>
        <div class="habits__field">
          <label for="pet-settings-name">Son nom (optionnel)</label>
          <input
            id="pet-settings-name"
            type="text"
            maxlength="40"
            data-pet-settings-name
            placeholder="Rex, Luna…"
            value="${escapeHtml(name)}"
            autocomplete="nickname"
          />
        </div>
        <button type="submit" class="btn btn-primary">Enregistrer</button>
      </form>
    </aside>
  `;
}

function createHabitsView({
  completionRate = 0,
  groupedItems = { daily: [], every2days: [], weekdays: [], weekend: [] },
  showOnboarding = false,
  onboardingPetKind = null,
  petSettingsOpen = false,
  petProfile = null,
  panelOpen = false,
  manageHabits = [],
  editHabit = null,
  bulkEditMode = false,
  historyDays = [],
  historyDetails = null
}) {
  if (showOnboarding) {
    return createOnboardingView(onboardingPetKind);
  }

  return `
    <section class="habits animate-fade-in">
      <div class="habits__layout">
        <article class="habits__main card animate-slide-up">
          <header class="habits__header">
            <h1 class="habits__title">Habitudes</h1>
            <p class="habits__message">${completionMessage(completionRate)}</p>
            <p class="habits__rate">${completionRate}% aujourd'hui</p>
          </header>
          <div class="habits__today-list" data-habits-list>
            ${createGroupedHabits(groupedItems)}
          </div>
          <div class="habits__footer">
            <button type="button" class="btn btn-secondary" data-open-habits-panel>Gérer mes habitudes</button>
            <button type="button" class="habits__pet-link" data-open-pet-settings>⚙️ Mon animal</button>
          </div>
        </article>

        <article class="habits__history card animate-slide-up">
          <h2 class="habits__history-title">Historique du mois</h2>
          ${createHistoryCalendar(historyDays)}
          <div class="habits__history-content" data-habits-history-detail>
            ${createHistoryDetails(historyDetails)}
          </div>
        </article>
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

export { createHabitsView, createDashboardPreview };
