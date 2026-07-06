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
