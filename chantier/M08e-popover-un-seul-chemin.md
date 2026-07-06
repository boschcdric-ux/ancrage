# M08e — Capture : un seul chemin d'ouverture pour le popover tag

**Prérequis :** M08d ✅. Mission de DÉSENCHEVÊTREMENT — issue d'un audit
complet, elle remplace la logique d'ouverture au lieu de la rustiner.
**Durée attendue :** ~1 h. **Risque :** faible (simplification nette).

---

## Diagnostic d'audit (lu sur le code, chemins vérifiés)

Le sélecteur de tag a DEUX mécanismes d'ouverture concurrents :

1. **`popovertarget` sur le bouton** (view.js ~l.68) : le NAVIGATEUR ouvre
   le popover tout seul au clic. C'est le chemin réellement emprunté en
   mode natif, car le handler JS de clic est gardé par `!useNativePopover`
   (index.js ~l.558) et ne fait donc rien.
2. L'ouverture navigateur déclenche l'événement `toggle`
   (`onTagPopoverToggle`, ~l.377) qui positionne via
   **`requestAnimationFrame(positionTagPopover)`** (~l.388) → une frame
   non positionnée peut être peinte → **flash** (iPhone) ou position par
   défaut persistante en haut-gauche (Mac, selon timing/navigateur).
3. `openTagPopover()` (~l.205), corrigé par M08d avec positionnement
   synchrone, **n'est jamais appelé au clic en mode natif** : M08d a
   soigné un chemin mort.

Conséquence : chaque correctif précédent réparait un chemin pendant que
l'exécution passait par l'autre. La solution est structurelle : **UN SEUL
chemin d'ouverture, piloté par le JS**, comme dans le composant canonique
`chantier/annexes/composant-popover-tag.html` (validé par Cédric, ne
flashe jamais).

---

## Correctif attendu

### 1. Retirer `popovertarget` (view.js)
Le bouton `data-capture-tag-toggle` ne porte PLUS `popovertarget` ni
condition `useNativePopover` dans ses attributs. Il garde `popover="auto"`
sur l'élément menu (la top layer et la fermeture clic-dehors/Échap natives
sont conservées). Garder `aria-haspopup`, `aria-expanded`, `aria-controls`.

### 2. Le clic passe par le JS dans TOUS les modes (index.js)
Dans le handler de clic (~l.557), supprimer la garde `!useNativePopover` :

```js
const tagToggle = origin.closest('[data-capture-tag-toggle]');
if (tagToggle instanceof HTMLButtonElement) {
  event.preventDefault();
  if (isTagPopoverOpen()) closeTagPopover();
  else openTagPopover();
  return;
}
```

`openTagPopover()` (déjà correct depuis M08d) devient l'UNIQUE point
d'ouverture : `showPopover()` puis `positionTagPopover()` **synchrone**,
puis `startPopoverTracking()`.

### 3. L'écouteur `toggle` ne sert plus qu'aux fermetures externes
Le navigateur peut fermer seul (clic dehors, Échap). `onTagPopoverToggle`
est conservé mais SIMPLIFIÉ : il ne gère plus l'ouverture (plus de
`requestAnimationFrame(positionTagPopover)` — le supprimer), seulement la
synchronisation à la fermeture :

```js
onTagPopoverToggle = (event) => {
  const isOpen = event.newState === 'open';
  syncTagToggleExpanded(isOpen);
  if (!isOpen) {
    stopPopoverTracking();
    clearTagPopoverPosition();
    const toggle = getTagToggleButton();
    if (toggle instanceof HTMLElement) toggle.focus();
  }
};
```

(Si l'ouverture vient de `openTagPopover()`, le `toggle` d'ouverture ne
fait que synchroniser `aria-expanded` — le positionnement synchrone a déjà
eu lieu, aucun repositionnement rAF.)

### 4. Vérification anti-régression du repli
Le chemin non-natif (`is-open` + positionnement) existe déjà et n'est pas
concerné — vérifier seulement qu'il passe toujours par `openTagPopover()`.

---

## Périmètre
**IN :** `capture/view.js` (attributs du bouton), `capture/index.js`
(handler clic ~l.557, `onTagPopoverToggle` ~l.377). Rien d'autre.
**OUT :** positionTagPopover (correcte), CSS (correct depuis M08d),
tout le reste du module, tout autre module.

---

## Critères d'acceptation
- [ ] Rituel de contrôle : tout vert, build stable.
- [ ] `grep -n "popovertarget" src/modules/capture/view.js` → aucune
      occurrence.
- [ ] `grep -n "requestAnimationFrame(positionTagPopover)"
      src/modules/capture/index.js` → aucune occurrence.
- [ ] Test manuel (Cédric, iPhone ET Mac, 4 thèmes) :
  - ouvrir/fermer le popover 10 fois : ancré au bouton À CHAQUE fois,
    AUCUN flash, AUCUNE apparition en haut-gauche, sur les DEUX machines ;
  - fermeture clic-dehors et Échap fonctionnent toujours (natif) ;
  - sélection d'un tag, « Sans tag », reset après capture : inchangés ;
  - scroll puis ouverture : ancrage correct.
- [ ] Mouvement réduit : ouverture sans animation, sans flash.

## Note ETAT.md
Consigner la leçon d'architecture dans le patron canonique : **jamais
`popovertarget` ET un handler JS sur le même déclencheur** — un seul
maître à bord. Le JS pilote l'ouverture (positionnement synchrone),
l'attribut `popover="auto"` ne sert que la top layer et la fermeture
native. Fin réelle de la saga Capture : validation groupée
M07 → M08e ensuite.
