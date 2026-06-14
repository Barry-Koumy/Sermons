import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'

// Les fichiers HTML des sermons sont servis directement depuis public/sermons_html/
// (générés par publish.py) — en dev comme en build. Aucun middleware nécessaire.

// Base selon la cible de déploiement :
//   • Vercel / domaine racine / dev / APK → '/'  (par défaut)
//   • GitHub Pages (sous-chemin)          → VITE_BASE=/Sermons/  (défini dans le workflow)
const base = process.env.VITE_BASE ?? '/'

// Repli SPA pour GitHub Pages : 404.html = copie de index.html. Sans ça, ouvrir un lien
// profond (ex. /Sermons/reader/<id>) renvoie une 404 nue au lieu de booter l'app.
function spa404Fallback(): Plugin {
  let outDir = 'dist'
  let root = process.cwd()
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    configResolved(cfg) {
      outDir = cfg.build.outDir
      root = cfg.root
    },
    closeBundle() {
      const index = path.resolve(root, outDir, 'index.html')
      if (fs.existsSync(index)) {
        fs.copyFileSync(index, path.resolve(root, outDir, '404.html'))
      }
    },
  }
}

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    // PWA : rend le site installable (« Ajouter à l'écran d'accueil ») avec l'icône.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'favicon-16.png', 'apple-touch-icon-180.png'],
      manifest: {
        name: 'Bibliothèque de Sermons',
        short_name: 'Sermons',
        description: 'Lire des sermons en français et en arabe, en ligne ou hors connexion.',
        lang: 'fr',
        dir: 'ltr',
        theme_color: '#06382a',
        background_color: '#06382a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // On ne pré-cache que la coquille de l'app (JS/CSS/HTML/icônes), PAS les ~580
        // fichiers de sermons : ils restent servis par le réseau + le repli hors-ligne
        // déjà intégré (catalogue local + sauvegarde manuelle des sermons).
        globPatterns: ['**/*.{js,css}', 'index.html', '*.png'],
        globIgnores: ['**/sermons_html/**'],
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/sermons_html/, /sermons\.json$/],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
    spa404Fallback(),
  ],
})
