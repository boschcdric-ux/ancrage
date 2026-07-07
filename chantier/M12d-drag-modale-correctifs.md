# M12d — Habitudes : modale fantôme, scroll perdu au drop, FLIP muet

**Prérequis :** M12c. Trois bugs, trois causes auditées, correctifs précis.
**Durée :** ~1h30. **Risque :** faible (2 correctifs d'une ligne + 1
réécriture de fonction avec code fourni).

> Ajouter la ligne M12d au tableau de bord d'ETAT.md.

---

## Bug 1 — La modale se rouvre toute seule (« fantôme »)

**Cause (auditée, index.js ~l.500) :**
```js
rootContainer.addEventListener('close', onDialogClose);
```
**L'événement `close` d'un `<dialog>` NE BUBBLE PAS** (spécification
navigateur). Un écouteur délégué en phase bulle sur un ancêtre ne se
déclenche donc JAMAIS. Conséquence : `panelOpen`/`petSettingsOpen` ne
repassent jamais à `false` quand l'utilisateur ferme (bouton, Échap ou
backdrop) ; au prochain `render()` (n'importe quelle action ailleurs),
`syncDialogsAfterRender()` rouvre le dialog — la « modale fantôme ».

**Correctif (1 ligne) — écouter en phase CAPTURE, qui traverse les
ancêtres même pour les événements non-bubblants :**
```js
rootContainer.addEventListener('close', onDialogClose, true);
```
(Et symétriquement dans le nettoyage au démontage :
`removeEventListener('close', onDialogClose, true)` — le 3e argument doit
correspondre, sinon le listener n'est pas retiré.)
Vérifier que `onDialogClose` gère bien LES DEUX dialogs (habits-panel ET
pet-settings) — l'audit montre le premier (~l.478), confirmer le second.

## Bug 2 — Au relâché du drag, la modale « repart du haut »

**Cause (auditée, index.js ~l.112-115) :**
```js
onReorderEnd: (orderedIds) => {
  reorderHabits(orderedIds);
  render();          // <- détruit/recrée la modale ouverte -> scroll perdu
}
```
Le `render()` complet recrée le dialog, qui est rouvert par le sync —
d'où la vue réinitialisée en haut à chaque drop. Il est INUTILE : le DOM
de la liste est déjà dans le bon ordre (le drag l'a réordonné en direct).

**Correctif :** supprimer le `render()` — persister seulement :
```js
onReorderEnd: (orderedIds) => {
  reorderHabits(orderedIds);
}
```
Pour le repli clavier (↑/↓), qui lui ne réordonne pas le DOM par drag :
au lieu d'un `render()` complet, déplacer la ligne dans le DOM par
`insertBefore` (même mouvement que le drag) puis restaurer le focus sur
la ligne déplacée — pas de re-render de la modale, pas de scroll perdu.

## Bug 3 — Les lignes ne s'écartent pas pendant le drag

**Cause (auditée, core/list-drag-reorder.js) :** deux fragilités que la
vraie modale (scrollable, nombreuses lignes) révèle alors que la maquette
isolée les masquait :
1. Le rang saisi est ré-appendé en FIN de liste à chaque changement
   d'index (`listEl.appendChild(drag.row)`) → sa position de layout
   change → le `translateY(dy)` calculé depuis la position d'origine
   devient faux → sauts visuels et calculs d'index faussés.
2. Le FLIP des autres lignes utilise UN seul `requestAnimationFrame`
   entre l'état inversé et le retour — pattern connu pour rater la
   peinture selon le navigateur (leçon documentée du chantier : DOUBLE
   rAF, cf. Respiration M09c).

**Correctif : remplacer intégralement `startDrag`/`onDragMove` du module
partagé par la version robuste ci-dessous.** Principes : la position de
référence du rang saisi est son `offsetTop` (insensible aux transforms) ;
le rang saisi est déplacé par `insertBefore` À SA VRAIE PLACE (pas en fin
de liste) ; le transform est recalculé après chaque déplacement DOM pour
rester visuellement continu ; FLIP en double rAF.

```js
function startDrag(ev, row) {
  ev.preventDefault();
  const id = row.dataset.id;
  if (!id) return;
  drag = {
    id,
    row,
    pointerId: ev.pointerId,
    grabOffset: ev.clientY - row.getBoundingClientRect().top,
    order: getOrder()
  };
  row.setPointerCapture(ev.pointerId);
  row.classList.add('list-drag-reorder__row--dragging');
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd, { once: true });
}

function currentLayoutTop(row, listEl) {
  // offsetTop est relatif à l'offsetParent et IGNORE les transforms :
  // référence stable pour recalculer le transform après un insertBefore.
  return row.offsetTop - listEl.offsetTop + listEl.getBoundingClientRect().top;
}

function applyDragTransform(ev) {
  const listEl = drag.row.parentElement;
  const targetVisualTop = ev.clientY - drag.grabOffset;
  const layoutTop = currentLayoutTop(drag.row, listEl);
  drag.row.style.transform = `translateY(${targetVisualTop - layoutTop}px)`;
}

function onDragMove(ev) {
  if (!drag) return;
  const listEl = drag.row.parentElement;
  applyDragTransform(ev);

  const rows = [...listEl.querySelectorAll(rowSelector)];
  const others = rows.filter((r) => r !== drag.row);
  const pointerY = ev.clientY;
  const curIndex = drag.order.indexOf(drag.id);
  let targetIndex = curIndex;
  others.forEach((r) => {
    const rect = r.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    const idx = drag.order.indexOf(r.dataset.id);
    if (pointerY < mid && idx < curIndex) targetIndex = Math.min(targetIndex, idx);
    if (pointerY > mid && idx > curIndex) targetIndex = Math.max(targetIndex, idx);
  });
  if (targetIndex === curIndex) return;

  // FLIP : positions AVANT
  const before = new Map(others.map((r) => [r, r.getBoundingClientRect()]));

  // Mettre à jour l'ordre logique
  const [moved] = drag.order.splice(curIndex, 1);
  drag.order.splice(targetIndex, 0, moved);

  // Déplacer le rang saisi À SA PLACE (pas en fin de liste)
  const nextId = drag.order[targetIndex + 1];
  const nextEl = nextId
    ? listEl.querySelector(`${rowSelector}[data-id="${nextId}"]`)
    : null;
  listEl.insertBefore(drag.row, nextEl);

  // Recaler le transform du rang saisi (sa position de layout a changé)
  applyDragTransform(ev);

  // FLIP des autres : inversion puis retour, en DOUBLE rAF (leçon M09c)
  others.forEach((r) => {
    const prev = before.get(r);
    const next = r.getBoundingClientRect();
    const deltaY = prev.top - next.top;
    if (!deltaY) return;
    r.style.transition = 'none';
    r.style.transform = `translateY(${deltaY}px)`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        r.style.transition = '';
        r.classList.add('list-drag-reorder__row--settle');
        r.style.transform = '';
      });
    });
  });
}
```
`onDragEnd` reste comme aujourd'hui (nettoyage + `onReorderEnd([...
drag.order])`) — avec le bug 2 corrigé, il ne déclenche plus de render.

**Mettre à jour l'annexe** `chantier/annexes/composant-liste-drag-reorder.html`
avec cette même version robuste (c'est le composant de référence pour
Mémo — il doit porter la version corrigée, pas la fragile).

---

## Périmètre
**IN :** `core/list-drag-reorder.js` (réécriture startDrag/onDragMove),
`habits/index.js` (listener close en capture + onReorderEnd sans render +
repli clavier par insertBefore), annexe composant mise à jour.
**OUT :** tout le reste.

---

## Critères d'acceptation
- [ ] Rituel de contrôle : tout vert (dont `core/list-drag-reorder.test.js`
      adapté si besoin), build stable.
- [ ] Test manuel (Cédric, iPhone + Mac, 4 thèmes) :
  - **fermer la modale par bouton, Échap ET clic sur le fond, puis
    naviguer partout (Régularité, Aujourd'hui, autres modules)** : la
    modale ne réapparaît JAMAIS toute seule ;
  - pendant un drag : les autres lignes S'ÉCARTENT en glissant (mouvement
    fluide, pas de saut), le rang saisi suit le doigt sans à-coup même en
    traversant plusieurs positions ;
  - au relâché : la liste reste où elle est (pas de retour en haut de la
    modale), l'ordre est bon, et il persiste après fermeture/réouverture
    et rechargement ;
  - repli clavier ↑/↓ : la ligne se déplace, le focus la suit, pas de
    scroll perdu ;
  - drag dans une liste longue (8+ habitudes) avec la modale scrollée au
    milieu : comportement correct.

## Note ETAT.md
Consigner deux leçons de patron :
1. **L'événement `close` d'un `<dialog>` ne bubble pas** — toute
   délégation d'écoute doit être en phase capture (`addEventListener(...,
   true)`) ou attachée directement au dialog. À intégrer au patron
   canonique des modales (5e règle).
2. **Drag & drop : la référence de position d'un élément déplacé dans le
   DOM est `offsetTop`** (insensible aux transforms), et tout FLIP suit la
   règle du double rAF (même leçon que M09c, désormais transverse).
Composant annexé mis à jour = version de référence pour Mémo.
