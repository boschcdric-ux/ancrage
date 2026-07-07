# M10 — Refonte du module Agenda : la marée du jour

**Prérequis :** M09 → M09c (Respiration) ✅ validées.
**Durée attendue :** grosse session (5–6 h) — c'est le plus gros module du
projet (3 120 lignes). Découpée en 4 commits (voir §Découpage).
**Risque :** élevé (refonte de présentation d'un module complexe).
Protocole v2 : maquette annexée + code délicat à transplanter + audit fait.

> Ajouter la ligne M10 au tableau de bord d'ETAT.md.

---

## L'état cible : la maquette annexée

**`chantier/annexes/maquette-M10-agenda.html`** (v4, validée par Cédric).
L'utiliser AVANT de coder : les 3 vues (Jour/Semaine/Mois), le curseur
d'heure simulée, les chevauchements (Kiné 15h00 + Point planning 15h15
partagent la largeur), l'ancre ⚓, les modales détail et « + Poser »
centrées, l'édition, les 4 thèmes, le mouvement réduit.

**RÈGLE DE LECTURE :** HTML/CSS = référence à transposer. JS = jetable
SAUF les blocs à transplanter tels quels (adapter noms/intégration) :
1. `assignLanes(evs)` — algorithme des couloirs de chevauchement.
2. Le positionnement des événements (`--lane`, `--lanes`, `top`, `height`
   selon durée réelle) et les seuils compact/normal.
3. Le pattern des deux modales `<dialog>` (détail + composeur) : centrage
   `width:min(...);margin:auto`, `::backdrop` flou, `showModal()`,
   fermeture Échap/backdrop/bouton.
4. La commande de marée (variables `--now-y`, `.tide__past`, `.tide__line`)
   et le calcul de la position selon l'heure.

---

## Ce qui change / ce qui est conservé

**Conservé (modèle + logique métier — NE PAS réécrire) :**
- Modèle d'événement complet (`normalizeEvent`) : titre, startDate,
  startTime, endDate, endTime, color, taskId, recurrence, reminder.
- Stockage `calendar:events`, récurrences (`getOccurrencesInRange`,
  `matchesRecurrence`), notifications (`scheduleNotifications`),
  rafraîchissement minuit (`scheduleMidnightRefresh`), lien tâches
  (`readIncompleteTasks`, `taskId`).
- La palette sémantique existante `['accent','success','warning','danger',
  'info']` : les 5 couleurs de la maquette (evt-a..e) se MAPPENT sur ces
  5 tokens. Ne pas inventer de nouvelles clés de couleur (compat données).

**Changé (présentation + ergonomie) :**
- Vue Jour = la marée (colonne d'heures, ligne de flottaison = maintenant,
  passé sous la surface, événement en cours illuminé, hauteur = durée,
  couloirs de chevauchement).
- Vue Semaine = **liste verticale des 7 jours** (PAS de grille heures ×
  jours), chaque jour avec ses événements en puces. Remplace la vue
  semaine actuelle.
- Vue Mois = « la carte » sobre (pastilles, max 3 + compteur, tap → jour).
- « En approche » : liste des prochains événements, distance temporelle =
  distance visuelle (far/horizon).
