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

### M05 — Signature Tâches : la ligne de flottaison

- En-tête redesigné : houle animée, progression de marée, ancre posée quand tout est fait.
- Tokens eau (`--water-front/back/glow`) dans les 4 thèmes.
- Cases à cocher custom (trait SVG, anneaux), chips filtre avec compteurs, états vides verbatim.
- Tests `tide.test.js` (+9 tests, total 42/42). Zéro `!important` dans `tasks/style.css`.
- Bundle JS entrée : +4,3 KB brut (+1,5 KB gzip) — SVG inline + fonctions tide. CSS entrée : +4 KB.

### M05b — Correctif interactions sous-tâches et tag

- Handler `onPointerDown` : `keepExpanded` élargi pour couvrir sous-tâches, formulaire d'ajout,
  menu tag et édition inline (aligné sur `view.js` actuel).
- Garde menu tag renforcée (`[data-task-tag-toggle]`, `[data-task-tag-pick]`).
- Un seul fichier touché (`tasks/index.js`). Bundle entrée : +0,5 KB brut (sélecteurs JS).

### M06 — Tâches : réparer tag, bordure, tag à la création

- Menu tag visible : `overflow: visible` via `.tasks__item--tag-open` quand menu ouvert.
- Barre d'ajout : bordure unique sur le conteneur `.tasks__form`.
- Tag à la création : bouton 🏷 dans la barre, `createTask(text, tagId)`, reset après ajout.
- Deux commits (`fix:` puis `feat:`). Bundle JS entrée : +1,8 KB brut / +0,4 KB gzip (dans tolérance).
- CSS entrée : +1 KB (sélecteur création). Série Tâches M05–M06 prête pour validation groupée.

### M07 — Signature Capture : la goutte

- Module Capture redesigné selon maquette `chantier/annexes/maquette-M07-capture.html`.
- Surface d'eau calme (pas de progression), goutte + ondes à la capture, « Posée. » en `aria-live`.
- Sélecteur tag à la création (bouton 🏷 + menu vers le haut), filtres avec compteurs par tag.
- Suppression de `maxlength` et de la troncature à 100 captures (`getCapturesToPersist`).
- Test `capture.test.js` (+2 tests, total 44/44). Zéro `!important` dans `capture/style.css`.
- Bundle JS entrée : +2,6 KB brut / +0,45 KB gzip (dans tolérance ±2 KB). CSS entrée : +2 KB.

### M08 — Capture : popover tag thématisé + mise en page

- Menu tag à la création : API Popover native (`popover="auto"`) en top layer ;
  repli `position: fixed` sur `body` si `showPopover` absent.
- Ancrage CSS via `anchor-name` / `position-anchor` ; repli centré bas viewport.
- Mise en page : `box-sizing` sur `.capture`, largeurs bornées, tag + « Capturer » sur une ligne.
- Accessibilité : `role="menu"`, `aria-expanded`, navigation clavier, focus rendu au déclencheur.
- Zéro `!important`, zéro couleur en dur dans `capture/style.css`. M08 finalise Capture (validation groupée M07+M08).
- Bundle JS entrée : +2,5 KB brut / +1,1 KB gzip (dans tolérance ±2 KB). CSS entrée : +1 KB.

### M08b — Capture : aligner le popover tag sur le composant de référence

- Correctif iOS/Safari : `positionTagPopover()` appelée après ouverture dans les deux chemins
  (API native `showPopover` + repli), via `requestAnimationFrame`.
- Placement unifié aligné sur `chantier/annexes/composant-popover-tag.html` : sous le déclencheur
  si place, au-dessus sinon, borné au viewport ; repositionnement au resize/scroll.
- CSS : retrait `anchor-name` / `position-anchor` ; `position: fixed` + `top`/`left` pilotés en JS.
- `composant-popover-tag.html` = patron canonique pour tout futur menu flottant.
- Saga Capture (M07 + M08 + M08b) prête pour validation groupée.
- Bundle JS entrée : +0,35 KB brut / +0,13 KB gzip (dans tolérance ±2 KB). CSS entrée : −0,3 KB.

