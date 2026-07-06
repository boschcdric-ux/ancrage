# ÉTAT DU CHANTIER — Ancrage

> Ce fichier est la mémoire du chantier. L'agent le lit au début de chaque
> mission et le met à jour à la fin. Il doit rester factuel et concis.

**Dernière mise à jour :** 2026-07-06 — M09c

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
| M07 | Signature Capture : la goutte | ✅ faite (en attente validation Cédric) | 2026-07-06 |
| M08 | Capture : popover tag + mise en page | ✅ faite (en attente validation Cédric) | 2026-07-06 |
| M08b | Capture : aligner popover tag (référence) | ✅ faite (en attente validation Cédric) | 2026-07-06 |
| M08c | Capture : popover tag fantôme (display) | ✅ faite (en attente validation Cédric) | 2026-07-06 |
| M08d | Capture : flash popover à l'ouverture | ✅ faite (en attente validation Cédric) | 2026-07-06 |
| M08e | Capture : un seul chemin d'ouverture popover | ✅ faite (en attente validation Cédric) | 2026-07-06 |
| M09 | Signature Respiration : respirer avec la mer | ✅ faite (en attente validation Cédric) | 2026-07-06 |
| M09b | Corrections groupées Capture & Respiration | ✅ faite (en attente validation Cédric) | 2026-07-06 |
| M09c | Respiration : sync eau démarrage + pause | ✅ faite (en attente validation Cédric) | 2026-07-06 |

Statuts : ⬜ à faire · 🔶 en cours · ✅ faite et validée par Cédric · 🛑 bloquée

---

## Métriques de référence

*Renseignées en M00, mises à jour à chaque mission. Aucune ne doit régresser
sans justification écrite.*

| Métrique | Baseline (M00) | Dernière valeur | Mission |
|---|---|---|---|
| Smoke tests | 20/20 modules, 4/4 shell | 20/20 modules, 4/4 shell | M09c |
| Tests unitaires | 22/22 passés (2 fichiers) | 44/44 passés (7 fichiers) | M09c |
| Lint | 0 erreur | 0 erreur | M09c |
| JS initial (dist, brut) | 856 KB (`index-DsV8hCcK.js`) | 285 KB (`index-YgXT2QBw.js`) | M09c |
| JS initial (gzip) | 243 KB | 78 KB | M09c |
| CSS (dist, brut) | 219 KB (`index-BZJK38el.css`) | 117 KB (`index-DNCpuRtL.css`, entrée HTML) | M09c |
| Nombre de chunks JS | 1 | 9 | M01 |
| Polices woff2 (dist) | — | ~122 KB (7 fichiers) | M04 |
| Precache PWA | — | 1080 KiB (23 entrées) | M09c |

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

### Rituel AVANT M07 (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 42/42 (6 fichiers)
- Lint : 0 erreur
- Build entrée : 277 KB brut (`index-_jHHsfBn.js`), 76 KB gzip
- CSS entrée : 114 KB brut (`index-Ds6OK8cE.css`), 18 KB gzip
- Precache : 1070 KiB

### Rituel APRÈS M07 (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers, +2 tests troncature)
- Lint : 0 erreur
- Build entrée : 280 KB brut (`index-CnwUmJ8a.js`), 76 KB gzip (+2,6 KB brut, +0,45 KB gzip — animation goutte + tag picker)
- CSS entrée : 116 KB brut (`index-BT23sQTf.css`), 19 KB gzip (+2 KB, styles signature capture)
- Precache : 1074 KiB
- Grep contrôle : 0 `!important` et 0 couleur en dur dans `capture/style.css`
- Commits : `feat:` présentation ; `feat:` câblage + décisions produit ; `test:` troncature

### Rituel AVANT M08 (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers)
- Lint : 0 erreur
- Build entrée : 280 KB brut (`index-CnwUmJ8a.js`), 76 KB gzip
- CSS entrée : 116 KB brut (`index-BT23sQTf.css`), 19 KB gzip
- Precache : 1074 KiB

