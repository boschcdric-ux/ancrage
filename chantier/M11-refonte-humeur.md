# M11 — Refonte du module Humeur : l'état de la mer

**Prérequis :** aucun autre chantier en cours. Mission longue et délicate
(moteur Canvas + refonte complète). **Durée attendue :** grosse session
(4-5 h), découpée en commits (voir §Découpage).
**Risque :** élevé — moteur Canvas persistant + refonte totale de
présentation. Protocole v2 strict : maquette annexée intégralement
fonctionnelle, code à transplanter presque tel quel (peu de réinvention
laissée à l'appréciation).

> Ajouter la ligne M11 au tableau de bord d'ETAT.md.

---

## L'état cible : la maquette annexée

**`chantier/annexes/maquette-M11-humeur.html`** — testée et validée en
profondeur par Cédric (concept, animation, débit du geste, 4 thèmes,
mouvement réduit). **Le JS de cette maquette est du code à transplanter
presque intégralement**, pas une description à réinterpréter — le moteur
Canvas notamment ne doit PAS être réécrit "à l'esprit", il doit être repris
quasi tel quel (adapter uniquement l'intégration au module réel : lecture/
écriture du modèle de données, branchement sur le rendu existant).

---

## Le concept (rappel pour contexte, la maquette fait foi)

L'humeur n'est plus une note sur 5 avec un emoji : c'est un **état de mer**.
- **Humeur = la lumière** (couleur du ciel et du soleil, sombre → claire).
- **Énergie = l'amplitude de la houle de fond** (plate → vive).
- Composer sa mer se fait via deux rangées de boutons (échelles 1-5
  existantes, PAS de nouveau modèle de données).
- **Aucune combinaison n'est jugée** : une mer d'huile sous un ciel doux
  n'est pas un échec, c'est un état comme un autre.
- La scène est un **océan vivant en Canvas** : houle légère + reflet de
  soleil qui scintille en PERMANENCE (l'appareil cible encaisse ça sans
  effort — ne pas figer par excès de prudence). Au moment de consigner,
  une **vague-soliton** traverse la scène et vient s'échouer à droite dans
  une gerbe d'écume (physique de Gerstner : orbites réelles, crêtes
  pointues, creux larges), puis tout retombe au régime de repos.
- **Historique = galerie multi-périodes** (Semaine / Mois / 3 mois /
  Année), pas une courbe. Sur les échelles au-delà de la semaine, les
  jours sont **agrégés en moyennes** (mood/energy arrondis).

---

## ⚠️ Le piège le plus critique de cette mission (audité, confirmé)

### Le module réel re-rend TOUT le DOM à chaque tap — ce qui détruirait le canvas

**Audit fait sur `mood/index.js` :** `refreshView()` (~l.369) fait
`rootContainer.innerHTML = createMoodView(...)` — un rendu complet. Et ce
qui est **spécifiquement dangereux ici** (pire que dans les modules
précédents) : le clic sur un bouton `[data-mood-select]` (choisir une
valeur d'humeur OU d'énergie, ~l.444-451) appelle `refreshView()`
**directement**, à chaque tap.

Si l'intégration suit ce chemin sans modification, **chaque tap sur les
curseurs détruirait et recréerait le `<canvas>`** — perte de l'état de
simulation en cours, redémarrage brutal de la boucle de repos, flash
visuel potentiel, et gaspillage de calcul à chaque interaction anodine.
C'est la même famille de piège que Respiration (élément animé qui doit
être persistant), mais avec un enjeu plus grand : ici il y a un **état
JS interne non-sérialisable** (position des gouttes, phase de simulation)
qui ne survivrait tout simplement pas à une recréation.

**Correctif obligatoire :** le clic sur `[data-mood-select]` (humeur ET
énergie) NE DOIT JAMAIS appeler le `refreshView()` global. Il doit
seulement :
1. mettre à jour `selectedMood` / `selectedEnergy` en mémoire ;
2. appeler une fonction dédiée et minimale, du type
   `applyMoodToScene(selectedMood, selectedEnergy)`, qui met à jour
   UNIQUEMENT les variables CSS de la scène (`--sky-top`, `--sky-bot`,
   `--sun`) et la variable JS `baseAmpMul` du moteur Canvas — **sans
   toucher au `<canvas>` ni au reste du DOM** ;
