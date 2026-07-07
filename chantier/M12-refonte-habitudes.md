# M12 — Refonte du module Habitudes : les mouillages

**Prérequis :** aucun. **Durée attendue :** grosse session (3-4 h),
découpée en commits. **Risque :** élevé — animations fines + changement
de philosophie (retrait du streak). Protocole v2 : maquette annexée
intégralement fonctionnelle, code à transplanter.

> Ajouter la ligne M12 au tableau de bord d'ETAT.md.

---

## L'état cible : la maquette annexée

**`chantier/annexes/maquette-M12-habitudes.html`** (v2, validée par
Cédric). Le JS est du code à transplanter pour toutes les séquences
d'animation (bascule emoji↔ancre, ondes, cascade d'entrée, constellation
scintillante) — ce sont des chorégraphies précises, pas des idées à
réinterpréter.

---

## Le concept (choix de valeurs assumé)

**Une habitude n'est pas une chaîne qu'on brise, c'est un lieu où l'on
revient jeter l'ancre.** Décision explicite de Cédric : **retirer
l'affichage du streak** (série ininterrompue) — remplacé par un compteur
de **retours cumulés** qui ne peut que grandir, jamais retomber à zéro.
Rater un jour ne "casse" rien visuellement.

- **Vue Aujourd'hui (par défaut)** : les mouillages du jour en cartes.
  Toucher une carte = jeter l'ancre : l'eau monte dans la carte, l'emoji
  bascule vers une ancre ⚓ avec un ressort, deux ondes se propagent, le
  compteur de retours bondit.
- **Vue Régularité** : une **constellation par habitude** — 35 derniers
  jours en points sur une houle sinusoïdale. Points allumés et
  scintillants = jours de retour (bioluminescence). Points vides = jours
  prévus mais manqués, qui "attendent" sans reproche. Points quasi
  invisibles = jours non prévus par la fréquence.
- Bandeau du jour : jauge circulaire + phrase encourageante SANS jamais
  culpabiliser (jamais "en retard", toujours "sans pression pour le reste").

---

## ⚠️ Piège critique confirmé : `toggleCompletion()` + `render()` immédiat

**Audit fait sur `habits/index.js` :** dans `bindEvents()`, le handler
`onChange` (~l.566-574) appelle `toggleCompletion(habitId, checked)` puis
`render()` **dans la foulée**, et `render()` (~l.558-560) fait
`rootContainer.innerHTML = createHabitsView(...)` — un rendu complet
immédiat.

**Conséquence si rien n'est changé : aucune animation ne sera jamais
visible.** Le DOM serait détruit et recréé dans son état final avant que
le navigateur ait pu peindre ne serait-ce qu'une frame de transition —
exactement le bug "flash sans transition" déjà rencontré (popover,
Respiration M09, Agenda M10 démarrage). Ici c'est encore plus direct :
l'appel à `render()` suit l'action à la ligne suivante.

**Correctif obligatoire (à appliquer avant toute autre chose, valider en
premier) :**
1. Le clic sur une carte de mouillage NE DOIT PAS appeler `render()`
   global. Il doit : muter les données (`toggleCompletion`), puis
   appliquer les classes/animations SUR LA CARTE EXISTANTE (`.done`,
   `.just-done`, retrait après le délai d'animation via
   `setTimeout`/`animationend`), et mettre à jour uniquement le texte du
   compteur de retours et de la jauge du bandeau — sans re-render complet.
2. `render()` global reste légitime pour : changement de vue (Aujourd'hui
   ↔ Régularité), ajout/suppression d'un mouillage, chargement initial.
   Jamais pour un simple toggle de complétion.
3. Transplanter le motif exact de la maquette : classes `done` et
   `just-done` posées/retirées en JS ciblé, jamais via un re-rendu du
   conteneur parent.