### M08c — Capture : popover tag fantôme (display)

- Correctif : `display: flex` retiré de `.tagpick__popover` au repos — écrasait le masquage
  natif (`display: none`) et affichait le menu en permanence dans le flux sous le champ.
- Flex appliqué uniquement sur `:popover-open` (API native) et `.tagpick__popover--fallback.is-open`
  (repli). Aucun changement JS.
- Saga Capture (M07 + M08 + M08b + M08c) prête pour validation groupée.
- Bundle JS entrée : inchangé. CSS entrée : +0,04 KB (négligeable).

### M08d — Capture : flash du popover à l'ouverture

- Correctif double ceinture : `positionTagPopover()` synchrone (plus de rAF à l'ouverture
  dans `openTagPopover`) + animation d'apparition opacity/transform sur `.tagpick__popover`.
- `@starting-style` pour transition native popover ; `prefers-reduced-motion` étendu au sélecteur natif.
- Patron popover : règle « positionner de façon synchrone après showPopover(), jamais via rAF ».
- Saga Capture (M07 → M08d) finalisée — validation groupée attendue.
- Bundle JS entrée : −0,04 KB brut (inchangé gzip). CSS entrée : +0,45 KB.

### M08e — Capture : un seul chemin d'ouverture pour le popover tag

- Désenchevêtrement structurel : retrait `popovertarget` du bouton tag (`view.js`).
- Ouverture pilotée uniquement par JS (`openTagPopover()` + positionnement synchrone) dans tous les modes.
- `onTagPopoverToggle` simplifié : sync fermeture externe uniquement (plus de rAF à l'ouverture).
- Leçon patron popover : jamais `popovertarget` ET handler JS sur le même déclencheur.
- Saga Capture (M07 → M08e) finalisée — validation groupée attendue.
- Bundle JS entrée : −0,12 KB brut / −0,05 KB gzip. CSS entrée : inchangé.

### M09 — Signature Respiration : respirer avec la mer

- L'orbe disparaît : la mer devient le guide respiratoire (montée inspiration, halo rétention,
  descente expiration) — câblé sur le moteur de phases existant, non réécrit.
- Moteur audio vagues (bruit filtré lowpass) remplace les bips ; réglage son conservé.
- Carte-mer cliquable (démarrage/pause), ligne de session, compteur cycles, programmes visibles.
- Fin de séance : « Mer étale. » + « Séance tenue. » ; eau redescend en ~3 s.
- Largeur standard `min(420px, 100%)` centrée posée — harmonisation autres modules à planifier.
- `#a78bfa` et `!important` supprimés. `prefers-reduced-motion` : guide textuel uniquement.
- Bundle JS entrée : −0,5 KB brut / +0,3 KB gzip (moteur audio). CSS entrée : −0,2 KB.

### M09b — Corrections groupées Capture & Respiration

- Capture : `font-size: max(1rem, 16px)` sur `.cap__input` — plus de zoom auto iOS.
- Capture : `blur()` après capture sur pointeur grossier ; `focus()` conservé sur desktop et en édition.
- Respiration : `applyPhaseToDom()` — zéro `innerHTML` entre phases en séance ; l'eau coule
  au lieu de sauter (élément mer persistant).
- Respiration : pilule de progression décollée des coins (piste + barre).
- Règle notée pour mission balai : tous les champs de saisie app-wide ≥ 16 px.
- Leçon architecture : animations CSS = élément DOM persistant, pas de re-render `innerHTML` en séance.
- Bundle JS entrée : +1,4 KB brut / +0,24 KB gzip. CSS entrée : +0,12 KB. Validation groupée M09 + M09b attendue.

### M09c — Respiration : synchroniser l'eau avec l'état réel (démarrage + pause)

