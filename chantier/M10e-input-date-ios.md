# M10e — Agenda : input date iOS déborde malgré width:100%

**Prérequis :** M10d. Micro-correctif final Agenda. Validation groupée
M10 → M10e ensuite.
**Durée :** ~15 min. **Risque :** minime (1 règle CSS).

---

## Diagnostic (audité)

Le champ « Fin récurrence » (`<input type="date" name="recurrenceEndDate">`)
déborde encore de la modale sur iPhone, alors que la règle
`.cal__composer-field input { width:100%; box-sizing:border-box;
min-width:0 }` est bien présente (vérifiée) et que le markup est standard.

**Cause :** sur iOS Safari/WebKit, un `<input type="date">` conserve son
**apparence native** (widget système), qui impose une largeur intrinsèque
minimale et un padding interne propre — ceux-ci **ignorent `width:100%`**
et débordent. Les autres champs date de la modale sont dans des
`cal__composer-row` à deux colonnes (plus étroites) où le dépassement ne
se voyait pas ; « Fin récurrence » est le seul input date en PLEINE
largeur, d'où le débordement visible.

---

## Correctif

Neutraliser l'apparence native des champs date/heure de la modale pour
qu'ils respectent la largeur CSS :

```css
.cal__composer-field input[type="date"],
.cal__composer-field input[type="time"],
.cal__composer-row input[type="date"],
.cal__composer-row input[type="time"] {
  -webkit-appearance: none;
  appearance: none;
  /* width:100% / box-sizing:border-box / min-width:0 déjà hérités */
}
```

Vérifier que les champs restent utilisables (le sélecteur de date/heure
iOS s'ouvre toujours au tap — `-webkit-appearance:none` retire le style
natif du champ, pas le picker). Si le rendu du texte interne se
désaligne, ajouter un `text-align:left` et un `min-height` cohérent avec
les autres champs.

---

## Périmètre
**IN :** `calendar/style.css` uniquement (la règle ci-dessus).
**OUT :** tout le reste.

---

## Critères d'acceptation
- [ ] Rituel de contrôle : tout vert, build stable.
- [ ] Test manuel (Cédric, **iPhone en priorité**, 4 thèmes) :
  - modale « + Poser » → « Plus d'options » : le champ « Fin récurrence »
    tient DANS la modale, aucun débordement à droite, à ≤ 380 px ;
  - taper le champ ouvre toujours le sélecteur de date iOS ;
  - les champs date/heure de la ligne du haut (début) et « Heure de fin »
    restent corrects, alignés ;
  - contrôle rapide sur Mac (pas de régression desktop).

## Note ETAT.md
Consigner : **les `<input type="date"/"time">` doivent porter
`-webkit-appearance:none` pour respecter la largeur CSS sur iOS** (le
widget natif déborde sinon). À appliquer d'office dans les futurs modules
avec champs date/heure. Série Agenda M10 → M10e close.
