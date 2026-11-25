import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' permite abrir o build em qualquer pasta; na Vercel funciona igual.
export default defineConfig({ plugins: [react()], base: './' })
