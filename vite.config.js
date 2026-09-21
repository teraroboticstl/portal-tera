import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const plugins = [react()]

  // Carregar middleware de API EXCLUSIVAMENTE em modo de desenvolvimento local ('serve').
  // Durante o build de produção na Vercel ('build'), este middleware NUNCA é importado ou empacotado.
  if (command === 'serve') {
    plugins.push({
      name: 'dev-api-middleware',
      async configureServer(server) {
        try {
          const devMiddlewarePath = './api/devServerMiddleware.js'
          const { devApiMiddleware } = await import(/* @vite-ignore */ devMiddlewarePath)
          server.middlewares.use(devApiMiddleware)
        } catch (err) {
          console.warn('[Vite Dev] Middleware de API local não carregado:', err?.message || err)
        }
      },
    })
  }

  return {
    logLevel: 'error', // Suppress warnings, only show errors
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})