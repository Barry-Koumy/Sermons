import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Les fichiers HTML des sermons sont servis directement depuis public/sermons_html/
// (générés par publish.py) — en dev comme en build. Aucun middleware nécessaire.
export default defineConfig({
  // Site « projet » GitHub Pages → servi sous https://barry-koumy.github.io/Sermons/
  base: '/Sermons/',
  plugins: [react(), tailwindcss()],
})
