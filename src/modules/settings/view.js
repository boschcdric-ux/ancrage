/**
 * Marquage de la vue Réglages (page scrollable, pas de modale).
 */

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {Array<{ id: string; icon: string; label: string; locked: boolean; on: boolean }>} moduleRows
 * @param {Array<{ id: string; icon: string; label: string; active: boolean }>} themeOptions
 * @param {{ kind: 'unsupported' | 'granted' | 'denied' | 'prompt' }} notifications
 */
export function createSettingsMarkup(moduleRows, themeOptions, notifications) {
  const rowsHtml = moduleRows
    .map(
      (row) => `
        <div class="settings-module-row">
          <span class="settings-module-row__icon" aria-hidden="true">${row.icon || '•'}</span>
          <span class="settings-module-row__label">${escapeHtml(row.label)}</span>
          <button
            type="button"
            class="settings-switch ${row.on ? 'is-on' : ''}"
            role="switch"
            aria-checked="${row.on}"
            aria-label="${row.locked ? `${escapeHtml(row.label)}, toujours actif` : `${row.on ? 'Désactiver' : 'Activer'} ${escapeHtml(row.label)}`}"
            data-settings-toggle="${escapeHtml(row.id)}"
            ${row.locked ? 'disabled' : ''}
          ></button>
        </div>`
    )
    .join('');

  const themeHtml = themeOptions
    .map(
      (o) => `
        <button
          type="button"
          class="settings-theme__btn ${o.active ? 'is-active' : ''}"
          data-settings-theme="${escapeHtml(o.id)}"
          aria-pressed="${o.active}"
        >
          <span class="settings-theme__icon" aria-hidden="true">${o.icon}</span>
          <span class="settings-theme__label">${escapeHtml(o.label)}</span>
        </button>`
    )
    .join('');

  let notificationsInner = '';
  if (notifications.kind === 'unsupported') {
    notificationsInner =
      '<p class="settings-notification-msg">Ce navigateur ne prend pas en charge les notifications.</p>';
  } else if (notifications.kind === 'granted') {
    notificationsInner =
      '<p class="settings-notification-status" role="status">✅ Notifications activées</p>';
  } else if (notifications.kind === 'denied') {
    notificationsInner = `<p class="settings-notification-msg">
        Les notifications ont été refusées. Pour les activer plus tard, ouvre les paramètres du site dans ton navigateur
        (icône à gauche de l’adresse) et autorise les notifications pour cette page.
      </p>`;
  } else {
    notificationsInner = `
      <button type="button" class="btn settings-notification-enable" data-settings-notifications-enable>
        Activer les notifications 🔔
      </button>`;
  }

  return `
    <div class="settings-root">
      <h1 class="settings__title">Réglages</h1>

      <section class="settings-section" aria-labelledby="settings-modules-heading">
        <h2 id="settings-modules-heading" class="settings-section__title">Outils actifs</h2>
        <div class="settings-module-list" role="group" aria-label="Outils dans la barre de navigation">
          ${rowsHtml}
        </div>
      </section>

      <section class="settings-section" aria-labelledby="settings-theme-heading">
        <h2 id="settings-theme-heading" class="settings-section__title">Thème</h2>
        <div class="settings-theme-grid" role="group" aria-label="Choix du thème">
          ${themeHtml}
        </div>
      </section>

      <section class="settings-section" aria-labelledby="settings-notifications-heading">
        <h2 id="settings-notifications-heading" class="settings-section__title">Notifications</h2>
        <div class="settings-notifications-block">
          ${notificationsInner}
        </div>
      </section>

      <section class="settings-section" aria-labelledby="settings-data-heading">
        <h2 id="settings-data-heading" class="settings-section__title">Données</h2>
        <p
          class="settings-data-feedback"
          data-settings-data-feedback
          hidden
          role="status"
          aria-live="polite"
        ></p>
        <div class="settings-data-actions">
          <button type="button" class="btn settings-data-btn" data-settings-export-backup>
            💾 Exporter mes données
          </button>
          <button type="button" class="btn settings-data-btn" data-settings-import-backup>
            📂 Restaurer une sauvegarde
          </button>
        </div>
        <input
          type="file"
          accept="application/json,.json"
          class="settings-data-file-input"
          data-settings-backup-import
          tabindex="-1"
          aria-hidden="true"
        />
      </section>
    </div>
  `;
}