### Rituel APRÈS M08 (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers)
- Lint : 0 erreur
- Build entrée : 283 KB brut (`index-D2M2TGAQ.js`), 78 KB gzip (+2,5 KB brut, +1,1 KB gzip — popover + positionnement repli)
- CSS entrée : 117 KB brut (`index-Bb7kltXR.css`), 19 KB gzip (+1 KB, styles popover + box-sizing)
- Precache : 1079 KiB
- Grep contrôle : 0 `!important`, 0 couleur en dur, 0 `<select>` dans `capture/`
- Commits : `feat:` popover tag top layer ; `chore:` clôture M08

### Rituel AVANT M08b (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers)
- Lint : 0 erreur
- Build entrée : 283 KB brut (`index-D2M2TGAQ.js`), 78 KB gzip
- CSS entrée : 117 KB brut (`index-Bb7kltXR.css`), 19 KB gzip
- Precache : 1079 KiB

### Rituel APRÈS M08b (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers)
- Lint : 0 erreur
- Build entrée : 283 KB brut (`index-DWDgDJp3.js`), 78 KB gzip (+0,35 KB brut, +0,13 KB gzip — placement unifié + écouteurs resize/scroll)
- CSS entrée : 117 KB brut (`index-Bp4-FEnp.css`), 19 KB gzip (−0,3 KB, retrait anchor CSS)
- Precache : 1079 KiB
- Grep contrôle : 0 `!important`, 0 couleur en dur, 0 `<select>` dans `capture/`
- `git diff --stat` : uniquement `capture/index.js` + `capture/style.css`
- Commits : `feat:` positionnement popover natif + repli ; `chore:` clôture M08b

### Rituel AVANT M08c (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers)
- Lint : 0 erreur
- Build entrée : 283 KB brut (`index-DWDgDJp3.js`), 78 KB gzip
- CSS entrée : 117 KB brut (`index-Bp4-FEnp.css`), 19 KB gzip
- Precache : 1079 KiB

### Rituel APRÈS M08c (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers)
- Lint : 0 erreur
- Build entrée : 283 KB brut (`index-DjrAev5L.js`), 78 KB gzip (inchangé)
- CSS entrée : 117 KB brut (`index-BXvU7IPb.css`), 19 KB gzip (+0,04 KB, déplacement `display:flex`)
- Precache : 1079 KiB
- Grep contrôle : 0 `!important`, 0 couleur en dur, 0 `<select>` dans `capture/`
- `git diff --stat` : uniquement `capture/style.css` (6 lignes)
- Commits : `fix:` display flex uniquement à l'ouverture ; `chore:` clôture M08c

### Rituel AVANT M08d (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers)
- Lint : 0 erreur
- Build entrée : 283 KB brut (`index-DjrAev5L.js`), 78 KB gzip
- CSS entrée : 117 KB brut (`index-BXvU7IPb.css`), 19 KB gzip
- Precache : 1079 KiB

### Rituel APRÈS M08d (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers)
- Lint : 0 erreur
- Build entrée : 283 KB brut (`index-CB6Id2oM.js`), 78 KB gzip (−0,04 KB, retrait rAF)
- CSS entrée : 117 KB brut (`index-DKelf_h_.css`), 19 KB gzip (+0,45 KB, animation apparition popover)
- Precache : 1079 KiB
- Grep contrôle : 0 `!important`, 0 couleur en dur, 0 `<select>` dans `capture/`
- `git diff --stat` : uniquement `capture/index.js` + `capture/style.css`
- Commits : `fix:` positionnement synchrone + animation naissance ; `chore:` clôture M08d

### Rituel AVANT M08e (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers)
- Lint : 0 erreur
- Build entrée : 283 KB brut (`index-CB6Id2oM.js`), 78 KB gzip
- CSS entrée : 117 KB brut (`index-DKelf_h_.css`), 19 KB gzip
- Precache : 1079 KiB