3. mettre à jour l'état visuel des boutons segmentés (`aria-pressed`)
   localement, sans passer par `innerHTML`.

Le `refreshView()` global reste légitime pour : changer de période dans
la galerie, changer de vue/onglet, ou tout ce qui ne touche pas la scène
vivante. Mais **JAMAIS pour un simple tap sur humeur/énergie.**

Test de non-régression impératif : ouvrir Humeur, laisser la scène vivre
quelques secondes (le reflet scintille), taper 5-6 fois de suite sur
différentes valeurs d'humeur et d'énergie → la scène doit changer de
lumière/houle INSTANTANÉMENT et SANS AUCUN clignotement, coupure ou reset
visible de l'animation de fond.

---

## ⚠️ Deuxième point de vigilance : aucun débordement, jamais

Cédric a explicitement demandé cette garantie après la saga Agenda
(M10b-e, débordements de modale et de champs). Appliquer d'office :
- Le module (`.module` racine) : `width: min(420px, 100%)`, jamais de
  `100%` brut sans plafond.
- **Tous** les conteneurs (`.stage`, `.controls`, `.gallery`, `.detail`) :
  `box-sizing: border-box`, `max-width: 100%`.
- La grille de galerie (`.days`) : utiliser
  `grid-template-columns: repeat(N, minmax(0, 1fr))` — **jamais**
  `repeat(N, 1fr)` seul, qui peut déborder quand le contenu d'une cellule
  (texte, emoji) est incompressible. `minmax(0, 1fr)` est la garantie
  anti-débordement pour une grille CSS.
- Le canvas lui-même : `width:100%; height:100%` sur l'élément, mais
  dimensionné en pixels réels via `canvas.width = clientWidth * DPR` au
  resize — jamais de dimension calculée qui dépasserait le conteneur
  parent (`.stage` a `overflow:hidden`, c'est le filet de sécurité final).
- Tous les textes qui peuvent être longs (légende de la scène, note dans
  le détail) : `overflow:hidden; text-overflow:ellipsis; white-space:nowrap`
  pour les lignes simples, `word-break:break-word` pour la note libre.
- Tester explicitement sur ≤ 375 px de large (iPhone SE ou équivalent en
  simulateur) en plus du 15 Pro Max — c'est la largeur la plus resserrée
  qui révèle les débordements.

---

## Modèle de données : conservé intégralement, aucune migration

**IN (à garder tel quel) :** `STORAGE_KEY='mood:entries'`, `MOOD_LEVELS`
et `ENERGY_LEVELS` réels (avec LEURS emojis/labels d'origine — 😴 Épuisé,
😕 Difficile, 😐 Moyen, 🙂 Bien, ⚡ En feu pour l'humeur ; 🪫 Vide, 😮‍💨
Faible, 🔋 Correct, ⚡ Chargé, 🚀 Optimal pour l'énergie — **NE PAS
reprendre les labels de la maquette qui étaient des exemples de
travail**, utiliser les vrais), `normalizeEntry`, `readEntries`,
`persistEntries`, `PERIOD_OPTIONS`, le lien avec le widget dashboard
(`createDashboardMoodWidget`).

**Aucun champ nouveau, aucun renommage.** La mer est une nouvelle
présentation des mêmes `mood`/`energy`/`note`/`date`, rien de plus — c'est
ce qui garantit l'historique d'un an intact et la lisibilité future par
Jarvis.

**Palette de scène par humeur** (`SKY_BY_MOOD` dans la maquette) : à
factoriser proprement dans `view.js`, indexée par la valeur 1-5 réelle.

---

## Découpage en commits
1. `feat: moteur océan Canvas (Gerstner + soliton)` — le fichier canvas
   isolé, testé seul, avec les deux régimes de boucle (repos/geste).
2. `feat: curseurs humeur/énergie sans re-render` — le point critique
   ci-dessus, à valider en premier avant de poursuivre.
3. `feat: galerie multi-périodes` — semaine/mois/3 mois/année, agrégation.
4. `refactor: containment et nettoyage` — vérification systématique des
   règles anti-débordement, suppression de tout code de présentation mort
   de l'ancien module (courbe SVG, etc., sauf si conservée en option — à
   trancher : voir note ETAT.md ci-dessous, par défaut la retirer).

