# M12c — Habitudes : en-tête du panneau + réorganisation par glisser-déposer

**Prérequis :** M12b. **Durée :** ~2h (le drag est délicat, prendre le
temps). **Risque :** moyen — nouvelle interaction tactile, mais
**composant testé et validé isolément** avant intégration (protocole v2).

> Ajouter la ligne M12c au tableau de bord d'ETAT.md.

---

## Composant annexé, à transplanter

**`chantier/annexes/composant-liste-drag-reorder.html`** — testé et
validé par Cédric en isolation (souris + réflexion tactile). Le JS de ce
composant est **du code à transplanter**, pas une inspiration : la
logique de drag (Pointer Events + technique FLIP pour l'animation des
lignes qui s'écartent) est délicate à obtenir juste, ne pas la
réécrire "à l'esprit".

**Ce composant est conçu pour être RÉUTILISABLE** — retenir sa forme
(fonction de rendu de liste découplée du contenu des lignes, logique de
drag isolée) en vue d'un usage futur dans Mémo (réordonner des post-its).
Si possible, l'extraire en module partagé plutôt que dupliqué
directement dans `habits/` — voir note ETAT.md en fin de mission.

---

## Correctif 1 — En-tête du panneau (bug de largeur)

**Cause (auditée) :** dans `view-panels.js`, `createManagePanel()`, le
bouton bascule affiche soit "Modifier toutes les habitudes" soit "Finir
la modification" (~l.13) — libellés longs qui, combinés au titre "Gérer
mes habitudes" sur la même ligne flex, provoquent le débordement/
écrasement visible en capture.

**Correctif :** reprendre la structure de `panel__head` du composant
annexé — le titre SEUL sur sa ligne, les actions en dessous dans une
rangée qui wrap proprement :
```html
<div class="habits__panel-head">
  <h2 class="habits__panel-title">Gérer mes habitudes</h2>
  <div class="habits__panel-actions">
    <button type="button" class="pbtn pbtn--toggle" data-habits-bulk-edit-toggle aria-pressed="${bulkEditMode}">
      ${bulkEditMode ? 'Terminé' : 'Réorganiser'}
    </button>
    <button type="button" class="pbtn" data-habits-panel-close>Fermer</button>
  </div>
</div>
```
Note le changement de libellé : "Réorganiser" / "Terminé" (courts) au
lieu de "Modifier toutes les habitudes" / "Finir la modification" —
cohérent avec le fait que le bouton sert maintenant à **activer le mode
glisser**, pas un "mode édition en masse" au sens de l'ancien bulk-form.

---

## Correctif 2 — Remplacer les flèches ↑/↓ par le glisser-déposer

**Cause (produit, pas un bug) :** `createHabitManagerItem()`
(view-panels.js ~l.72-90) génère deux boutons `data-habit-move-up` /
`data-habit-move-down` par ligne. Décision de Cédric : remplacer cette
interaction par un drag tactile, sur le modèle du composant annexé.

### Ce qui est CONSERVÉ tel quel (logique métier saine)
`moveHabit(habitId, direction)` (index.js ~l.203) fait un simple
`splice`/`persist` — cette mécanique de déplacement dans le tableau
`habits` est bonne. Elle sert de base à la nouvelle fonction de
réordonnancement complet.

### Ce qui change
1. **Nouvelle fonction** `reorderHabits(orderedIds)` (remplace/complète
   `moveHabit`) : reçoit le tableau COMPLET des ids dans le nouvel ordre
   (produit par le drag), reconstruit `habits` dans cet ordre, persiste.
   ```js
   function reorderHabits(orderedIds) {
     const byId = new Map(habits.map((h) => [h.id, h]));
     const next = orderedIds.map((id) => byId.get(id)).filter(Boolean);
     if (next.length !== habits.length) return; // garde-fou
     habits = next;
     persistHabits(habits);
   }
   ```
2. **Markup de chaque ligne** (`createHabitManagerItem`) : ajouter la
   poignée `.row__handle` (grip 6 points, cf. composant annexé) visible
   uniquement quand `bulkEditMode`/mode réorganisation est actif. Retirer
   les boutons ↑/↓ visibles par défaut ; les garder en repli clavier
   discret (même logique que le composant : visibles seulement au focus
   ou en mode réorganisation), pour l'accessibilité — le drag seul n'est
   pas utilisable au clavier/lecteur d'écran.
3. **JS d'interaction** : transplanter `startDrag`/`onDragMove`/
   `onDragEnd` du composant annexé, adaptés aux vrais éléments du DOM
   du module (sélecteurs `.habits__manage-item` au lieu de `.row`, etc.).
   Au relâché (`onDragEnd`), appeler `reorderHabits(nouvelOrdre)` puis
   `render()` (un render complet ICI est acceptable : l'action est
   ponctuelle et volontaire, pas un tap répété comme pour les mouillages
   — pas besoin de mutation scoping sur ce point précis).
4. **`touch-action:pan-y`** sur les lignes en mode repos (permet le
   scroll vertical normal de la liste) et `touch-action:none` sur la
   poignée elle-même (nécessaire pour que le drag fonctionne sans que le
   navigateur interprète le geste comme un scroll).

---

## Périmètre
**IN :** `habits/view-panels.js` (en-tête + markup des lignes + poignée),
`habits/index.js` (`reorderHabits`, retrait/adaptation de `moveHabit` si
devenu inutile ou conservé comme fallback clavier), `habits/style.css`
(en-tête, poignée, styles de drag).
**OUT :** vue Aujourd'hui/Régularité (M12), système `petSlot`, modale
pet-settings (déjà traitée en M12b, non concernée par le drag).

---

## Critères d'acceptation
- [ ] Rituel de contrôle : tout vert, build stable.
- [ ] Test manuel (Cédric, iPhone + Mac, 4 thèmes) :
  - en-tête : titre et boutons ne se chevauchent JAMAIS, dans les deux
    états (Réorganiser / Terminé) ;
  - toucher "Réorganiser" fait apparaître les poignées ⠿ sur chaque ligne ;
  - glisser une ligne (doigt sur iPhone, souris sur Mac) : la ligne suit
    le pointeur, les autres s'écartent avec un mouvement fluide (pas de
    saut brutal), le nouvel ordre est conservé après relâché ;
  - l'ordre persiste après fermeture/réouverture du panneau et rechargement ;
  - fallback clavier : Tab jusqu'à une ligne en mode réorganisation, ↑/↓
    déplacent la ligne ;
  - liste NON en mode réorganisation : scroll vertical normal, pas de
    poignée visible, comportement inchangé pour éditer/supprimer ;
  - widget dashboard et vue Aujourd'hui non affectés.
- [ ] **Checklist de sortie** repassée (nouvelle interaction tactile —
      vérifier notamment `touch-action`, absence de débordement, aucun
      `!important` introduit).

## Note ETAT.md
Consigner : patron **glisser-déposer réutilisable** ajouté au chantier
(Pointer Events + technique FLIP), annexé en composant isolé
(`composant-liste-drag-reorder.html`) — **premier candidat identifié pour
Mémo** (réordonner des post-its) quand ce chantier sera abordé. Le motif
"flèches ↑/↓" reste disponible comme repli clavier/accessibilité, jamais
comme interaction principale visible par défaut. Fin de la série
Habitudes (M12 → M12c).
