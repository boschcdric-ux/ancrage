import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const STYLES_PATH = join(dirname(fileURLToPath(import.meta.url)), 'styles.css');
const THEME_IDS = ['encre', 'garrigue', 'crepuscule', 'maree'];
const CONTRAST_VARS = [
  '--bg-primary',
  '--bg-secondary',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--accent',
  '--text-on-accent',
];

function parseHex(hex) {
  const normalized = hex.trim().toLowerCase();
  const match = /^#([0-9a-f]{6})$/i.exec(normalized);
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function srgbChannel(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance({ r, g, b }) {
  const R = srgbChannel(r);
  const G = srgbChannel(g);
  const B = srgbChannel(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(foreground, background) {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseVars(blockBody) {
  const vars = {};
  for (const varName of CONTRAST_VARS) {
    const varPattern = new RegExp(`${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*([^;]+);`);
    const varMatch = varPattern.exec(blockBody);
    if (varMatch) vars[varName] = varMatch[1].trim();
  }
  return vars;
}

function extractThemeBlocks(css) {
  const themes = {};
  const encreMatch = /:root\s*,\s*\[data-theme="encre"\]\s*\{([^}]+)\}/s.exec(css);
  if (encreMatch) themes.encre = parseVars(encreMatch[1]);

  for (const themeId of ['garrigue', 'crepuscule', 'maree']) {
    const re = new RegExp(`\\[data-theme="${themeId}"\\]\\s*\\{([^}]+)\\}`, 's');
    const match = re.exec(css);
    if (match) themes[themeId] = parseVars(match[1]);
  }

  return themes;
}

function colorFromCssValue(value) {
  return parseHex(value);
}

describe('theme contrast WCAG AA', () => {
  const css = readFileSync(STYLES_PATH, 'utf8');
  const themes = extractThemeBlocks(css);

  for (const themeId of THEME_IDS) {
    it(`thème ${themeId} : paires critiques ≥ 4,5`, () => {
      const vars = themes[themeId];
      expect(vars, `bloc ${themeId} introuvable`).toBeTruthy();

      const bgPrimary = colorFromCssValue(vars['--bg-primary']);
      const bgSecondary = colorFromCssValue(vars['--bg-secondary']);
      const textPrimary = colorFromCssValue(vars['--text-primary']);
      const textSecondary = colorFromCssValue(vars['--text-secondary']);
      const textMuted = colorFromCssValue(vars['--text-muted']);
      const accent = colorFromCssValue(vars['--accent']);
      const textOnAccent = colorFromCssValue(vars['--text-on-accent']);

      expect(contrastRatio(textPrimary, bgPrimary)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(textSecondary, bgPrimary)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(textMuted, bgPrimary)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(textMuted, bgSecondary)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(textOnAccent, accent)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
