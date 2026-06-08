import './style.css';
import { save, load, generateUUID } from '../../core/storage.js';
import {
  createRecipesShell,
  renderRecipeGrid,
  filterChips,
  renderDetailBody,
  renderEditForm,
  ingredientFormRow,
  stepFormRow,
  shoppingLabelForIngredient,
  createDashboardWidgetHtml
} from './view.js';

const RECIPES_KEY = 'recipes:list';
const STORES_KEY = 'shopping:stores';

const SHOP_CATEGORIES = new Set([
  'viande_poisson',
  'fruits_legumes',
  'frais',
  'epicerie',
  'hygiene',
  'boissons',
  'surgeles',
  'autre'
]);

/** IDs fixes pour fusionner les recettes d’origine si la liste existe déjà. */
const DEFAULT_RECIPES_RAW = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    name: 'Salade de pois chiches',
    emoji: '🥗',
    photo: null,
    prepTime: 10,
    difficulty: 1,
    type: 'vegetarian',
    ingredients: [
      { name: 'Pois chiches', quantity: 400, unit: 'g', category: 'epicerie' },
      { name: 'Tomates cerises', quantity: 200, unit: 'g', category: 'fruits_legumes' },
      { name: 'Concombre', quantity: 0.5, unit: 'pièce', category: 'fruits_legumes' },
      { name: 'Feta', quantity: 150, unit: 'g', category: 'frais' },
      { name: "Huile d'olive", quantity: 2, unit: 'c. à s.', category: 'epicerie' },
      { name: 'Citron', quantity: 0.5, unit: 'pièce', category: 'fruits_legumes' }
    ],
    steps: [
      'Égoutter et rincer les pois chiches.',
      'Couper tomates, concombre et feta en morceaux.',
      'Mélanger, arroser d’huile et d’un filet de citron.',
      'Goûter, assaisonner — c’est prêt.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    name: 'Pâtes à l’ail et huile',
    emoji: '🍝',
    photo: null,
    prepTime: 15,
    difficulty: 1,
    type: 'vegetarian',
    ingredients: [
      { name: 'Pâtes', quantity: 250, unit: 'g', category: 'epicerie' },
      { name: 'Ail', quantity: 3, unit: 'gousses', category: 'fruits_legumes' },
      { name: "Huile d'olive", quantity: 4, unit: 'c. à s.', category: 'epicerie' },
      { name: 'Parmesan', quantity: 50, unit: 'g', category: 'frais' },
      { name: 'Persil', quantity: 1, unit: 'petit bouquet', category: 'fruits_legumes' }
    ],
    steps: [
      'Cuire les pâtes al dente dans l’eau bouillante salée.',
      'Faire revenir l’ail haché dans l’huile à feu doux.',
      'Égoutter les pâtes, mélanger avec l’huile à l’ail.',
      'Parsemer de parmesan et de persil ciselé.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    name: 'Curry de lentilles',
    emoji: '🥘',
    photo: null,
    prepTime: 25,
    difficulty: 2,
    type: 'vegetarian',
    ingredients: [
      { name: 'Lentilles corail', quantity: 250, unit: 'g', category: 'epicerie' },
      { name: 'Lait de coco', quantity: 400, unit: 'ml', category: 'epicerie' },
      { name: 'Tomates', quantity: 2, unit: 'pièces', category: 'fruits_legumes' },
      { name: 'Curry en poudre', quantity: 1, unit: 'c. à s.', category: 'epicerie' },
      { name: 'Oignon', quantity: 1, unit: 'pièce', category: 'fruits_legumes' }
    ],
    steps: [
      'Faire revenir l’oignon émincé jusqu’à transparence.',
      'Ajouter le curry, puis les tomates en morceaux.',
      'Verser lentilles, lait de coco et un peu d’eau ; mijoter 15–20 min.',
      'Rectifier l’assaisonnement, servir bien chaud.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    name: 'Saumon au four',
    emoji: '🐟',
    photo: null,
    prepTime: 20,
    difficulty: 1,
    type: 'fish',
    ingredients: [
      { name: 'Pavé de saumon', quantity: 2, unit: 'pièces', category: 'viande_poisson' },
      { name: 'Citron', quantity: 0.5, unit: 'pièce', category: 'fruits_legumes' },
      { name: 'Herbes de Provence', quantity: 1, unit: 'c. à c.', category: 'epicerie' },
      { name: "Huile d'olive", quantity: 1, unit: 'c. à s.', category: 'epicerie' }
    ],
    steps: [
      'Préchauffer le four à 180 °C.',
      'Déposer le saumon sur une plaque, citron et herbes par-dessus.',
      'Arroser d’huile, enfourner 12–15 min selon l’épaisseur.',
      'Le cœur doit rester légèrement rosé si tu préfères.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-111111111105',
    name: 'Omelette aux légumes',
    emoji: '🥚',
    photo: null,
    prepTime: 10,
    difficulty: 1,
    type: 'vegetarian',
    ingredients: [
      { name: 'Œufs', quantity: 3, unit: 'pièces', category: 'frais' },
      { name: 'Poivron', quantity: 0.5, unit: 'pièce', category: 'fruits_legumes' },
      { name: 'Champignons', quantity: 100, unit: 'g', category: 'fruits_legumes' },
      { name: 'Fromage râpé', quantity: 40, unit: 'g', category: 'frais' }
    ],
    steps: [
      'Couper poivron et champignons en petits morceaux.',
      'Les faire sauter à la poêle jusqu’à tendreté.',
      'Battre les œufs, verser sur les légumes, saupoudrer de fromage.',
      'Cuire à feu moyen en pliant quand le dessus prend.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-111111111106',
    name: 'Riz aux haricots rouges',
    emoji: '🫘',
    photo: null,
    prepTime: 20,
    difficulty: 1,
    type: 'vegetarian',
    ingredients: [
      { name: 'Riz', quantity: 200, unit: 'g', category: 'epicerie' },
      { name: 'Haricots rouges', quantity: 240, unit: 'g', category: 'epicerie' },
      { name: 'Tomates concassées', quantity: 400, unit: 'g', category: 'epicerie' },
      { name: 'Cumin', quantity: 1, unit: 'c. à c.', category: 'epicerie' },
      { name: 'Ail', quantity: 1, unit: 'gousse', category: 'fruits_legumes' }
    ],
    steps: [
      'Faire revenir ail et cumin dans un peu d’huile.',
      'Ajouter riz, tomates et haricots égouttés.',
      'Mouiller (eau ou bouillon), couvrir et cuire jusqu’à absorption.',
      'Laisser reposer 5 min avant de servir.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-111111111107',
    name: 'Wrap au thon',
    emoji: '🥙',
    photo: null,
    prepTime: 5,
    difficulty: 1,
    type: 'fish',
    ingredients: [
      { name: 'Tortilla', quantity: 2, unit: 'pièces', category: 'epicerie' },
      { name: 'Thon en boîte', quantity: 1, unit: 'boîte', category: 'viande_poisson' },
      { name: 'Salade', quantity: 1, unit: 'poignée', category: 'fruits_legumes' },
      { name: 'Tomate', quantity: 1, unit: 'pièce', category: 'fruits_legumes' },
      { name: 'Fromage frais', quantity: 2, unit: 'c. à s.', category: 'frais' }
    ],
    steps: [
      'Égoutter le thon et l’émietter.',
      'Tartiner la tortilla de fromage frais.',
      'Ajouter thon, salade et tomate en lamelles.',
      'Rouler serré — prêt en un clin d’œil.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-111111111108',
    name: 'Soupe de légumes express',
    emoji: '🍲',
    photo: null,
    prepTime: 15,
    difficulty: 1,
    type: 'vegetarian',
    ingredients: [
      { name: 'Carottes', quantity: 2, unit: 'pièces', category: 'fruits_legumes' },
      { name: 'Pommes de terre', quantity: 2, unit: 'pièces', category: 'fruits_legumes' },
      { name: 'Poireaux', quantity: 1, unit: 'pièce', category: 'fruits_legumes' },
      { name: 'Bouillon cube', quantity: 1, unit: 'pièce', category: 'epicerie' }
    ],
    steps: [
      'Éplucher et couper les légumes en morceaux réguliers.',
      'Les couvrir d’eau avec le bouillon, porter à ébullition.',
      'Mijoter 12–15 min jusqu’à tendreté.',
      'Mixer ou laisser en morceaux selon ton envie.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-111111111109',
    name: 'Shakshuka',
    emoji: '🥚',
    photo: null,
    prepTime: 20,
    difficulty: 1,
    type: 'vegetarian',
    ingredients: [
      { name: 'Œufs', quantity: 4, unit: 'pièces', category: 'frais' },
      { name: 'Tomates concassées', quantity: 400, unit: 'g', category: 'epicerie' },
      { name: 'Poivron', quantity: 1, unit: 'pièce', category: 'fruits_legumes' },
      { name: 'Oignon', quantity: 1, unit: 'pièce', category: 'fruits_legumes' },
      { name: 'Cumin', quantity: 1, unit: 'c. à c.', category: 'epicerie' },
      { name: 'Paprika', quantity: 1, unit: 'c. à c.', category: 'epicerie' },
      { name: 'Ail', quantity: 1, unit: 'gousse', category: 'fruits_legumes' }
    ],
    steps: [
      'Faire revenir l’oignon, le poivron et l’ail émincés 5 min.',
      'Ajouter cumin, paprika et tomates concassées, puis mijoter 8 min.',
      'Creuser 4 petits puits, casser les œufs dedans.',
      'Couvrir et cuire 4–5 min, jusqu’à blancs pris et jaunes encore coulants.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-11111111110a',
    name: 'Dal de lentilles corail',
    emoji: '🫘',
    photo: null,
    prepTime: 25,
    difficulty: 1,
    type: 'vegetarian',
    ingredients: [
      { name: 'Lentilles corail', quantity: 250, unit: 'g', category: 'epicerie' },
      { name: 'Lait de coco', quantity: 400, unit: 'ml', category: 'epicerie' },
      { name: 'Tomates concassées', quantity: 200, unit: 'g', category: 'epicerie' },
      { name: 'Curry en poudre', quantity: 1, unit: 'c. à s.', category: 'epicerie' },
      { name: 'Oignon', quantity: 1, unit: 'pièce', category: 'fruits_legumes' },
      { name: 'Ail', quantity: 1, unit: 'gousse', category: 'fruits_legumes' },
      { name: 'Gingembre', quantity: 1, unit: 'c. à c.', category: 'fruits_legumes' }
    ],
    steps: [
      'Faire revenir oignon, ail et gingembre hachés 4 min.',
      'Ajouter le curry puis les tomates concassées, mélanger 1 min.',
      'Verser lentilles, lait de coco et 300 ml d’eau, puis cuire 15 min.',
      'Remuer, ajuster sel/poivre et servir bien chaud.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-11111111110b',
    name: 'Falafels express en boîte',
    emoji: '🥙',
    photo: null,
    prepTime: 15,
    difficulty: 1,
    type: 'vegetarian',
    ingredients: [
      { name: 'Pois chiches en boîte', quantity: 400, unit: 'g', category: 'epicerie' },
      { name: 'Ail', quantity: 1, unit: 'gousse', category: 'fruits_legumes' },
      { name: 'Cumin', quantity: 1, unit: 'c. à c.', category: 'epicerie' },
      { name: 'Coriandre', quantity: 1, unit: 'c. à s.', category: 'fruits_legumes' },
      { name: 'Farine', quantity: 2, unit: 'c. à s.', category: 'epicerie' },
      { name: 'Yaourt nature', quantity: 120, unit: 'g', category: 'frais' },
      { name: 'Citron', quantity: 0.5, unit: 'pièce', category: 'fruits_legumes' }
    ],
    steps: [
      'Mixer pois chiches égouttés avec ail, cumin, coriandre et farine.',
      'Former des petites boulettes et les dorer à la poêle 6–8 min.',
      'Mélanger yaourt, jus de citron, sel et poivre pour la sauce.',
      'Servir les falafels chauds avec la sauce yaourt citronnée.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-11111111110c',
    name: 'Omelette espagnole simplifiée',
    emoji: '🍳',
    photo: null,
    prepTime: 20,
    difficulty: 1,
    type: 'vegetarian',
    ingredients: [
      { name: 'Œufs', quantity: 4, unit: 'pièces', category: 'frais' },
      { name: 'Pommes de terre', quantity: 300, unit: 'g', category: 'fruits_legumes' },
      { name: 'Oignon', quantity: 1, unit: 'pièce', category: 'fruits_legumes' },
      { name: "Huile d'olive", quantity: 2, unit: 'c. à s.', category: 'epicerie' },
      { name: 'Sel', quantity: 1, unit: 'pincée', category: 'epicerie' }
    ],
    steps: [
      'Couper pommes de terre fines et émincer l’oignon.',
      'Cuire 10 min à la poêle avec l’huile, à feu moyen et couvert.',
      'Battre les œufs avec le sel, verser dans la poêle et mélanger vite.',
      'Cuire 3–4 min puis retourner (ou plier) pour finir la cuisson.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-11111111110d',
    name: 'Sardines sur toast',
    emoji: '🐟',
    photo: null,
    prepTime: 5,
    difficulty: 1,
    type: 'fish',
    ingredients: [
      { name: 'Sardines en boîte', quantity: 1, unit: 'boîte', category: 'viande_poisson' },
      { name: 'Pain de mie', quantity: 2, unit: 'tranches', category: 'epicerie' },
      { name: 'Tomate', quantity: 1, unit: 'pièce', category: 'fruits_legumes' },
      { name: 'Citron', quantity: 0.5, unit: 'pièce', category: 'fruits_legumes' },
      { name: 'Herbes de Provence', quantity: 1, unit: 'c. à c.', category: 'epicerie' }
    ],
    steps: [
      'Toaster les tranches de pain de mie.',
      'Écraser légèrement les sardines avec un filet de citron.',
      'Ajouter la tomate en dés et les herbes, puis mélanger.',
      'Étaler sur les toasts et servir aussitôt.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-11111111110e',
    name: 'Buddha bowl pois chiches rôtis',
    emoji: '🥗',
    photo: null,
    prepTime: 25,
    difficulty: 1,
    type: 'vegetarian',
    ingredients: [
      { name: 'Pois chiches', quantity: 240, unit: 'g', category: 'epicerie' },
      { name: 'Riz', quantity: 180, unit: 'g', category: 'epicerie' },
      { name: 'Carotte', quantity: 1, unit: 'pièce', category: 'fruits_legumes' },
      { name: 'Concombre', quantity: 0.5, unit: 'pièce', category: 'fruits_legumes' },
      { name: 'Avocat', quantity: 1, unit: 'pièce', category: 'fruits_legumes' },
      { name: 'Sauce tahini', quantity: 2, unit: 'c. à s.', category: 'epicerie' },
      { name: 'Citron', quantity: 0.5, unit: 'pièce', category: 'fruits_legumes' }
    ],
    steps: [
      'Cuire le riz selon le paquet.',
      'Poêler les pois chiches 8 min avec un peu d’huile et de sel.',
      'Préparer carotte râpée, concombre et avocat en tranches.',
      'Assembler le bol et arroser de sauce tahini citronnée.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-11111111110f',
    name: 'Nouilles sautées aux légumes',
    emoji: '🍜',
    photo: null,
    prepTime: 15,
    difficulty: 1,
    type: 'vegetarian',
    ingredients: [
      { name: 'Nouilles', quantity: 200, unit: 'g', category: 'epicerie' },
      { name: 'Courgette', quantity: 1, unit: 'pièce', category: 'fruits_legumes' },
      { name: 'Carotte', quantity: 1, unit: 'pièce', category: 'fruits_legumes' },
      { name: 'Sauce soja', quantity: 2, unit: 'c. à s.', category: 'epicerie' },
      { name: 'Ail', quantity: 1, unit: 'gousse', category: 'fruits_legumes' },
      { name: 'Huile de sésame', quantity: 1, unit: 'c. à s.', category: 'epicerie' },
      { name: 'Œuf', quantity: 1, unit: 'pièce', category: 'frais' }
    ],
    steps: [
      'Cuire les nouilles puis les égoutter.',
      'Sauter ail, courgette et carotte en julienne 4 min au wok.',
      'Ajouter l’œuf battu et remuer jusqu’à cuisson.',
      'Incorporer les nouilles, sauce soja et huile de sésame 1–2 min.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-111111111110',
    name: 'Houmous maison express',
    emoji: '🥘',
    photo: null,
    prepTime: 10,
    difficulty: 1,
    type: 'vegetarian',
    ingredients: [
      { name: 'Pois chiches en boîte', quantity: 400, unit: 'g', category: 'epicerie' },
      { name: 'Tahini', quantity: 2, unit: 'c. à s.', category: 'epicerie' },
      { name: 'Citron', quantity: 0.5, unit: 'pièce', category: 'fruits_legumes' },
      { name: 'Ail', quantity: 1, unit: 'gousse', category: 'fruits_legumes' },
      { name: "Huile d'olive", quantity: 2, unit: 'c. à s.', category: 'epicerie' },
      { name: 'Cumin', quantity: 0.5, unit: 'c. à c.', category: 'epicerie' }
    ],
    steps: [
      'Égoutter les pois chiches en gardant un peu d’eau de boîte.',
      'Mixer pois chiches, tahini, ail, cumin et jus de citron.',
      'Ajouter huile d’olive et un peu d’eau pour une texture crémeuse.',
      'Goûter, saler puis servir avec pain ou crudités.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Thon à la provençale',
    emoji: '🐟',
    photo: null,
    prepTime: 15,
    difficulty: 1,
    type: 'fish',
    ingredients: [
      { name: 'Thon en boîte', quantity: 1, unit: 'boîte', category: 'viande_poisson' },
      { name: 'Tomates cerises', quantity: 200, unit: 'g', category: 'fruits_legumes' },
      { name: 'Olives', quantity: 80, unit: 'g', category: 'epicerie' },
      { name: 'Ail', quantity: 1, unit: 'gousse', category: 'fruits_legumes' },
      { name: 'Herbes de Provence', quantity: 1, unit: 'c. à c.', category: 'epicerie' },
      { name: "Huile d'olive", quantity: 1, unit: 'c. à s.', category: 'epicerie' }
    ],
    steps: [
      'Faire revenir l’ail haché dans l’huile d’olive 1 min.',
      'Ajouter tomates cerises coupées et olives, cuire 5 min.',
      'Incorporer le thon égoutté et les herbes de Provence.',
      'Laisser chauffer 2–3 min et servir avec pain ou riz.'
    ],
    isDefault: true
  },
  {
    id: '11111111-1111-4111-8111-111111111112',
    name: 'Pancakes salés aux herbes',
    emoji: '🥞',
    photo: null,
    prepTime: 15,
    difficulty: 1,
    type: 'vegetarian',
    ingredients: [
      { name: 'Œufs', quantity: 2, unit: 'pièces', category: 'frais' },
      { name: 'Farine', quantity: 120, unit: 'g', category: 'epicerie' },
      { name: 'Lait', quantity: 180, unit: 'ml', category: 'frais' },
      { name: 'Ciboulette', quantity: 1, unit: 'c. à s.', category: 'fruits_legumes' },
      { name: 'Fromage râpé', quantity: 60, unit: 'g', category: 'frais' },
      { name: 'Sel', quantity: 1, unit: 'pincée', category: 'epicerie' }
    ],
    steps: [
      'Mélanger farine, œufs, lait et sel pour obtenir une pâte lisse.',
      'Ajouter ciboulette ciselée et fromage râpé.',
      'Verser des petites louches dans une poêle chaude huilée.',
      'Cuire 1–2 min par face et servir aussitôt.'
    ],
    isDefault: true
  }
];

let rootContainer = null;
let modalPortal = null;
let recipes = [];
let activeFilter = 'all';
let searchQuery = '';
let openSheet = null;
let autosaveTimer = null;
let onSyncComplete = null;
let onRootClick = null;
let onRootInput = null;
let onRootChange = null;
let onFormInput = null;
let onKeyDown = null;

function now() {
  return Date.now();
}

function normalizeCategoryId(value) {
  if (value == null || value === '') return 'autre';
  const id = String(value);
  return SHOP_CATEGORIES.has(id) ? id : 'autre';
}

function normalizeIngredient(raw) {
  if (!raw || typeof raw.name !== 'string') return null;
  const name = raw.name.trim();
  if (!name) return null;
  let quantity = raw.quantity;
  if (quantity != null && quantity !== '') {
    const n = Number(quantity);
    quantity = Number.isFinite(n) ? n : raw.quantity;
  } else quantity = '';
  const unit = typeof raw.unit === 'string' ? raw.unit.trim() : '';
  return {
    name,
    quantity,
    unit,
    category: normalizeCategoryId(raw.category)
  };
}

function normalizeRecipe(raw) {
  if (!raw || typeof raw.name !== 'string') return null;
  const name = raw.name.trim();
  if (!name) return null;
  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients.map(normalizeIngredient).filter(Boolean)
    : [];
  const steps = Array.isArray(raw.steps)
    ? raw.steps.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean)
    : [];
  const type = ['vegetarian', 'fish', 'vegan', 'other'].includes(raw.type) ? raw.type : 'other';
  let difficulty = Number(raw.difficulty);
  if (!Number.isFinite(difficulty)) difficulty = 1;
  difficulty = Math.min(3, Math.max(1, Math.round(difficulty)));
  let prepTime = Number(raw.prepTime);
  if (!Number.isFinite(prepTime)) prepTime = 15;
  prepTime = Math.min(120, Math.max(5, Math.round(prepTime / 5) * 5));

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : generateUUID(),
    name,
    emoji: typeof raw.emoji === 'string' && raw.emoji.trim() ? raw.emoji.trim() : '🍽️',
    photo: raw.photo == null ? null : raw.photo,
    prepTime,
    difficulty,
    type,
    ingredients,
    steps,
    isDefault: raw.isDefault === true,
    createdAt: Number(raw.createdAt) || now(),
    updatedAt: Number(raw.updatedAt) || now()
  };
}

function seedDefaultRecipes() {
  const t = now();
  return DEFAULT_RECIPES_RAW.map((r, i) =>
    normalizeRecipe({
      ...r,
      createdAt: t + i,
      updatedAt: t + i
    })
  ).filter(Boolean);
}

function mergeDefaultRecipes(existing) {
  const byId = new Map(existing.map((r) => [r.id, r]));
  for (const def of DEFAULT_RECIPES_RAW) {
    if (!byId.has(def.id)) {
      const merged = normalizeRecipe({ ...def, createdAt: now(), updatedAt: now() });
      if (merged) {
        existing.push(merged);
        byId.set(merged.id, merged);
      }
    }
  }
  return existing;
}

function readRecipes() {
  const data = load(RECIPES_KEY, []);
  let list = Array.isArray(data) ? data.map(normalizeRecipe).filter(Boolean) : [];
  if (!list.length) {
    list = seedDefaultRecipes();
    save(RECIPES_KEY, list);
    return list;
  }
  list = mergeDefaultRecipes(list);
  save(RECIPES_KEY, list);
  return list;
}

function persistRecipes() {
  save(RECIPES_KEY, recipes);
}

function normalizeShoppingItem(raw) {
  if (!raw || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  return {
    id: raw.id,
    name: raw.name.trim() || 'Sans nom',
    category: normalizeCategoryId(raw.category),
    price: raw.price != null && Number.isFinite(Number(raw.price)) ? Math.round(Number(raw.price) * 100) / 100 : null,
    checked: !!raw.checked,
    isFavorite: !!raw.isFavorite,
    createdAt: Number(raw.createdAt) || now()
  };
}

function normalizeStore(raw) {
  if (!raw || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  const items = Array.isArray(raw.items) ? raw.items.map(normalizeShoppingItem).filter(Boolean) : [];
  const favorites = Array.isArray(raw.favorites)
    ? raw.favorites.map((f) => String(f).trim()).filter(Boolean)
    : [];
  const budget = Number(raw.budget);
  return {
    id: raw.id,
    name: raw.name.trim() || 'Magasin',
    budget: Number.isFinite(budget) && budget >= 0 ? budget : 100,
    items,
    favorites,
    createdAt: Number(raw.createdAt) || now()
  };
}

function ingredientBaseKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function shoppingItemMatchesIngredient(itemName, ingredientName) {
  const ing = ingredientBaseKey(ingredientName);
  if (!ing) return false;
  const raw = String(itemName || '').trim();
  const lower = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (lower === ing) return true;
  const paren = lower.indexOf('(');
  if (paren > 0) {
    const base = lower.slice(0, paren).trim();
    if (base === ing) return true;
  }
  return lower.startsWith(`${ing} (`);
}

function getFirstShoppingStore(stores) {
  return stores[0] || null;
}

function addRecipeIngredientsToShopping(recipe) {
  const data = load(STORES_KEY, null);
  if (!Array.isArray(data) || !data.length) return { ok: false, reason: 'no-stores', added: 0, storeName: '' };
  const stores = data.map(normalizeStore).filter(Boolean);
  if (!stores.length) return { ok: false, reason: 'no-stores', added: 0, storeName: '' };

  const store = getFirstShoppingStore(stores);
  if (!store) return { ok: false, reason: 'no-store', added: 0, storeName: '' };

  const ings = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  let added = 0;
  for (const ing of ings) {
    const norm = normalizeIngredient(ing);
    if (!norm) continue;
    const label = shoppingLabelForIngredient(norm);
    const exists = store.items.some((it) => shoppingItemMatchesIngredient(it.name, norm.name));
    if (exists) continue;
    store.items.push({
      id: generateUUID(),
      name: label,
      category: norm.category,
      price: null,
      checked: false,
      isFavorite: false,
      createdAt: now()
    });
    added += 1;
  }

  const next = stores.map((s) => (s.id === store.id ? store : s));
  save(STORES_KEY, next);
  return { ok: true, added, storeName: store.name };
}

function getFilteredRecipes() {
  const q = searchQuery.trim().toLowerCase();
  return recipes.filter((r) => {
    if (q && !r.name.toLowerCase().includes(q)) return false;
    if (activeFilter === 'quick') return r.prepTime < 15;
    if (activeFilter === 'vegetarian') return r.type === 'vegetarian' || r.type === 'vegan';
    if (activeFilter === 'fish') return r.type === 'fish';
    if (activeFilter === 'mine') return r.isDefault !== true;
    return true;
  });
}

function qs(sel) {
  return rootContainer?.querySelector(sel) ?? modalPortal?.querySelector(sel) ?? null;
}

function qsa(sel) {
  return [...(rootContainer?.querySelectorAll(sel) ?? []), ...(modalPortal?.querySelectorAll(sel) ?? [])];
}

function syncFilters() {
  const el = qs('[data-recipes-filters-wrap]');
  if (el) el.innerHTML = filterChips(activeFilter);
}

function syncGrid() {
  const el = qs('[data-recipes-grid-wrap]');
  if (el) el.innerHTML = renderRecipeGrid(getFilteredRecipes());
}

function syncAll() {
  syncFilters();
  syncGrid();
}

function showToast(message) {
  const el = qs('[data-recipes-toast]');
  if (!(el instanceof HTMLElement)) return;
  el.textContent = message;
  el.hidden = false;
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => {
    el.hidden = true;
  }, 3200);
}

function mountModalPortal() {
  if (modalPortal || !rootContainer) return;
  const embedded = rootContainer.querySelector('.recipes-modal-portal--embedded');
  if (!(embedded instanceof HTMLElement)) return;
  modalPortal = embedded;
  modalPortal.classList.remove('recipes-modal-portal--embedded');
  modalPortal.classList.add('recipes-modal-portal');
  modalPortal.id = 'recipes-modal-portal';
  document.body.appendChild(modalPortal);
}

function unmountModalPortal() {
  if (modalPortal?.isConnected) modalPortal.remove();
  modalPortal = null;
}

function setSheetVisibility(mode) {
  const detail = qs('[data-recipes-sheet="detail"]');
  const edit = qs('[data-recipes-sheet="edit"]');
  openSheet = mode;
  if (detail instanceof HTMLElement) {
    const show = mode === 'detail';
    detail.hidden = !show;
    detail.setAttribute('aria-hidden', show ? 'false' : 'true');
  }
  if (edit instanceof HTMLElement) {
    const show = mode === 'edit';
    edit.hidden = !show;
    edit.setAttribute('aria-hidden', show ? 'false' : 'true');
  }
  if (modalPortal instanceof HTMLElement) {
    modalPortal.setAttribute('aria-hidden', mode ? 'false' : 'true');
  }
}

function closeSheets() {
  setSheetVisibility(null);
  window.clearTimeout(autosaveTimer);
}

function openDetail(recipeId) {
  const r = recipes.find((x) => x.id === recipeId);
  if (!r) return;
  const body = qs('[data-recipes-detail-body]');
  if (body) body.innerHTML = renderDetailBody(r);
  setSheetVisibility('detail');
}

function collectFormRecipe() {
  const idInput = qs('[data-recipes-form-id]');
  const id = idInput instanceof HTMLInputElement ? idInput.value.trim() : '';
  const nameInp = qs('[data-recipes-form-name]');
  const emojiInp = qs('[data-recipes-form-emoji]');
  const timeInp = qs('[data-recipes-form-time]');
  const typeSel = qs('[data-recipes-form-type]');
  const diffBtn = qs('[data-recipes-form-diff].is-active');
  const name = nameInp instanceof HTMLInputElement ? nameInp.value.trim() : '';
  const emoji = emojiInp instanceof HTMLInputElement ? emojiInp.value.trim() : '🍽️';
  const prepTime = timeInp instanceof HTMLInputElement ? Number(timeInp.value) : 15;
  const type = typeSel instanceof HTMLSelectElement ? typeSel.value : 'vegetarian';
  const difficulty = diffBtn instanceof HTMLButtonElement ? Number(diffBtn.dataset.recipesFormDiff) || 1 : 1;

  const ingRows = qsa('[data-recipes-ing-row]');
  const ingredients = [];
  for (const row of ingRows) {
    const n = row.querySelector('[data-recipes-ing-name]');
    const q = row.querySelector('[data-recipes-ing-qty]');
    const u = row.querySelector('[data-recipes-ing-unit]');
    const c = row.querySelector('[data-recipes-ing-cat]');
    ingredients.push(
      normalizeIngredient({
        name: n instanceof HTMLInputElement ? n.value : '',
        quantity: q instanceof HTMLInputElement ? q.value : '',
        unit: u instanceof HTMLInputElement ? u.value : '',
        category: c instanceof HTMLSelectElement ? c.value : 'epicerie'
      })
    );
  }

  const stepRows = qsa('[data-recipes-step-row]');
  const steps = [];
  for (const row of stepRows) {
    const ta = row.querySelector('[data-recipes-step-text]');
    const txt = ta instanceof HTMLTextAreaElement ? ta.value.trim() : '';
    if (txt) steps.push(txt);
  }

  const existing = recipes.find((x) => x.id === id);
  return normalizeRecipe({
    id: id || undefined,
    name,
    emoji,
    photo: existing?.photo ?? null,
    prepTime,
    difficulty,
    type,
    ingredients: ingredients.filter(Boolean),
    steps,
    isDefault: existing ? existing.isDefault : false,
    createdAt: existing?.createdAt,
    updatedAt: now()
  });
}

function applyFormRecipeToState(recipe) {
  if (!recipe) return;
  const i = recipes.findIndex((x) => x.id === recipe.id);
  if (i >= 0) recipes[i] = recipe;
  else recipes.push(recipe);
  persistRecipes();
  const status = qs('[data-recipes-autosave-status]');
  if (status) {
    status.textContent = 'Enregistré';
    window.clearTimeout(applyFormRecipeToState._st);
    applyFormRecipeToState._st = window.setTimeout(() => {
      if (status) status.textContent = 'Sauvegarde automatique';
    }, 1600);
  }
}

function scheduleAutosave() {
  window.clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(() => {
    const r = collectFormRecipe();
    if (r && r.name) applyFormRecipeToState(r);
  }, 450);
}

function createDraftRecipe() {
  const t = now();
  return {
    id: generateUUID(),
    name: '',
    emoji: '🍽️',
    photo: null,
    prepTime: 15,
    difficulty: 1,
    type: 'vegetarian',
    ingredients: [],
    steps: [],
    isDefault: false,
    createdAt: t,
    updatedAt: t
  };
}

function openEdit(recipeOrNew) {
  let recipe;
  if (recipeOrNew === 'new') {
    /* normalizeRecipe refuse un nom vide — brouillon hors normalisation jusqu’à la 1ʳᵉ sauvegarde */
    recipe = createDraftRecipe();
  } else {
    recipe = recipes.find((x) => x.id === recipeOrNew);
    if (!recipe) return;
    recipe = { ...recipe, ingredients: [...recipe.ingredients], steps: [...recipe.steps] };
  }
  const wrap = qs('[data-recipes-edit-form-wrap]');
  if (wrap) wrap.innerHTML = renderEditForm(recipe);
  const title = qs('#recipes-edit-title');
  if (title) title.textContent = recipeOrNew === 'new' ? 'Nouvelle recette' : 'Modifier la recette';
  setSheetVisibility('edit');
  scheduleAutosave();
}

function reindexIngredientRows() {
  const list = qs('[data-recipes-ing-list]');
  if (!list) return;
  const rows = [...list.querySelectorAll(':scope > [data-recipes-ing-row]')];
  rows.forEach((row, index) => {
    row.setAttribute('data-recipes-ing-row', String(index));
    row.querySelector('[data-recipes-ing-name]')?.setAttribute('data-recipes-ing-name', String(index));
    row.querySelector('[data-recipes-ing-qty]')?.setAttribute('data-recipes-ing-qty', String(index));
    row.querySelector('[data-recipes-ing-unit]')?.setAttribute('data-recipes-ing-unit', String(index));
    row.querySelector('[data-recipes-ing-cat]')?.setAttribute('data-recipes-ing-cat', String(index));
    row.querySelector('[data-recipes-ing-remove]')?.setAttribute('data-recipes-ing-remove', String(index));
  });
}

function reindexStepRows() {
  const list = qs('[data-recipes-step-list]');
  if (!list) return;
  const rows = [...list.querySelectorAll(':scope > [data-recipes-step-row]')];
  rows.forEach((row, index) => {
    row.setAttribute('data-recipes-step-row', String(index));
    row.querySelector('[data-recipes-step-text]')?.setAttribute('data-recipes-step-text', String(index));
    row.querySelector('[data-recipes-step-remove]')?.setAttribute('data-recipes-step-remove', String(index));
    const fl = row.querySelector('.recipes__field-label');
    if (fl) fl.textContent = `Étape ${index + 1}`;
  });
}

function bindEvents() {
  onRootClick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('[data-recipes-sheet-dismiss]')) {
      closeSheets();
      return;
    }

    const filt = target.closest('[data-recipes-filter]');
    if (filt instanceof HTMLButtonElement) {
      const id = filt.dataset.recipesFilter;
      if (id && id !== activeFilter) {
        activeFilter = id;
        syncFilters();
        syncGrid();
      }
      return;
    }

    if (target.closest('[data-recipes-new]')) {
      openEdit('new');
      return;
    }

    const open = target.closest('[data-recipes-open]');
    if (open instanceof HTMLButtonElement) {
      const id = open.dataset.recipesOpen;
      if (id) openDetail(id);
      return;
    }

    const addShop = target.closest('[data-recipes-add-shopping]');
    if (addShop instanceof HTMLButtonElement) {
      const id = addShop.dataset.recipesAddShopping;
      const r = recipes.find((x) => x.id === id);
      if (r) {
        const res = addRecipeIngredientsToShopping(r);
        if (res.ok) {
          showToast(`${res.added} ingrédient${res.added > 1 ? 's' : ''} ajouté${res.added > 1 ? 's' : ''} à ${res.storeName} !`);
        } else {
          showToast('Impossible d’ajouter aux courses — vérifie tes magasins.');
        }
      }
      return;
    }

    const editOpen = target.closest('[data-recipes-edit-open]');
    if (editOpen instanceof HTMLButtonElement) {
      const id = editOpen.dataset.recipesEditOpen;
      if (id) {
        closeSheets();
        openEdit(id);
      }
      return;
    }

    if (target.closest('[data-recipes-add-ing]')) {
      const list = qs('[data-recipes-ing-list]');
      if (list) {
        const idx = list.querySelectorAll('[data-recipes-ing-row]').length;
        list.insertAdjacentHTML('beforeend', ingredientFormRow({ name: '', quantity: '', unit: '', category: 'epicerie' }, idx));
        reindexIngredientRows();
        scheduleAutosave();
      }
      return;
    }

    if (target.closest('[data-recipes-add-step]')) {
      const list = qs('[data-recipes-step-list]');
      if (list) {
        const idx = list.querySelectorAll('[data-recipes-step-row]').length;
        list.insertAdjacentHTML('beforeend', stepFormRow('', idx));
        reindexStepRows();
        scheduleAutosave();
      }
      return;
    }

    const rmIng = target.closest('[data-recipes-ing-remove]');
    if (rmIng instanceof HTMLButtonElement) {
      const row = rmIng.closest('[data-recipes-ing-row]');
      row?.remove();
      reindexIngredientRows();
      scheduleAutosave();
      return;
    }

    const rmStep = target.closest('[data-recipes-step-remove]');
    if (rmStep instanceof HTMLButtonElement) {
      const row = rmStep.closest('[data-recipes-step-row]');
      row?.remove();
      reindexStepRows();
      scheduleAutosave();
      return;
    }

    const diff = target.closest('[data-recipes-form-diff]');
    if (diff instanceof HTMLButtonElement) {
      qsa('[data-recipes-form-diff]').forEach((b) => {
        if (b instanceof HTMLButtonElement) {
          b.classList.toggle('is-active', b === diff);
          b.setAttribute('aria-pressed', b === diff ? 'true' : 'false');
        }
      });
      scheduleAutosave();
    }
  };

  onRootInput = (event) => {
    const t = event.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.matches('[data-recipes-search]')) {
      searchQuery = t.value;
      syncGrid();
    }
  };

  onRootChange = (event) => {
    const t = event.target;
    if (!(t instanceof HTMLInputElement) && !(t instanceof HTMLTextAreaElement) && !(t instanceof HTMLSelectElement)) return;
    if (t.matches('[data-recipes-form-time]')) {
      const lab = qs('[data-recipes-form-time-val]');
      if (lab) lab.textContent = t.value;
    }
    if (
      t.matches('[data-recipes-form-name]') ||
      t.matches('[data-recipes-form-emoji]') ||
      t.matches('[data-recipes-form-time]') ||
      t.matches('[data-recipes-form-type]')
    ) {
      scheduleAutosave();
    }
  };

  onFormInput = (event) => {
    const t = event.target;
    if (
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      t instanceof HTMLSelectElement
    ) {
      if (t.matches('[data-recipes-form-time]')) {
        const lab = qs('[data-recipes-form-time-val]');
        if (lab) lab.textContent = t.value;
        scheduleAutosave();
        return;
      }
      if (t.matches('[data-recipes-form-name]') || t.matches('[data-recipes-form-emoji]')) {
        scheduleAutosave();
        return;
      }
      if (
        t.closest('[data-recipes-edit-form]') &&
        (t.matches('[data-recipes-ing-name]') ||
          t.matches('[data-recipes-ing-qty]') ||
          t.matches('[data-recipes-ing-unit]') ||
          t.matches('[data-recipes-ing-cat]') ||
          t.matches('[data-recipes-step-text]'))
      ) {
        scheduleAutosave();
      }
    }
  };

  onKeyDown = (event) => {
    if (event.key !== 'Escape') return;
    if (openSheet) {
      event.preventDefault();
      closeSheets();
    }
  };

  rootContainer?.addEventListener('click', onRootClick);
  modalPortal?.addEventListener('click', onRootClick);
  rootContainer?.addEventListener('input', onRootInput);
  rootContainer?.addEventListener('change', onRootChange);
  modalPortal?.addEventListener('change', onRootChange);
  modalPortal?.addEventListener('input', onFormInput);
  document.addEventListener('keydown', onKeyDown);

  onSyncComplete = () => {
    recipes = readRecipes();
    syncAll();
  };
  document.addEventListener('ancrage:sync-complete', onSyncComplete);
}

function unbindEvents() {
  if (onRootClick) {
    rootContainer?.removeEventListener('click', onRootClick);
    modalPortal?.removeEventListener('click', onRootClick);
  }
  if (onRootInput) rootContainer?.removeEventListener('input', onRootInput);
  if (onRootChange) {
    rootContainer?.removeEventListener('change', onRootChange);
    modalPortal?.removeEventListener('change', onRootChange);
  }
  if (onFormInput) modalPortal?.removeEventListener('input', onFormInput);
  if (onKeyDown) document.removeEventListener('keydown', onKeyDown);
  if (onSyncComplete) document.removeEventListener('ancrage:sync-complete', onSyncComplete);
  onRootClick = null;
  onRootInput = null;
  onRootChange = null;
  onFormInput = null;
  onKeyDown = null;
  onSyncComplete = null;
}

function pickQuickSuggestions(src, n) {
  const quick = src.filter((r) => r.prepTime < 20);
  if (!quick.length) return [];
  const copy = [...quick];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  const count = Math.min(n, copy.length);
  return copy.slice(0, count);
}

const recipesModule = {
  id: 'recipes',
  label: 'Recettes',
  icon: '📖',

  init(container) {
    rootContainer = container;
    recipes = readRecipes();
    activeFilter = 'all';
    searchQuery = '';
    openSheet = null;

    rootContainer.innerHTML = createRecipesShell();
    mountModalPortal();
    bindEvents();

    const search = qs('[data-recipes-search]');
    if (search instanceof HTMLInputElement) search.value = '';

    syncAll();
    setSheetVisibility(null);
  },

  destroy() {
    window.clearTimeout(autosaveTimer);
    window.clearTimeout(showToast._t);
    unbindEvents();
    closeSheets();
    unmountModalPortal();
    recipes = [];
    if (rootContainer) {
      rootContainer.innerHTML = '';
      rootContainer = null;
    }
  },

  getDashboardWidget() {
    const data = load(RECIPES_KEY, []);
    const list = Array.isArray(data) ? data.map(normalizeRecipe).filter(Boolean) : [];
    const merged = mergeDefaultRecipes([...list]);
    const suggestions = pickQuickSuggestions(merged, 3);
    if (!suggestions.length) {
      return {
        title: 'Recettes',
        content: `
          <p class="recipes-widget__empty">Ajoute une recette pour des idées rapides ✨</p>
          <button type="button" class="btn dashboard__link" data-dashboard-nav="recipes">Voir les recettes</button>
        `
      };
    }
    return {
      title: 'Recettes',
      content: createDashboardWidgetHtml(suggestions)
    };
  }
};

export default recipesModule;
