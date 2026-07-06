# ÉTAT DU CHANTIER — Ancrage

> Ce fichier est la mémoire du chantier. L'agent le lit au début de chaque
> mission et le met à jour à la fin. Il doit rester factuel et concis.

**Dernière mise à jour :** 2026-07-06 — M06

---

## Tableau de bord

| Mission | Intitulé | Statut | Date |
|---|---|---|---|
| M00 | Baseline et branche de chantier | ✅ faite et validée par Cédric | 2026-07-06 |
| M01 | Restaurer le code-splitting (registry) | ✅ faite et validée par Cédric | 2026-07-06 |
| M02 | Fiabiliser la sauvegarde | ✅ faite et validée par Cédric | 2026-07-06 |
| M03 | Ménage : code mort et duplications | ✅ faite (en attente validation Cédric) | 2026-07-06 |
| M04 | Socle design : thèmes, mouvement, typographie | ✅ faite (en attente validation Cédric) | 2026-07-06 |
| M05 | Signature Tâches : la ligne de flottaison | ✅ faite (en attente validation Cédric) | 2026-07-06 |
| M05b | Correctif interactions sous-tâches/tag | ✅ faite (en attente validation Cédric) | 2026-07-06 |
| M06 | Tâches : tag, bordure, tag à la création | ✅ faite (en attente validation Cédric) | 2026-07-06 |

Statuts : ⬜ à faire · 🔶 en cours · ✅ faite et validée par Cédric · 🛑 bloquée

---

## Métriques de référence

*Renseignées en M00, mises à jour à chaque mission. Aucune ne doit régresser
sans justification écrite.*

| Métrique | Baseline (M00) | Dernière valeur | Mission |
|---|---|---|---|
| Smoke tests | 20/20 modules, 4/4 shell | 20/20 modules, 4/4 shell | M06 |
| Tests unitaires | 22/22 passés (2 fichiers) | 42/42 passés (6 fichiers) | M06 |
| Lint | 0 erreur | 0 erreur | M06 |
| JS initial (dist, brut) | 856 KB (`index-DsV8hCcK.js`) | 277 KB (`index-_jHHsfBn.js`) | M06 |
| JS initial (gzip) | 243 KB | 76 KB | M06 |
| CSS (dist, brut) | 219 KB (`index-BZJK38el.css`) | 114 KB (`index-Ds6OK8cE.css`, entrée HTML) | M06 |
| Nombre de chunks JS | 1 | 9 | M01 |
| Polices woff2 (dist) | — | ~122 KB (7 fichiers) | M04 |
| Precache PWA | — | 1070 KiB (23 entrées) | M06 |

Variation bundle M05 : +4,3 KB brut sur le chunk d'entrée JS (275 vs 270 M04) — hors tolérance ±2 KB
mais +1,5 KB gzip seulement ; justifié par markup SVG inline (houle, ancre, coche) et fonctions tide
dans `view.js`. CSS entrée +4 KB (113 vs 109 M04) — styles signature module Tâches. Zéro `!important`
et zéro `#c9a227` dans `tasks/style.css`.

### Rituel AVANT M05 (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 33/33 (5 fichiers)
- Lint : 0 erreur
- Build entrée : 270 KB brut (`index-BURE5voA.js`), 74 KB gzip
- CSS entrée : 109 KB brut (`index-GGyrk_Eq.css`)
- Precache : 1058 KiB

### Rituel APRÈS M05 (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 42/42 (6 fichiers, +9 tests tide)
- Lint : 0 erreur
- Build entrée : 275 KB brut (`index-BOvMyc0Q.js`), 75 KB gzip
- CSS entrée : 113 KB brut (`index-DZvOYv93.css`), 18 KB gzip
- Precache : 1066 KiB
- Grep contrôle : 0 `!important` et 0 `#c9a227` dans `tasks/style.css`

### Rituel AVANT M05b (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 42/42 (6 fichiers)
- Lint : 0 erreur
- Build entrée : 275 KB brut (`index-DYqjOxU9.js`), 76 KB gzip
- CSS entrée : 113 KB brut (`index-DZvOYv93.css`), 18 KB gzip
- Precache : 1066 KiB