- Démarrage : `render()` peint LOW, puis double `requestAnimationFrame` avant `onPhaseStart`
  — l'eau monte visiblement depuis le bas (plus de saut à HIGH au premier instant).
- Pause : `freezeWaterAtCurrentPosition()` fige la hauteur réellement peinte (`getComputedStyle`)
  sans transition ; reprise inchangée (transition vers cible sur durée restante).
- Un seul fichier (`breathing/index.js`, +26 lignes). Saga Respiration M09→M09c finalisée.
- Bundle JS entrée : +0,5 KB brut / +0,12 KB gzip (dans tolérance). CSS entrée : inchangé.

### M10 — Refonte Agenda : la marée du jour

- Vue Jour : marée animée (`--now-y`, houle SVG, passé sous la surface), couloirs de chevauchement
  (`assignLanes` dans `tide.js`), hauteur = durée réelle, ticker 60 s avec mutations ciblées.
- Vue Semaine : liste verticale des 7 jours (puces cliquables). Vue Mois : carte pastilles (max 3).
- Section « En approche » : distance temporelle = estompage visuel (far / horizon).
- Modales `<dialog>` centrées pour détail et composeur « + Poser » (fin écran plein flux).
- Ancre ⚓, auto-scroll sur maintenant, animation accostage création, `prefers-reduced-motion`.
- Largeur `min(420px, 100%)`, champs ≥ 16 px, 0 `!important`, 0 couleur en dur.
- Chunk calendar : JS 9,3 KB gzip (−1,7 KB), CSS 3,1 KB gzip (−1,4 KB). Entrée inchangée. +7 tests.
- Validation manuelle iPhone/Mac (4 thèmes) attendue avant mission suivante.

### M10b — Agenda : modale centrée, boutons lisibles + espacement haut (socle)

- Modales détail/composeur : animation `cal-modal-in` déplacée sur `.cal__detail-card` /
  `.cal__composer-card` — le `<dialog>` ne porte plus de `transform` (centrage vertical restauré).
- Boutons `.cal__btn` : `--text-primary` par défaut, `--text-on-accent` forcé sur primary
  (:hover/:active), danger explicite. `prefers-reduced-motion` cible les wrappers.
- Socle : `padding-top: calc(env(safe-area-inset-top) + var(--space-4))` sur mobile-bar
  (tous modules, pas de doublon par module).
- CSS entrée : +0,05 KB gzip. Chunk calendar CSS : +0,1 KB gzip. JS inchangé.
- Validation groupée M10 + M10b (iPhone, 4 thèmes) attendue.

### M10c — Agenda : modale en mode modal (showModal)

- Cause : attribut `open` posé en HTML sur les `<dialog>` détail/composeur → mode non-modal
  (pas de top layer, pas de backdrop, pas de centrage) ; `!dialog.open` bloquait `showModal()`.
- Retrait de `open` sur les 2 dialogs dans `view.js` ; ouverture uniquement via `showModal()`.
- Classe `cal--modal-open` masque le bouton sticky « + Poser » tant qu'une modale est ouverte.
- Patron modale complété : **jamais `open` en HTML, toujours `showModal()` en JS** (complète M10b).
- Chunk calendar JS : +0,1 KB gzip. Chunk calendar CSS : +0,01 KB. Entrée inchangée.
- Fin refonte Agenda. Validation groupée M10 + M10b + M10c (iPhone/Mac, 4 thèmes) attendue.

### M10d — Agenda : fonds thématisés (mois) + débordement fin récurrence

- Cases mois (`.cal__cell`) et boutons Jour/Semaine/Mois (`.cal__seg-btn`) : fond explicite
  token — le défaut navigateur des `<button>` restait clair en thèmes sombres (Encre, Crépuscule).
- Boutons « En approche » (`.cal__app-item`) : `background: transparent`, `border: none`.
- Champ Fin récurrence : `.cal__composer-field input` ajouté au sélecteur largeur modale
  (`width:100%`, `box-sizing`, `min-width:0`).
