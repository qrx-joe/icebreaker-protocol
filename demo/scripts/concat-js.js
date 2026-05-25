import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const files = [
  'src/state.js',
  'src/ui.js',
  'src/attachments.js',
  'src/timer.js',
  'src/inactivity.js',
  'src/speech.js',
  'src/api.js',
  'src/help.js',
  'src/landing.js',
  'src/contract.js',
  'src/roadmap.js',
  'src/steps.js',
  'src/done.js',
  'src/settings.js',
  'src/history.js',
  'src/init.js',
]

let bundle = ''
for (const file of files) {
  const content = fs.readFileSync(path.join(root, file), 'utf8')
  bundle += `\n/* === ${file} === */\n`
  bundle += content
  bundle += '\n'
}

// Write to public/ for dev, and also to root for Vite build
const publicDir = path.join(root, 'public')
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir)
}

fs.writeFileSync(path.join(publicDir, 'bundle.js'), bundle)
fs.writeFileSync(path.join(root, 'bundle.js'), bundle)

console.log(`Bundle created: ${bundle.length} bytes from ${files.length} files`)
