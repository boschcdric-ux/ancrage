# M12h — Habitudes : la réorganisation sort de la modale (vue dédiée)

**Prérequis :** M12g (investigation). **Décision de Cédric** suite au
rapport : on ne combat plus le bug WebKit `<dialog>` top-layer ×
`overflow:auto` — on **change de terrain**. Le drag est prouvé
fonctionnel HORS dialog (sonde M12g) : la réorganisation devient une vue
dédiée dans le corps du module, plus de drag dans la modale.
**Durée :** ~2h. **Risque :** moyen-faible (le drag lui-même est déjà
écrit et prouvé hors dialog ; c'est surtout du déplacement de contexte).

> Ajouter la ligne M12h au tableau de bord d'ETAT.md.

---

## Étape 0 — RETIRER la régression de M12g (obligatoire, en premier)

Le hack livré en M12g doit disparaître :
```css
/* style.css ~l.755-757 — À SUPPRIMER ENTIÈREMENT */
.habits__panel-card:has(.list-drag-reorder__row--dragging),
.habits__pet-card:has(.list-drag-reorder__row--dragging) {
  overflow: visible;
}
```
**Pourquoi c'est une régression :** basculer `overflow` de `auto` à
`visible` au `pointerdown` fait perdre au conteneur sa position de
scroll (elle s'effondre à 0) → la modale « remonte en haut » pile quand
on saisit une ligne en bas de liste. Et le correctif ne réglait de toute
façon pas l'invisibilité en conditions réelles.

**CONSERVER** en revanche l'autre correctif de M12g : le
`will-change:transform` du socle rendu conditionnel (uniquement pendant
le swipe) — c'est une amélioration saine, indépendante du bug. Vérifier
simplement que la navigation swipe entre modules reste fluide.

---

## Le changement de terrain

### Principe
Toucher « Réorganiser » (dans la modale Gérer) **ferme la modale** et
ouvre une **vue dédiée plein module** — une vue ordinaire dans le flux,
PAS un `<dialog>` — contenant uniquement la liste des habitudes à
glisser. « Terminé » ferme la vue et **rouvre la modale Gérer** (retour
au contexte d'où l'on venait).

Le module possède déjà exactement ce mécanisme : `showOnboarding`
remplace toute la vue par `createOnboardingView()` (view.js ~l.164-165).
Imiter ce modèle à l'identique :
- nouvel état `reorderViewOpen` (même famille que `showOnboarding`) ;
- dans `createHabitsView()` : si `reorderViewOpen`, retourner
  `createReorderView(habits)` au lieu de la vue normale ;
- transitions d'état :
  - bouton « Réorganiser » (modale) → `setState({ reorderViewOpen: true,
    panelOpen: false })` (la modale se ferme via le mécanisme existant) ;
  - bouton « Terminé » (vue) → `setState({ reorderViewOpen: false,
    panelOpen: true })` (retour à la modale Gérer).

### La vue `createReorderView` (markup)
```html
<section class="habits habits--reorder">
  <header class="habits__reorder-head">
    <h1 class="habits__reorder-title">Réorganiser</h1>
    <p class="habits__reorder-sub">Glisse tes mouillages dans l'ordre qui te va.</p>
    <button type="button" class="btn btn-primary" data-reorder-done>Terminé</button>
  </header>
  <ul class="habits__manage-list habits__manage-list--reorder" data-reorder-list role="list">
    <!-- mêmes lignes .habits__manage-item qu'aujourd'hui, avec data-id,
         poignée .habits__manage-handle TOUJOURS visible dans cette vue,
         et le repli clavier ↑/↓ conservé (focus) -->
  </ul>
</section>
```
- Réutiliser `core/list-drag-reorder.js` TEL QUEL (il est bon — la sonde
  M12g l'a prouvé hors dialog). Le brancher sur `[data-reorder-list]`
  avec le même `onReorderEnd` (persist sans render, comme M12d).
- Cascade d'entrée des lignes (comme la vue Aujourd'hui, `--i` + délai),
  respectant `prefers-reduced-motion`.
- Le bouton « Réorganiser » de la modale et son libellé restent, seule
  sa cible change (ouvrir la vue au lieu du mode inline).
- **Simplification bienvenue :** la modale Gérer n'a plus AUCUN mode
  réorganisation inline — retirer la logique `bulkEditMode`/poignées/
  drag DE LA MODALE (le brancher uniquement dans la vue dédiée). La
  modale redevient simple : ajouter / éditer / supprimer.
- Dans cette vue plein module, PAS de conteneur `overflow:auto`
  intermédiaire autour de la liste : le scroll est celui, naturel, de
  `#app-module-content` (c'est précisément ce qui rend le terrain sain).

### Containment (rappels systématiques)
`width: min(420px, 100%)` pour la vue, `box-sizing:border-box`,
`minmax(0,1fr)` si grille, textes longs en ellipsis, test ≤ 375 px.

---

## Périmètre
**IN :** `habits/view-panels.js` ou `view.js` (createReorderView + retrait
du mode inline de la modale), `habits/index.js` + `habits-events.js`
(état `reorderViewOpen`, transitions, branchement drag sur la vue),
`habits/style.css` (retrait du hack :has, styles de la vue).
**OUT :** `core/list-drag-reorder.js` (inchangé — il fonctionne),
vue Aujourd'hui/Régularité, pet-settings, socle (sauf vérif non-régression
du will-change conditionnel déjà livré).

---

## Critères d'acceptation
- [ ] `grep -n ":has" src/modules/habits/style.css` → zéro occurrence.
- [ ] Rituel de contrôle : tout vert, build stable.
- [ ] Test manuel (Cédric, iPhone prioritaire, 4 thèmes) :
  - modale Gérer : scroll normal en bas de liste, plus aucun saut vers le
    haut (régression M12g disparue) ;
  - « Réorganiser » → la modale se ferme, la vue dédiée s'ouvre ;
  - **drag dans la vue : la ligne reste VISIBLE en permanence**, lent et
    rapide, liste longue, page scrollée — c'est LE test de la mission ;
  - « Terminé » → retour à la modale Gérer, ordre appliqué partout
    (modale, vue Aujourd'hui, constellation) et persistant après
    rechargement ;
  - repli clavier ↑/↓ fonctionnel dans la vue ;
  - navigation swipe entre modules non régressée ;
  - mouvement réduit : pas de cascade, tout instantané.
- [ ] Checklist de sortie repassée sur le module.

## Note ETAT.md
Consigner la résolution de la saga : cause prouvée (M12g) = `<dialog>`
top-layer × `overflow:auto`, insoluble proprement de l'intérieur ;
décision = changement de terrain, la réorganisation vit dans une vue
dédiée hors modale. **Règle transverse définitive : jamais de drag par
transform à haute fréquence À L'INTÉRIEUR d'un `<dialog>` scrollable** —
concevoir ces interactions dans le flux normal du module (vaut pour Mémo :
le drag des post-its se fera dans la vue, jamais dans une modale).
Série Habitudes réellement close (M12 → M12h).
