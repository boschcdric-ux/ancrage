# M08b — Capture : aligner le popover tag sur le composant de référence

**Prérequis :** M08 exécutée. M08b la corrige. Validation groupée
M07 + M08 + M08b à la fin.
**Durée attendue :** courte (~1 h).
**Risque :** faible, périmètre chirurgical.

---

## Le bug (diagnostiqué sur le code réel)

Le popover tag de M08 s'affiche mal sur iOS/Safari : il se superpose au
titre au lieu de s'ancrer sous le déclencheur (constaté sur appareil).

**Cause racine, vérifiée dans `capture/index.js` :**
`openTagPopover()` a deux chemins. Le chemin natif (ligne ~182) appelle
seulement `popover.showPopover()` **sans jamais positionner le menu** — la
fonction `positionFallbackPopover()` n'est appelée que dans le chemin de
repli (non natif). Résultat : avec l'API native (cas iPhone), le popover
s'ouvre à la position par défaut du navigateur (coin haut-gauche), d'où la
superposition. Le placement existe mais n'est branché que sur le mauvais
chemin.

---

## L'état cible : le composant de référence annexé

**`chantier/annexes/composant-popover-tag.html`** — composant testé et
validé par Cédric. Il montre le comportement EXACT attendu : le popover
est positionné **dans les deux cas** (natif ET repli), ancré au
déclencheur, borné au viewport, repositionné au resize/scroll.

**Consigne : reproduire la logique de ce composant, ne pas réinventer le
positionnement.** Les points clés à transposer dans `capture/index.js` :

1. **Positionner APRÈS ouverture, dans les deux chemins.** Que ce soit via
   `showPopover()` (natif) ou le repli, appeler la fonction de placement
   juste après l'affichage, dans un `requestAnimationFrame` (les dimensions
   du menu doivent être connues pour le placer). Le chemin natif de M08 ne
   le fait pas → c'est LE correctif principal.
2. **Fonction de placement unique** (fusionner avec
   `positionFallbackPopover` existante) appliquée quel que soit le mode :
   - `left = rect.left` du déclencheur, repoussé si dépasse à droite,
     borné à `margin` minimum ;
   - vertical : sous le bouton si la place existe (`rect.bottom + 6`),
     au-dessus sinon (`rect.top - hauteur - 6`), sinon collé au bord haut
     avec marge ;
   - largeur bornée `min(280, 100vw - 2·margin)`, `max-height` avec
     défilement interne.
3. **Repositionner au resize et au scroll** (écouteurs actifs tant que le
   popover est ouvert), comme le composant.
4. Conserver : thématisation (déjà OK en M08), « Sans tag » + 6 tags avec
   ✓, `aria-checked`, navigation clavier, focus rendu au déclencheur,
   fermeture clic-dehors + Échap (l'API native les gère ; en repli, à la
   main).

---

## Périmètre

**IN :**
- `src/modules/capture/index.js` : la logique d'ouverture/positionnement
  du popover (fonctions `openTagPopover`, `positionFallbackPopover` et
  leurs appelants). Objectif : positionnement appliqué dans les deux
  chemins, aligné sur le composant de référence.
- `src/modules/capture/style.css` : ajustements de style du popover
  UNIQUEMENT si nécessaires pour coller au composant (le popover doit
  pouvoir recevoir `top`/`left` en `position:fixed`).
- `src/modules/capture/view.js` : seulement si la structure doit être
  ajustée pour le positionnement (éviter si possible).

**OUT (interdit) :**
- Le reste de M07/M08 (goutte, mise en page, bouton, persistance).
- Tout autre module. Le shell.

---

## Critères d'acceptation

- [ ] Rituel de contrôle : smoke 20/20, unit tous verts, lint 0, build
      stable (±2 KB gzip).
- [ ] `git diff` limité à capture/ (principalement index.js).
- [ ] Test manuel (Cédric, iPhone + Mac, 4 thèmes) — le point qui a échoué :
  - ouvrir le tag depuis le haut ET après avoir scrollé → le popover
    s'ancre TOUJOURS au bouton, jamais superposé au titre, jamais hors
    écran ;
  - au-dessus si pas de place en dessous ;
  - choisir un tag → appliqué + ✓ ; « Sans tag » → retiré ;
  - fermeture clic-dehors et Échap ; focus rendu ;
  - rotation / redimensionnement → le popover se replace ou se ferme
    proprement (pas de menu fantôme mal placé).
- [ ] Mouvement réduit : pas d'animation, fonctionnel.

---

## Note ETAT.md (fin de mission)
Consigner : le popover tag est désormais conforme au composant de
référence `composant-popover-tag.html`. **Ce composant devient le PATRON
CANONIQUE de tout menu flottant du projet** — les futures missions qui
ont besoin d'un menu/popover doivent le réutiliser plutôt que réinventer
le positionnement. Marque la fin de la saga Capture (M07 + M08 + M08b),
prête pour validation groupée.
