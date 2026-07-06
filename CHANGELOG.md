# Changelog — Ancrage

Historique des modifications du chantier `chantier/redesign`.

## [Chantier] — 2026-07-06

### M00 — Baseline et installation du chantier

- Création de la branche `chantier/redesign`.
- Installation de l'infrastructure documentaire (`chantier/`).
- Baseline mesurée : smoke 20/20, unit 22/22, lint 0 erreur, 1 chunk JS (~856 KB brut / ~243 KB gzip), CSS ~219 KB.

### M01 — Restaurer le code-splitting (registry)

- Ajout de `src/modules/registry.js` (métadonnées des 20 modules, sans import de module).
- `settings/index.js` : liste activable construite depuis le registry (plus d'imports statiques des 19 modules).
- `dashboard/index.js` : widgets lazy via `import()` dynamique avec placeholder.
- `main.js` : journal passé en lazy (TipTap dans un chunk séparé).
- Métriques après : 9 chunks JS, entrée 265 KB brut / 72 KB gzip, smoke 20/20, lint 0.

### M02 — Fiabiliser la sauvegarde

- `save()` : séquence de défense quota (purge backup ancien → retry → purge tous → retry).
- Événement `ancrage:save-failed` + toast centralisé dans `main.js` (cooldown 10 s).
- Rétention backups quotidiens : 7 → 3 snapshots.
- Tests unitaires quota (+5 tests, total 27/27). Bundle entrée : +1,2 KB (dans tolérance).

### M03 — Ménage : code mort et duplications

- Suppression de `src/style/tokens.css` et `themes.css` (orphelins, valeurs divergentes du vrai `core/styles.css`).
- 10 `escapeHtml` locaux remplacés par import depuis `core/format.js`.
- `localDateString` centralisé dans `core/format.js` (+2 tests unitaires, total 29/29).
- `formatDateFr` divergents renommés : mood → `formatDateShortFr`, journal → `formatDateFullFr`.
- Bundle entrée : −0,9 KB (dans tolérance). Aucun changement visuel attendu.

### M04 — Socle design : thèmes, mouvement, typographie

- 4 thèmes Ancrage (encre, garrigue, crepuscule, maree) remplacent dark/light/warm.
- Migration auto des préférences legacy dans `theme.js`.
- Polices Atkinson Hyperlegible + Bricolage Grotesque auto-hébergées (npm).
- Typographie display sur h1–h3, grammaire de mouvement mise à jour.
- Test garde-fou contraste WCAG AA (+4 tests, total 33/33).
- Bundle JS entrée : +0,2 KB (dans tolérance ±3 KB). Polices woff2 ~122 KB.
