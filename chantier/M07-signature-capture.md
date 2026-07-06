# M07 — Signature du module Capture : la goutte

**Prérequis :** série Tâches (M05 + M05b + M06) ✅ validée dans ETAT.md.
**Durée attendue :** une session (3–4 h).
**Risque :** moyen. Périmètre présentation + deux décisions produit actées
(voir §Décisions). Les leçons de la série Tâches sont intégrées d'emblée.

> Avant de commencer : ajouter la ligne M07 au tableau de bord d'ETAT.md.

---

## L'état cible : la maquette annexée

**`chantier/annexes/maquette-M07-capture.html`** — validée par Cédric.
L'ouvrir et l'utiliser AVANT de coder : capturer une pensée (bouton et
Cmd/Ctrl+Entrée), enchaîner plusieurs captures, ouvrir/fermer le menu tag,
supprimer une capture, filtrer, replier/déplier « voir plus », basculer
les 4 thèmes et le mode mouvement réduit.

**RÈGLE DE LECTURE DE LA MAQUETTE :**
- HTML/CSS = référence à transposer (structures, tokens, animations, textes).
- JavaScript = démonstration jetable. NE PAS le copier. Le vrai module a
  déjà sa logique (`capture/index.js`) et son rendu. On adapte la
  présentation au moteur existant.
- **Détail important** : la maquette remplace le `<form>` par un `<div>` +
  bouton `click`, UNIQUEMENT parce que l'aperçu d'artefact bloque la
  soumission de formulaire. **Le vrai module GARDE son `<form>`
  (`data-capture-form`) et son `onFormSubmit`** — ne pas le dégrader.

---

## L'intention (différente de Tâches)

Dans Tâches, l'eau MONTE : elle mesure la progression. Dans Capture,
l'eau ne monte pas — capturer n'est pas accomplir, c'est **se délester**.
La surface reste basse, calme, constante : elle reçoit. La pensée tombe
en goutte, l'onde s'ouvre à l'impact, la surface se referme.
**L'onde EST la confirmation** — pas de toast qui saute à l'écran.

Vocabulaire : le titre « Capture », sous-titre « Dépose la pensée. L'eau
la garde, ta tête est libre. » ; la liste des récentes s'appelle
« Sous la surface » ; état vide « Surface claire. Aucune pensée ne
t'attend ici. C'est une bonne nouvelle. »

---

## Périmètre

**IN :**
- `src/modules/capture/view.js` : structures HTML (carte capture avec
  couche décorative, surface d'eau, sélecteur de tag, liste, items,
  filtres, états vides).
