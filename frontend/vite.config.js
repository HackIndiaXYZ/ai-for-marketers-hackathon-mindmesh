import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // This forces Vite to resolve all React imports to a single, unified instance.
    dedupe: ['react', 'react-dom'],
  }
})