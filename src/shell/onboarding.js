import { load, save, generateUUID } from '../core/storage.js';
import { persistDisabledModuleIds } from './nav-modules.js';

const ONBOARDING_DONE_KEY = 'adhd-app:onboarding:done';
const PROFILE_DONE_KEY = 'adhd-app:profile:done';

const ALL_MODULE_IDS = [
  'now',
  'dashboard',
  'weather',
  'capture',
  'shopping',
  'recipes',
  'budget',
  'calendar',
  'tasks',
  'habits',
  'medications',
  'mood',
  'journal',
  'memo',
  'notes',
  'pomodoro',
  'focus',
  'breathing',
  'planning-boulot',
  'settings'
];

const ALWAYS_ACTIVE_MODULE_IDS = new Set(['now', 'dashboard', 'settings', 'capture']);

const PROFILE_Q1 = [
  {
    id: 'overwhelmed',
    emoji: '🌊',
    label: 'Surchargé(e) ou anxieux(se)',
    modules: ['breathing', 'mood', 'now']
  },
  {
    id: 'scattered',
    emoji: '😶',
    label: 'Un peu dispersé(e)',
    modules: ['now', 'tasks', 'capture']
  },
  {
    id: 'good',
    emoji: '✨',
    label: 'Plutôt bien',
    modules: ['now', 'tasks', 'habits']
  }
];

const PROFILE_Q2 = [
  { id: 'finish', emoji: '✅', label: 'Finir ce que je commence', modules: ['tasks', 'pomodoro'] },
  { id: 'appointments', emoji: '🗓️', label: 'Ne pas oublier les RDV', modules: ['calendar'] },
  { id: 'ideas', emoji: '💭', label: 'Garder mes idées quelque part', modules: ['capture', 'memo'] },
  { id: 'money', emoji: '💸', label: 'Gérer mon argent', modules: ['budget', 'shopping'] },
  { id: 'emotions', emoji: '😊', label: 'Comprendre mes émotions', modules: ['mood', 'journal'] },
  { id: 'nothing', emoji: '📍', label: 'Rien de particulier', modules: [], exclusive: true }
];

const PROFILE_Q3 = [
  { id: 'routines', emoji: '🌱', label: 'Mettre en place des routines', modules: ['habits'] },
  { id: 'meds', emoji: '💊', label: 'Me rappeler mes médicaments', modules: ['medications'] },
  { id: 'food', emoji: '🍳', label: 'Décider quoi manger', modules: ['recipes'] },
  { id: 'weather', emoji: '🌤️', label: 'Voir la météo du jour', modules: ['weather'] },
  { id: 'time', emoji: '🍅', label: 'Mieux gérer mon temps', modules: ['pomodoro'] },
  { id: 'later', emoji: '➡️', label: 'Pas pour l\'instant', modules: [], exclusive: true }
];

let onboardingStyleElement = null;

function isProfileDone() {
  return localStorage.getItem(PROFILE_DONE_KEY) !== null;
}

function markProfileDone() {
  localStorage.setItem(PROFILE_DONE_KEY, 'true');
}

function isOnboardingDone() {
  return localStorage.getItem(ONBOARDING_DONE_KEY) !== null;
}

function markOnboardingDone() {
  localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
}

function computeActiveModules(q1Id, q2Ids, q3Ids) {
  const active = new Set(ALWAYS_ACTIVE_MODULE_IDS);

  const q1 = PROFILE_Q1.find((o) => o.id === q1Id);
  if (q1) q1.modules.forEach((id) => active.add(id));

  for (const id of q2Ids) {
    const opt = PROFILE_Q2.find((o) => o.id === id);
    if (opt) opt.modules.forEach((mid) => active.add(mid));
  }

  for (const id of q3Ids) {
    const opt = PROFILE_Q3.find((o) => o.id === id);
    if (opt) opt.modules.forEach((mid) => active.add(mid));
  }

  return active;
}

function applyModuleProfile(activeSet) {
  const disabled = ALL_MODULE_IDS.filter((id) => !activeSet.has(id));
  persistDisabledModuleIds(new Set(disabled));
  markProfileDone();
}

function applyAllModulesActive() {
  persistDisabledModuleIds(new Set());
  markProfileDone();
}

