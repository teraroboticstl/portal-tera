import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { resolveSupabaseConfig } from './src/lib/supabaseConfig.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, __dirname, ''), ...process.env }
  const { publicConfig } = resolveSupabaseConfig(env,
    key => createHash('sha256').update(key).digest('hex'))
  // Vite 6 switches to native realpath on Windows even after an EPERM probe.
  // Keep permitted original paths only when ordinary resolution succeeds.
  // Linux/Vercel and all other filesystem errors retain the default behavior.
  let preserveSymlinks = false
  if (process.platform === 'win32') {
    try { fs.realpathSync.native(__dirname) }
    catch (error) {
      if (error.code !== 'EPERM') throw error
      fs.realpathSync(__dirname)
      preserveSymlinks = true
      console.warn('[build] WINDOWS_NATIVE_REALPATH_EPERM: using Vite original-path resolution')
    }
  }
  const plugins = [react()]

  // Carregar middleware de API EXCLUSIVAMENTE em modo de desenvolvimento local ('serve').
  // Durante o build de produção na Vercel ('build'), este middleware NUNCA é importado ou empacotado.
  if (command === 'serve') {
    plugins.push({
      name: 'dev-api-middleware',
      async configureServer(server) {
        try {
          const devMiddlewarePath = './api/_devServerMiddleware.js'
          const { devApiMiddleware } = await import(/* @vite-ignore */ devMiddlewarePath)
          server.middlewares.use(devApiMiddleware)
        } catch (err) {
          console.warn('[Vite Dev] Middleware de API local não carregado:', err?.message || err)
        }
      },
    })
  }

  return {
    define: { __TERA_SUPABASE_CONFIG__: JSON.stringify(publicConfig) },
    logLevel: 'error', // Suppress warnings, only show errors
    plugins,
    resolve: {
      preserveSymlinks,
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
