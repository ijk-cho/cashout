import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Generate sourcemaps for better debugging
    sourcemap: true,
    // Optimize chunks using rolldown-compatible function format
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split React and React DOM into separate chunk
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          // Split Firebase into separate chunk
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase-vendor';
          }
        },
      },
    },
  },
  server: {
    // Enable HMR
    hmr: true,
    // Set headers for development
    headers: {
      'Cache-Control': 'no-store',
    },
  },
})
