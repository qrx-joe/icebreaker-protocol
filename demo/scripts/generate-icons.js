import { createCanvas } from 'canvas'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#0a0a0f'
  ctx.fillRect(0, 0, size, size)

  // Gradient square (skewed like brand-mark)
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.transform(1, -0.18, 0, 1, 0, 0)
  const gradient = ctx.createLinearGradient(-size * 0.25, -size * 0.25, size * 0.25, size * 0.25)
  gradient.addColorStop(0, '#6ee7b7')
  gradient.addColorStop(1, '#38bdf8')
  ctx.fillStyle = gradient
  const rectSize = size * 0.5
  ctx.fillRect(-rectSize / 2, -rectSize / 2, rectSize, rectSize)
  ctx.restore()

  // Text
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${size * 0.22}px "Noto Sans SC", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('破冰', size / 2, size / 2 + size * 0.02)

  return canvas.toBuffer('image/png')
}

// Generate icons
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), generateIcon(192))
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), generateIcon(512))

console.log('PWA icons generated: 192x192, 512x512')