### Rituel APRÈS M08e (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers)
- Lint : 0 erreur
- Build entrée : 283 KB brut (`index-y54b0APg.js`), 78 KB gzip (−0,12 KB brut, −0,05 KB gzip — retrait popovertarget + rAF toggle)
- CSS entrée : 117 KB brut (`index-DKelf_h_.css`), 19 KB gzip (inchangé)
- Precache : 1079 KiB
- Grep contrôle : 0 `popovertarget` dans `capture/view.js`, 0 `requestAnimationFrame(positionTagPopover)` dans `capture/index.js`
- `git diff --stat` : uniquement `capture/index.js` + `capture/view.js`
- Commits : `refactor:` un seul chemin ouverture popover ; `chore:` clôture M08e

### Rituel AVANT M09 (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers)
- Lint : 0 erreur
- Build entrée : 283 KB brut (`index-y54b0APg.js`), 78 KB gzip
- CSS entrée : 117 KB brut (`index-DKelf_h_.css`), 19 KB gzip
- Precache : 1079 KiB

### Rituel APRÈS M09 (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers)
- Lint : 0 erreur
- Build entrée : 283 KB brut (`index-fv5tNCPv.js`), 78 KB gzip (−0,5 KB brut, +0,3 KB gzip — moteur audio vagues)
- CSS entrée : 117 KB brut (`index-B1lW4Acg.css`), 19 KB gzip (−0,2 KB, styles mer)
- Precache : 1078 KiB
- Grep contrôle : 0 `a78bfa`, 0 `!important` dans `breathing/`
- `git diff --stat` : uniquement `breathing/index.js` + `breathing/style.css` + `breathing/view.js`
- Commits : `feat:` signature mer + audio ; `chore:` clôture M09

### Rituel AVANT M09b (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers)
- Lint : 0 erreur
- Build entrée : 283 KB brut (`index-fv5tNCPv.js`), 78 KB gzip
- CSS entrée : 117 KB brut (`index-B1lW4Acg.css`), 19 KB gzip
- Precache : 1078 KiB

### Rituel APRÈS M09b (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers)
- Lint : 0 erreur
- Build entrée : 284 KB brut (`index-Vv4XTdsz.js`), 78 KB gzip (+1,4 KB brut, +0,24 KB gzip — `applyPhaseToDom` + helpers session)
- CSS entrée : 117 KB brut (`index-DNCpuRtL.css`), 19 KB gzip (+0,12 KB, pilule progression)
- Precache : 1080 KiB
- Grep contrôle : 0 `innerHTML` entre `startSession` et `finishSessionSuccess` hors `render()` initial/final
- `git diff --stat` : uniquement `capture/` + `breathing/` (5 fichiers)
- Commits : `fix:` capture iOS ; `fix:` respiration DOM persistant + pilule ; `chore:` clôture M09b

### Rituel AVANT M09c (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers)
- Lint : 0 erreur
- Build entrée : 284 KB brut (`index-Vv4XTdsz.js`), 78 KB gzip
- CSS entrée : 117 KB brut (`index-DNCpuRtL.css`), 19 KB gzip
- Precache : 1080 KiB

### Rituel APRÈS M09c (2026-07-06)

