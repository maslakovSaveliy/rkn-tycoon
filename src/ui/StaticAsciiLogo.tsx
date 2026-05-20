'use client'

import { useEffect, useState } from 'react'

const COLS = 60
const ROWS = 11
const CHARS = ' .,-:;=+*x?$#%&@█'
const LOGO_TEXT = 'RKN SIM'

let cachedArt: string | null = null

function generateArt(): string {
  if (cachedArt) return cachedArt
  if (typeof document === 'undefined') return ''

  const cellW = 8
  const cellH = 12
  const w = COLS * cellW
  const h = ROWS * cellH
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#fff'
  const fontPx = Math.floor(h * 0.78)
  ctx.font = `900 ${String(fontPx)}px ui-monospace, "JetBrains Mono", "Courier New", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(LOGO_TEXT, w / 2, h / 2)

  const data = ctx.getImageData(0, 0, w, h).data
  let out = ''
  for (let r = 0; r < ROWS; r++) {
    let row = ''
    for (let c = 0; c < COLS; c++) {
      let sum = 0
      let n = 0
      for (let dy = 0; dy < cellH; dy += 2) {
        for (let dx = 0; dx < cellW; dx += 2) {
          const x = c * cellW + dx
          const y = r * cellH + dy
          const i = (y * w + x) * 4
          sum += data[i] ?? 0
          n++
        }
      }
      const avg = sum / Math.max(1, n) / 255
      const idx = Math.min(
        CHARS.length - 1,
        Math.floor(avg * (CHARS.length - 0.0001)),
      )
      row += CHARS[idx] ?? ' '
    }
    out += row + (r < ROWS - 1 ? '\n' : '')
  }
  cachedArt = out
  return out
}

interface Props {
  width: number
  height: number
}

export function StaticAsciiLogo({ width, height }: Props) {
  const [art, setArt] = useState<string>(cachedArt ?? '')

  useEffect(() => {
    if (!cachedArt) {
      const v = generateArt()
      if (v) setArt(v)
    }
  }, [])

  // Pick font-size so the COLS×ROWS grid fits the box on both axes.
  // Monospace char advance ≈ 0.6em, line-height set below.
  const lineHeight = 0.85
  const fontByWidth = width / (COLS * 0.6)
  const fontByHeight = height / (ROWS * lineHeight)
  const fontSize = Math.max(4, Math.min(fontByWidth, fontByHeight))

  return (
    <pre
      role="img"
      aria-label="РКН СИМУЛЯТОР"
      style={{
        width,
        height,
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#c0d000',
        fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
        fontWeight: 700,
        fontSize,
        lineHeight,
        letterSpacing: '-0.05em',
        textShadow: '0 0 8px rgba(192,208,0,0.45)',
        whiteSpace: 'pre',
        overflow: 'hidden',
      }}
    >
      {art}
    </pre>
  )
}
