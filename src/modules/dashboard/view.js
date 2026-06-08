import { escapeHtml, formatInputTime, truncate } from '../../core/format.js';

function formatCurrentDate(date = new Date()) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function createTaDaWidget(tadaData) {
  const { entries, total } = tadaData;
  const hasItems = total > 0;
  const displayUpTo = 5;
  const shown = entries.slice(0, displayUpTo);
  const overflowFull = Math.max(0, total - displayUpTo);
  const overflowCompact = Math.max(0, total - 3);

  const listHtml = shown
    .map(
      (item) => `
    <li class="dashboard__tada-item">
      <span class="dashboard__tada-check" aria-hidden="true">✓</span>
      <span class="dashboard__tada-item-text">${escapeHtml(truncate(item.label, 80))}</span>
    </li>`
    )
    .join('');

  const overflowFullHtml =
    overflowFull > 0
      ? `<p class="dashboard__tada-overflow dashboard__tada-overflow--full dashboard__muted">${escapeHtml(
          overflowFull === 1 ? '+ 1 autre chose accomplie' : `+ ${overflowFull} autres choses accomplies`
        )}</p>`
      : '';

  const overflowCompactHtml =
    overflowCompact > 0
      ? `<p class="dashboard__tada-overflow dashboard__tada-overflow--compact dashboard__muted">${escapeHtml(
          overflowCompact === 1 ? '+ 1 autre chose accomplie' : `+ ${overflowCompact} autres choses accomplies`
        )}</p>`
      : '';

  const summaryFull =
    total === 1
      ? '✨ Aujourd’hui tu as accompli 1 chose'
      : `✨ Aujourd’hui tu as accompli ${total} choses`;

  const summaryCompact = total === 1 ? '✨ 1 chose accomplie' : `✨ ${total} choses accomplies`;

  return `
    <article class="card dashboard__card dashboard__card--tada animate-slide-up" aria-live="polite">
      <header class="dashboard__card-head">
        <h2 class="dashboard__card-title dashboard__tada-title">Ta-Da ! 🎉</h2>
      </header>
      ${
        hasItems
          ? `<p class="dashboard__tada-summary dashboard__tada-summary--full">${escapeHtml(summaryFull)}</p>
      <p class="dashboard__tada-summary dashboard__tada-summary--compact">${escapeHtml(summaryCompact)}</p>
      <ul class="dashboard__tada-list" role="list">
        ${listHtml}
      </ul>
      ${overflowFullHtml}
      ${overflowCompactHtml}`
          : `<p class="dashboard__tada-empty dashboard__muted">La journée commence — la liste se remplira !</p>`
      }
    </article>
  `;
}

function createTasksWidget(tasksData) {
  const { nextTasks, completed, total } = tasksData;
  const ratio = total > 0 ? Math.round((completed / total) * 100) : 0;

  return `
    <article class="card dashboard__card animate-fade-in">
      <header class="dashboard__card-head">
        <h2 class="dashboard__card-title">✅ Tâches</h2>
      </header>
      <div class="dashboard__progress">
        <div class="dashboard__progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ratio}">
          <span class="dashboard__progress-fill" style="width: ${ratio}%"></span>
        </div>
        <p class="dashboard__muted">${completed}/${total} tâches</p>
      </div>
      ${
        nextTasks.length
          ? `<ul class="dashboard__list">
              ${nextTasks.map((task) => `<li>${escapeHtml(task.text)}</li>`).join('')}
            </ul>`
          : '<p class="dashboard__muted">Aucune tâche pour l\'instant</p>'
      }
      <button type="button" class="btn dashboard__link" data-dashboard-nav="tasks">Voir toutes les tâches</button>
    </article>
  `;
}

function createMemoWidget(memoData) {
  const { pinnedCards } = memoData;
  const hasCards = pinnedCards.length > 0;

  return `
    <article class="card dashboard__card animate-fade-in">
      <header class="dashboard__card-head">
        <h2 class="dashboard__card-title">🗒️ Mémo</h2>
      </header>
      ${
        hasCards
          ? `<ul class="dashboard__list">
              ${pinnedCards
                .map(
                  (note) =>
                    `<li><strong>${escapeHtml(note.title || 'Sans titre')}</strong><span class="dashboard__note-preview">${escapeHtml(truncate(note.preview, 50) || 'Post-it vide')}</span></li>`
                )
                .join('')}
            </ul>`
          : '<p class="dashboard__muted">Ajoute ou epingle une note importante pour la retrouver ici.</p>'
      }
      <button type="button" class="btn dashboard__link" data-dashboard-nav="memo">${hasCards ? 'Ouvrir Mémo' : 'Créer une carte'}</button>
    </article>
  `;
}

