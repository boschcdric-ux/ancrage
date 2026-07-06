# M08c — Capture : le popover tag reste visible en permanence (display)

**Prérequis :** M08b exécutée. Correctif final avant validation groupée
M07 + M08 + M08b + M08c.
**Durée attendue :** très courte (~20 min).
**Risque :** minime, une seule règle CSS en cause.

---

## Le bug (diagnostiqué sur le code réel)

Constaté sur appareil (captures Cédric) : le menu de tags apparaît EN
PERMANENCE, coincé dans la mise en page sous le champ de texte — visible
même quand il n'a jamais été ouvert — en plus du popover qui s'affiche
correctement (bien positionné) quand on clique sur le déclencheur. Deux
affichages simultanés du même contenu.

**Cause racine, vérifiée dans `capture/style.css` (ligne ~184) :**

```css
.tagpick__popover {
  ...
  display: flex;
  flex-direction: column;
  gap: 2px;
}
```

Un élément portant l'attribut `popover` est masqué PAR DÉFAUT par le
navigateur (`display: none` via les styles internes du user-agent) tant
qu'il n'est pas ouvert. La règle `display: flex` ci-dessus s'applique
INCONDITIONNELLEMENT et écrase ce masquage natif : l'élément reste donc
visible en permanence, dans le flux normal du document (d'où sa position
figée sous le champ, sa largeur qui suit son conteneur au lieu des bornes
prévues, et l'absence d'animation d'ouverture perçue).

---

## Correctif attendu

Ne poser `display: flex` (et les propriétés de mise en page associées)
que sur l'état OUVERT du popover, jamais à l'état de repos. Deux façons
possibles, choisir celle qui s'intègre le mieux à l'existant :

**Option A — via le sélecteur `:popover-open` (natif) :**
```css
.tagpick__popover {
  margin: 0;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  box-shadow: var(--shadow);
  min-width: 170px;
  max-width: min(280px, calc(100vw - 16px));
  max-height: min(320px, 60vh);
  overflow-y: auto;
  gap: 2px;
  /* PAS de display ici : le navigateur masque par défaut */
}
.tagpick__popover:popover-open {
  display: flex;
  flex-direction: column;
}
```

**Option B — si le repli (non-natif) est aussi utilisé activement**, la
classe `is-open` (déjà posée par `positionFallbackPopover`/`openTagPopover`
selon M08b) doit être celle qui déclenche `display: flex` :
```css
.tagpick__popover { display: none; /* ...autres propriétés... */ }
.tagpick__popover.is-open,
.tagpick__popover:popover-open { display: flex; flex-direction: column; }
```

Choisir l'option qui couvre LES DEUX chemins (natif ET repli) — c'est
l'exigence de M08b déjà en place, ne pas la casser. Vérifier notamment
que le chemin natif (`showPopover()`) applique bien la classe `is-open`
en plus de l'état natif, OU que `:popover-open` seul suffit dans les deux
cas — à trancher par lecture du JS existant dans `index.js`.

---

## Périmètre

**IN :**
- `src/modules/capture/style.css` : uniquement la règle `.tagpick__popover`
  (et son état ouvert) — le `display` et ses implications immédiates.

**OUT (interdit) :**
- Tout le reste de `style.css`, tout `view.js`, tout `index.js` (sauf si
  la lecture révèle qu'il faut ajouter la classe `is-open` au chemin
  natif — dans ce cas, l'ajout est limité à cette seule ligne).
- Tout autre module.

---

## Critères d'acceptation

- [ ] Rituel de contrôle : smoke 20/20, unit tous verts, lint 0, build
      stable.
- [ ] `git diff` limité à 1-2 fichiers, quelques lignes.
- [ ] Test manuel (Cédric, iPhone, 4 thèmes) :
  - **au repos, sans avoir cliqué sur "Tag", AUCUN menu visible** nulle
    part à l'écran (c'est le test qui a échoué) ;
  - clic sur "Tag" → LE SEUL popover apparaît, animé, bien positionné,
    largeur bornée (pas plus large que ~280px) ;
  - fermeture → il disparaît complètement (aucun résidu figé) ;
  - re-test du placement (scroll puis ouverture) toujours bon (acquis M08b).