---

## Détails de fidélité
- Bouton de sauvegarde : texte, désactivé (`disabled`) pendant le geste
  (2 s environ), réactivé à la fin — évite un double-déclenchement.
- Note : conservée, `textarea` redimensionnable, largeur contenue.
- Mouvement réduit : la boucle de repos ET la boucle de geste sont
  désactivées ; une seule frame figée est peinte ; le texte de
  confirmation reste visible normalement (pas d'animation dessus non plus).
- Thèmes : les 4 thèmes doivent changer la palette de scène (ciel, eau,
  soleil, écume) ET rester cohérents avec la couleur d'humeur choisie —
  les deux se combinent (le thème donne la gamme, l'humeur la nuance).
- Widget dashboard existant (`createDashboardMoodWidget`) : non régressé,
  fonctionnel (il n'a pas besoin du canvas, garder sa forme actuelle sauf
  si Cédric souhaite l'aligner visuellement — hors périmètre de cette
  mission, à proposer séparément si pertinent).

---

## Critères d'acceptation
- [ ] Rituel de contrôle : smoke/unit/lint verts, build stable (surveiller
      le poids du chunk mood, le moteur canvas ajoute du JS).
- [ ] **Test critique n°1** : taper rapidement plusieurs valeurs
      d'humeur/énergie d'affilée → aucune coupure, reset ou clignotement
      de la scène vivante (voir section piège ci-dessus).
- [ ] **Test critique n°2** : aucun débordement horizontal sur ≤ 375 px
      (galerie Année à 12 colonnes en particulier) et sur iPhone 15 Pro Max.
- [ ] Test manuel (Cédric, iPhone + Mac, 4 thèmes) :
  - la scène vit en permanence (houle douce + reflet scintillant), même
    sans interaction ;
  - consigner déclenche la vague qui traverse et s'échoue à droite avec
    l'écume, puis retour au calme ;
  - les 4 thèmes changent la palette de la scène ET des vignettes de
    galerie ;
  - galerie : bascule Semaine/Mois/3 mois/Année fluide, moyennes cohérentes
    (comparer visuellement à des données connues) ;
  - tap sur une vignette → détail avec la description + note si présente ;
  - note conservée et affichée au bon endroit du détail ;
  - mouvement réduit : tout figé, texte de confirmation lisible ;
  - widget dashboard toujours correct.
- [ ] `grep -n "width:\s*100%" src/modules/mood/style.css` : vérifier
      qu'aucune occurrence n'est utilisée sans `box-sizing:border-box` ou
      sans plafond (`max-width`/`min(...)`) à proximité.

## Note ETAT.md
Consigner : Humeur refondu — 5e emploi de l'eau (mesure / accueille /
guide / situe dans le temps / **traduit l'état intérieur**). Premier
module à utiliser un **moteur Canvas persistant avec deux régimes de
boucle** (repos léger permanent + geste ponctuel) — patron réutilisable
pour de futures animations gourmandes. Leçon durcie : **un tap sur un
simple sélecteur ne doit jamais déclencher un re-render global si un
élément à état interne complexe (canvas, moteur JS) est présent** —
toujours prévoir un chemin de mise à jour scoping. Décision à trancher
avec Cédric si souhaité plus tard : garder ou non un accès à l'ancien
graphique de courbe en option secondaire (non fait dans cette mission,
la galerie remplace entièrement l'affichage par défaut).
