/**
 * Sonde M12g — tests A/B WebKit (étape 2 mission).
 * Usage : depuis /tmp/m12g-probe avec playwright installé :
 *   node m12g-webkit-drag-probe.mjs
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const probeHtml = readFileSync(join(__dirname, 'm12g-drag-probe.html'), 'utf8');

async function dragSample(page, config) {
  await page.evaluate((cfg) => {
    const content = document.getElementById('app-module-content');
    const parallax = document.getElementById('app-module-parallax');
    const card = document.querySelector('.panel__card');
    const dialog = document.querySelector('.panel');
    if (cfg.parallaxWillChange) parallax.style.willChange = 'transform';
    if (cfg.noIsolation) content.style.isolation = 'auto';
    if (cfg.overflowVisible) card.style.overflow = 'visible';
    if (cfg.useHasOverflowFix) {
      const style = document.createElement('style');
      style.id = 'm12g-has-fix';
      style.textContent = '.panel__card:has(.row.dragging){overflow:visible}';
      document.head.appendChild(style);
    }
    if (cfg.outsideDialog) {
      const list = document.getElementById('list');
      parallax.insertBefore(list, dialog);
      dialog.close();
    }
  }, config);

  const handle = page.locator('.row__handle').nth(1);
  const box = await handle.boundingBox();
  if (!box) throw new Error('handle introuvable');

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + 90, { steps: 14 });
  await page.waitForTimeout(100);

  const sample = await page.evaluate(() => {
    const row = document.querySelector('.row.dragging') || document.querySelectorAll('.row')[1];
    const rect = row.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + Math.min(rect.height / 2, 20);
    const hit = document.elementFromPoint(cx, cy);
    const rowStyle = getComputedStyle(row);
    return {
      rect: { w: Math.round(rect.width), h: Math.round(rect.height), top: Math.round(rect.top) },
      transform: rowStyle.transform,
      opacity: rowStyle.opacity,
      visibility: rowStyle.visibility,
      hitIsRow: hit === row || Boolean(hit?.closest?.('.row')),
      hitTag: hit?.className || String(hit?.tagName),
      parallaxWillChange: getComputedStyle(document.getElementById('app-module-parallax')).willChange,
      contentIsolation: getComputedStyle(document.getElementById('app-module-content')).isolation
    };
  });

  await page.mouse.up();
  return sample;
}

async function runAll() {
  const { webkit } = await import('playwright');
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(probeHtml);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/`;

  const scenarios = [
    { name: 'baseline (aucun hack)', config: {} },
    { name: 'suspect1: parallax will-change permanent', config: { parallaxWillChange: true } },
    { name: 'suspect2: isolation retirée', config: { noIsolation: true } },
    { name: 'suspect3: overflow card visible', config: { overflowVisible: true } },
    { name: 'fix M12g: :has(.dragging) overflow visible (prod)', config: { useHasOverflowFix: true } },
    { name: 'suspect4: liste hors dialog', config: { outsideDialog: true } },
    {
      name: 'combo: will-change + isolation + overflow (état prod M12f)',
      config: { parallaxWillChange: true, noIsolation: false, overflowVisible: false }
    }
  ];

  const browser = await webkit.launch({ headless: true });
  const results = [];

  for (const scenario of scenarios) {
    const page = await browser.newPage();
    await page.goto(url);
    await page.setViewportSize({ width: 390, height: 844 });
    const sample = await dragSample(page, scenario.config);
    results.push({ scenario: scenario.name, ...sample });
    await page.close();
  }

  await browser.close();
  server.close();

  console.log('\n=== M12g WebKit A/B (étape 2) ===\n');
  console.log(JSON.stringify(results, null, 2));

  const baseline = results[0];
  const withWillChange = results.find((r) => r.scenario.includes('suspect1'));
  const proved =
    baseline.hitIsRow !== withWillChange.hitIsRow ||
    (withWillChange.rect.h > 0 && !withWillChange.hitIsRow);

  if (proved) {
    console.log('\n✅ Différence mesurée entre baseline et will-change permanent.');
  } else {
    console.log('\n⚠️  WebKit headless : aucun scénario ne reproduit la non-peinture.');
    console.log('   Correctif will-change conditionnel appliqué sur hypothèse documentée + pile prod.');
  }
}

runAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
