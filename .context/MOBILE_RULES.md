# Règles mobile — Ancrage (ADHD App)

> **Obligatoire** pour tout nouveau module ou correction UI dans Ancrage.
> Les IA doivent appliquer ces règles **sans qu’on les redemande**.

Référence design : `DESIGN_SYSTEM.md` (variables `--text-*`, `--space-*`, `--border`, etc.).

---

## Règle 1 — Taille minimum des éléments tactiles

Tout **bouton**, **input**, **select**, **checkbox** :

```css
min-height: 44px; /* standard Apple iOS */
```

Icônes seules cliquables :

```css
min-width: 44px;
min-height: 44px;
```

---

## Règle 2 — Rien ne déborde de l’écran

Conteneur **racine** du module :

```css
width: 100%;
max-width: 100%;
box-sizing: border-box;
overflow-x: hidden;
```

---

## Règle 3 — Padding bas (barre de navigation)

Sur le conteneur racine du module (ex. `.mon-module`) :

```css
padding-bottom: calc(var(--nav-height, 72px) + var(--space-4));
```

La variable globale `--nav-height` est définie dans `src/core/styles.css` (défaut 72px).

---

## Règle 4 — Scroll natif iOS

Tout conteneur scrollable :

```css
overflow-y: auto;
-webkit-overflow-scrolling: touch;
```

---

## Règle 5 — Labels toujours visibles

Chaque **input** ou **select** doit avoir un **`<label>` visible au-dessus** (pas le placeholder seul).

Pattern recommandé pour les champs :

```html
<div class="…-field">
  <label for="…">Libellé</label>
  <input … />
</div>
```

Pour `type="time"` sur iPhone (souvent vide visuellement), utiliser un wrapper dédié avec labels « Début » / « Fin » et `placeholder="--:--"` sur l’input.

---

## Vue configuration longue

Si la vue défile (formulaire, réglages) :

```css
padding-bottom: calc(var(--nav-height, 72px) + var(--space-6));
overflow-y: auto;
-webkit-overflow-scrolling: touch;
```

Les champs en bas du flux doivent rester en position **normale** (pas `fixed` / `absolute`).

---

## Exemple de référence

Module `planning-boulot` : `src/modules/planning-boulot/style.css` (commentaire en tête + classes `.planning-time-field`, `.planning-config-container`).
