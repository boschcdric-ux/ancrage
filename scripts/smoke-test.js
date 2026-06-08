/**
 * Smoke tests : intégrité des modules (export standard) et des points d’entrée shell.
 * Nécessite un loader minimal (fichier temporaire) pour .css et import.meta.env dans Node.
 */

import { readdirSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath, pathToFileURL } from 'url';
import { register } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MODULES_DIR = join(ROOT, 'src', 'modules');
const SHELL_DIR = join(ROOT, 'src', 'shell');

const SEP = '═══════════════════════════════════';

const MODULE_STRING_KEYS = ['id', 'label', 'icon'];
const MODULE_FN_KEYS = ['init', 'destroy', 'getDashboardWidget'];

/** Au moins un caractère Extended_Pictographic (emoji). */
const EMOJI_RE = /\p{Extended_Pictographic}/u;

const LOADER_SOURCE = `export async function load(url, context, nextLoad) {
  if (url.endsWith('.css')) {
    return { format: 'module', shortCircuit: true, source: 'export default {};' };
  }
  const result = await nextLoad(url, context);
  if (url.includes('/storage.js') && result.format === 'module') {
    let s = result.source;
    if (s instanceof Uint8Array) s = Buffer.from(s).toString('utf8');
    s = s.replace(/import\\.meta\\.env/g, '({ VITE_POCKETBASE_URL: "" })');
    return { ...result, source: s };
  }
  return result;
}
`;

function installNodeLoader() {
  const dir = mkdtempSync(join(tmpdir(), 'adhd-smoke-'));
  const loaderPath = join(dir, 'loader.mjs');
  writeFileSync(loaderPath, LOADER_SOURCE, 'utf8');
  register(pathToFileURL(loaderPath).href, import.meta.url);
  return () => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  };
}

function listModuleIds() {
  return readdirSync(MODULES_DIR)
    .filter((name) => {
      try {
        if (!statSync(join(MODULES_DIR, name)).isDirectory()) return false;
        return statSync(join(MODULES_DIR, name, 'index.js')).isFile();
      } catch {
        return false;
      }
    })
    .sort();
}

function validateModuleObject(mod) {
  const errors = [];
  if (mod == null) {
    errors.push("l'export default est absent ou null");
    return errors;
  }
  if (typeof mod !== 'object' || Array.isArray(mod)) {
    errors.push("l'export default doit être un objet (non tableau)");
    return errors;
  }
  for (const key of MODULE_STRING_KEYS) {
    if (!(key in mod)) {
      errors.push(`propriété manquante : ${key}`);
      continue;
    }
    const v = mod[key];
    if (typeof v !== 'string') {
      errors.push(`${key} n'est pas une chaîne`);
    } else if (!v.trim()) {
      errors.push(`${key} est vide`);
    } else if (key === 'icon' && !EMOJI_RE.test(v)) {
      errors.push('icon doit contenir au moins un emoji');
    }
  }
  for (const key of MODULE_FN_KEYS) {
    if (!(key in mod)) {
      errors.push(`propriété manquante : ${key}`);
      continue;
    }
    if (typeof mod[key] !== 'function') {
      errors.push(`${key} n'est pas une fonction`);
    }
  }
  return errors;
}

function formatOkLine(moduleId, mod, width) {
  const parts = [];
  for (const k of MODULE_STRING_KEYS) {
    parts.push(
      typeof mod[k] === 'string' && mod[k].trim() && (k !== 'icon' || EMOJI_RE.test(mod[k]))
        ? `${k} ✓`
        : `${k} ✗`
    );
  }
  for (const k of MODULE_FN_KEYS) {
    parts.push(typeof mod[k] === 'function' ? `${k} ✓` : `${k} ✗`);
  }
  return `✅ ${moduleId.padEnd(width)} — ${parts.join(' ')}`;
}

/** @param {Record<string, 'function' | 'string' | 'set'>} expected */
function validateNamedExports(ns, expected, label) {
  const errors = [];
  for (const [name, kind] of Object.entries(expected)) {
    if (!(name in ns)) {
      errors.push(`export manquant : ${name}`);
      continue;
    }
    const v = ns[name];
    if (kind === 'function' && typeof v !== 'function') {
      errors.push(`${name} n'est pas une fonction`);
    } else if (kind === 'string' && typeof v !== 'string') {
      errors.push(`${name} n'est pas une chaîne`);
    } else if (kind === 'string' && !String(v).trim()) {
      errors.push(`${name} est une chaîne vide`);
    } else if (kind === 'set' && !(v instanceof Set)) {
      errors.push(`${name} n'est pas un Set`);
    }
  }
  return { label, errors };
}