- Chunk calendar CSS : +0,02 KB gzip. Entrée et JS inchangés.
- Série Agenda M10 → M10d terminée. Validation groupée (iPhone/Mac, 4 thèmes, insister Encre
  et Crépuscule) attendue.

### M10e — Agenda : input date iOS déborde malgré width:100%

- Cause : iOS Safari conserve l'apparence native des `<input type="date"/"time">`, qui impose
  une largeur intrinsèque ignorante de `width:100%` — visible sur « Fin récurrence » (pleine
  largeur), pas sur les champs en deux colonnes.
- Correctif : `-webkit-appearance:none` + `appearance:none` sur les inputs date/heure de la
  modale (`.cal__composer-field` et `.cal__composer-row`). Le sélecteur iOS reste fonctionnel.
- Chunk calendar CSS : +0,05 KB gzip. Entrée et JS inchangés.
- Règle chantier : tout futur champ date/heure doit porter `appearance:none` pour respecter
  la largeur CSS sur iOS. Série Agenda M10 → M10e close. Validation groupée (iPhone prioritaire,
  4 thèmes) attendue.

### M11 — Refonte Humeur : l'état de la mer

- Scène océan Canvas persistante (houle Gerstner + reflet scintillant en continu, soliton +
  gerbe d'écume au consignement). Moteur dans `ocean-canvas.js`, transplanté depuis la maquette.
- Deux curseurs segmentés (humeur = lumière / énergie = amplitude houle) ; labels et emojis
  réels conservés (pas ceux de la maquette).
- **Correctif critique** : tap humeur/énergie ne déclenche plus `refreshView()` — mise à jour
  scopée (`applyMoodToScene`, `aria-pressed`) sans recréer le canvas.
- Galerie multi-périodes (Semaine / Mois / 3 mois / Année) avec vignettes mini-mer ; moyennes
  arrondies au-delà de la semaine. Détail au tap. Courbe SVG historique retirée.
- Modèle `mood:entries` inchangé. Widget dashboard conservé (mini-courbe).
- Styles : `width:min(420px,100%)`, grilles `minmax(0,1fr)`, tokens eau par thème.
- Tests : +4 (ocean-canvas helpers, buildGalleryBuckets). Total 55/55.
- Bundle entrée : +2 KB brut / +2 KB gzip (moteur canvas). CSS entrée : +3 KB.
- Validation manuelle (iPhone, 4 thèmes, mouvement réduit) attendue.

### M12 — Refonte Habitudes : les mouillages

- Vue **Aujourd'hui** : cartes mouillages (eau montante, bascule emoji→⚓, ondes, compteur retours
  / mois). Entrée en cascade. Tap = jeter l'ancre sans `render()` global (classes `done` /
  `just-done` sur la carte existante).
- Vue **Régularité** : constellation 35 jours par habitude (points bioluminescents = retours,
  cercles vides = jours prévus manqués sans reproche, points discrets = hors fréquence).
- Bandeau jour : jauge circulaire animée + messages encourageants (jamais « en retard »).
- Retrait affichage streak — `getReturnsCount()` (fenêtre 30 jours) remplace la série
  ininterrompue. `getConsecutiveDays()` conservée mais non affichée.
- Modèle `habits:list` + `habits:completions` inchangé. petSlot / onboarding animal conservés.
  Widget dashboard inchangé.
- Découpage : `logic.js`, `habits-store.js`, `habits-events.js`, `view-panels.js`.
- Tests : +8 (`logic.test.js`). Total 63/63.
- Bundle entrée : +3,6 KB brut / +1 KB gzip. CSS entrée : +5 KB. Chunk habits : 4,1 KB gzip.
- Première application de `CHECKLIST-SORTIE-MODULE.md`. Validation manuelle (iPhone, taps
  rapides, 4 thèmes) attendue.
