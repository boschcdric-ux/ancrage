import { escapeHtml } from '../../core/format.js';

const GRIP_DOTS = '<span class="grip"><i></i><i></i><i></i><i></i><i></i><i></i></span>';

function createManagePanel(habits, editHabit) {
  const formTitle = editHabit ? "Modifier l'habitude" : 'Ajouter une habitude';
  const submitLabel = editHabit ? 'Enregistrer' : 'Ajouter';

  return `
    <dialog class="habits__panel" data-habits-panel-dialog>
      <div class="habits__panel-card">
      <header class="habits__panel-head">
        <h2 class="habits__panel-title">Gérer mes habitudes</h2>
        <div class="habits__panel-actions">
          <button
            type="button"
            class="btn btn-secondary habits__panel-toggle"
            data-habits-reorder-open
          >
            Réorganiser
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
        <ul class="habits__manage-list" data-habits-manage-list role="list" aria-label="Mes habitudes">
          ${habits.map((habit, index) => createHabitManagerItem(habit, index, habits.length, false)).join('')}
        </ul>
      </div>
      </div>
    </dialog>
  `;
}

function createReorderView(habits) {
  return `
    <section class="habits habits--reorder animate-fade-in">
      <header class="habits__reorder-head">
        <h1 class="habits__reorder-title">Réorganiser</h1>
        <p class="habits__reorder-sub">Glisse tes mouillages dans l'ordre qui te va.</p>
        <button type="button" class="btn btn-primary" data-reorder-done>Terminé</button>
      </header>
      <ul class="habits__manage-list habits__manage-list--reorder" data-reorder-list role="list" aria-label="Réorganiser mes habitudes">
        ${habits.map((habit, index) => createHabitManagerItem(habit, index, habits.length, true)).join('')}
      </ul>
    </section>
  `;
}

function createHabitManagerItem(habit, index, total, reorderMode = false) {
  const canMoveUp = index > 0;
  const canMoveDown = index < total - 1;
  const name = escapeHtml(habit.name);
  const cascadeStyle = reorderMode ? ` style="--i:${index}"` : '';

  return `
    <li
      class="habits__manage-item card${reorderMode ? ' habits__manage-item--reorder' : ''}"
      data-id="${escapeHtml(habit.id)}"
      role="listitem"
      tabindex="0"${cascadeStyle}
    >
      <span class="habits__manage-handle${reorderMode ? ' habits__manage-handle--show' : ''}" aria-hidden="true">
        ${GRIP_DOTS}
      </span>
      <div class="habits__manage-main">
        <p class="habits__manage-title">
          <span aria-hidden="true">${escapeHtml(habit.emoji)}</span>
          <span>${name}</span>
        </p>
        <p class="habits__manage-meta">${escapeHtml(habit.frequencyLabel)}</p>
      </div>
      <div class="habits__manage-kbd${reorderMode ? ' habits__manage-kbd--show' : ''}">
        <button
          type="button"
          class="habits__manage-kbd-btn"
          data-habit-move-up="${habit.id}"
          aria-label="Monter ${name}"
          ${canMoveUp ? '' : 'disabled'}
        >▲</button>
        <button
          type="button"
          class="habits__manage-kbd-btn"
          data-habit-move-down="${habit.id}"
          aria-label="Descendre ${name}"
          ${canMoveDown ? '' : 'disabled'}
        >▼</button>
      </div>
      ${
        reorderMode
          ? ''
          : `
      <div class="habits__manage-actions">
        <button type="button" class="btn btn-secondary habits__icon-btn" data-habit-edit="${habit.id}">✎</button>
        <button type="button" class="btn btn-secondary habits__icon-btn habits__icon-btn--danger" data-habit-delete="${habit.id}">✕</button>
      </div>`
      }
    </li>
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
        <p class="habits__onboarding-lead">Des routines douces, sans punition. Pas de compteur qui repart à zéro.</p>
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
    <dialog class="habits__panel habits__panel--pet" data-pet-settings-dialog>
      <div class="habits__pet-card">
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
      </div>
    </dialog>
  `;
}

export { createManagePanel, createOnboardingView, createPetSettingsPanel, createReorderView };