function createPomodoroWidget(pomodoroData) {
  const { activeLabel } = pomodoroData;
  const hasActiveSession = Boolean(activeLabel);
  const statusClassName = hasActiveSession ? 'dashboard__status' : 'dashboard__muted';

  return `
    <article class="card dashboard__card animate-fade-in">
      <header class="dashboard__card-head">
        <h2 class="dashboard__card-title">🍅 Pomodoro</h2>
      </header>
      <p class="${statusClassName}" data-dashboard-pomodoro-status>
        ${hasActiveSession ? escapeHtml(activeLabel) : 'Aucune session active'}
      </p>
      <button
        type="button"
        class="btn dashboard__link"
        data-dashboard-nav="pomodoro"
        data-dashboard-pomodoro-cta
        ${hasActiveSession ? 'hidden' : ''}
      >
        Démarrer une session
      </button>
    </article>
  `;
}

function createCaptureWidget(captureData) {
  const { latestCaptures } = captureData;
  const hasCaptures = latestCaptures.length > 0;

  return `
    <article class="card dashboard__card animate-fade-in">
      <header class="dashboard__card-head">
        <h2 class="dashboard__card-title">⚡ Capture</h2>
      </header>
      ${
        hasCaptures
          ? `<ul class="dashboard__list">
              ${latestCaptures.map((entry) => `<li>${escapeHtml(truncate(entry.text, 60))}</li>`).join('')}
            </ul>`
          : '<p class="dashboard__muted">Capture une idee en une phrase pour liberer ton esprit.</p>'
      }
      <button type="button" class="btn dashboard__link" data-dashboard-nav="capture">${hasCaptures ? 'Voir les captures' : 'Faire une capture'}</button>
    </article>
  `;
}

function hasMeaningfulContent(content = '') {
  const textOnly = String(content)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return textOnly.length > 0;
}

function createWidgetFallback(message, moduleId, ctaLabel) {
  return `
    <p class="dashboard__muted">${escapeHtml(message)}</p>
    <button type="button" class="btn dashboard__link" data-dashboard-nav="${moduleId}">${escapeHtml(ctaLabel)}</button>
  `;
}

function createWeatherWidget(weatherData) {
  const hasWeatherLine = hasMeaningfulContent(weatherData?.content);

  return `
    <article class="card dashboard__card dashboard__card--weather animate-fade-in" aria-live="polite">
      <header class="dashboard__card-head">
        <h2 class="dashboard__card-title">🌤 Météo</h2>
      </header>
      ${
        hasWeatherLine
          ? weatherData.content
          : createWidgetFallback(
              'Ajoute ta ville pour recevoir une météo claire avant de démarrer.',
              'weather',
              'Configurer la météo'
            )
      }
      ${hasWeatherLine ? '<button type="button" class="btn dashboard__link" data-dashboard-nav="weather">Ouvrir Météo</button>' : ''}
    </article>
  `;
}

function createMoodWidget(moodData) {
  const hasContent = hasMeaningfulContent(moodData?.content);
  return `
    <article class="card dashboard__card animate-fade-in">
      <header class="dashboard__card-head">
        <h2 class="dashboard__card-title">🙂 Humeur</h2>
      </header>
      ${
        hasContent
          ? moodData.content
          : createWidgetFallback(
              'Un mini check-in peut t’aider a ajuster ta journee avec douceur.',
              'mood',
              'Faire mon check-in'
            )
      }
      ${hasContent ? '<button type="button" class="btn dashboard__link" data-dashboard-nav="mood">Voir mon humeur</button>' : ''}
    </article>
  `;
}

function createHabitsWidget(habitsData) {
  const hasContent = hasMeaningfulContent(habitsData?.content);
  return `
    <article class="card dashboard__card animate-fade-in">
      <header class="dashboard__card-head">
        <h2 class="dashboard__card-title">🌱 Habitudes</h2>
      </header>
      ${
        hasContent
          ? habitsData.content
          : createWidgetFallback(
              'Pose une petite habitude du jour pour garder ton elan.',
              'habits',
              'Ouvrir mes habitudes'
            )
      }
      ${hasContent ? '<button type="button" class="btn dashboard__link" data-dashboard-nav="habits">Voir les habitudes</button>' : ''}
    </article>
  `;
}

function createMedicationsWidget(medicationsData) {
  const hasContent = hasMeaningfulContent(medicationsData?.content);
  if (!hasContent) return '';
  return `
    <article class="card dashboard__card animate-fade-in">
      <header class="dashboard__card-head">
        <h2 class="dashboard__card-title">💊 Médicaments</h2>
      </header>
      ${medicationsData.content}
      <button type="button" class="btn dashboard__link" data-dashboard-nav="medications">Voir les médicaments</button>
    </article>
  `;
}

