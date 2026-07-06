# M08 — Capture : popover tag thématisé + mise en page

**Prérequis :** M07 exécutée (⏳ non validée — M08 la finalise ; validation
groupée M07 + M08 à la fin).
**Durée attendue :** une session (~2 h 30).
**Risque :** moyen. Périmètre présentation, mais le popover demande du soin.

> Avant de commencer : ajouter la ligne M08 au tableau de bord d'ETAT.md.

---

## Contexte : trois points relevés après M07

1. **Le sélecteur de tag à la création est resté un `<select>` natif**
   (`capture__tag-select`, view.js ~ligne 30). Il fonctionne (imbattable,
   jamais coupé), MAIS il s'affiche avec le style natif d'iOS/du système,
   qui ne suit pas les thèmes Ancrage (mer, nature). Décision de Cédric :
   le remplacer par un **menu custom thématisé**, à condition qu'il soit
   fait proprement (voir §Popover).
2. **La carte Capture déborde / n'est pas centrée** : sur mobile, le
   contenu semble décalé vers la droite et large de plus que l'écran.
   À corriger (largeur, marges, box-sizing).
3. **Le bouton « Capturer » est trop grand** par rapport à la maquette :
   il doit partager sa ligne avec le déclencheur de tag, pas s'étaler.

Le reste de M07 (goutte, ondes, « Posée. », liste « Sous la surface »,
filtres, états vides, décisions produit maxlength/troncature) est
CONSERVÉ tel quel — ne pas y toucher.

---

## Périmètre

**IN :**
- `src/modules/capture/view.js` : remplacer `createCaptureTagField`
  (le `<select>`) par un déclencheur + popover custom ; ajuster la ligne
  d'actions (tag + bouton).
- `src/modules/capture/style.css` : styles du popover, du déclencheur,
  correction largeur/centrage de la carte, taille du bouton.
- `src/modules/capture/index.js` : câblage du popover (ouverture,
  sélection, fermeture), en remplacement du câblage du `<select>`.

**OUT (interdit) :**
- Le shell de navigation (`src/shell/`) : le débordement de la barre de
  nav du bas existe AUSSI dans l'app d'origine (constaté sur capture
  Cédric) — ce n'est PAS causé par ce module, c'est un problème de shell
  distinct. Le NOTER dans ETAT.md « Découvertes » comme candidat à une
  future mission shell, ne pas le traiter ici.
- Toute la logique goutte/ondes/persistance de M07.
- Tout autre module ; le badge partagé `shared-tag-badge`.

---

## §Popover : la méthode robuste (le cœur de la mission)

**Le problème historique** (revenu 4 fois sur ce module) : un menu
positionné en `absolute` DANS une carte se fait couper par l'`overflow`
de la carte, ou emprisonner par son contexte d'empilement, ou déborde
de l'écran. La solution définitive : **sortir le menu de la page, dans
la top layer du navigateur.**

Approche imposée, par ordre de préférence :

**Option A — API Popover native (préférée).**
Le déclencheur est un `<button popovertarget="capture-tag-pop">` ; le menu
est un `<div id="capture-tag-pop" popover>`. Le navigateur place
automatiquement le menu dans la top layer (au-dessus de TOUT, hors de tout
overflow et de tout stacking context). Positionnement via CSS
`position-area` (ancré au déclencheur) avec repli `position: fixed` centré
bas si non supporté. Fermeture automatique au clic extérieur et à Échap
(gérées par le navigateur — un gain de robustesse énorme).
Support : Safari iOS 17+, Chrome 114+. Vérifier la cible de Cédric (iPhone
récent → OK).

**Option B — repli si Popover non disponible.**
Menu en `position: fixed` (pas `absolute`) rattaché au `body`, coordonnées
calculées en JS depuis le rect du déclencheur (`getBoundingClientRect`),
avec `z-index` élevé. `fixed` + `body` = hors des overflows des cartes.
Fermeture au clic extérieur et Échap gérées à la main (patron déjà présent
dans le module Tâches).

