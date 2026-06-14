// Génère, à partir de `icon.png` (logo plein cadre, fond vert), tous les dérivés :
//   • assets/icon.png          → master carré 1024 (source pour @capacitor/assets, Android)
//   • public/icon-192.png, icon-512.png, icon-maskable-512.png  → PWA
//   • public/apple-touch-icon-180.png, favicon-32.png, favicon-16.png
//
// Le fond de padding = couleur réelle du coin de l'icône, pour un carré homogène.
// Relançable : `node scripts/generate-icons.mjs`.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'icon.png');
const PUBLIC = resolve(root, 'public');
const ASSETS = resolve(root, 'assets');
mkdirSync(ASSETS, { recursive: true });

// 1. Couleur de fond = moyenne d'un coin (fond vert plein de l'icône).
const corner = await sharp(SRC)
  .extract({ left: 0, top: 0, width: 12, height: 12 })
  .resize(1, 1)
  .raw()
  .toBuffer();
const bg = { r: corner[0], g: corner[1], b: corner[2] };
const hex = '#' + [bg.r, bg.g, bg.b].map((n) => n.toString(16).padStart(2, '0')).join('');
console.log('Fond détecté :', hex);

// 2. Master carré 1024 (contain sur le vert, opaque).
const master = await sharp(SRC)
  .resize(1024, 1024, { fit: 'contain', background: bg })
  .flatten({ background: bg })
  .png()
  .toBuffer();
await sharp(master).toFile(resolve(ASSETS, 'icon.png'));

// 3. Dérivés web (depuis le master).
const out = (size, name, dir = PUBLIC) =>
  sharp(master).resize(size, size).png().toFile(resolve(dir, name));
await out(192, 'icon-192.png');
await out(512, 'icon-512.png');
await out(512, 'icon-maskable-512.png'); // fond plein → zone de sécurité OK
await out(180, 'apple-touch-icon-180.png');
await out(32, 'favicon-32.png');
await out(16, 'favicon-16.png');

console.log('Icônes générées :', hex, '→ assets/icon.png + public/icon-*.png');
