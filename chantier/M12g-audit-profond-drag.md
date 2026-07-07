# M12g — Habitudes : AUDIT PROFOND du drag invisible (investigation, pas correction)

**Nature de cette mission : différente des précédentes.** Six correctifs
ciblés (M12d/e/f) ont échoué à faire disparaître le bug « la ligne
draguée devient invisible sur WebKit/iOS ». On ARRÊTE de patcher à
l'aveugle. Cette mission demande à Cursor de **mener une investigation
empirique dans le navigateur, d'établir la preuve de la cause, PUIS
seulement de corriger** — et si la cause n'est pas prouvable/corrigeable
proprement, de le dire clairement et de basculer sur le repli.

**Prérequis :** M12f. **Durée :** ouverte (c'est de l'investigation).
**Autorisation exceptionnelle :** cette mission peut faire plusieurs
essais/mesures dans la même session (le protocole « une passe » ne
s'applique pas à une investigation).

---

## Ce qu'on sait déjà (ne pas re-défricher)

Le drag fonctionne (position/logique correctes) ; SEULE la peinture
échoue : la ligne saisie devient invisible sous le pointeur sur WebKit
(reproductible aussi dans Safari desktop, pas seulement iPhone).

Correctifs DÉJÀ tentés sans effet (ne pas les refaire tels quels) :
- M12e : `will-change/translateZ/backface-visibility` sur la LIGNE
  draguée (`.list-drag-reorder__row--dragging`). Sans effet.
- M12f : retrait du `transform` résiduel de l'image finale de
  `@keyframes habits-panel-in` sur `.habits__panel-card`. Sans effet.

**Piste principale NON ENCORE VALIDÉE (à instrumenter en priorité) :** le
bug ne vient probablement pas du module `habits` mais du **socle**
(`src/core/styles.css`), qui empile plusieurs contextes de composition
AU-DESSUS de la modale et de sa liste. Inventaire audité :
- `#app-module-content.module-stage` : `isolation: isolate` (l.322-324) +
  `overflow-y: auto` (l.318-319).
- `#app-module-pan-layer` : couche du système de navigation par swipe
  entre modules, `position:relative; z-index:2` (l.335+), avec une
  transition `transform` en variante `--spring`.
- `#app-module-parallax` : **`will-change: transform` PERMANENT**
  (l.347-350). `will-change:transform` crée un contexte de composition
  permanent sur ce conteneur qui enveloppe TOUS les modules — donc un
  ancêtre de la modale, de la liste et de la ligne draguée.

Hypothèse à prouver ou réfuter : un (ou la combinaison) de ces contextes
de composition d'ancêtre — en particulier le `will-change:transform`
permanent de `#app-module-parallax` — empêche WebKit de repeindre
correctement un descendant lui-même transformé à haute fréquence
(la ligne draguée), surtout quand ce descendant est aussi dans un
`<dialog>` en top layer.

Note : le `<dialog>` en top layer est un cas de compositing à part
entière ; l'interaction top-layer × ancêtre `will-change` × overflow est
exactement le genre d'empilement qui déclenche ces bugs WebKit.

---

## Démarche demandée (dans l'ordre, S'ARRÊTER dès que prouvé)

### Étape 1 — Instrumenter et OBSERVER (aucune correction encore)
Mettre en place de quoi observer le bug en direct dans le navigateur
(Safari de préférence, via un device réel ou le simulateur iOS ; à défaut
Chrome avec émulation, mais le bug est WebKit-spécifique donc Safari est
requis pour conclure). Par exemple :
- ajouter temporairement des bordures/outlines vives sur la ligne
  draguée et ses ancêtres pour voir CE QUI disparaît exactement (la ligne
  seule ? son fond ? tout l'élément ? est-elle repoussée hors d'une zone
  de clip ?) ;
- logguer en direct, pendant le drag, `getBoundingClientRect()` de la
  ligne + la valeur calculée de son `transform`, pour confirmer que la
  position reste bien dans le viewport (donc que c'est une non-peinture,
  pas un déplacement hors-écran).

### Étape 2 — Isoler la cause par élimination (test A/B en direct)
Désactiver UN par UN, dans l'inspecteur ou par un flag temporaire, les
contextes de composition suspects, en retestant le drag après chaque
changement :
1. `#app-module-parallax { will-change: transform }` → passer à `auto`.
   **Suspect n°1.** Le drag redevient-il visible ?
2. `#app-module-content.module-stage { isolation: isolate }` → retirer.
3. `.habits__panel-card { overflow: auto }` → `visible` (temporairement).
4. La modale elle-même (`<dialog>` top layer) : tester le même drag sur
   une liste équivalente PLACÉE HORS modale (dans le corps du module) —
   si hors modale le drag est visible, l'interaction top-layer × ancêtres
   est confirmée comme déclencheur.

Consigner précisément QUEL changement (ou quelle combinaison) restaure la
visibilité. C'est LA preuve recherchée.

### Étape 3 — Concevoir le correctif le plus ciblé possible
Une fois la cause prouvée, corriger de la manière la MOINS invasive :
- Si c'est le `will-change:transform` permanent de `#app-module-parallax` :
  ne PAS le supprimer globalement (il sert aux transitions de navigation
  swipe). Le rendre **conditionnel** : ne l'activer que pendant une
  transition de module (classe ajoutée au début du swipe, retirée à la
  fin), et le laisser à `auto` au repos. Ainsi il n'existe plus comme
  contexte permanent quand une modale/drag est active. Vérifier que les
  transitions de navigation restent fluides.
- Si c'est l'`isolation:isolate` ou l'overflow : trouver le réglage
  minimal qui lève le bug sans casser le layout (edge-glow, clip du
  contenu, etc.).
- Si c'est intrinsèquement l'interaction avec le top layer du `<dialog>`
  et qu'aucun réglage d'ancêtre ne suffit : envisager de rendre la liste
  draggable dans un conteneur qui n'est pas soumis au même empilement, ou
  conclure au repli (voir ci-dessous).

### Étape 4 — Si rien ne fonctionne proprement : REPLI assumé
Si l'investigation montre qu'aucun correctif propre n'est possible sans
dégrader la navigation ou le layout, **ne pas empiler un 7e hack**.
Basculer sur le repli, proprement :
- réactiver les flèches ↑/↓ comme interaction PRINCIPALE de
  réorganisation (elles fonctionnent, la logique `moveHabit`/
  `reorderHabits` est intacte) — visibles et confortables, pas cachées ;
- retirer le mode drag (ou le conserver derrière un flag désactivé par
  défaut, documenté) ;
- garder le module partagé `core/list-drag-reorder.js` en base (non
  branché) pour une reprise future éventuelle, avec un commentaire en
  tête renvoyant à cette mission.
Ce repli n'est pas un échec : c'est la décision d'ingénierie correcte si
le coût dépasse le bénéfice. Cédric l'a explicitement anticipé.

---

## Livrable attendu (rapport d'investigation, pas juste un diff)
Le retour de mission DOIT contenir :
1. **La cause prouvée** : quel changement précis restaure la visibilité
   (résultat des tests A/B de l'étape 2).
2. **Le correctif retenu** et pourquoi c'est le moins invasif.
3. **Ce qui a été écarté** et pourquoi.
4. Si repli : la justification et l'état laissé (drag désactivé, flèches
   principales, module drag conservé en base).
5. Rituel de contrôle vert + confirmation que la navigation swipe entre
   modules n'a PAS régressé (si le correctif touche le socle).

---

## Critères d'acceptation
- [ ] Cause du bug **prouvée empiriquement** (pas supposée), consignée
      dans le rapport.
- [ ] Soit : drag visible et fluide sur iPhone (ligne jamais invisible),
      4 thèmes, navigation swipe non régressée.
- [ ] Soit : repli propre sur flèches ↑/↓ comme interaction principale,
      drag retiré/désactivé, module partagé conservé en base, décision
      justifiée.
- [ ] Aucun nouvel `!important`, aucune régression de layout ou de
      navigation, rituel vert.
- [ ] `chantier/annexes/composant-liste-drag-reorder.html` mis à jour ou
      marqué comme "à revoir selon conclusion M12g" (il était resté
      non aligné après M12f).

## Note ETAT.md
Consigner la CONCLUSION de l'investigation (cause réelle + décision), quel
que soit le résultat — c'est la valeur de cette mission. Si un contexte de
composition du socle (`will-change`, `isolation`, top layer) est confirmé
coupable, l'ajouter comme point d'attention transverse : **tout futur
élément transformé à haute fréquence (drag, animation de suivi) doit
vérifier la pile de contextes de composition de ses ANCÊTRES, y compris
le socle**, pas seulement son propre module. Fin (réelle) de la série
Habitudes selon l'issue.