- Détail ET composeur = modales `<dialog>` centrées (fin des cartes en flux).
- Ancre ⚓ : revient à aujourd'hui, s'allume si on est « ailleurs » (par
  vue), transition de couleur douce (pas de ressort d'état).
- Bouton « + Poser » sticky permanent.

---

## ⚠️ Les deux leçons critiques (appliquées d'office)

### 1. Marée animée → élément persistant (leçon Respiration M09b)
**Le module re-rend TOUT par `rootContainer.innerHTML = createCalendarView
(...)` à chaque `render()` (index.js ~l.651).** Un élément recréé puis
positionné dans la même frame N'ANIME PAS. Pour que la marée monte en
douceur :
- La montée de la ligne de flottaison et du passé NE doit PAS passer par un
  `render()` complet. Après le rendu initial de la vue Jour, les mises à
  jour de position de la marée (au ticker, au changement d'heure) mutent
  directement les variables CSS (`--now-y`) sur l'élément `.tide`
  PERSISTANT, sans réécrire `innerHTML`.
- `render()` complet reste réservé aux changements de vue/jour/données.
- Vérifier : ouvrir la vue Jour d'aujourd'hui et attendre/simuler le temps
  → la marée glisse, ne saute pas.

### 2. Ticker temps réel (absent aujourd'hui)
Le module n'a AUCUN `setInterval` de rafraîchissement (audit). Pour que la
ligne « now » avance en usage réel :
- Créer un ticker (toutes les 60 s suffit) actif uniquement quand la vue
  Jour d'aujourd'hui est affichée, qui met à jour `--now-y` et l'état
  passé/en-cours des événements par mutation ciblée (pas de `render()`).
- **Nettoyage obligatoire au démontage** du module (`clearInterval`), comme
  `clearNotificationTimers`/`clearTick` existants — sinon fuite mémoire.
- Respecter `prefers-reduced-motion` : la position est correcte, mais sans
  transition animée (saut discret acceptable en mouvement réduit).

---

## Découpage en commits (diff lisible)
1. `feat: vue Jour marée + couloirs` — la signature, ticker, mutations
   ciblées, positionnement par durée.
2. `feat: vues Semaine (liste) et Mois (carte) + En approche`.
3. `feat: modales détail et composeur (dialog centré)` — édition incluse.
4. `refactor: nettoyage` — largeur standard `min(420px,100%)`, tokens,
   0 `!important`, 0 couleur en dur, suppression du code de présentation mort.

---

## Détails de fidélité
- Largeur module : `min(420px, 100%)` centrée (harmonisation).
- Champs de saisie ≥ 16 px (évite le zoom iOS — leçon M09b).
- Composeur : titre + date + heure visibles ; « Plus d'options » déplie
  fin / récurrence / rappel / couleur / (lien tâche, déjà au modèle) ;
  se replie à chaque réouverture.
- Modales : `<dialog>` + `showModal()`, `width:min(...);margin:auto`,
  `::backdrop` avec flou, fermeture Échap + clic backdrop + bouton, focus
  géré par le natif. JAMAIS `width:100%` sur le dialog (casse le centrage).
- Marée : `--hour-h:44px`, plage 7h–23h, houle SVG dérivante, halo, passé
  en dégradé sous la surface.
- Couloirs : `assignLanes` transplantée ; largeur d'événement =
  `(100% - gouttière) / lanes`.
- Auto-scroll à l'ouverture du jour courant : centrer la ligne de
  flottaison (l'utilisateur arrive sur « maintenant »).
- Textes : « En approche », « Journée en eau libre. / Rien d'amarré.
  L'horizon est à toi. », « Horizon dégagé — rien en approche. ».

---

## Critères d'acceptation
- [ ] Rituel de contrôle : smoke 20/20, unit tous verts, lint 0, build
      stable (le module est lazy : surveiller la taille du chunk calendar).
- [ ] `grep -n "!important" src/modules/calendar/style.css` → aucune.
- [ ] Widget dashboard du calendrier (`createCalendarWidget`,
      `hasWidget:true`) toujours fonctionnel.
- [ ] Notifications, récurrences, lien tâches : non régressés (créer un
      événement récurrent avec rappel, vérifier qu'il se programme).
- [ ] Test manuel (Cédric, iPhone + Mac, 4 thèmes) :
  - **Jour** : la marée monte avec l'heure (glisse, ne saute pas) ; passé
    sous la surface ; événement en cours illuminé ; 2 événements qui se
    chevauchent partagent la largeur ; hauteur = durée ; auto-scroll sur
    maintenant ;
  - **Semaine** : liste des 7 jours, aujourd'hui surligné, tap jour → Jour,
    tap événement → détail ;
  - **Mois** : pastilles, max 3 + compteur, tap → Jour ; pas de débordement
    sur ≤ 380 px ;
  - **En approche** : proches nets, lointains estompés ;
  - **Modales** : détail et « + Poser » CENTRÉS (pas en haut-gauche),
    fond flouté, fermeture Échap/backdrop/bouton, focus piégé ; Modifier
    pré-remplit ; création anime l'accostage ;
  - **Ancre** : s'allume hors d'aujourd'hui (chaque vue), transition douce,
    ramène au présent ;
  - Mouvement réduit : positions correctes, pas d'animation ; ticker
    n'anime pas mais garde la position juste.

## Note ETAT.md
Consigner : Agenda refondu (4e gros chantier). Marée = 4e emploi de l'eau
(mesure / accueille / guide / **situe dans le temps**). Ticker temps réel
ajouté (à nettoyer au démontage). Modales `<dialog>` = nouveau patron
canonique pour toute fenêtre focalisée (centrage `margin:auto`, jamais
`width:100%`). Confirmer l'application des 2 leçons (élément persistant +
champs ≥16px). Prochaine étape possible : mission balai d'harmonisation des
largeurs de TOUS les modules (le socle `--module-max-width`).
