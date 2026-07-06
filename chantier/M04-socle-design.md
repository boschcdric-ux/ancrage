# M04 — Socle design : thèmes, mouvement, typographie

**Prérequis :** M03 ✅ dans ETAT.md.
**Durée attendue :** une session (2–3 h).
**Risque :** moyen — beaucoup de surface visuelle, mais aucune logique métier.

> Première mission de la tranche B (design). Avant de commencer :
> ajouter la ligne M04 au tableau de bord d'ETAT.md
> (`M04 | Socle design : thèmes, mouvement, typographie | 🔶 en cours`).

---

## Contexte et intention

L'app fonctionne mais son identité visuelle est générique (Inter + violet
standard) et son `--text-muted` échoue nettement le contraste WCAG AA
(ratio mesuré : 2,64 en sombre, 2,59 en clair, minimum requis 4,5).

Cette mission installe le **socle** de la nouvelle direction :
« calme profond, récompense vive », ancrée dans l'univers du nom Ancrage
(mer, nature, lumière du Sud). Elle ne change AUCUN agencement : mêmes
écrans, mêmes composants, mêmes tailles. Seuls changent les couleurs,
la typographie et les valeurs de la grammaire de mouvement — via les
tokens que les 21 modules consomment déjà.

**Règle d'or de la mission : les NOMS des variables CSS ne changent pas.**
(`--bg-primary`, `--accent`, `--text-muted`, etc. restent identiques.)
Seules leurs VALEURS changent. C'est ce qui garantit que les modules
héritent du nouveau design sans être touchés.

Les 4 thèmes remplacent les 3 existants :

| Ancien | Nouveau | Personnalité |
|---|---|---|
| dark | **encre** | Mer de nuit — bleu-noir profond, accent bioluminescent |
| light | **garrigue** | Midi à Nîmes — calcaire, olivier |
| warm | **crepuscule** | Fin de journée — aubergine, ambre |
| — | **maree** | Marée basse au matin — écume, ardoise marine |

Tous les ratios de contraste des paires critiques ont été vérifiés
≥ 4,5 (AA) pour les 4 thèmes avant rédaction de cette mission.

---

## Périmètre

**IN :**
- `src/core/styles.css` : blocs de thèmes, tokens de mouvement, typographie.
- `src/core/theme.js` : liste des thèmes, mode auto, migration des anciens noms.
- `src/modules/settings/index.js` : la liste des thèmes proposés et la
  validation codée en dur (les 2 endroits identifiés ci-dessous), rien d'autre.
- `index.html` : `data-theme` par défaut, `<meta name="theme-color">`,
  suppression du `<link>` Google Fonts.
- `src/main.js` : imports des polices.
- `package.json` : ajout des 2 dépendances de polices autorisées ci-dessous.
- Nouveau test : garde-fou de contraste.

**OUT (interdit) :**
- Tout fichier `style.css` de module (les `!important` et couleurs codées
  en dur des modules sont traités dans les missions signatures — si un
  module rend mal avec les nouveaux tokens à cause d'une couleur en dur,
  le NOTER dans ETAT.md « Découvertes », ne pas corriger).
- Tout HTML généré par les `view.js`, tout agencement, toute taille.
- Toute logique (`index.js` des modules, storage, router).
- Toute nouvelle animation (les signatures viendront en M05+).

---

## Étapes

### 1. Polices auto-hébergées (dépendances npm AUTORISÉES)

Le projet charge actuellement Inter depuis Google Fonts (CDN) : hors
ligne, la typo casse — inacceptable pour une PWA. Remplacer par des
polices embarquées :

```bash
npm install @fontsource-variable/bricolage-grotesque @fontsource/atkinson-hyperlegible
```

- **Atkinson Hyperlegible** (corps de texte) : police conçue par le
  Braille Institute pour une lisibilité maximale — choix signifiant
  pour une app TDAH-first.
- **Bricolage Grotesque** (titres) : caractère, chaleur, modernité.