- Smoke : 20/20 modules, 4/4 shell
- Unit : 44/44 (7 fichiers)
- Lint : 0 erreur
- Build entrée : 285 KB brut (`index-YgXT2QBw.js`), 78 KB gzip (+0,5 KB brut, +0,12 KB gzip — double rAF démarrage + gel pause)
- CSS entrée : 117 KB brut (`index-DNCpuRtL.css`), 19 KB gzip (inchangé)
- Precache : 1080 KiB
- `git diff --stat` : uniquement `breathing/index.js` (+26 lignes)
- Commits : `fix:` sync eau démarrage + pause ; `chore:` clôture M09c

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
- M07 : fin `maxlength` textarea — saisie illimitée, compteur informatif après 200 caractères.
- M07 : fin troncature `MAX_STORED_CAPTURES` — toutes les captures persistées ; toast quota M02 si saturation.
- M07 : signature « la goutte » — surface calme, animation goutte/ondes, confirmation « Posée. » (pas de toast).
- M07 : couche décorative `.cap__layer` (overflow hidden) séparée du contenu ; menu tag en `z-index:35`.
- M07 : handlers `onPointerDown` listent `.tagpick`, menu, toggle et items dès le départ (leçon M05b).
- M07 : dates relatives (« aujourd'hui · HH:MM », « hier », « 3 juin »), suppression sink, filtres avec compteurs.
- M08 : menu tag capture — API Popover native (`popover="auto"`, `popovertarget`) en top layer ;
  repli `position: fixed` sur `body` si `showPopover` absent. Patron à réutiliser pour tout menu flottant.
- M08 : mise en page carte — `box-sizing: border-box`, largeurs bornées à 100 %, ligne tag + « Capturer »
  sans `flex:1` mobile. M08 finalise Capture (validation groupée M07 + M08 attendue).
- M08b : correctif positionnement popover — `positionTagPopover()` appelée après ouverture dans les deux
  chemins (natif via `toggle` + `requestAnimationFrame`, repli identique) ; retrait anchor CSS au profit
  de `position: fixed` + `top`/`left` JS, aligné sur `chantier/annexes/composant-popover-tag.html`.
- M08b : écouteurs `resize` + `scroll` (capture) tant que le popover est ouvert — repositionnement dynamique.
- M08b : `composant-popover-tag.html` devient le **patron canonique** de tout menu flottant du projet.
  Saga Capture (M07 + M08 + M08b) prête pour validation groupée.
- M08c : `display: flex` retiré de `.tagpick__popover` au repos — écrasait le `display: none`
  natif du popover et affichait un menu fantôme dans le flux. Flex appliqué sur `:popover-open`
  (natif) et `.tagpick__popover--fallback.is-open` (repli). Aucun changement JS.
- M08c : saga Capture complète (M07 + M08 + M08b + M08c) prête pour validation groupée Cédric.
- M08d : `positionTagPopover()` appelé de façon synchrone après `showPopover()` / `is-open`
  dans `openTagPopover()` — jamais via `requestAnimationFrame` à l'ouverture (rAF conservé
  uniquement pour resize/scroll). Règle ajoutée au patron popover canonique.
- M08d : animation d'apparition (opacity + transform + `@starting-style`) sur `.tagpick__popover`
  — naissance transparente masque toute frame mal positionnée ; `prefers-reduced-motion` couvre
  le sélecteur natif en plus du repli.
- M08d : saga Capture finalisée (M07 → M08d) — validation groupée Cédric attendue.
- M08e : retrait `popovertarget` du bouton tag — le JS pilote seul l'ouverture via `openTagPopover()`
  (positionnement synchrone M08d), `popover="auto"` ne sert que top layer + fermeture native.
- M08e : `onTagPopoverToggle` ne gère plus l'ouverture (plus de rAF) — uniquement sync fermeture
  externe (clic-dehors, Échap). Leçon patron : **jamais `popovertarget` ET handler JS sur le même
  déclencheur** — un seul maître à bord.
