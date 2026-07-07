# M12e — Habitudes : la ligne draguée devient invisible sur iOS

**Prérequis :** M12d. Micro-correctif ciblé, cause connue et documentée.
**Durée :** ~20 min. **Risque :** minime (1 règle CSS).

---

## Diagnostic (audité, cause identifiée avec un fort niveau de confiance)

**Symptôme :** en glissant une habitude, elle se déplace correctement
(la logique de position/réordonnancement est juste) mais devient
**visuellement invisible sous le doigt**, sur iOS.

**Cause :** c'est un bug de rendu connu de Safari/WebKit iOS. La ligne
draguée est repositionnée par `transform: translateY(...)` **très
fréquemment** (le `pointermove` se déclenche des dizaines de fois par
seconde pendant le drag). Audit confirmé : **aucune promotion de calque
GPU** n'est appliquée sur l'élément (`will-change`, `translateZ`,
`translate3d` — zéro occurrence dans le CSS/JS du module).

Sans promotion explicite, WebKit gère parfois ce type d'élément en
repaint CPU classique ; à haute fréquence de changement de `transform`,
le moteur peut manquer une peinture et laisser l'élément invisible
jusqu'au prochain changement de layout (redimensionnement, scroll...).
C'est un bug de la plateforme, pas une erreur de logique — la preuve
étant que la position calculée reste juste (Cédric confirme "j'arrive
bien à la déplacer").

---

## Correctif

Forcer la promotion de la ligne draguée sur son propre calque de
composition GPU, dès le début du drag — ce qui contourne le bug de
repaint :

```css
.habits__manage-item.list-drag-reorder__row--dragging {
  transition: none;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.35);
  z-index: 20;
  cursor: grabbing;
  will-change: transform;       /* AJOUT : promotion de calque */
  -webkit-transform: translateZ(0); /* AJOUT : filet de sécurité WebKit */
  backface-visibility: hidden;  /* AJOUT : évite le flicker associé */
  -webkit-backface-visibility: hidden;
}
```

**Point d'attention :** `will-change` doit être posé UNIQUEMENT pendant
le drag (via la classe `--dragging`, déjà conditionnelle) et retiré à la
fin — le laisser en permanence sur toutes les lignes gaspillerait de la
mémoire GPU inutilement. Vérifier que la classe `--dragging` est bien
retirée par `onDragEnd()` (déjà le cas, cf. `list-drag-reorder.js`), ce
qui retirera `will-change` avec elle automatiquement.

Ne pas appliquer `will-change: transform` à TOUTES les lignes de la
liste en permanence — seulement à celle en cours de drag.

---

## Périmètre
**IN :** `habits/style.css` uniquement (règle ci-dessus).
**OUT :** logique JS (déjà correcte), tout le reste.

Mettre à jour l'annexe de référence
`chantier/annexes/composant-liste-drag-reorder.html` avec le même
correctif (c'est le composant qui resservira pour Mémo — il doit porter
le correctif iOS dès maintenant, sinon le bug renaîtra ailleurs).

---

## Critères d'acceptation
- [ ] Rituel de contrôle : tout vert.
- [ ] Test manuel **iPhone en priorité** (c'est là que le bug vit) :
  - glisser une habitude sur toute la hauteur de la liste, lentement ET
    rapidement → la ligne reste VISIBLE en permanence sous le doigt,
    aucune disparition ni clignotement ;
  - tester dans les 4 thèmes ;
  - contrôle rapide sur Mac (le bug ne s'y manifeste probablement pas,
    mais vérifier l'absence de régression visuelle).

## Note ETAT.md
Consigner : **tout élément repositionné par `transform` à haute fréquence
via JS (drag, suivi de pointeur) doit être promu sur son propre calque
GPU** (`will-change: transform` pendant l'interaction uniquement) pour
éviter un bug de disparition/clignotement connu sur Safari/WebKit iOS. À
appliquer d'office dans tout futur pattern de drag (dont sa réutilisation
prévue pour Mémo). Série Habitudes close (M12 → M12e).
