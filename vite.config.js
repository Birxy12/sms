import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    mainFields: ['browser', 'module', 'main'],
    alias: {
      'fs': 'path-browserify',
      'stream': 'stream-browserify',
      'path': 'path-browserify',
      'vm': 'vm-browserify'
    }
  },
  define: {
    global: 'globalThis'
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    },
    hmr: {
      host: '127.0.0.1',
    },
  },
  build: {
    sourcemap: true
  },
  optimizeDeps: {
    include: ['react-easy-crop']
  }
})

