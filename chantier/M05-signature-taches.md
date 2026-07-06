# M05 — Signature du module Tâches : la ligne de flottaison

**Prérequis :** M04 ✅ dans ETAT.md.
**Durée attendue :** une session (3–4 h). Mission la plus visuelle du chantier.
**Risque :** moyen — beaucoup de CSS/markup, mais la logique métier est intouchable.

> Avant de commencer : ajouter la ligne M05 au tableau de bord d'ETAT.md.

---

## L'état cible : la maquette annexée

Le fichier **`chantier/annexes/maquette-M05-taches.html`** est l'état cible
visuel et comportemental de cette mission. Il a été validé par Cédric.
L'ouvrir dans un navigateur et l'utiliser AVANT de coder : cocher des
tâches et des sous-tâches, déplier une tâche, filtrer, utiliser
l'amnistie, tout terminer pour voir l'ancre, basculer les 4 thèmes et
le mode mouvement réduit.

**RÈGLE DE LECTURE DE LA MAQUETTE — la plus importante de la mission :**
- Le **HTML et le CSS** de la maquette sont la référence à transposer
  (structures, classes à adapter au préfixe `tasks__` existant, tokens,
  animations, textes).
- Le **JavaScript** de la maquette est du code de démonstration jetable.
  NE PAS le copier : le vrai module a déjà toute sa logique
  (`tasks/index.js`) et son système de rendu. On adapte la présentation
  au moteur existant, jamais l'inverse.

---

## Périmètre

