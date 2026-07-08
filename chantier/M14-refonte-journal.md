# M14 — Refonte du module Journal : déposer le courant du jour

**Régime : Mission** (refonte multi-fichiers, découpage d'un gros index.js,
Tiptap à préserver, tags partagés à modifier dans 3 modules).
**Prérequis :** aucun. **Durée attendue :** session moyenne-longue (3-4 h).

> Ajouter la ligne M14 au tableau de bord d'`ETAT.md` (⬜) — sans cette
> ligne, l'agent doit STOP (règle §1).

---

## L'état cible : la maquette annexée

**`chantier/annexes/maquette-M14-journal.html`** — validée par Cédric
(design, contraste liste/écriture, tags, 4 thèmes).

### Étiquetage de la maquette (règle §6)
- **Le VISUEL et la disposition** des deux vues (liste "strates", barre de
  tags, éditeur sobre, barre d'outils) : **code à transplanter**.
- **L'éditeur Tiptap** dans la maquette est un FAUX (contenteditable +
  boutons décoratifs). Le vrai module a un Tiptap fonctionnel à
  **préserver intégralement** — voir section dédiée. Ne PAS remplacer le
  vrai éditeur par le faux de la maquette : reprendre l'habillage visuel
  (barre d'outils, page sobre) AUTOUR de l'éditeur Tiptap réel existant.

---

## Le concept (deux ambiances volontairement contrastées)

Choix de Cédric : la **liste** est thématisée (repère, navigation), l'
**écriture** est sobre (la page s'efface, seul le texte reste).
- **Vue liste** : les entrées comme des dépôts/strates le long d'un fil
  vertical (récentes = point accent, anciennes = point estompé).
  Typographie de lecture (serif) pour titres/extraits. Navigation par
  **TAG en priorité** (barre scrollable), tri par date **secondaire et
  discret**. Accueil équilibré : liste + bouton "Écrire" visible.
- **Vue écriture** : fond "papier" quasi neutre, thème retiré, police de
  lecture (serif), barre d'outils Tiptap complète. La bascule liste↔
  écriture est le cœur de l'expérience.

---

## ⚠️ Tiptap : à PRÉSERVER intégralement (ne rien casser)

Le module a un éditeur Tiptap **fonctionnel et délicat**. Audit fait :

**Extensions chargées** (index.js ~l.327, à conserver À L'IDENTIQUE) :
`StarterKit`, `TextStyle`, `Color`, `Highlight.configure({multicolor:true})`,
`TaskList`, `TaskItem.configure({nested:true, HTMLAttributes:{class:
'journal-task-item'}})`.

**Cycle de vie déjà correct** (à NE PAS casser) : `mountEditor()` appelle
`destroyEditor()` avant de recréer l'éditeur, et le re-render passe par
`destroyEditor()` → `innerHTML` → `mountEditor()`. C'est le bon pattern
(l'éditeur est détruit proprement avant chaque re-render, recréé après) —
le préserver tel quel. NE PAS tenter d'"optimiser" en gardant l'éditeur
vivant à travers un innerHTML (ça le casserait).

**Les 20 commandes de la barre d'outils** (attributs `data-journal-command`
exacts, à conserver TOUS, même ordre) : `bold`, `italic`, `underline`,
`strike`, `heading1`, `heading2`, `heading3`, `highlight`, `color-purple`,
`color-red`, `color-green`, `color-orange`, `color-reset`, `bulletList`,
`orderedList`, `taskList`, `blockquote`, `horizontalRule`. Le handler qui
lit ces data-attributes et pilote Tiptap doit rester branché — seul
l'HABILLAGE visuel de la barre change (classes CSS, disposition), pas les
`data-journal-command` ni leur logique.

**Test de non-régression Tiptap impératif :** après refonte, ouvrir une
entrée, tester CHAQUE bouton de formatage (gras, les 3 titres, les 5
couleurs, surlignage, les 3 listes, citation, séparateur), vérifier que
le contenu se sauvegarde et se recharge correctement (getHTML/setContent).

---

## Les tags : liste mise à jour, DANS LES 3 MODULES

**Découverte d'audit importante :** les tags ne sont PAS propres à Journal.
`PREDEFINED_TAGS` est défini À L'IDENTIQUE dans **3 modules** :
`journal/view.js`, `tasks/view.js`, `capture/view.js`, et les couleurs
(`--shared-tag-tone`) sont dans les `style.css` de chacun. Toute
modification de la liste DOIT être répercutée dans les trois, sinon
incohérence (un tag visible dans un module, absent d'un autre).

**Nouvelle liste (9 tags)** — à écrire identiquement dans les 3 modules :
```js
const PREDEFINED_TAGS = [
  { id: 'maison',    emoji: '🏠', label: 'Maison' },
  { id: 'boulot',    emoji: '💼', label: 'Boulot' },
  { id: 'sante',     emoji: '🏥', label: 'Santé' },
  { id: 'admin',     emoji: '📋', label: 'Admin' },
  { id: 'personnel', emoji: '👤', label: 'Personnel' },
  { id: 'projets',   emoji: '🚀', label: 'Projets' },
  { id: 'idees',     emoji: '💡', label: 'Idées' },
  { id: 'ecriture',  emoji: '✍️', label: 'Écriture' },
  { id: 'nature',    emoji: '🌿', label: 'Nature' }
];
```
Changements vs actuel : **retrait de `jardin`**, **ajout de `projets`,
`idees`, `ecriture`, `nature`**. (`jardin` était en `--success` : réattribuer
`--success` à `nature`.)

**Couleurs** (`--shared-tag-tone`) à définir dans les style.css concernés,
cohérentes avec l'existant :
- maison `--info`, boulot `--accent`, sante `--danger`, admin `--warning`,
  personnel `--text-secondary` (inchangés) ;
- **nature `--success`** (reprend la couleur de l'ex-jardin) ;
- projets, idees, ecriture : leur attribuer une tonalité distincte —
  utiliser des tokens existants si disponibles (ex. un violet, un jaune,
  un terracotta), sinon définir 3 nouveaux tokens de tonalité au niveau
  du socle. **Ne pas inventer de couleurs en dur hors du système de
  tokens.**

**Migration :** AUCUNE nécessaire. Cédric a confirmé n'avoir que des
entrées `boulot` et `personnel` (tags conservés). L'`id: 'jardin'`
retiré ne casse aucune entrée existante. (Par sécurité : si une entrée
portait un tag inconnu, l'afficher sans badge plutôt que planter — vérifier
que `renderTagBadge` gère déjà le cas `find` → undefined, ce qui semble
être le cas d'après l'audit : `if (!tag) return ''`.)

---

## Découpage (index.js = 655 lignes, à réduire)

`journal/index.js` fait 655 lignes — au-dessus de la limite ~300 (règle
§2). Découper par responsabilité, par exemple :
- `journal/editor.js` — cycle de vie Tiptap (mount/destroy/commandes).
- `journal/store.js` — lecture/écriture des entrées, filtres, tri.
- `journal/index.js` — orchestration (render list/editor, événements).
Le découpage exact est laissé à l'appréciation, mais **coller la preuve
`wc -l src/modules/journal/*.js` dans le compte-rendu** (règle checklist).

---

## Scroll horizontal des tags (comme M14-tickets déjà faits)

La barre de tags de la liste doit porter `data-h-scroll` (le mécanisme
d'exclusion du swipe entre modules est déjà en place dans
`shell/gestures.js` + `shell/swipe-detection.js`, câblé pour Tâches et
Capture). Ajouter simplement l'attribut sur le conteneur scrollable de la
barre de tags du Journal, et le CSS `overflow-x:auto; scrollbar-width:none`.

---

## Périmètre
**IN :** `journal/index.js` (+ nouveaux fichiers de découpage),
`journal/view.js`, `journal/style.css`, `journal/README.md` (à remplir),
ET la liste `PREDEFINED_TAGS` + couleurs dans `tasks/` et `capture/`
(uniquement la liste de tags et leurs couleurs, RIEN d'autre dans ces 2
modules).
**OUT :** la logique Tiptap elle-même (préservée), les autres aspects de
Tâches/Capture, le système de swipe (déjà fait).

---

## Critères d'acceptation
- [ ] Rituel de contrôle : smoke/unit/lint/build verts.
- [ ] **Preuve `wc -l`** des fichiers journal collée au compte-rendu,
      aucun > ~300 lignes.
- [ ] **Navigateur piloté (règle §5, émulation iPhone ~390px ET desktop)** :
  - contraste liste (thématisée) ↔ écriture (sobre) fonctionnel ;
  - barre de tags scrollable horizontalement SANS changer de module,
    aux deux tailles ;
  - aucun débordement à ~375-390px (les 9 tags, les cartes d'entrées).
- [ ] **Test Tiptap complet** : chaque bouton des 20 commandes fonctionne,
      sauvegarde + rechargement du contenu OK (non-régression).
- [ ] Les 9 tags identiques et cohérents dans Journal, Tâches ET Capture
      (vérifier les 3 modules, pas seulement Journal).
- [ ] Test manuel Cédric (iPhone + Mac, 4 thèmes) : liste, écriture, tri
      par date secondaire, création + édition d'une entrée, tags corrects.
- [ ] `README.md` rempli.

## Note ETAT.md (format §9, court)
Journal refondu — 8e emploi de l'eau (…/**déposer le courant du jour** :
la liste comme strates sédimentaires, l'écriture comme page qui s'efface).
Décision : deux ambiances contrastées volontaires (thématisé pour
retrouver, nu pour écrire). Tags portés de 6 à 9 (retrait jardin, ajout
projets/idées/écriture/nature) — **répercutés dans les 3 modules qui
partagent PREDEFINED_TAGS** (noter cette dépendance pour le futur : tout
changement de tags touche Journal+Tâches+Capture). Tiptap préservé
intégralement. Idée reportée (non faite, choix de Cédric contre la
sur-ingénierie) : tags librement créables par l'utilisateur — jugé trop
lourd (stockage partagé, UI de création, 3 modules) pour le bénéfice.