Dans les deux cas :
- Le menu est thématisé (tokens Ancrage : `--bg-secondary`, `--border`,
  `--shadow`, items au survol `--bg-hover`, sélection en `--accent`).
- Il ne peut jamais sortir de l'écran : largeur bornée, `max-height` avec
  défilement interne, marges de sécurité aux bords du viewport.
- Contenu : « Sans tag » (avec ✓ si actif) puis les 6 `PREDEFINED_TAGS`.
- Accessibilité : `role="menu"`, items `role="menuitem"` ou boutons,
  `aria-expanded` sur le déclencheur, navigation clavier, focus visible,
  focus renvoyé au déclencheur à la fermeture.
- Le déclencheur affiche le tag choisi (pastille + label) ou « Tag » par
  défaut.

**Critère dur :** menu ouvert, il s'affiche ENTIER, au-dessus de la carte
« Sous la surface », sans jamais déborder de l'écran, dans les 4 thèmes,
sur largeur ≤ 380 px. C'est le point qui a échoué 4 fois — il doit être
vérifié explicitement.

---

## §Mise en page (largeur, centrage, bouton)

- **Débordement de la carte** : auditer la largeur de `.capture` /
  `.capture__card` et de leurs enfants. Causes probables : une largeur
  fixe/`min-width` trop grande, un `padding` non compté (`box-sizing`),
  ou un enfant qui force la largeur. Objectif : la carte tient dans le
  viewport avec des marges symétriques, `box-sizing: border-box` partout,
  aucune largeur > 100 %.
- **Ligne d'actions** : le déclencheur de tag et le bouton « Capturer »
  partagent une ligne (`display:flex; gap`), comme la maquette. Le bouton
  ne prend pas toute la largeur — taille alignée sur la maquette
  (`padding` mesuré, pas `width:100%`).
- Vérifier que la correction de largeur ne casse pas la surface d'eau
  (elle doit rester collée au bas de la carte, pleine largeur interne).

---

## Critères d'acceptation

- [ ] Rituel de contrôle : smoke 20/20, unit tous verts, lint 0, build
      stable (±2 KB gzip).
- [ ] `git diff src/modules/capture/index.js` relu : uniquement le
      remplacement du câblage `<select>` → popover. Le reste (goutte,
      persistance, focus) intact.
- [ ] Plus de `<select class="capture__tag-select">` dans le view.js.
- [ ] Zéro `!important`, couleurs par tokens dans capture/style.css.
- [ ] Test manuel (Cédric, iPhone + Mac, 4 thèmes) :
  - **la carte Capture est centrée, ne déborde pas** à droite, marges
    symétriques ;
  - le bouton « Capturer » a une taille raisonnable, partage sa ligne
    avec le déclencheur de tag ;
  - ouvrir le tag → **popover thématisé, entier, au-dessus de la carte
    suivante, jamais hors écran**, dans les 4 thèmes ;
  - choisir un tag → appliqué + visible sur le déclencheur ; « Sans tag »
    → retiré ; fermeture au clic extérieur et à Échap ; focus rendu ;
  - capturer avec un tag → la capture porte le tag ; le déclencheur se
    réinitialise ;
  - la goutte, « Posée. », la liste, les filtres, la suppression : intacts.
- [ ] Mouvement réduit : le popover apparaît sans animation, tout fonctionne.
- [ ] Découverte consignée : débordement de la barre de nav du shell
      (hors périmètre, pour mission shell future).

---

## Note ETAT.md (fin de mission)
Consigner : M08 finalise Capture (validation groupée M07 + M08). Le menu
tag est désormais un popover en top layer — patron à réutiliser pour tout
futur menu flottant (plus jamais de menu en `absolute` dans une carte).
Noter le débordement du shell comme dette identifiée.
