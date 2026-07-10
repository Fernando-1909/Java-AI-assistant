import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' garante que os assets funcionem tanto localmente quanto
// hospedados em um subdiretório (ex: GitHub Pages: usuario.github.io/repo)
export default defineConfig({
  plugins: [react()],
  base: './',
})