Dans `src/main.js`, tout en haut (avant l'import du CSS) :
```js
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource-variable/bricolage-grotesque';
```

Puis supprimer :
- le `@import url('https://fonts.googleapis.com/...')` dans `core/styles.css`,
- le `<link>` Google Fonts et le `<link rel="preconnect">` dans `index.html`.

### 2. Typographie dans `core/styles.css`

Remplacer le bloc typographie existant :
```css
--font-family: 'Atkinson Hyperlegible', system-ui, sans-serif;
--font-display: 'Bricolage Grotesque Variable', var(--font-family);
```
(les tailles `--text-*`, graisses et interlignes existants ne changent pas).

Appliquer la police display aux titres, dans les styles de base :
`h1, h2, h3 { font-family: var(--font-display); letter-spacing: -0.01em; }`
— uniquement si un style de base pour h1–h3 existe déjà dans core/styles.css ;
sinon l'ajouter sobrement à côté des styles de `body`.

### 3. Les 4 thèmes — remplacer les 3 blocs existants par CE bloc, verbatim

```css
/* ===== THÈME ENCRE (sombre, défaut) — mer de nuit ===== */
:root, [data-theme="encre"] {
  --bg-primary: #0a1017;
  --bg-secondary: #101a24;
  --bg-tertiary: #16232f;
  --bg-hover: #1c2c3b;

  --text-primary: #e9f1f4;
  --text-secondary: #9db4c0;
  --text-muted: #8299a6;

  --accent: #45e0b0;
  --accent-hover: #63eec2;
  --accent-soft: rgba(69, 224, 176, 0.15);
  --text-on-accent: #04241a;

  --success: #5fd39a;
  --warning: #f0b35e;
  --danger: #ef7d93;
  --info: #5ab4f0;

  --border: rgba(233, 241, 244, 0.08);
  --shadow: 0 4px 24px rgba(2, 8, 14, 0.5);
  --shadow-soft: 0 2px 12px rgba(2, 8, 14, 0.3);
}

/* ===== THÈME GARRIGUE (clair) — calcaire et olivier ===== */
[data-theme="garrigue"] {
  --bg-primary: #f2eee6;
  --bg-secondary: #faf7f0;
  --bg-tertiary: #eae4d8;
  --bg-hover: #e2dccd;

  --text-primary: #26301f;
  --text-secondary: #55614a;
  --text-muted: #5f6b53;

  --accent: #4d6b3c;
  --accent-hover: #3e5a2f;
  --accent-soft: rgba(77, 107, 60, 0.12);
  --text-on-accent: #f5f8ef;

  --success: #3d7d4f;
  --warning: #a86f24;
  --danger: #b3543f;
  --info: #2f6f8f;

  --border: rgba(38, 48, 31, 0.10);
  --shadow: 0 4px 24px rgba(90, 80, 60, 0.15);
  --shadow-soft: 0 2px 12px rgba(90, 80, 60, 0.08);
}

/* ===== THÈME CRÉPUSCULE (sombre chaud) — aubergine et ambre ===== */
[data-theme="crepuscule"] {
  --bg-primary: #171015;
  --bg-secondary: #201620;
  --bg-tertiary: #291d29;
  --bg-hover: #322434;

  --text-primary: #f4e9e4;
  --text-secondary: #c3aaa4;
  --text-muted: #a89089;

  --accent: #f0a35e;
  --accent-hover: #f5b678;
  --accent-soft: rgba(240, 163, 94, 0.15);
  --text-on-accent: #2b1706;

  --success: #7fc48f;
  --warning: #f0c05e;
  --danger: #ee7f8e;
  --info: #8fb4e8;

  --border: rgba(244, 233, 228, 0.08);
  --shadow: 0 4px 24px rgba(10, 4, 10, 0.5);
  --shadow-soft: 0 2px 12px rgba(10, 4, 10, 0.3);
}

/* ===== THÈME MARÉE BASSE (clair frais) — écume du matin ===== */
[data-theme="maree"] {
  --bg-primary: #e8edeb;
  --bg-secondary: #f4f7f6;
  --bg-tertiary: #dee6e3;
  --bg-hover: #d4dedb;

  --text-primary: #1d2b2d;
  --text-secondary: #48605f;
  --text-muted: #536c6a;

  --accent: #146b66;
  --accent-hover: #0f5752;
  --accent-soft: rgba(20, 107, 102, 0.10);
  --text-on-accent: #eaf5f3;

  --success: #2f7d54;
  --warning: #a86f24;
  --danger: #b3543f;
  --info: #2f6f8f;

  --border: rgba(29, 43, 45, 0.10);
  --shadow: 0 4px 24px rgba(60, 85, 82, 0.15);
  --shadow-soft: 0 2px 12px rgba(60, 85, 82, 0.08);
}
```

### 4. Grammaire de mouvement — mêmes noms, nouvelles valeurs

Dans le bloc `/* ===== ANIMATIONS ===== */`, remplacer les valeurs
(PAS les noms) :

```css
--duration-fast:   140ms;  /* feedback tactile (press, hover)      */
--duration-normal: 320ms;  /* transitions d'état                    */
--duration-slow:   500ms;  /* apparitions amples                    */
--duration-xslow:  650ms;  /* réservé à la récompense (M05+)        */
--ease-default: cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring:  cubic-bezier(0.34, 1.45, 0.64, 1);
--ease-out:     cubic-bezier(0.16, 1, 0.3, 1);
```

Les tokens `--app-module-transition-ms` et
`--app-module-desktop-fade-ms` ne changent pas (synchronisés avec
shell/gestures — hors périmètre).

### 5. `core/theme.js` — 4 thèmes, auto, migration

- `const THEMES = ['encre', 'garrigue', 'crepuscule', 'maree'];`
- `getAutoTheme()` : jour (7 h–20 h) → `'garrigue'`, nuit → `'encre'`.
- **Migration des anciens noms** (préférence stockée dans
  `adhd-theme-override`) : au chargement, si le thème lu vaut un ancien
  nom, le convertir — `dark → encre`, `light → garrigue`,
  `warm → crepuscule` — et réécrire la valeur migrée. Un utilisateur qui
  avait choisi « Chaud » doit se retrouver en Crépuscule sans rien faire.
- `applyTheme()` : sécurité — si le thème demandé n'est pas dans THEMES,
  appliquer le thème auto.

### 6. `settings/index.js` — la liste et la validation

- Remplacer la liste des 3 thèmes (ids/icônes/labels, vers la ligne 18) par :
  `encre 🌊 Encre · garrigue 🫒 Garrigue · crepuscule 🌅 Crépuscule · maree 🐚 Marée basse`
- Corriger la validation codée en dur (vers la ligne 267,
  `themeId === 'light' || ...`) : valider contre `THEMES` importé de
  `core/theme.js` plutôt que des littéraux — plus jamais de liste en dur ici.

### 7. `index.html`
- `data-theme="encre"` sur `<html>`.
- `<meta name="theme-color" content="#0a1017">`.

### 8. Vérification onboarding
`grep -rn "data-theme\|'dark'\|'light'\|'warm'" src/shell/onboarding.js` —
si l'onboarding référence les anciens thèmes, appliquer la même
correspondance. Sinon, rien.

### 9. Garde-fou de contraste (nouveau test)
Créer `src/core/theme-contrast.test.js` : le test lit `core/styles.css`,
extrait pour chaque bloc `[data-theme="…"]` (et `:root`) les valeurs de
`--bg-primary`, `--bg-secondary`, `--text-primary`, `--text-secondary`,
`--text-muted`, `--accent`, `--text-on-accent`, calcule les ratios de
contraste WCAG et vérifie :
- `text-primary` / `bg-primary` ≥ 4,5
- `text-secondary` / `bg-primary` ≥ 4,5
- `text-muted` / `bg-primary` ≥ 4,5 et / `bg-secondary` ≥ 4,5
- `text-on-accent` / `accent` ≥ 4,5
Ce test doit être exécuté par `npm run test:unit` (règle des standards).
C'est lui qui empêchera pour toujours le retour d'un texte illisible.

---

## Critères d'acceptation

- [ ] Rituel de contrôle : tout vert, y compris le test de contraste
      (≥ 20 assertions de ratio).
- [ ] `grep -rn "fonts.googleapis" src index.html dist` → 0 occurrence.
- [ ] Hors ligne simulé (DevTools → Network → Offline, après un premier
      chargement) : la typographie reste correcte.
- [ ] Les 4 thèmes se sélectionnent dans Réglages ; le mode auto bascule
      garrigue/encre ; un override legacy (`warm` écrit à la main dans
      `adhd-theme-override`) est migré en `crepuscule` au chargement.
- [ ] Aucun fichier `src/modules/*/style.css` modifié
      (`git diff --stat` le confirme).
- [ ] Bundle JS d'entrée : inchangé à ±3 KB. Poids des polices ajouté au
      precache : consigner la valeur dans ETAT.md (attendu : de l'ordre
      de 100–250 KB de woff2 — c'est le prix de l'autonomie hors ligne,
      il est accepté).
- [ ] Résumé final : liste des découvertes « couleurs en dur dans les
      modules qui jurent avec les nouveaux thèmes », consignées dans
      ETAT.md pour les missions signatures.

---

## Vérification visuelle (Cédric, ~5 min — la plus agréable du chantier)

1. `npm run preview` : l'app s'ouvre en Encre. Naviguer 4–5 modules.
2. Réglages → basculer les 4 thèmes un par un. Chercher : un texte
   illisible, un bouton invisible, un élément resté violet (`#7c6af7`)
   — chaque anomalie va dans ETAT.md « Découvertes ».
3. Vérifier les titres : la nouvelle police display doit se voir
   (plus de caractère que le texte courant).
4. Mode hors ligne : couper le wifi, recharger — la typo tient.