**Test de non-régression impératif :** cocher/décocher plusieurs
mouillages d'affilée, rapidement → à chaque tap, la séquence complète doit
être VISIBLE (bascule emoji/ancre, ondes, montée d'eau, bond du compteur)
— aucun instantané, aucun DOM qui "saute" à l'état final.

---

## Modèle de données : conservé intégralement

**IN (à garder tel quel) :** `STORAGE_KEY` habits + completions,
`normalizeHabit`, `normalizeCompletion`, fréquences (`daily`, `weekdays`,
`weekend`, `every2days`), `petSlot` et tout le système d'onboarding animal
(`buildPetHabitDef`, `buildInitialHabitsFromOnboarding` — sortie du chien,
litière du chat, etc.), `isCompletedOnDate`, `toggleCompletion`,
`getCompletionRateForDate` (sert au bandeau), `getMonthCalendar` (données
sources de la constellation).

**Ce qui change d'usage, pas de structure :**
- `getConsecutiveDays()` (le streak) : **la fonction peut rester en base**
  (elle ne coûte rien et pourrait resservir à Jarvis plus tard pour
  détecter des patterns), mais **son résultat ne doit plus être affiché
  nulle part dans l'interface**. Remplacer l'affichage par un comptage de
  retours sur la période (30 jours glissants, cf. `returnsThisMonth` dans
  la maquette) — nouvelle fonction de lecture, pas une nouvelle donnée
  stockée.
- La vue "calendrier mensuel" existante (`getMonthCalendar`, probablement
  affichée en grille classique aujourd'hui) est remplacée par la vue
  Régularité en constellation. Vérifier si `getMonthCalendar` peut être
  réutilisée telle quelle comme source de données pour construire les
  35 derniers jours (probablement oui, à adapter en fenêtre glissante
  plutôt qu'en mois calendaire si nécessaire).

---

## Découpage en commits
1. `feat: vue Aujourd'hui + animations mouillage (sans re-render global)`
   — LE commit le plus délicat, contient le correctif du piège critique.
   Cursor peut s'arrêter ici pour validation avant de poursuivre.
2. `feat: vue Régularité constellation` — scintillement, houle, légende.
3. `feat: bandeau du jour + jauge animée`.
4. `refactor: retrait de l'affichage streak, nettoyage` — passer la
   **checklist de sortie** (`chantier/CHECKLIST-SORTIE-MODULE.md`) à ce
   stade, avant de clôturer la mission.

---

## Détails de fidélité
- Largeur module : `min(420px, 100%)`, `box-sizing:border-box` partout
  (leçon Agenda/Humeur).
- Grilles éventuelles : `minmax(0,1fr)`, jamais `1fr` seul.
- Constellation : positions des points calculées une fois par carte à
  l'affichage (pas de recalcul en boucle — ce n'est pas animé en continu,
  contrairement à Humeur, seul le scintillement CSS tourne).
- Scintillement (`twinkle`) : respecter `prefers-reduced-motion` (le
  couper entièrement, points simplement allumés fixes).
- Icône ⚓ cohérente avec celle déjà utilisée dans Agenda (bouton "revenir
  à aujourd'hui") — même symbole, même sens : le retour à un point fixe.
- Le système `petSlot` (animal) : aucune modification de logique, juste
  la nouvelle présentation en carte de mouillage comme les autres.

---

## Critères d'acceptation
- [ ] Rituel de contrôle : smoke/unit/lint verts, build stable.
- [ ] **Test critique** : cocher/décocher plusieurs mouillages rapidement
      → séquence d'animation TOUJOURS visible, jamais de saut instantané
      (voir section piège ci-dessus).
- [ ] Test manuel (Cédric, iPhone + Mac, 4 thèmes) :
  - vue Aujourd'hui : ancre qui plonge avec ressort, ondes, eau qui monte,
    compteur qui bondit, jauge du bandeau qui glisse ;
  - cartes en cascade à l'ouverture de la vue ;
  - vue Régularité : constellation scintillante, légende claire, jours
    manqués visuellement neutres (aucune couleur d'alerte/reproche) ;
  - **aucune trace visible de "streak" ou de série ininterrompue dans
    l'interface** ;
  - système animal (petSlot) non régressé, toujours proposé à
    l'onboarding ;
  - mouvement réduit : tout instantané, scintillement coupé, positions
    correctes ;
  - aucun débordement sur ≤ 375 px.
- [ ] **Checklist de sortie passée** (`chantier/CHECKLIST-SORTIE-MODULE.md`)
      avant de clore la mission — première application concrète de cette
      nouvelle porte de validation.

## Note ETAT.md
Consigner : Habitudes refondu — 6e emploi de l'eau (mesure / accueille /
guide / situe dans le temps / traduit l'état intérieur / **accueille le
retour sans jugement**). Choix de valeurs notable : retrait volontaire de
la mécanique de streak, remplacée par un comptage de retours cumulés —
à rappeler si le sujet revient (ex. si Cédric ou un tiers suggère de
"regamifier" avec des séries, ce fut un choix réfléchi contre la
culpabilisation TDAH). Constellation en bioluminescence : idée initiée par
une proposition Ollama, affinée et intégrée au monde d'Ancrage — noter
comme précédent positif de collaboration multi-IA sur ce chantier.
Première application de la CHECKLIST-SORTIE-MODULE.md : consigner ici si
elle a révélé quelque chose à corriger, pour ajuster la checklist
elle-même si besoin.