function createCalendarDashboardWidget(calendarData) {
  const hasContent = hasMeaningfulContent(calendarData?.content);
  return `
    <article class="card dashboard__card animate-fade-in">
      <header class="dashboard__card-head">
        <h2 class="dashboard__card-title">📅 Calendrier</h2>
      </header>
      ${
        hasContent
          ? calendarData.content
          : createWidgetFallback(
              'Planifie un prochain rendez-vous pour visualiser la suite.',
              'calendar',
              'Ajouter un evenement'
            )
      }
      ${hasContent ? '<button type="button" class="btn dashboard__link" data-dashboard-nav="calendar">Ouvrir le calendrier</button>' : ''}
    </article>
  `;
}

function createJournalWidget(journalData) {
  const hasContent = hasMeaningfulContent(journalData?.content);
  return `
    <article class="card dashboard__card animate-fade-in">
      <header class="dashboard__card-head">
        <h2 class="dashboard__card-title">📔 Journal</h2>
      </header>
      ${
        hasContent
          ? journalData.content
          : createWidgetFallback(
              'Ecris quelques lignes pour poser ta pensee du moment.',
              'journal',
              'Ecrire une entree'
            )
      }
      ${hasContent ? '<button type="button" class="btn dashboard__link" data-dashboard-nav="journal">Ouvrir le journal</button>' : ''}
    </article>
  `;
}

function createRecipesDashboardWidget(recipesData) {
  const hasContent = hasMeaningfulContent(recipesData?.content);
  return `
    <article class="card dashboard__card animate-fade-in">
      <header class="dashboard__card-head">
        <h2 class="dashboard__card-title">📖 Recettes</h2>
      </header>
      ${
        hasContent
          ? recipesData.content
          : createWidgetFallback(
              'Ajoute une recette pour des idées rapides quand tu n’as pas le cerveau pour décider.',
              'recipes',
              'Voir les recettes'
            )
      }
    </article>
  `;
}

function createDashboardView(date = new Date(), widgetsData, options = {}) {
  const time = formatInputTime(date);
  const formattedDate = formatCurrentDate(date);
  const { tada, tasks, memo, pomodoro, capture, weather, mood, habits, medications, journal, calendar, recipes } =
    widgetsData;
  const widgets = Array.isArray(options?.widgets) ? options.widgets : [];
  const isCustomizationOpen = options?.customization?.isOpen === true;

  const rendererById = {
    weather: () => createWeatherWidget(weather),
    tada: () => createTaDaWidget(tada ?? { entries: [], total: 0 }),
    tasks: () => createTasksWidget(tasks),
    memo: () => createMemoWidget(memo),
    mood: () => createMoodWidget(mood),
    habits: () => createHabitsWidget(habits),
    medications: () => createMedicationsWidget(medications),
    pomodoro: () => createPomodoroWidget(pomodoro),
    capture: () => createCaptureWidget(capture),
    calendar: () => createCalendarDashboardWidget(calendar),
    journal: () => createJournalWidget(journal),
    recipes: () => createRecipesDashboardWidget(recipes)
  };

  const visibleWidgetIds = widgets.filter((widget) => widget.visible !== false).map((widget) => widget.id);
  const widgetsHtml = visibleWidgetIds.map((id) => rendererById[id]?.() || '').join('');

  return `
    <section class="dashboard animate-fade-in">
      <header class="dashboard__header card animate-slide-up">
        <div class="dashboard__welcome-main">
          <p class="dashboard__welcome">Bienvenue, il est <strong data-dashboard-time>${time}</strong></p>
          <p class="dashboard__date" data-dashboard-date>${formattedDate}</p>
        </div>
        <div class="dashboard__customize-control">
          <div data-app-mobile-theme-host class="dashboard__theme-host"></div>
          <button
            type="button"
            class="btn dashboard__customize-toggle"
            data-dashboard-customize-toggle
            aria-label="Personnaliser l'accueil"
            aria-expanded="${isCustomizationOpen ? 'true' : 'false'}"
          >
            <span aria-hidden="true">⚙️</span>
          </button>
        </div>
      </header>

      <div class="dashboard__grid">
        ${
          widgetsHtml ||
          '<p class="card dashboard__empty-state animate-fade-in">Active des aperçus pour personnaliser ton accueil</p>'
        }
      </div>
    </section>
  `;
}

export { createDashboardView, formatCurrentDate, formatInputTime as formatCurrentTime };