function appendOnboardingCapture(text) {
  const raw = load('capture:items', []);
  const items = Array.isArray(raw) ? raw : [];
  const trimmed = String(text).trim();
  if (!trimmed) return;
  items.unshift({
    id: generateUUID(),
    text: trimmed,
    createdAt: Date.now(),
    tagId: null
  });
  save('capture:items', items.slice(0, 100));
}

function injectOnboardingStyles() {
  if (onboardingStyleElement) return;
  onboardingStyleElement = document.createElement('style');
  onboardingStyleElement.setAttribute('data-app-onboarding-style', 'true');
  onboardingStyleElement.textContent = `
    .app-onboarding .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .app-onboarding {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      box-sizing: border-box;
      padding: max(env(safe-area-inset-top), var(--space-4)) var(--space-4) max(env(safe-area-inset-bottom), var(--space-6));
      background: var(--bg-primary);
      color: var(--text-primary);
      font-family: var(--font-family);
      touch-action: manipulation;
    }

    .app-onboarding__brand {
      flex-shrink: 0;
      text-align: center;
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-muted);
      letter-spacing: 0.02em;
      padding-bottom: var(--space-4);
    }

    .app-onboarding__body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: stretch;
      min-height: 0;
      width: 100%;
      max-width: 28rem;
      margin-left: auto;
      margin-right: auto;
    }

    .app-onboarding__panel {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-6);
      width: 100%;
    }

    .app-onboarding__panel--slide {
      animation: profileSlideIn var(--duration-normal) var(--ease-out) both;
    }

    @keyframes profileSlideIn {
      from {
        opacity: 0;
        transform: translateX(24px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .app-onboarding__title {
      margin: 0;
      text-align: center;
      font-size: clamp(var(--text-2xl), 4.5vw, var(--text-3xl));
      font-weight: var(--font-semibold);
      line-height: 1.25;
      color: var(--text-primary);
    }

    .app-onboarding__subtitle {
      margin: 0;
      text-align: center;
      font-size: var(--text-base);
      line-height: 1.5;
      color: var(--text-secondary);
      white-space: pre-line;
    }

    .app-onboarding__field {
      width: 100%;
      min-height: 140px;
      padding: var(--space-4);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: var(--text-base);
      font-family: var(--font-family);
      line-height: 1.45;
      resize: vertical;
      box-sizing: border-box;
      transition:
        border-color var(--duration-fast) var(--ease-out),
        box-shadow var(--duration-fast) var(--ease-out);
    }

    .app-onboarding__field:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }

    .app-onboarding__field::placeholder {
      color: var(--text-muted);
    }

    .app-onboarding__choices {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .app-onboarding__choice {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      min-height: 52px;
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--border);
      border-radius: var(--radius-full);
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: var(--text-base);
      font-family: var(--font-family);
      line-height: 1.35;
      text-align: left;
      cursor: pointer;
      transition:
        border-color var(--duration-fast) var(--ease-out),
        background var(--duration-fast) var(--ease-out),
        box-shadow var(--duration-fast) var(--ease-out);
    }

    .app-onboarding__choice:hover {
      border-color: var(--accent);
    }

    .app-onboarding__choice.is-selected {
      border-color: var(--accent);
      background: var(--accent-soft);
      box-shadow: 0 0 0 1px var(--accent-soft);
    }

    .app-onboarding__choice-emoji {
      flex-shrink: 0;
      font-size: var(--text-xl);
      line-height: 1;
    }

    .app-onboarding__choice-label {
      flex: 1;
    }

    .app-onboarding__footer {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-2);
      width: 100%;
      max-width: 28rem;
      margin-left: auto;
      margin-right: auto;
      padding-top: var(--space-4);
    }

    .app-onboarding__btn-primary {
      width: 100%;
      min-height: 48px;
      padding: var(--space-3) var(--space-5);
      border: 1px solid var(--accent);
      border-radius: var(--radius-lg);
      background: var(--accent);
      color: var(--text-primary);
      font-size: var(--text-base);
      font-weight: var(--font-semibold);
      font-family: var(--font-family);
      cursor: pointer;
      transition:
        background var(--duration-fast) var(--ease-out),
        border-color var(--duration-fast) var(--ease-out),
        transform var(--duration-fast) var(--ease-out),
        box-shadow var(--duration-normal) var(--ease-default),
        opacity var(--duration-fast) var(--ease-out);
    }

    .app-onboarding__btn-primary:hover:not(:disabled) {
      background: var(--accent-hover);
      border-color: var(--accent-hover);
      transform: translateY(-1px);
      box-shadow: var(--shadow-soft);
    }

    .app-onboarding__btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }

    .app-onboarding__btn-primary:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .app-onboarding__btn-primary[hidden],
    .app-onboarding__footer[hidden] {
      display: none !important;
    }

    .app-onboarding__btn-skip {
      align-self: center;
      margin-top: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: var(--text-sm);
      font-family: var(--font-family);
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .app-onboarding__btn-skip:hover {
      color: var(--text-secondary);
    }

    .app-onboarding__list {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .app-onboarding__list-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      font-size: var(--text-base);
      line-height: 1.45;
      color: var(--text-primary);
    }

    .app-onboarding__list-icon {
      flex-shrink: 0;
      color: var(--success);
      font-size: var(--text-lg);
      line-height: 1.2;
    }

    .app-onboarding__preview-wrap {
      display: flex;
      justify-content: center;
      padding: var(--space-4) 0;
    }

    .app-onboarding__now-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-1);
      min-width: 72px;
      min-height: 56px;
      padding: var(--space-2);
      border: 1px solid var(--accent);
      border-radius: var(--radius-md);
      background: var(--accent-soft);
      color: var(--accent);
      font-family: var(--font-family);
      cursor: pointer;
      box-shadow: 0 0 0 1px var(--accent-soft);
      transition: transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
    }

    .app-onboarding__now-preview:hover {
      box-shadow: var(--shadow-soft);
    }

    .app-onboarding__now-preview:active {
      transform: scale(0.97);
    }

    .app-onboarding__now-preview-icon {
      font-size: 24px;
      line-height: 1;
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .app-onboarding__now-preview-label {
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      line-height: 1.15;
      text-align: center;
      max-width: 100%;
    }

    .app-onboarding__hint {
      margin: 0;
      text-align: center;
      font-size: var(--text-sm);
      line-height: 1.5;
      color: var(--text-secondary);
    }

    .app-onboarding__dots {
      flex-shrink: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: var(--space-3);
      padding-top: var(--space-6);
      min-height: 1.5rem;
    }

    .app-onboarding__dot {
      font-size: var(--text-sm);
      line-height: 1;
      color: var(--text-muted);
      user-select: none;
    }

    .app-onboarding__dot.is-active {
      color: var(--accent);
    }

    @media (prefers-reduced-motion: reduce) {
      .app-onboarding__btn-primary,
      .app-onboarding__now-preview,
      .app-onboarding__panel--slide {
        animation: none;
        transition: none;
      }

      .app-onboarding__now-preview:active {
        transform: none;
      }
    }
  `;
  document.head.appendChild(onboardingStyleElement);
}