- `src/modules/capture/style.css` : réécriture pour atteindre la maquette.
  Résorber au passage tout `!important` et toute couleur en dur au profit
  des tokens (à recenser d'abord par grep).
- `src/modules/capture/index.js` : câblage de présentation (voir §Câblage),
  + les deux décisions produit du §Décisions, + l'animation de goutte.

**OUT (interdit) :**
- Modèle de données, clés de stockage, sync PocketBase, logique de
  filtrage/édition métier.
- Tout autre module. Le badge partagé `shared-tag-badge` (utilisé aussi
  ailleurs) ne doit pas changer d'apparence globale — si retouche, la
  scoper au module capture.

---

## Décisions produit actées (à implémenter)

1. **Plus aucune limite de saisie.** Retirer `maxlength="280"` du textarea
   dans `view.js`. La capture ne refuse jamais une pensée — c'est le
   contrat « ne jamais perdre une pensée » appliqué à la saisie. Le
   compteur de caractères devient purement informatif : masqué avant
   200 caractères, puis « N caractères » sans couleur d'alerte, sans
   jugement.

2. **Plus de plafond silencieux de stockage.** Actuellement
   `MAX_STORED_CAPTURES = 100` (index.js ligne ~6) tronque silencieusement
   les captures les plus anciennes à chaque `persistCaptures()`
   (`captures.slice(0, MAX_STORED_CAPTURES)`). C'est une perte silencieuse,
   contraire au contrat du produit et à l'usage réel (les captures
   s'accumulent sans être traitées). **Retirer le `.slice(...)`** : on
   persiste toutes les captures. La lisibilité est déjà gérée par le repli
   de liste (« voir X de plus »). Depuis M02, une éventuelle saturation du
   stockage est signalée par toast, plus jamais silencieuse.
   Ajouter/adapter un test : `persistCaptures` ne tronque plus.

---

## Câblage de présentation (index.js)

- **Sélecteur de tag à la création** : le module a déjà `formTagId` et
  `createCaptureTagField` — adapter leur PRÉSENTATION à la maquette
  (bouton 🏷 + menu animé), sans réinventer la logique de sélection
  existante. Réutiliser `PREDEFINED_TAGS`.
- **Animation de goutte** : à l'ajout réussi d'une capture, jouer la
  séquence goutte → ondes d'impact → clapotis de surface + confirmation
  textuelle « Posée. » (`aria-live`), comme dans la maquette. La goutte et
  les ondes sont injectées dans une **couche décorative dédiée**
  (`.cap__layer`, `overflow:hidden`) SÉPARÉE du contenu interactif — voir
  §Overflow.
- **Focus** : après capture, le focus retourne dans le textarea (enchaîner
  les captures sans toucher l'écran ailleurs).
- **Cmd/Ctrl+Entrée** dans le textarea = soumettre (en plus du bouton).
- Respecter `prefers-reduced-motion` : pas de goutte ni de clapotis, la
  confirmation textuelle « Posée. » suffit ; la surface ne dérive pas.

Aucune autre ligne d'index.js hors de ce câblage.

---

## ⚠️ Les trois leçons de la série Tâches (appliquées d'emblée)

**1. Overflow — séparer décor et interactif.** La carte capture contient
DEUX besoins contradictoires : rogner le décor (goutte, ondes, surface
d'eau dans les coins arrondis) ET laisser déborder le menu tag. Solution
imposée : une couche décorative `.cap__layer` en `position:absolute;
inset:0; overflow:hidden` porte le décor ; la carte elle-même reste en
`overflow:visible`. Le menu tag n'est jamais dans une zone `overflow:hidden`.

**2. Contexte d'empilement — ne pas emprisonner le menu.** Ne PAS mettre
`isolation:isolate` sur la carte (ça emprisonnerait le `z-index` du menu,
qui passerait alors sous la carte suivante). Le sélecteur de tag porte son
propre `z-index` élevé (`.tagpick { position:relative; z-index:35 }`) et
le menu un `z-index` supérieur au reste. Vérifier : menu ouvert, il passe
AU-DESSUS de la carte « Sous la surface ».

**3. Handlers de délégation — lister les zones d'emblée.** Le
`onPointerDown` (fermeture au clic extérieur) et les handlers de clic
doivent reconnaître TOUTES les zones interactives du sélecteur de tag
(`.tagpick`, le bouton déclencheur, les items du menu) pour ne pas se
fermer au premier clic dedans. Vérifier par grep que les `data-*` /
classes utilisés par les handlers correspondent EXACTEMENT au HTML produit
par le view.js (le décalage attendu/produit avait causé le bug M05b).

---

## Détails de fidélité (maquette)

- Carte capture : titre `--font-display`, textarea en `--bg-tertiary`
  avec anneau de focus `--water-glow`.
- Surface d'eau : deux vagues SVG (dérive 16 s / 11 s inversées), basse et
  constante, clapotis `bob` au moment de l'impact seulement.
- Goutte : ~420 ms, part du bas du textarea, tombe jusqu'à la surface ;
  deux ondes d'impact concentriques `forwards`.
- Menu tag : ouverture vers le HAUT (`bottom: calc(100% + 6px)`), animation
  d'émergence (opacity + translate + scale léger, `--duration-fast`),
  `max-height` avec défilement interne en sécurité.
- Filtres : chips avec compteur du total par tag (masqué à zéro), chip
  active en `--accent-soft`/`--accent`.
- Items : badge tag optionnel, texte, date relative (« aujourd'hui · HH:MM »,
  « hier », « 3 juin »), actions modifier/supprimer ; suppression = l'item
  « coule » (`sink`).
- Repli de liste : « Voir X de plus » / « Replier ».

---

## Critères d'acceptation

- [ ] Rituel de contrôle : smoke 20/20, unit tous verts (+ test « pas de
      troncature »), lint 0, build stable (±2 KB gzip).
- [ ] `git diff src/modules/capture/index.js` relu : uniquement le câblage
      de présentation + les deux décisions produit + l'animation. Reste intact.
- [ ] `maxlength` retiré du textarea ; `MAX_STORED_CAPTURES`/`.slice`
      retiré de la persistance.
- [ ] Zéro `!important` restant dans `capture/style.css` ; couleurs par tokens.
- [ ] Test manuel (Cédric, iPhone + Mac, 4 thèmes) :
  - capturer (bouton ET Cmd+Entrée) → goutte + ondes + « Posée. » ;
    l'item fait surface ; focus revenu dans le champ ;
  - texte très long (> 280) accepté sans blocage ; compteur informatif
    apparaît après 200, sans alerte ;
  - **menu tag ouvert = visible en entier, AU-DESSUS de la carte suivante**,
    dans les 4 thèmes, sur mobile ≤ 380 px ;
  - choisir un tag → appliqué ; « Aucun tag » → retiré ; le menu se ferme
    au clic extérieur sans avaler le premier clic ;
  - supprimer une capture → elle coule ; filtres + compteurs ; état vide ;
  - repli/dépli « voir plus ».
- [ ] Mouvement réduit : pas de goutte ni de dérive ; « Posée. » sert de
      confirmation ; tout reste fonctionnel.

---

## Note ETAT.md (fin de mission)
Consigner les deux décisions produit (fin des limites de saisie et de
stockage) et confirmer que les trois leçons Tâches (overflow, empilement,
handlers) ont été appliquées préventivement — objectif : pas de M07b.
