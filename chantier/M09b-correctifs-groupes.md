# M09b — Corrections groupées Capture & Respiration (4 points audités)

**Prérequis :** M09 exécutée (⏳ — M09b la finalise ; validation groupée
M09 + M09b ensuite). Protocole v2 : un audit, une mission, quatre correctifs.
**Durée attendue :** ~1 h 30. **Risque :** faible à moyen (le point 3 est
structurel mais bien délimité).

> Ajouter la ligne M09b au tableau de bord d'ETAT.md.

---

## Correctif 1 — Capture : zoom automatique iOS sur le champ

**Cause (auditée) :** `capture/style.css` ligne ~80 : `.capture__input
{ font-size: 0.96rem }` ≈ 15,4 px. Safari iOS zoome automatiquement sur
tout champ de saisie dont la police est < 16 px.
**Correctif :** `font-size: max(1rem, 16px);` sur `.capture__input`
(et sur tout autre champ de saisie du module capture s'il en existe).
On ne touche PAS au viewport (`user-scalable=no` interdit — accessibilité).
**Note ETAT.md :** règle générale à consigner pour la mission balai
d'harmonisation : TOUS les champs de saisie de l'app à ≥ 16 px.

## Correctif 2 — Capture : fermer le clavier après capture sur mobile

**Cause (auditée) :** `capture/index.js` ligne ~534 : `input.focus()`
après l'ajout — voulu pour enchaîner au clavier sur desktop, mais sur
iPhone il maintient le clavier ouvert et masque l'animation de la goutte.
**Correctif :** différencier par type de pointeur :

```js
const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
if (coarsePointer) input.blur();
else input.focus();
```

(Appliquer au chemin d'AJOUT ~l.534. Le chemin d'édition ~l.521 garde
`input.focus()` tel quel : on reste dans le champ pour corriger.)

## Correctif 3 — Respiration : l'eau saute au lieu de couler (structurel)

**Cause (auditée, chemin d'exécution tracé) :** à chaque frontière de
phase, `onPhaseBoundary()` (~l.362) appelle `render({applyPhase:true})`
→ `rootContainer.innerHTML = createBreathingView(...)` (~l.328) : la
carte-mer est DÉTRUITE et RECRÉÉE, puis `setWater()` pose le niveau sur
l'élément neuf. Insertion + changement de style dans la même frame =
aucune transition (le navigateur ne peint que l'état final). La maquette
animait parce que l'élément mer PERSISTAIT.

**Correctif structurel : zéro `innerHTML` pendant une session.**
- `onPhaseBoundary()` ne doit PLUS appeler `render()`. À la place, une
  fonction de mutation ciblée `applyPhaseToDom()` qui, sur le DOM
  existant : met à jour le texte de phase (`.breathing__phase-word` ou
  équivalent), le compte à rebours, le compteur de cycles, la classe
  `breathing__sea-card--holding` (le toggle existe déjà ~l.358), puis
  appelle `onPhaseStart(phase, dur)` (son + eau). `updateLiveDom()`
  existant peut servir de base — l'étendre.
- `render()` complet reste réservé aux CHANGEMENTS D'ÉCRAN
  (idle→running→paused→complete) et aux réglages hors session.
- Cas particulier déjà présent : le toggle du son en cours de session
  (~l.554) appelle `render({applyPhase:true})` — le remplacer par la même
  mutation ciblée (sinon il recasse la transition en pleine séance).
- Vérifier que `setWater` cible bien l'élément persistant
  (`[data-breathing-sea]`) et que la transition CSS `height` avec
  `--breath-ms`/`--breath-ease` est en place dans style.css (acquis M09).

**Anti-régression :** dérouler mentalement une session 4-7-8 complète :
aucune ligne ne doit reconstruire le DOM entre `startSession()` et
`finishSessionSuccess()`.

## Correctif 4 — Respiration : la ligne de progression et les coins arrondis

**Constat :** la ligne de session pleine largeur (`top:0`) bute dans les
coins arrondis de la carte.
**Correctif :** la transformer en pilule insérée avec piste :

```css
.breathing__session-track {
  position: absolute; top: 10px; left: 14px; right: 14px;
  height: 4px; border-radius: var(--radius-full);
  background: var(--bg-tertiary); z-index: 3;
}
.breathing__session-bar {
  height: 100%; width: var(--session, 0%);
  border-radius: inherit; background: var(--accent);
  transition: width 1s linear;
}
```

Adapter le markup (la piste enveloppe la barre). En mouvement réduit, la
transition de largeur peut rester (1 s linéaire, non vestibulaire) — pas
d'exigence particulière.

---

## Périmètre
**IN :** `capture/style.css` (font-size), `capture/index.js` (blur/focus),
`breathing/index.js` (mutations ciblées, fin des innerHTML en session),
`breathing/view.js` + `breathing/style.css` (pilule de progression).
**OUT :** moteur de phases/timers (les durées et l'ordre ne changent pas),
son (fonctionne), programmes, persistance, tout autre module.

---

## Critères d'acceptation
- [ ] Rituel de contrôle : tout vert, build stable.
- [ ] Test manuel (Cédric, iPhone + Mac, 4 thèmes) :
  - **iPhone :** taper dans le champ capture (popover ouvert ou non) →
    AUCUN zoom automatique ; capturer → le clavier SE FERME et la goutte
    est visible ; **Mac :** le focus reste dans le champ après capture ;
  - **Respiration :** programme Dormir 4-7-8 → l'eau MONTE en 4 s
    (fluide), SE TIENT 7 s (halo), DESCEND en 8 s (fluide) — aucune
    téléportation, y compris après bascule du son en pleine séance ;
  - la pilule de progression est décollée des bords, piste visible,
    remplissage régulier ;
  - pause/reprendre/terminer, « Mer étale. », mouvement réduit
    (compte à rebours textuel) : intacts.

## Note ETAT.md
Consigner : (a) règle app-wide « champs de saisie ≥ 16 px » pour la
mission balai ; (b) leçon d'architecture pour les futures signatures
animées : **une animation CSS exige un élément persistant — tout module
dont le moteur re-rend par `innerHTML` doit passer aux mutations ciblées
pendant les états animés** (à vérifier dans l'audit pré-mission des
prochaines signatures, Habitudes notamment).