function renderProfileDots(questionStep) {
  return [1, 2, 3]
    .map(
      (i) =>
        `<span class="app-onboarding__dot ${i === questionStep ? 'is-active' : ''}" aria-hidden="true">${
          i <= questionStep ? '●' : '○'
        }</span>`
    )
    .join('');
}

function toggleProfileMultiChoice(answers, choiceId, options) {
  const opt = options.find((o) => o.id === choiceId);
  if (!opt) return;

  if (answers.has(choiceId)) {
    answers.delete(choiceId);
    return;
  }

  if (opt.exclusive) {
    answers.clear();
    answers.add(choiceId);
    return;
  }

  for (const o of options) {
    if (o.exclusive) answers.delete(o.id);
  }
  answers.add(choiceId);
}

function renderProfileChoices(options, selectedIds, multi) {
  return `
    <ul class="app-onboarding__choices" role="${multi ? 'group' : 'radiogroup'}">
      ${options
        .map((opt) => {
          const selected = multi ? selectedIds.has(opt.id) : selectedIds === opt.id;
          return `
            <li>
              <button
                type="button"
                class="app-onboarding__choice ${selected ? 'is-selected' : ''}"
                data-profile-choice="${opt.id}"
                ${opt.exclusive ? 'data-profile-exclusive="true"' : ''}
                ${multi ? '' : `role="radio" aria-checked="${selected ? 'true' : 'false'}"`}
              >
                <span class="app-onboarding__choice-emoji" aria-hidden="true">${opt.emoji}</span>
                <span class="app-onboarding__choice-label">${opt.label}</span>
              </button>
            </li>
          `;
        })
        .join('')}
    </ul>
  `;
}

