import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build into public/app so server can serve the built SPA
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'public/app',
    emptyOutDir: true
  }
  ,
  server: {
    // proxy API calls to the backend to avoid CORS during development
    proxy: {
      '/api': {
        // use 127.0.0.1 to avoid resolving to IPv6 ::1 which can cause ECONNREFUSED
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
