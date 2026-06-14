import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Les fichiers HTML des sermons sont servis directement depuis public/sermons_html/
// (générés par publish.py) — en dev comme en build. Aucun middleware nécessaire.
export default defineConfig({
  // Base selon la cible de déploiement :
  //   • Vercel / domaine racine / dev → '/'  (par défaut)
  //   • GitHub Pages (sous-chemin)    → VITE_BASE=/Sermons/  (défini dans le workflow)
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
})
