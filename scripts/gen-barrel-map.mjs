#!/usr/bin/env node
// Generates public/crt-barrel-map.png — a displacement map for the SVG
// feDisplacementMap CRT barrel filter.
//
// Encoding (8-bit unsigned per channel, neutral = 128):
//   R = 128 + 127 * dx(u, v)
//   G = 128 + 127 * dy(u, v)
// where dx, dy are the per-pixel displacement (range −1..+1) needed to
// achieve a barrel ("fish-eye") warp:
//   dx = u * r^k * strength
//   dy = v * r^k * strength
// with (u, v) the normalised pixel position in [-1, +1], r = sqrt(u^2 + v^2)
// and k tuning the curve aggressiveness (k=2 is the textbook barrel).

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PNG } from 'pngjs'

const SIZE = 128
const STRENGTH = 0.42
const CURVE_EXP = 2.1

const png = new PNG({ width: SIZE, height: SIZE })

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const u = (x / (SIZE - 1)) * 2 - 1
    const v = (y / (SIZE - 1)) * 2 - 1
    const r = Math.sqrt(u * u + v * v)
    const falloff = Math.pow(r, CURVE_EXP) * STRENGTH
    const dx = u * falloff
    const dy = v * falloff

    const ri = Math.max(0, Math.min(255, Math.round(128 + dx * 127)))
    const gi = Math.max(0, Math.min(255, Math.round(128 + dy * 127)))

    const idx = (y * SIZE + x) * 4
    png.data[idx + 0] = ri
    png.data[idx + 1] = gi
    png.data[idx + 2] = 0
    png.data[idx + 3] = 255
  }
}

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '..', 'public', 'crt-barrel-map.png')
writeFileSync(out, PNG.sync.write(png))
console.log(`Wrote ${out}`)
