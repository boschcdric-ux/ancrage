# M08d — Capture : flash du popover à l'ouverture (frame non positionnée)

**Prérequis :** M08c ✅. Micro-correctif final de la saga Capture.
**Durée attendue :** ~20 min. **Risque :** minime.

---

## Le bug (diagnostiqué, cause exacte identifiée)

À l'ouverture du popover tag, un flash d'une fraction de seconde apparaît
PARFOIS : le menu surgit brièvement en haut, derrière la carte, avant de
se placer correctement. Intermittent.

**Cause, vérifiée dans `capture/index.js` (~ligne 209) :**

```js
if (!popover.matches(':popover-open')) popover.showPopover();
startPopoverTracking();
requestAnimationFrame(positionTagPopover);   // ← une frame trop tard
```

`showPopover()` AFFICHE l'élément immédiatement ; le positionnement
n'arrive qu'à la frame suivante (rAF). Si le navigateur peint entre les
deux, le popover apparaît une frame à sa position de layout par défaut
(haut de page) — c'est le flash. L'intermittence dépend du timing de
peinture. Même mécanisme sur le chemin de repli (~ligne 221).
Aggravant : aucune transition d'opacité sur `.tagpick__popover`, donc la
frame fautive est pleinement opaque.

---

## Correctif attendu (double ceinture)

**1. Positionner de façon SYNCHRONE (le vrai fix).**
`getBoundingClientRect()` force le calcul de layout à la demande — pas
besoin d'attendre une frame. Remplacer, dans les DEUX chemins :

```js
requestAnimationFrame(positionTagPopover);
```
par un appel direct :
```js
positionTagPopover();
```
Ainsi le popover est positionné dans la même tâche JS, AVANT toute
peinture possible. (Conserver `startPopoverTracking()` pour le
repositionnement au scroll/resize.)

**2. Naissance transparente (la ceinture).**
Dans `capture/style.css`, ajouter l'animation d'apparition du composant
de référence (`chantier/annexes/composant-popover-tag.html`) :

```css
.tagpick__popover {
  opacity: 0;
  transform: translateY(6px) scale(.98);
  transition: opacity var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-spring),
              overlay var(--duration-fast) allow-discrete,
              display var(--duration-fast) allow-discrete;
}
.tagpick__popover:popover-open,
.tagpick__popover.is-open {
  opacity: 1;
  transform: translateY(0) scale(1);
}
@starting-style {
  .tagpick__popover:popover-open { opacity: 0; transform: translateY(6px) scale(.98); }
}
```
Bénéfice double : l'animation d'ouverture manquante (relevée par Cédric)
apparaît, ET toute frame résiduelle mal placée serait invisible
(opacité 0 à la naissance). Respecter le mouvement réduit : la transition
est neutralisée par la règle globale du module (vérifier qu'elle couvre
ce sélecteur).

---

## Périmètre
**IN :** `capture/index.js` (les 2 lignes rAF), `capture/style.css`
(le bloc d'animation ci-dessus). **OUT :** tout le reste.

---

## Critères d'acceptation
- [ ] Rituel de contrôle : tout vert, build stable.
- [ ] `git diff` : 2 fichiers, quelques lignes.
- [ ] Test manuel (Cédric, iPhone) : ouvrir/fermer le popover 10 fois de
      suite, y compris après scroll — AUCUN flash en haut, ouverture
      animée en douceur à chaque fois.
- [ ] Mouvement réduit : ouverture instantanée sans animation, sans flash.

## Note ETAT.md
Reporter le correctif dans le composant canonique : la règle « positionner
de façon synchrone après showPopover(), jamais via rAF » complète le
patron popover pour toutes les futures utilisations.