function mountProfileQuestionnaire(onComplete) {
  const app = document.getElementById('app');
  if (!app) return;
  injectOnboardingStyles();

  let step = 0;
  let q1Answer = null;
  const q2Answers = new Set();
  const q3Answers = new Set();

  const profileAbort = new AbortController();

  const finishProfile = (useAllModules) => {
    if (useAllModules) {
      applyAllModulesActive();
    } else {
      applyModuleProfile(computeActiveModules(q1Answer, q2Answers, q3Answers));
    }
    profileAbort.abort();
    onComplete();
  };

  const syncFooter = () => {
    const nextBtn = app.querySelector('[data-profile-next]');
    const skipBtn = app.querySelector('[data-profile-skip]');
    const footer = app.querySelector('[data-profile-footer]');

    if (footer instanceof HTMLElement) {
      footer.hidden = false;
    }

    if (nextBtn instanceof HTMLButtonElement) {
      nextBtn.hidden = step === 0;
      if (step === 1) {
        nextBtn.disabled = !q1Answer;
      } else {
        nextBtn.disabled = false;
      }
    }

    if (skipBtn instanceof HTMLButtonElement) {
      skipBtn.hidden = false;
    }
  };

  const renderProfilePanel = () => {
    const panel = app.querySelector('[data-onboarding-panel]');
    const dots = app.querySelector('[data-onboarding-dots]');
    if (!(panel instanceof HTMLElement)) return;

    panel.classList.remove('app-onboarding__panel--slide');
    void panel.offsetWidth;

    let inner = '';
    if (step === 0) {
      inner = `
        <h2 class="app-onboarding__title">Bienvenue sur Ancrage ⚓</h2>
        <p class="app-onboarding__subtitle">L'app qui s'adapte à ton cerveau,
pas l'inverse.
3 questions pour configurer ton espace
personnel. Tu pourras tout modifier
dans les réglages.</p>
        <button type="button" class="app-onboarding__btn-primary" data-profile-welcome-start>
          Commencer →
        </button>
      `;
      if (dots) dots.innerHTML = '';
    } else if (step === 1) {
      inner = `
        <h2 class="app-onboarding__title">Comment tu te sens en ce moment ?</h2>
        ${renderProfileChoices(PROFILE_Q1, q1Answer, false)}
      `;
      if (dots) dots.innerHTML = renderProfileDots(1);
    } else if (step === 2) {
      inner = `
        <h2 class="app-onboarding__title">Qu'est-ce qui te complique la vie en ce moment ?</h2>
        <p class="app-onboarding__hint">Tu peux en choisir plusieurs.</p>
        ${renderProfileChoices(PROFILE_Q2, q2Answers, true)}
      `;
      if (dots) dots.innerHTML = renderProfileDots(2);
    } else {
      inner = `
        <h2 class="app-onboarding__title">Est-ce que tu aimerais de l'aide avec ces choses ?</h2>
        <p class="app-onboarding__hint">Tu peux en choisir plusieurs.</p>
        ${renderProfileChoices(PROFILE_Q3, q3Answers, true)}
      `;
      if (dots) dots.innerHTML = renderProfileDots(3);
    }

    panel.innerHTML = inner;
    panel.classList.add('app-onboarding__panel--slide');
    syncFooter();
  };

  app.innerHTML = `
    <div class="app-onboarding" data-app-onboarding role="dialog" aria-modal="true" aria-labelledby="onboarding-step-title">
      <div class="app-onboarding__brand">Ancrage ⚓</div>
      <div class="app-onboarding__body">
        <div class="app-onboarding__panel" data-onboarding-panel id="onboarding-step-title"></div>
      </div>
      <div class="app-onboarding__footer" data-profile-footer>
        <button type="button" class="app-onboarding__btn-primary" data-profile-next disabled>
          Suivant →
        </button>
        <button type="button" class="app-onboarding__btn-skip" data-profile-skip>
          Passer →
        </button>
      </div>
      <div class="app-onboarding__dots" data-onboarding-dots role="status" aria-live="polite" aria-label="Question"></div>
    </div>
  `;

  renderProfilePanel();

  app.addEventListener(
    'click',
    (event) => {
      const t = event.target;
      if (!(t instanceof HTMLElement)) return;

      const welcomeStart = t.closest('[data-profile-welcome-start]');
      if (welcomeStart instanceof HTMLButtonElement) {
        step = 1;
        renderProfilePanel();
        return;
      }

      const choiceBtn = t.closest('[data-profile-choice]');
      if (choiceBtn instanceof HTMLButtonElement) {
        const choiceId = choiceBtn.dataset.profileChoice;
        if (!choiceId) return;
        if (step === 1) {
          q1Answer = choiceId;
        } else if (step === 2) {
          toggleProfileMultiChoice(q2Answers, choiceId, PROFILE_Q2);
        } else if (step === 3) {
          toggleProfileMultiChoice(q3Answers, choiceId, PROFILE_Q3);
        }
        renderProfilePanel();
        return;
      }

      const nextBtn = t.closest('[data-profile-next]');
      if (nextBtn instanceof HTMLButtonElement && !nextBtn.disabled) {
        if (step === 1) {
          step = 2;
          renderProfilePanel();
          return;
        }
        if (step === 2) {
          step = 3;
          renderProfilePanel();
          return;
        }
        if (step === 3) {
          finishProfile(false);
        }
        return;
      }

      const skipBtn = t.closest('[data-profile-skip]');
      if (skipBtn instanceof HTMLButtonElement) {
        finishProfile(true);
      }
    },
    { signal: profileAbort.signal }
  );
}

