import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { devApiMiddleware } from './api/devServerMiddleware.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const apiPlugin = () => ({
  name: 'dev-api-middleware',
  configureServer(server) {
    server.middlewares.use(devApiMiddleware)
  }
})

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    react(),
    apiPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});