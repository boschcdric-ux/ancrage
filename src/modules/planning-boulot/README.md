# Module planning-boulot

## Objectif

Afficher le planning de travail rotatif sur **5 semaines** avec une vue « aujourd’hui » prioritaire (TDAH-first).

## Sites

Exemples par défaut (à personnaliser dans la configuration) :

- Site A
- Site B
- Site C

## Données

- **Clé localStorage** : `adhd-app:ancrage-planning-boulot` (logique `ancrage-planning-boulot` via `save`/`load`)
- Structure par jour : `{ off, slot1: { site, start, end }, slot2: { … } }` (migration auto depuis l’ancien format `{ site, start, end, off }`)
- Racine : `reference_date`, `weeks[5]`, `holidays_schedule`, `holidays_mode`, `overrides` par date `YYYY-MM-DD`

## Mobile

Règles obligatoires : `.context/MOBILE_RULES.md` (référence implémentée dans `style.css`).

## Spécificités TDAH

- Carte du jour en haut, lisible en un coup d’œil
- Heures supplémentaires (> 7,5 h ou case dédiée) en orange (`--warning`)
- Modification ponctuelle par **override** ; supprimé automatiquement si identique au cycle normal
- Mode vacances avec planning dédié (vide par défaut, à configurer)

## Export

`id: planning-boulot`, `category: boulot`, `getDashboardWidget()` pour le dashboard Ancrage.