### Rituel APRÈS M05b (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 42/42 (6 fichiers)
- Lint : 0 erreur
- Build entrée : 275 KB brut (`index-DTE4qdCO.js`), 76 KB gzip (+0,5 KB brut, sélecteurs `closest` supplémentaires)
- CSS entrée : 113 KB brut (`index-DZvOYv93.css`), 18 KB gzip (inchangé)
- Precache : 1067 KiB
- `git diff --stat` : uniquement `src/modules/tasks/index.js` (handler `onPointerDown`)

### Rituel AVANT M06 (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 42/42 (6 fichiers)
- Lint : 0 erreur
- Build entrée : 275 KB brut (`index-DTE4qdCO.js`), 76 KB gzip
- CSS entrée : 113 KB brut (`index-DZvOYv93.css`), 18 KB gzip
- Precache : 1067 KiB

### Rituel APRÈS M06 (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 42/42 (6 fichiers)
- Lint : 0 erreur
- Build entrée : 277 KB brut (`index-_jHHsfBn.js`), 76 KB gzip (+1,8 KB brut, +0,4 KB gzip — sélecteur tag création)
- CSS entrée : 114 KB brut (`index-Ds6OK8cE.css`), 18 KB gzip (+1 KB, styles sélecteur création)
- Precache : 1070 KiB
- Commits : `fix:` menu tag overflow + bordure form ; `feat:` tag à la création
- `git diff --stat` index.js : câblage tag création + signature `createTask(text, tagId)` uniquement

### Simulation quota plein (procédure dev, M02)

1. `npm run preview`, ouvrir l'app dans le navigateur.
2. Console DevTools — patcher temporairement `localStorage.setItem` :

```js
const nativeSetItem = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(localStorage), 'setItem'
).value;
localStorage.setItem = function (key, value) {
  if (key.startsWith('adhd-app:capture:')) {
    const e = new Error('Quota exceeded');
    e.name = 'QuotaExceededError';
    throw e;
  }
  return nativeSetItem.call(this, key, value);
};
```

3. Capturer une pensée dans le module Capture (ou toute action qui appelle `save()`).
4. **Attendu :** toast « La sauvegarde a échoué — l'espace local est plein… » (un seul toast même en rafale 10 s).
5. Recharger la page pour annuler le patch.

Vérification automatisée équivalente : `npm run test:unit` — tests `save() — gestion du quota` dans `storage.test.js`.

---

## Décisions prises

*Une ligne par décision : quoi, pourquoi, quelle mission.*

- Hors mission (correctif manuel Cédric, après M01) : `test:unit` élargi
  de `src/core/ src/modules/mood/` à `src/` pour couvrir `registry.test.js`,
  créé en M01 mais non branché au filet automatique. Nouvelle règle ajoutée
  à 00-REGLES.md §2 pour éviter que ça se reproduise. `.cursorrules` committé
  à cette occasion.
- M00 : chantier installé sur branche `chantier/redesign` dans le clone
  `ancrage-chantier` — baseline mesurée avant toute modification applicative.
- M01 : `registry.js` expose `navLabel` en plus de `label` — les réglages
  utilisent des libellés courts différents du `label` canonique de certains
  modules (capture, calendrier, notes).
- M01 : widgets dashboard lazy (médicaments, journal, calendrier, recettes)
  affichent « Chargement… » puis se remplissent après `import()` — re-render
  du dashboard à la résolution, cache en mémoire pour les rafraîchissements 30 s.
- M02 : signalement d'échec centralisé via `ancrage:save-failed` + toast dans
  `main.js` (cooldown 10 s) — aucun appelant de `save()` modifié.
- M02 : rétention backups quotidiens réduite de 7 à 3 snapshots — PocketBase
  reste la sauvegarde longue durée.
- M03 : `escapeHtml` — 8 copies identiques (replaceAll + 5 caractères) fusionnées ;
  `settings` et `breathing` avaient une variante sans échappement apostrophe →
  import canonique (comportement enrichi, sans régression visuelle attendue).
