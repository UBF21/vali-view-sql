import sharp from 'sharp'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const svgPath = resolve(__dir, '../public/og-image.svg')
const outPath = resolve(__dir, '../public/og-image.png')

if (!existsSync(svgPath)) {
  console.error('og-image.svg not found in public/')
  process.exit(1)
}

const svg = readFileSync(svgPath)

await sharp(svg)
  .resize(1200, 630)
  .png({ quality: 90 })
  .toFile(outPath)

console.log('✓ og-image.png generated (1200x630)')
