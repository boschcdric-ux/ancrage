# M10d — Agenda : fonds thématisés (mois) + débordement fin récurrence

**Prérequis :** M10c. Finitions visuelles de l'Agenda. Validation groupée
M10 → M10d ensuite.
**Durée :** ~40 min. **Risque :** minime.

---

## Correctif 1 — Cases du mois / boutons Jour-Semaine-Mois « qui jurent »
en thème sombre (Encre, Crépuscule)

**Symptôme :** en thème sombre, les cases du calendrier mensuel, les
boutons de vue et les événements apparaissent clairs/blancs, comme s'ils
ne suivaient pas le thème (cf. captures Encre/Crépuscule).

**Cause (auditée) :** `.cal__cell` (style.css ~l.604) et `.cal__seg-btn`
(~l.82) n'ont **AUCUN `background` défini** dans leur bloc de base — ils
héritent d'un fond par défaut clair qui ne suit pas les tokens de thème.
En thème clair ça passe ; en thème sombre les éléments restent clairs.

**Correctif :** donner un fond explicite basé sur les tokens à ces
éléments (et vérifier les états sélectionné/aujourd'hui/hors-mois) :

```css
.cal__cell {
  background: var(--bg-tertiary);   /* AJOUT : suit le thème */
  /* ...reste inchangé... */
}
.cal__cell--out {
  opacity: 0.4;                     /* jour hors mois : atténué, pas un fond différent */
}
.cal__cell--today {
  border-color: var(--accent);
  color: var(--accent);
}
.cal__cell--selected {              /* si cette classe existe */
  background: var(--accent-soft);
}
.cal__cell:hover {
  background: var(--bg-hover);
}
```
Et pour le sélecteur de vue :
```css
.cal__seg {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
}
.cal__seg-btn {
  background: transparent;
  color: var(--text-secondary);
}
.cal__seg-btn[aria-pressed='true'] {
  background: var(--accent);
  color: var(--text-on-accent);
}
```
Vérifier de même que les puces/événements du mois et de la semaine
utilisent des fonds à base de tokens (`--bg-tertiary`, `--bg-secondary`)
et jamais un fond implicite. Contrôler les 4 thèmes.

## Correctif 2 — Champ « Fin récurrence » qui déborde de la modale

**Cause (auditée) :** le champ `<input type="date"
name="recurrenceEndDate">` (view.js ~l.109) est dans un
`.cal__composer-field`, mais la règle de largeur (style.css ~l.800) ne
cible que `select` et `textarea` de ce champ — **pas `input`**. Le champ
date n'a donc ni `width:100%` ni `box-sizing`, et déborde.

**Correctif :** ajouter `input` au sélecteur :
```css
.cal__composer-field input,
.cal__composer-field select,
.cal__composer-field textarea {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 9px 11px;
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
  color-scheme: light dark;
}
```
Vérifier qu'AUCUN champ de la modale (titre, dates, heures, description,
tâche, récurrence, rappel, fin récurrence) ne déborde, sur ≤ 380 px.

---

## Périmètre
**IN :** `calendar/style.css` uniquement (fonds thématisés + largeur input).
**OUT :** view.js (sauf si une classe d'état manque), index.js, logique,
autres modules, socle.

---

## Critères d'acceptation
- [ ] Rituel de contrôle : tout vert, build stable.
- [ ] Test manuel (Cédric, iPhone + Mac, **les 4 thèmes, insister sur Encre
      et Crépuscule**) :
  - vue Mois : cases, boutons Jour/Semaine/Mois, pastilles, « En approche »
    suivent le thème (plus de blocs clairs qui jurent en sombre) ;
  - aujourd'hui, jours hors-mois, jour sélectionné : lisibles et cohérents ;
  - modale « + Poser » → « Plus d'options » : le champ Fin récurrence (et
    tous les autres) tient dans la modale, aucun débordement ;
  - contraste du texte correct partout.

## Note ETAT.md
Consigner : Agenda terminé (M10 → M10d). Leçon : tout élément de fond doit
déclarer un `background` à base de token — ne jamais compter sur un fond
implicite (invisible en thème clair, cassé en thème sombre) ; à vérifier
dans l'audit des prochains modules.

**Dette notée (mission future dédiée, PAS ici) :** le bouton d'aide « ? »
de chaque module (a) chevauche des éléments selon le module (ex. flotte
sur « Mois » dans l'Agenda) et (b) contient des infos à mettre à jour après
les refontes. Prévoir une mission transversale « aide contextuelle » :
repositionnement cohérent + réécriture des contenus d'aide par module.