**IN :**
- `src/modules/tasks/view.js` : structures HTML générées (en-tête avec
  ligne de flottaison, chips avec compteurs, items, sous-tâches, bannière
  amnistie, états vides, ancre d'en-tête). Ajout de fonctions PURES de
  dérivation d'affichage (voir §Fonctions de vue).
- `src/modules/tasks/style.css` : réécriture libre pour atteindre la
  maquette. Objectif secondaire : y résorber les 11 `!important` et le
  doré `#c9a227` en dur (découverte M04) au profit des tokens.
- `src/core/styles.css` : ajout des 3 tokens eau dans CHACUN des 4 blocs
  de thème (valeurs verbatim au §Tokens eau).
- `src/modules/tasks/index.js` : UNIQUEMENT le câblage de présentation
  (voir §Câblage autorisé). Tout le reste du fichier est interdit.

**OUT (interdit) :**
- Toute modification du modèle de données, des clés de stockage, de la
  normalisation, du tri/filtrage métier, de l'archivage, de l'amnistie
  (leur LOGIQUE ; leur APPARENCE est IN).
- Tout autre module. Le widget dashboard du module tasks
  (`createDashboardPreview`) reste tel quel — si une mini-vague y serait
  jolie, le noter en découverte, ne pas le faire.
- Les gestes/transitions du shell.

---

## Tokens eau (à ajouter verbatim dans core/styles.css)

Dans chaque bloc de thème, après `--shadow-soft` :

```css
/* encre */
--water-front: rgba(69, 224, 176, 0.30);
--water-back:  rgba(69, 224, 176, 0.14);
--water-glow:  rgba(69, 224, 176, 0.10);
/* garrigue */
--water-front: rgba(77, 107, 60, 0.30);
--water-back:  rgba(77, 107, 60, 0.14);
--water-glow:  rgba(77, 107, 60, 0.08);
/* crepuscule */
--water-front: rgba(240, 163, 94, 0.28);
--water-back:  rgba(240, 163, 94, 0.13);
--water-glow:  rgba(240, 163, 94, 0.09);
/* maree */
--water-front: rgba(20, 107, 102, 0.30);
--water-back:  rgba(20, 107, 102, 0.14);
--water-glow:  rgba(20, 107, 102, 0.07);
```

---

## Fonctions de vue (pures, dans view.js)

Deux fonctions de DÉRIVATION d'affichage, sans état ni effet de bord,
transposées de la maquette :

1. `computeTideProgress(tasks)` → nombre 0..1.
   « Commencer compte » : une tâche faite vaut 1 ; une tâche non faite
   avec sous-tâches vaut `(sous-tâches faites / total) × 0.6` ;
   le résultat est la moyenne sur toutes les tâches.
2. `tideLabel(progress, allDone)` → chaîne parmi, verbatim :
   `mer étale` (≤ 0,02) · `la mer monte` (< 0,45) ·
   `la marée est belle` (< 0,85) · `presque marée haute` (≥ 0,85) ·
   `journée tenue` (allDone).

Ces deux fonctions reçoivent des tests unitaires (cas limites : liste
vide, tout fait, sous-tâches partielles). Rappel de la règle des
standards : les tests doivent être ramassés par `npm run test:unit`.

Textes des états vides, verbatim :
- Liste vide : titre `Mer libre.` — sous-texte
  `Rien à faire n'est pas rien. Pose une pensée quand elle vient.`
- Filtre sans résultat : titre `Rien sous ce filtre.` — sous-texte
  `La mer est calme de ce côté.`
- Amnistie effectuée : `Pardonné. Demain est une autre marée.`

---

## ⚠️ Le piège central : animations de récompense × re-rendu innerHTML

Le module re-rend sa liste par `innerHTML` à chaque changement. Si les
animations de récompense (trait qui se dessine, anneaux, ancre qui tombe)
sont attachées naïvement à l'état `.done`, alors **chaque re-rendu les
rejouera sur TOUTES les tâches déjà faites** — cacophonie garantie.

La solution est déjà dans le module : le mécanisme `highlightedTaskId`
(utilisé aujourd'hui pour `animate-bounce-in`). Règle stricte :

- Les animations de RÉCOMPENSE (dessin du trait, anneaux concentriques,
  gonflement de l'eau `swell`, tick du compteur) ne s'appliquent QUE via
  une classe portée par la tâche fraîchement cochée
  (ex. `tasks__item--just-done`, posée grâce à `highlightedTaskId`).
- Une tâche déjà faite rendue à nouveau s'affiche directement à l'état
  FINAL : coche pleine, trait `stroke-dashoffset: 0`, aucune animation.
- Les anneaux sont réalisés en pseudo-éléments (`::before`/`::after`)
  de la case de la tâche `--just-done` (animation `forwards`), pas en
  éléments injectés par JS — ainsi le re-rendu ne laisse aucun orphelin.
- Même principe pour l'ancre d'en-tête : elle n'anime sa chute (et son
  clapotis) que lors de la TRANSITION vers « tout fait » ; si la vue est
  re-rendue alors que tout était déjà fait, l'ancre s'affiche posée,
  sans rejouer la chute.
- La transition de hauteur de l'eau, elle, est portée par un nœud STABLE
  (l'en-tête n'est pas re-rendu par `innerHTML` à chaque toggle — si le
  code actuel re-rend l'en-tête, ne mettre à jour que la variable CSS
  `--level` et les textes via des mises à jour ciblées, pattern déjà
  présent dans renderList pour d'autres nœuds).

## Câblage autorisé dans index.js

Strictement limité à :
- passer aux fonctions de vue les valeurs dérivées nécessaires
  (progression, libellé de marée, id de la tâche fraîchement cochée) ;
- mettre à jour la variable CSS `--level` et déclencher les classes
  d'animation (`swell`, tick) au bon moment ;
- respecter `prefers-reduced-motion` : si actif, aucune classe
  d'animation n'est posée, l'eau change de hauteur sans transition.

Aucune autre ligne d'index.js ne doit apparaître dans le diff.

---

## Détails de fidélité (extraits de la maquette, à respecter)

- En-tête : titre en `--font-display`, compteur `tabular-nums` en
  `--accent`, libellé de marée en `--text-secondary`.
- Houle : deux vagues SVG superposées, dérive lente (14 s / 9 s inversées),
  arrêtée en mouvement réduit.
- Chips de filtre : compteur du RESTANT uniquement (pas du fait), masqué
  à zéro ; chip active en `--accent-soft`/`--accent`.
- Tâches faites : coulent en bas de la liste affichée (tri d'AFFICHAGE
  dans la vue, sans toucher au tri métier), opacité 0,72, texte barré fin.
- Amnistie : bannière en pointillés, sortie `pardon` douce SANS anneaux
  ni gonflement — le pardon ne se célèbre pas comme une victoire.
- Étoile priorité : opacité 0,35 → 1 + léger scale quand active.
- Pastille de tag colorée à droite (couleurs des tags conservées).

---

## Critères d'acceptation

- [ ] Rituel de contrôle : tout vert, nouveaux tests inclus dans test:unit.
- [ ] `git diff src/modules/tasks/index.js` relu ligne à ligne : rien
      d'autre que le câblage autorisé.
- [ ] Zéro `!important` restant dans `tasks/style.css` ; zéro `#c9a227`.
- [ ] Scénario manuel (Cédric) : cocher → trait + anneaux + montée + tick,
      UNE seule fois, sur LA tâche cochée seulement ; cocher une
      sous-tâche → petite montée ; tout finir → ancre + clapotis +
      « journée tenue » ; décocher → l'ancre se retire sans animation
      parasite ; re-cocher → elle retombe ; amnistie → sortie douce +
      message ; filtres avec compteurs ; états vides.
- [ ] Les 4 thèmes : la signature est belle et lisible dans chacun.
- [ ] Mouvement réduit (réglage système OU DevTools) : aucune houle,
      aucune chute, l'eau change de niveau instantanément, tout reste
      fonctionnel.
- [ ] Bundle : delta CSS du chunk tasks consigné ; JS d'entrée stable ±2 KB.