function mountCaptureOnboarding(onComplete) {
  const app = document.getElementById('app');
  if (!app) return;
  injectOnboardingStyles();

  let step = 0;
  let touchStartX = null;

  const dotsHtml = () =>
    [0, 1, 2]
      .map(
        (i) =>
          `<span class="app-onboarding__dot ${i === step ? 'is-active' : ''}" aria-hidden="true">${
            i === step ? '●' : '○'
          }</span>`
      )
      .join('');

  const renderPanel = () => {
    const panel = app.querySelector('[data-onboarding-panel]');
    const dots = app.querySelector('[data-onboarding-dots]');
    if (!(panel instanceof HTMLElement)) return;

    panel.classList.remove('animate-fade-in', 'app-onboarding__panel--slide');
    void panel.offsetWidth;

    let inner = '';
    if (step === 0) {
      inner = `
        <h2 class="app-onboarding__title">Ton cerveau va trop vite ?</h2>
        <p class="app-onboarding__subtitle">Commence par vider ce qui te prend la tête, là, maintenant.</p>
        <label class="visually-hidden" for="app-onboarding-input">Saisie libre</label>
        <textarea
          id="app-onboarding-input"
          class="app-onboarding__field"
          data-onboarding-input
          rows="5"
          placeholder="Écris n'importe quoi — une inquiétude, une idée, quelque chose à faire..."
        ></textarea>
        <button type="button" class="app-onboarding__btn-primary" data-onboarding-primary>
          C'est noté →
        </button>
        <button type="button" class="app-onboarding__btn-skip" data-onboarding-skip hidden>
          Passer →
        </button>
      `;
    } else if (step === 1) {
      inner = `
        <h2 class="app-onboarding__title">Ici, on ne culpabilise pas.</h2>
        <ul class="app-onboarding__list" role="list">
          <li class="app-onboarding__list-item">
            <span class="app-onboarding__list-icon" aria-hidden="true">✓</span>
            <span>Pas de notifications anxiogènes</span>
          </li>
          <li class="app-onboarding__list-item">
            <span class="app-onboarding__list-icon" aria-hidden="true">✓</span>
            <span>Pas de streaks à maintenir à tout prix</span>
          </li>
          <li class="app-onboarding__list-item">
            <span class="app-onboarding__list-icon" aria-hidden="true">✓</span>
            <span>Tu fais ce que tu peux, quand tu peux</span>
          </li>
          <li class="app-onboarding__list-item">
            <span class="app-onboarding__list-icon" aria-hidden="true">✓</span>
            <span>Le but est d'avancer, pas d'être parfait</span>
          </li>
        </ul>
        <button type="button" class="app-onboarding__btn-primary" data-onboarding-primary>
          Ça me va →
        </button>
      `;
    } else {
      inner = `
        <h2 class="app-onboarding__title">Une seule boussole.</h2>
        <p class="app-onboarding__subtitle">Quand tu es perdu, une chose à faire.</p>
        <div class="app-onboarding__preview-wrap">
          <button type="button" class="app-onboarding__now-preview" data-onboarding-now-preview aria-label="Aperçu du bouton Que faire ?">
            <span class="app-onboarding__now-preview-icon" aria-hidden="true">🧭</span>
            <span class="app-onboarding__now-preview-label">Que faire ?</span>
          </button>
        </div>
        <p class="app-onboarding__hint">
          Ancrage regarde ton énergie et tes tâches pour te proposer UNE action. Pas de liste.
          Pas de choix. Juste : quoi faire maintenant.
        </p>
        <button type="button" class="app-onboarding__btn-primary" data-onboarding-primary>
          Commencer →
        </button>
      `;
    }

    panel.innerHTML = inner;
    panel.classList.add('animate-fade-in');

    if (dots) {
      dots.innerHTML = dotsHtml();
    }

    if (step === 0) {
      const input = app.querySelector('[data-onboarding-input]');
      const skip = app.querySelector('[data-onboarding-skip]');
      const syncSkip = () => {
        if (!(input instanceof HTMLTextAreaElement) || !(skip instanceof HTMLButtonElement)) return;
        const empty = input.value.trim() === '';
        skip.hidden = !empty;
      };
      syncSkip();
      input?.addEventListener('input', syncSkip);
    }
  };

  app.innerHTML = `
    <div class="app-onboarding" data-app-onboarding role="dialog" aria-modal="true" aria-labelledby="onboarding-step-title">
      <div class="app-onboarding__brand">Ancrage ⚓</div>
      <div class="app-onboarding__body" data-onboarding-swipe-zone>
        <div class="app-onboarding__panel" data-onboarding-panel id="onboarding-step-title"></div>
      </div>
      <div class="app-onboarding__dots" data-onboarding-dots role="status" aria-live="polite" aria-label="Étape"></div>
    </div>
  `;

  renderPanel();

  function goNext() {
    if (step >= 2) return;
    step += 1;
    renderPanel();
  }

  const onboardingAbort = new AbortController();

  function finish() {
    markOnboardingDone();
    onboardingAbort.abort();
    history.replaceState({}, '', '#now');
    onComplete();
  }

  const swipeZone = app.querySelector('[data-onboarding-swipe-zone]');

  const onTouchStart = (e) => {
    if (!e.changedTouches?.[0]) return;
    touchStartX = e.changedTouches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (touchStartX == null || !e.changedTouches?.[0]) return;
    const dx = touchStartX - e.changedTouches[0].clientX;
    touchStartX = null;
    if (dx > 56) {
      if (step === 0) {
        const input = app.querySelector('[data-onboarding-input]');
        const text = input instanceof HTMLTextAreaElement ? input.value : '';
        if (text.trim()) appendOnboardingCapture(text);
      }
      if (step < 2) goNext();
      else finish();
    }
  };

  swipeZone?.addEventListener('touchstart', onTouchStart, {
    passive: true,
    signal: onboardingAbort.signal
  });
  swipeZone?.addEventListener('touchend', onTouchEnd, {
    passive: true,
    signal: onboardingAbort.signal
  });

  app.addEventListener(
    'click',
    (event) => {
      const t = event.target;
      if (!(t instanceof HTMLElement)) return;
      const previewBtn = t.closest('[data-onboarding-now-preview]');
      if (previewBtn instanceof HTMLButtonElement && step === 2) {
        previewBtn.classList.remove('animate-scale-in');
        void previewBtn.offsetWidth;
        previewBtn.classList.add('animate-scale-in');
        return;
      }

      const primary = t.closest('[data-onboarding-primary]');
      const skip = t.closest('[data-onboarding-skip]');

      if (primary instanceof HTMLButtonElement) {
        if (step === 0) {
          const input = app.querySelector('[data-onboarding-input]');
          const text = input instanceof HTMLTextAreaElement ? input.value : '';
          if (text.trim()) appendOnboardingCapture(text);
          goNext();
          return;
        }
        if (step === 1) {
          goNext();
          return;
        }
        finish();
        return;
      }

      if (skip instanceof HTMLButtonElement && step === 0) {
        goNext();
      }
    },
    { signal: onboardingAbort.signal }
  );
}

function mountOnboarding(onComplete) {
  if (isProfileDone()) {
    mountCaptureOnboarding(onComplete);
    return;
  }
  mountProfileQuestionnaire(() => {
    mountCaptureOnboarding(onComplete);
  });
}

export { isOnboardingDone, mountOnboarding };
