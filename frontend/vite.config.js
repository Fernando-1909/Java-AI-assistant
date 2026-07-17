import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base aponta para o subcaminho do GitHub Pages (usuario.github.io/repo/).
// Se um dia trocar de repositório ou hospedar na raiz de um domínio, ajuste
// para '/' ou './'.
export default defineConfig({
  plugins: [react()],
  base: '/Java-AI-assistant/',
})