async function runShellChecks() {
  const results = [];

  const onboardingUrl = pathToFileURL(join(SHELL_DIR, 'onboarding.js')).href;
  try {
    const ns = await import(onboardingUrl);
    const e = validateNamedExports(ns, { isOnboardingDone: 'function', mountOnboarding: 'function' }, 'onboarding.js');
    results.push(e);
  } catch (err) {
    results.push({
      label: 'onboarding.js',
      errors: [`échec du chargement — ${err?.message || String(err)}`]
    });
  }

  const navModulesUrl = pathToFileURL(join(SHELL_DIR, 'nav-modules.js')).href;
  try {
    const ns = await import(navModulesUrl);
    const e = validateNamedExports(
      ns,
      {
        MODULES_SETTINGS_KEY: 'string',
        MODULE_IDS_NAV_LOCKED: 'set',
        DEFAULT_NAV_ACTIVE_MODULE_IDS: 'set',
        parseStoredDisabledModuleIds: 'function',
        getDisabledModuleIdsSet: 'function',
        persistDisabledModuleIds: 'function',
        isModuleEnabledForNav: 'function',
        getNavModulesOrdered: 'function',
        initializeModulesSettingsIfNeeded: 'function'
      },
      'nav-modules.js'
    );
    results.push(e);
  } catch (err) {
    results.push({
      label: 'nav-modules.js',
      errors: [`échec du chargement — ${err?.message || String(err)}`]
    });
  }

  const navigationUrl = pathToFileURL(join(SHELL_DIR, 'navigation.js')).href;
  try {
    const ns = await import(navigationUrl);
    const e = validateNamedExports(
      ns,
      {
        initNavigation: 'function',
        renderNavigation: 'function',
        updateSyncIndicatorInNav: 'function',
        updateNavigationLayout: 'function'
      },
      'navigation.js'
    );
    results.push(e);
  } catch (err) {
    results.push({
      label: 'navigation.js',
      errors: [`échec du chargement — ${err?.message || String(err)}`]
    });
  }

  const gesturesUrl = pathToFileURL(join(SHELL_DIR, 'gestures.js')).href;
  try {
    const ns = await import(gesturesUrl);
    const e = validateNamedExports(
      ns,
      {
        initGestures: 'function',
        renderModule: 'function',
        initNativeTouchShell: 'function'
      },
      'gestures.js'
    );
    results.push(e);
  } catch (err) {
    results.push({
      label: 'gestures.js',
      errors: [`échec du chargement — ${err?.message || String(err)}`]
    });
  }

  return results;
}

function printShellLines(results) {
  console.log('');
  console.log('Shell');
  console.log(SEP);
  const namePad = Math.max(...results.map((r) => r.label.length), 14);
  for (const { label, errors } of results) {
    if (errors.length === 0) {
      if (label === 'onboarding.js') {
        console.log(`✅ ${label.padEnd(namePad)} — isOnboardingDone ✓ mountOnboarding ✓`);
      } else if (label === 'nav-modules.js') {
        console.log(
          `✅ ${label.padEnd(namePad)} — parseStoredDisabledModuleIds ✓ getDisabledModuleIdsSet ✓ persistDisabledModuleIds ✓ isModuleEnabledForNav ✓ getNavModulesOrdered ✓ initializeModulesSettingsIfNeeded ✓ MODULES_SETTINGS_KEY ✓ MODULE_IDS_NAV_LOCKED ✓ DEFAULT_NAV_ACTIVE_MODULE_IDS ✓`
        );
      } else if (label === 'navigation.js') {
        console.log(
          `✅ ${label.padEnd(namePad)} — initNavigation ✓ renderNavigation ✓ updateSyncIndicatorInNav ✓ updateNavigationLayout ✓`
        );
      } else if (label === 'gestures.js') {
        console.log(`✅ ${label.padEnd(namePad)} — initGestures ✓ renderModule ✓ initNativeTouchShell ✓`);
      } else {
        console.log(`✅ ${label.padEnd(namePad)} — OK`);
      }
    } else {
      console.log(`❌ ${label.padEnd(namePad)} — ERREUR : ${errors.join(' ; ')}`);
    }
  }
}

async function main() {
  const cleanupLoader = installNodeLoader();

  const moduleIds = listModuleIds();
  const moduleReports = [];
  let moduleOk = 0;

  console.log(SEP);
  console.log('🧪 Ancrage — Smoke Tests');
  console.log(SEP);

  const namePad = Math.max(12, ...moduleIds.map((id) => id.length));

  for (const id of moduleIds) {
    const fileUrl = pathToFileURL(join(MODULES_DIR, id, 'index.js')).href;
    let mod;
    try {
      const loaded = await import(fileUrl);
      mod = loaded?.default;
    } catch (err) {
      const msg = err?.message || String(err);
      console.log(`❌ ${id.padEnd(namePad)} — ERREUR : échec du chargement — ${msg}`);
      moduleReports.push({ id, ok: false });
      continue;
    }

    const errors = validateModuleObject(mod);
    if (errors.length === 0) {
      console.log(formatOkLine(id, mod, namePad));
      moduleOk += 1;
      moduleReports.push({ id, ok: true });
    } else {
      console.log(`❌ ${id.padEnd(namePad)} — ERREUR : ${errors.join(' ; ')}`);
      moduleReports.push({ id, ok: false });
    }
  }

  const shellResults = await runShellChecks();
  printShellLines(shellResults);

  const moduleFail = moduleReports.filter((r) => !r.ok).length;
  const shellFail = shellResults.filter((r) => r.errors.length > 0).length;
  const shellOk = shellResults.length - shellFail;

  console.log(SEP);
  console.log(`✅ ${moduleOk}/${moduleIds.length} modules OK`);
  if (moduleFail > 0) {
    console.log(`❌ ${moduleFail} module${moduleFail > 1 ? 's' : ''} en erreur`);
  }
  console.log(`✅ ${shellOk}/${shellResults.length} fichiers shell OK`);
  if (shellFail > 0) {
    console.log(`❌ ${shellFail} fichier${shellFail > 1 ? 's' : ''} shell en erreur`);
  }
  console.log(SEP);

  cleanupLoader();

  const exitCode = moduleFail > 0 || shellFail > 0 ? 1 : 0;
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(SEP);
  console.error('❌ Smoke test interrompu :', err?.message || err);
  console.error(SEP);
  process.exit(1);
});