- M03 : `formatDateFr` divergent renommé — mood → `formatDateShortFr` (sans année),
  journal → `formatDateFullFr` (Intl long + année) ; budget `formatDateLongFr` inchangé
  (format manuel « d mois y »).
- M03 : `localDateString` identique tasks/dashboard → `core/format.js` + 2 tests.
- M04 : 4 thèmes Ancrage (encre, garrigue, crepuscule, maree) remplacent dark/light/warm ;
  migration auto localStorage (`dark→encre`, `light→garrigue`, `warm→crepuscule`).
- M04 : polices Atkinson Hyperlegible (corps) + Bricolage Grotesque (titres) auto-hébergées
  via npm — plus de Google Fonts CDN.
- M04 : mode auto jour (7 h–20 h) → garrigue, nuit → encre.
- M04 : validation thèmes dans settings via `THEMES` importé de `theme.js` (fin des littéraux).
- M04 : garde-fou `theme-contrast.test.js` — 20 assertions WCAG AA sur les 4 thèmes.
- M05 : tokens `--water-front/back/glow` ajoutés aux 4 thèmes dans `core/styles.css`.
- M05 : en-tête « ligne de flottaison » — houle SVG, compteur tabular-nums, libellés de marée
  (`computeTideProgress` + `tideLabel`), ancre posée quand tout est fait.
- M05 : animations de récompense via `tasks__item--just-done` / `highlightedTaskId` uniquement
  (trait, anneaux ::before/::after, swell eau, tick compteur) — pas de rejeu au re-rendu.
- M05 : chips filtre avec compteur du restant ; tâches faites en bas (tri affichage dans view.js).
- M05 : amnistie — bannière pointillés, sortie `pardon` douce, message « Pardonné. Demain est une autre marée. »
- M05 : 11 `!important` et `#c9a227` supprimés de `tasks/style.css`.
- M05b : `keepExpanded` dans `onPointerDown` aligné sur le HTML M05 — `.tasks__subtasks-list`
  (pas `.tasks__subtasks`, absent du view.js), formulaire sous-tâches, zones tag, édition sous-tâche.
- M05b : leçon — une mission « présentation seule » doit inclure les handlers `closest(...)` qui
  dépendent des enveloppes/classes HTML modifiées.
- M06 : menu tag — classe `tasks__item--tag-open` lève `overflow:hidden` sur `.tasks__item-detail`
  quand le menu est ouvert (animation dépliement déjà terminée).
- M06 : barre d'ajout — bordure unique sur `.tasks__form`, input nu (`appearance: none`).
- M06 : tag à la création — `pendingCreateTagId` réinitialisé après chaque `createTask` ;
  sélecteur réutilise `PREDEFINED_TAGS` et le rendu du menu tag existant.
- M06 : clôture série Tâches (M05 + M05b + M06) — validation humaine groupée attendue.

---

## Découvertes hors périmètre (à ne PAS corriger sans mission dédiée)

*L'agent note ici tout problème constaté hors du périmètre de sa mission.*

- M00 : Vite signale 7 modules importés à la fois dynamiquement (`main.js`)
  et statiquement (`dashboard`, `settings`) — **Résolu en M01.**
- M00 : chunk JS unique > 500 kB — **Résolu en M01.**
- M01 : `npm run test:unit` n'incluait pas `registry.test.js` —
  **Corrigé hors mission par Cédric** (script élargi à `src/`).
- M04 : `breathing/style.css` — cercle actif utilise `#a78bfa` (violet legacy) en dur.
- M04 : `focus/style.css` — fonds d'ambiance (`#0a0a0f`, `#0a1628`, etc.) codés en dur,
  ne suivent pas les tokens thème.
- M04 : `journal/style.css` — surligneur jaune `#fef08a` en dur.
- M04 : `notes/style.css` — palette papier sticky (`#1a1a1a`, `#fff`, etc.) en dur.
- M04 : `tasks/style.css` — ombre dorée `#c9a227` sur badge priorité — **Résolu en M05.**
- M05 : widget dashboard tâches (`createDashboardPreview`) non redessiné — mini-vague possible en mission future.

---

## Blocages

*Rempli uniquement en cas de STOP. Vidé une fois le blocage levé par Cédric.*

- —
