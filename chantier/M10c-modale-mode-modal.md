# M10c — Agenda : la modale n'est pas en mode modal (top layer)

**Prérequis :** M10b. Correctif final de la refonte Agenda. Validation
groupée M10 + M10b + M10c ensuite.
**Durée :** ~40 min. **Risque :** faible, cause unique identifiée.

---

## Diagnostic (audité — UNE cause, TROIS symptômes)

Symptômes rapportés : la modale « + Poser » (et le détail) (1) apparaît en
HAUT au lieu du centre, (2) laisse voir le contenu de la page derrière
(pas de fond estompé), (3) est chevauchée par le bouton « + Poser ».

**Cause racine unique, vérifiée dans `calendar/view.js` :**
Le dialog est rendu en HTML AVEC l'attribut `open` :
```js
// view.js ~l.405
<dialog class="cal__composer" data-cal-composer-dialog ${state.open ? 'open' : ''}>
// et ~l.372 pour le détail
<dialog class="cal__detail" data-cal-detail-dialog open>
```
Un `<dialog open>` posé par HTML s'ouvre en mode **NON-MODAL** : c'est un
bloc normal dans le flux, **sans top layer, sans `::backdrop`, sans
centrage**. Seul `dialog.showModal()` (appelé par JS) active le mode modal
(top layer + backdrop + centrage natif).

Aggravant : `openComposerDialog()`/`openDetailDialog()` gardent l'appel
derrière `if (!dialog.open)` (index.js ~l.480, 487). Comme le HTML a déjà
posé `open`, la condition est fausse → **`showModal()` n'est JAMAIS
appelé**. La modale reste donc en mode page normale. Les trois symptômes
en découlent directement.

---

## Correctif

### 1. Le HTML ne pose JAMAIS `open` (view.js)
Les deux `<dialog>` sont rendus SANS attribut `open`, quel que soit l'état :
```js
// détail
return '<dialog class="cal__detail" data-cal-detail-dialog></dialog>';
// (version remplie)
`<dialog class="cal__detail" data-cal-detail-dialog> ... </dialog>`
// composeur
`<dialog class="cal__composer" data-cal-composer-dialog> ... </dialog>`
```
L'ouverture est UNIQUEMENT pilotée par `showModal()` en JS. L'état
`state.open` continue de décider s'il faut APPELER l'ouverture, mais ne
pose plus l'attribut sur l'élément.

### 2. Ouvrir vraiment en modal (index.js)
Comme le dialog n'est plus jamais `open` via HTML, la garde `!dialog.open`
fonctionne. Vérifier que `openComposerDialog()` et `openDetailDialog()`
appellent bien `showModal()` après le `render()` (le `requestAnimationFrame`
existant est correct puisque le dialog est recréé par `render()`).

**Point de vigilance (leçon connue) :** `render()` réécrit `innerHTML`, ce
qui DÉTRUIT le dialog et le recrée fermé. Donc l'ordre `render()` PUIS
`showModal()` dans un `requestAnimationFrame` est correct — mais si un
autre `render()` survient pendant que la modale est ouverte, elle se ferme.
Vérifier qu'aucun `render()` n'est déclenché tant qu'une modale est
ouverte (sinon, la rouvrir après). Au besoin, après un `render()` dont
l'état indique une modale ouverte, ré-appeler `showModal()`.

### 3. Masquer « + Poser » quand une modale est ouverte (demande Cédric)
Le bouton sticky `.cal__addbtn` chevauche la modale et fait doublon (la
modale a son propre bouton d'enregistrement). Le masquer dès qu'une modale
est ouverte. Deux options :
- **CSS (préféré)** : quand le composeur ou le détail est ouvert, un état
  sur le conteneur `.cal` (ex. classe `cal--modal-open` posée en JS à
  l'ouverture, retirée à la fermeture) masque le bouton :
  ```css
  .cal--modal-open .cal__addbtn { display: none; }
  ```
- Ou piloter `hidden` sur le bouton en JS aux ouvertures/fermetures.

Choisir l'option qui s'intègre le plus proprement au cycle
open/close/render existant. S'assurer que le bouton REVIENT à la fermeture
de la modale (bouton, Échap, clic backdrop).

---

## Périmètre
**IN :** `calendar/view.js` (retrait de `open` sur les 2 dialogs),
`calendar/index.js` (garantir `showModal()`, gérer l'état
`cal--modal-open`), `calendar/style.css` (masquage `.cal__addbtn`).
**OUT :** logique métier, autres modules, socle.

---

## Critères d'acceptation
- [ ] `grep -n "data-cal-composer-dialog open\|data-cal-detail-dialog open"
      src/modules/calendar/view.js` → aucune occurrence de dialog avec `open`.
- [ ] Rituel de contrôle : tout vert, build stable.
- [ ] Test manuel (Cédric, iPhone + Mac, 4 thèmes) :
  - ouvrir « + Poser » depuis le BAS de la vue (scrollé en bas) → la
    modale apparaît CENTRÉE au milieu de l'écran, pas en haut ;
  - le fond derrière est ESTOMPÉ/flouté — on ne lit plus le contenu de la
    page à travers ;
  - le bouton « + Poser » sticky DISPARAÎT tant que la modale est ouverte,
    REVIENT à la fermeture ;
  - idem pour la modale de détail d'un événement ;
  - fermeture Échap / clic backdrop / bouton : OK, focus rendu ;
  - « Plus d'options » déplie sans chevauchement parasite.
- [ ] Mouvement réduit : modale centrée, sans animation.

## Note ETAT.md
Consigner dans le patron canonique des modales : **un `<dialog>` ne doit
JAMAIS recevoir l'attribut `open` via HTML — toujours l'ouvrir par
`showModal()` en JS**, sinon il s'affiche en mode non-modal (pas de top
layer, pas de backdrop, pas de centrage). Compléter la règle « ne pas
animer le dialog lui-même » (M10b). Fin de la refonte Agenda.
