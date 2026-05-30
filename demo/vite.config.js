import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

const CORE_FILES = [
  'state.js',
  'ui.js',
  'utils.js',
  'notify.js',
  'attachments.js',
  'timer.js',
  'inactivity.js',
  'speech.js',
  'api.js',
  'help.js',
  'landing.js',
  'contract.js',
  'roadmap.js',
  'steps.js',
  'done.js',
  'review.js',
  'settings.js',
  'history.js',
  'init.js',
  'event-bindings.js',
]

function mergeCorePlugin() {
  return {
    name: 'merge-core-modules',
    resolveId(id) {
      if (id === 'virtual:app-core') return id
    },
    load(id) {
      if (id !== 'virtual:app-core') return

      const srcDir = path.resolve('src')
      let merged = ''

      for (const file of CORE_FILES) {
        const filePath = path.join(srcDir, file)
        if (!fs.existsSync(filePath)) continue

        let code = fs.readFileSync(filePath, 'utf8')

        // Strip import statements (including multi-line destructuring)
        code = code.replace(/^\s*import\s+(?:\{[\s\S]*?\}|[^'"{]*?)\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
        // Strip bare import statements (e.g. import './state.js')
        code = code.replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, '')
        // Strip export keyword (export let → let, export function → function)
        code = code.replace(/\bexport\s+/g, '')
        // Clean up empty lines left behind
        code = code.replace(/\n{3,}/g, '\n\n')

        merged += `/* === ${file} === */\n${code}\n`
      }

      // Auto-init side-effect modules after all code is loaded
      merged += `\n/* === auto-init === */\ninitHelp()\ninitHistory()\ninitApp()\nbindEvents()\n`

      return merged
    },
  }
}

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 3000,
  },
  plugins: [
    mergeCorePlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 86400,
              },
            },
          },
        ],
      },
    }),
  ],
})
