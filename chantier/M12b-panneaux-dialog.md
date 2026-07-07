# M12b — Habitudes : panneaux « Gérer mes habitudes » et « Mon animal » en vraies modales

**Prérequis :** M12. Ces deux panneaux existaient AVANT la refonte M12 et
n'ont pas été convertis au pattern `<dialog>` établi sur l'Agenda
(M10b/c) — angle mort identifié après coup, désormais noté dans
`CHECKLIST-SORTIE-MODULE.md` pour ne plus se reproduire.
**Durée :** ~1h30. **Risque :** faible — patron déjà éprouvé trois fois.

> Ajouter la ligne M12b au tableau de bord d'ETAT.md.

---

## Diagnostic (audité)

Les deux panneaux (`habits__panel` = "Gérer mes habitudes",
`habits__panel--pet` = "Mon animal") sont des `<aside>` ordinaires,
conditionnellement insérés dans le rendu via les booléens d'état
`panelOpen` / `petSettingsOpen` (`habits-events.js`, `index.js`). Leur CSS
(style.css ~l.685) :

```css
.habits__panel {
  position: fixed;
  right: var(--space-4);
  top: var(--space-4);
  bottom: calc(var(--space-16) + var(--space-8));
  width: min(520px, calc(100vw - var(--space-8)));
  ...
}
```

C'est un panneau latéral calé en haut (`top` fixe, jamais centré
verticalement) et quasi pleine hauteur (`bottom` proche du bas d'écran) —
exactement pourquoi Cédric doit scrolloter vers le haut pour le voir, et
pourquoi il paraît "beaucoup trop grand". Aucun `::backdrop`, aucun
`showModal()` : ce ne sont pas des modales au sens du navigateur, juste
des blocs positionnés en dur.

---

## Correctif : appliquer le patron `<dialog>` canonique (déjà validé 3x)

Rappel du patron durci sur l'Agenda, à appliquer ici À L'IDENTIQUE :
1. Élément `<dialog>`, **jamais l'attribut `open` posé en HTML** —
   uniquement `showModal()` en JS (sinon mode non-modal : pas de top
   layer, pas de backdrop, pas de centrage — cause du bug M10c).
2. CSS du dialog : `border:none; padding:0; background:transparent;
   width:min(420px, calc(100vw - 32px)); margin:auto;` — **jamais**
   `width:100%`, jamais de `position:fixed` avec `top/right/bottom` en
   dur (incompatible avec le centrage natif).
3. `::backdrop` avec fond estompé + flou (`backdrop-filter:blur(3px)`).
4. **Ne jamais animer le `<dialog>` lui-même** (un `transform` sur
   l'élément casse le centrage top layer — bug M10b). Envelopper le
   contenu dans un `.habits__panel-card` / `.habits__pet-card` interne,
   et animer CE wrapper (`cal-modal-in` ou équivalent local).
5. Fermeture par bouton, Échap (natif au `<dialog>`), et clic sur le
   backdrop (`if (event.target === dialog) dialog.close()`).
6. Ouverture juste après un `render()` : utiliser un `requestAnimationFrame`
   avant `showModal()` si le dialog vient d'être recréé par le rendu
   global (leçon M10 : laisser le DOM se stabiliser avant d'appeler
   `showModal()` sur un élément neuf).

### Code à transplanter (structure JS attendue)

```js
function openHabitsPanelDialog() {
  requestAnimationFrame(() => {
    const dialog = rootContainer?.querySelector('[data-habits-panel-dialog]');
    if (dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal();
  });
}
function closeHabitsPanelDialog() {
  const dialog = rootContainer?.querySelector('[data-habits-panel-dialog]');
  if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
}
// idem pour openPetSettingsDialog / closePetSettingsDialog
```
Brancher ces fonctions sur les transitions d'état existantes
(`panelOpen`/`petSettingsOpen` passant à `true`/`false`), en plus du
`render()` déjà en place — le `render()` construit le HTML du dialog
(fermé), puis `openXxxDialog()` l'ouvre réellement juste après.

### CSS à transplanter (remplace le bloc `.habits__panel` actuel)

```css
.habits__panel,
.habits__panel--pet {
  border: none;
  padding: 0;
  background: transparent;
  color: var(--text-primary);
  width: min(420px, calc(100vw - 32px));
  margin: auto;
  position: static; /* le <dialog> natif gère tout — retirer position:fixed/top/right/bottom */
  max-height: min(80vh, 640px);
}
.habits__panel::backdrop,
.habits__panel--pet::backdrop {
  background: rgba(4, 10, 16, 0.55);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}
.habits__panel-card { /* wrapper interne — À CRÉER s'il n'existe pas */
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: var(--shadow);
  padding: 18px 16px;
  max-height: min(80vh, 640px);
  overflow: auto;
  box-sizing: border-box;
}
.habits__panel[open] .habits__panel-card,
.habits__panel--pet[open] .habits__panel-card {
  animation: panel-in var(--duration-normal, 320ms) var(--ease-out, cubic-bezier(.16,1,.3,1)) both;
}
@keyframes panel-in {
  from { opacity: 0; transform: translateY(12px) scale(.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
```
Retirer entièrement l'ancien bloc `@media` qui recalait le panneau en
`left/right/top: var(--space-2)` (style.css ~l.867) — il n'a plus lieu
d'être avec un `<dialog>` correctement centré, qui s'adapte nativement.

### HTML : envelopper le contenu existant

Dans `view-panels.js`, remplacer `<aside class="habits__panel ...">` par
`<dialog class="habits__panel" data-habits-panel-dialog>` et englober tout
le contenu actuel (header + form + liste) dans un
`<div class="habits__panel-card">...</div>` interne. Même traitement pour
`habits__panel--pet` → `data-pet-settings-dialog`.

---

## Périmètre
**IN :** `habits/view-panels.js` (markup dialog + wrapper card),
`habits/style.css` (bloc panel réécrit), `habits/index.js` ou
`habits-events.js` (fonctions open/close dialog branchées sur les
transitions d'état existantes).
**OUT :** logique métier (formulaire, onboarding animal, liste
d'habitudes), vue Aujourd'hui/Régularité déjà livrées en M12.

---

## Critères d'acceptation
- [ ] `grep -n "habits__panel.*open\"" src/modules/habits/view-panels.js`
      → aucune occurrence de dialog avec `open` posé en HTML.
- [ ] Rituel de contrôle : tout vert, build stable.
- [ ] Test manuel (Cédric, iPhone + Mac, 4 thèmes, scrollé à différentes
      positions avant d'ouvrir) :
  - « + Nouveau mouillage » → modale CENTRÉE à l'écran, peu importe la
    position de scroll, fond estompé/flouté ;
  - « ⚙️ Mon animal » → idem, centrée, fond flouté ;
  - taille de modale raisonnable (pas quasi pleine hauteur d'écran) ;
  - fermeture par bouton, Échap, clic sur le fond : les trois marchent ;
  - formulaire d'ajout d'habitude et réglages animal pleinement
    fonctionnels (aucune régression de logique) ;
  - mouvement réduit : modale centrée sans animation.

## Note ETAT.md
Consigner : patron `<dialog>` appliqué une 4e fois (Capture popover,
Agenda détail/composeur, Humeur — non concerné —, Habitudes). Confirmer la
règle ajoutée à `CHECKLIST-SORTIE-MODULE.md` : **toute refonte doit
recenser explicitement les panneaux/fenêtres annexes préexistants du
module et les convertir au même pattern**, pas seulement la vue
principale qui fait l'objet de la maquette.