- M08e : saga Capture finalisée (M07 → M08e) — validation groupée Cédric attendue.
- M09 : Respiration = 3e signature (l'eau qui mesure → l'eau qui accueille → l'eau qui guide).
  Orbe supprimé ; la mer monte/descend avec les phases sur le moteur existant (timers inchangés).
- M09 : moteur audio vagues transplanté depuis la maquette (bruit filtré + enveloppes par phase).
  Réglage Activé/Désactivé conservé ; `AudioContext` au premier geste ; `stopSound()` en pause/fin.
- M09 : `setWater(level, seconds, easing)` — LOW=22 / HIGH=82, easings maquette, halo `holding` en rétention.
- M09 : labels Inspire / Retiens / Expire / Poumons vides ; fin « Mer étale. » + « Séance tenue. »
- M09 : largeur standard `min(420px, 100%)` centrée — première brique harmonisation largeurs modules.
  Mission balai largeurs à planifier juste après.
- M09 : `#a78bfa` et tous les `!important` supprimés de `breathing/style.css`.
- M09 : mouvement réduit — aucune animation eau/houle ; compte à rebours textuel guide la séance.
- M09b : `.cap__input` — `font-size: max(1rem, 16px)` pour bloquer le zoom auto iOS Safari
  (< 16 px). Règle app-wide à généraliser en mission balai harmonisation : **tous les champs
  de saisie ≥ 16 px**.
- M09b : capture mobile — `blur()` après ajout si `(pointer: coarse)` ; desktop garde `focus()`
  pour enchaîner. Chemin édition inchangé (`focus()` conservé).
- M09b : respiration — `applyPhaseToDom()` remplace `render({applyPhase})` aux frontières de
  phase, pause/reprise et bascule son en séance. L'élément `[data-breathing-sea]` persiste →
  transitions CSS fluides. Leçon architecture : **une animation CSS exige un élément persistant —
  tout module dont le moteur re-rend par `innerHTML` pendant un état animé doit passer aux
  mutations ciblées** (à vérifier en audit pré-mission Habitudes et prochaines signatures).
- M09b : pilule de progression — piste `.breathing__session-track` décollée des coins arrondis
  (top 10px, inset 14px). Validation groupée M09 + M09b attendue.
- M09c : démarrage séance — `render()` LOW puis double `requestAnimationFrame` avant
  `onPhaseStart` (l'eau part visiblement du bas, plus de saut à HIGH au premier instant).
- M09c : pause — `freezeWaterAtCurrentPosition()` lit `getComputedStyle(sea).height`,
  fige `--level` sans transition ; reprise via `applyPhaseToDom` existant (durée restante).
- M09c : leçon — toute transition CSS doit être reprise en main à la pause (geler la valeur
  réellement peinte) ; laisser un état initial se peindre (rAF) avant la transition suivante
  sur un élément neuf (même règle que flash popover M08d). Saga Respiration M09→M09c finalisée.

---

## Découvertes hors périmètre (à ne PAS corriger sans mission dédiée)

*L'agent note ici tout problème constaté hors du périmètre de sa mission.*

- M00 : Vite signale 7 modules importés à la fois dynamiquement (`main.js`)
  et statiquement (`dashboard`, `settings`) — **Résolu en M01.**
- M00 : chunk JS unique > 500 kB — **Résolu en M01.**
- M01 : `npm run test:unit` n'incluait pas `registry.test.js` —
  **Corrigé hors mission par Cédric** (script élargi à `src/`).
- M04 : `breathing/style.css` — cercle actif utilise `#a78bfa` (violet legacy) en dur. **Résolu en M09.**
- M04 : `focus/style.css` — fonds d'ambiance (`#0a0a0f`, `#0a1628`, etc.) codés en dur,
  ne suivent pas les tokens thème.
- M04 : `journal/style.css` — surligneur jaune `#fef08a` en dur.
- M04 : `notes/style.css` — palette papier sticky (`#1a1a1a`, `#fff`, etc.) en dur.
- M04 : `tasks/style.css` — ombre dorée `#c9a227` sur badge priorité — **Résolu en M05.**
- M05 : widget dashboard tâches (`createDashboardPreview`) non redessiné — mini-vague possible en mission future.
- M07 : `shared-tag-badge` remplacé par `.capture__badge` scopé au module (badge partagé inchangé ailleurs).
- M08 : débordement barre de nav du bas (`src/shell/`) — constaté aussi sur l'app d'origine ;
  candidat mission shell future, hors périmètre M08.
- M08d : chemin d'ouverture natif via `popovertarget` passe par `onTagPopoverToggle` (l.388)
  qui conserve un `requestAnimationFrame` — hors périmètre strict M08d ; la ceinture CSS
  compense. Si flash persiste sur iPhone, micro-correctif sur cette ligne. **Résolu en M08e**
  (retrait `popovertarget`, ouverture 100 % JS).

---

## Blocages

*Rempli uniquement en cas de STOP. Vidé une fois le blocage levé par Cédric.*

- —
