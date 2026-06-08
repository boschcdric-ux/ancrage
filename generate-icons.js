import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, 'public/icons');
const OUT_512 = join(ICONS_DIR, 'icon-512.png');
const OUT_192 = join(ICONS_DIR, 'icon-192.png');
const OUT_APPLE = join(ICONS_DIR, 'apple-touch-icon.png');

/** Ancre stylisée sur fond violet — compatible librsvg (sharp). */
const ANCHOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#6366f1"/>
  <g fill="none" stroke="#ffffff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="256" cy="132" r="34" fill="#ffffff" stroke="none"/>
    <path d="M256 166 V310"/>
    <path d="M256 310 C256 372 176 392 176 328"/>
    <path d="M256 310 C256 372 336 392 336 328"/>
    <path d="M128 392 H384"/>
    <path d="M256 248 L196 312"/>
    <path d="M256 248 L316 312"/>
  </g>
</svg>`;

async function ensureBase512() {
  try {
    await access(OUT_512);
    return;
  } catch {
    /* génère la source 512 si absente */
  }

  mkdirSync(ICONS_DIR, { recursive: true });
  await sharp(Buffer.from(ANCHOR_SVG)).png().toFile(OUT_512);
  console.log(`Écrit : ${OUT_512}`);
}

async function main() {
  mkdirSync(ICONS_DIR, { recursive: true });
  await ensureBase512();

  if (!existsSync(OUT_512)) {
    console.error(`Fichier source introuvable : ${OUT_512}`);
    process.exit(1);
  }

  await sharp(OUT_512).resize(192, 192).png().toFile(OUT_192);
  console.log(`Écrit : ${OUT_192}`);

  await sharp(OUT_512).resize(180, 180).png().toFile(OUT_APPLE);
  console.log(`Écrit : ${OUT_APPLE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
