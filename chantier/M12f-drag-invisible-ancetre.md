# M12f — Habitudes : ligne draguée invisible (vraie cause = ancêtre transformé)

**Prérequis :** M12e (qui n'a PAS résolu le problème — mauvais étage visé).
**Durée :** ~30 min. **Risque :** faible (correctif CSS ciblé).

---

## Pourquoi M12e n'a rien changé

M12e a promu **la ligne draguée** sur son propre calque GPU
(`will-change`, `translateZ`). Ça n'a rien fait car le problème ne vient
pas de la ligne : il vient d'un **ancêtre**.

## Diagnostic (audité, cause confirmée)

`.habits__panel-card` (et `.habits__pet-card`) cumule DEUX propriétés qui,
ensemble, déclenchent un bug de rendu WebKit iOS :
1. `overflow: auto` (conteneur scrollable — la carte de la modale) ;
2. l'animation d'entrée `habits-panel-in` en `fill-mode: both`, dont
   l'image finale est `transform: translateY(0) scale(1)`. Comme le mode
   est `both`, **ce `transform` reste appliqué en permanence** après la
   fin de l'animation (un `scale(1)` invisible mais bien présent au sens
   du moteur).

Un `transform` non-`none` sur un élément en `overflow:auto` crée un
contexte de composition/clip qui « capture » ses descendants. Sur
WebKit iOS, un descendant lui-même repositionné par `transform` à haute
fréquence (la ligne draguée) peut alors ne plus être peint du tout — il
disparaît. Le `will-change` posé sur la ligne (M12e) ne peut pas
contourner ça, car le contexte fautif est créé par l'ANCÊTRE, pas par la
ligne.

Preuve de cohérence : le drag fonctionne (position correcte), seule la
peinture échoue ; et le composant isolé (annexe) ne montrait pas le bug
car sa liste courte ne scrollait pas de la même façon et le contexte
n'était pas sollicité pareil.

---

## Correctif — supprimer le transform RÉSIDUEL de la carte

L'entrée animée reste souhaitable ; ce qu'on veut éliminer, c'est le
transform qui **persiste après** l'animation. Il suffit de retirer le
`transform` de l'image finale (`to`) de la keyframe : l'entrée
interpole toujours depuis l'état `from` (décalé + réduit) vers l'état de
repos, mais comme `to` ne mentionne plus `transform`, la propriété n'est
pas retenue et la carte revient à `transform: none` une fois l'animation
finie — le contexte de composition fautif disparaît.

```css
@keyframes habits-panel-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
  to {
    opacity: 1;
    /* PAS de transform ici : la carte revient à transform:none après
       l'entrée. Un transform résiduel sur un ancêtre en overflow:auto
       fait disparaître l'enfant draggé sur WebKit iOS. */
  }
}
```
(Même principe pour `habits-panel-fade-in` s'il portait un transform — ce
n'est pas le cas ici, il n'anime que l'opacité, donc rien à changer pour
le backdrop.)

**Vérifier après coup :** plus aucun `transform` résiduel non-`none` ne
doit subsister sur un ancêtre de la liste draguée une fois la modale
ouverte. En particulier, ne PAS « corriger » en ajoutant un
`transform: translateZ(0)` ou `will-change: transform` sur
`.habits__panel-card` ou `.habits__manage-list` : ce serait
contre-productif (on réintroduirait exactement l'ancêtre transformé qui
cause le bug). Le calque GPU de la LIGNE (M12e) peut rester, il est
inoffensif.

Si, contre toute attente, le bug persistait après ce correctif, tester
en dernier recours de retirer temporairement `overflow: auto` de la carte
pendant un drag actif (classe ajoutée au `pointerdown`, retirée au
`pointerup`) — mais le correctif de keyframe devrait suffire seul.

---

## Périmètre
**IN :** `habits/style.css` (keyframe `habits-panel-in`). Annexe
`composant-liste-drag-reorder.html` : **déjà mise à jour** avec le même
principe (transform retiré de l'image finale) — s'aligner dessus.
**OUT :** JS (inchangé), le calque GPU de la ligne de M12e (conservé).

---

## Critères d'acceptation
- [ ] `grep -n "scale(1)" src/modules/habits/style.css` sur la keyframe
      `habits-panel-in` : le `to` ne doit plus contenir de transform.
- [ ] Rituel de contrôle : tout vert.
- [ ] Test manuel **iPhone (prioritaire)** :
  - Habitudes → Gérer → Réorganiser → glisser une ligne lentement et
    rapidement : la ligne reste **visible en permanence**, aucune
    disparition ;
  - l'entrée de la modale reste animée (léger glissement + fondu) et
    correcte visuellement ;
  - drag dans une liste longue scrollée : correct ;
  - 4 thèmes ;
  - contrôle Mac : pas de régression de l'animation d'ouverture.

## Note ETAT.md
Consigner la leçon (transverse, importante) : **une animation d'entrée en
`fill-mode: both` dont l'image finale porte un `transform` laisse un
transform RÉSIDUEL permanent sur l'élément.** Combiné à `overflow:auto`,
cet ancêtre transformé fait disparaître un enfant draggé sur WebKit iOS.
Règle : les animations d'entrée de modale ne doivent pas retenir de
transform dans leur image finale (retirer `transform` du `to`, ou ne pas
utiliser `fill: both` sur un transform terminant à l'identité). À
intégrer au patron canonique des modales ET au patron de drag. Vraie
clôture de la série Habitudes après validation (M12 → M12f).
