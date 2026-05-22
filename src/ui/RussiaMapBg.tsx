'use client'

import { useEffect, useRef } from 'react'

const SAMPLE_STEP_PX = 7
const DOT_RADIUS = 1.6
const BASE_ALPHA = 0.55
const FIT_RATIO = 0.95
const FLASH_INTERVAL_MS = 260
const FLASH_INTERVAL_JITTER = 0.6
const FLASH_HOLD_MS = 480
const FLASH_FADE_MS = 900
const MAX_ACTIVE_FLASHES = 60
const SOURCE_LUMA_THRESHOLD = 235
const SOURCE_ALPHA_THRESHOLD = 32

type Dot = { x: number; y: number }
type Flash = { dot: number; t0: number }

export function RussiaMapBg() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    let dots: Dot[] = []
    let srcW = 0
    let srcH = 0
    let flashes: Flash[] = []
    let nextFlashAt = 0
    let rafId = 0
    let stopped = false
    let resizeRaf = 0

    function fitCanvas() {
      if (!canvas || !ctx) return
      const dpr = window.devicePixelRatio || 1
      const vw = window.innerWidth
      const vh = window.innerHeight
      canvas.width = Math.floor(vw * dpr)
      canvas.height = Math.floor(vh * dpr)
      canvas.style.width = `${vw}px`
      canvas.style.height = `${vh}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function sampleImage(img: HTMLImageElement) {
      const iw = img.naturalWidth
      const ih = img.naturalHeight
      const off = document.createElement('canvas')
      off.width = iw
      off.height = ih
      const oc = off.getContext('2d', { willReadFrequently: true })
      if (!oc) return
      oc.drawImage(img, 0, 0)
      const { data } = oc.getImageData(0, 0, iw, ih)
      const step = SAMPLE_STEP_PX
      const collected: Dot[] = []
      for (let by = 0; by < ih; by += step) {
        const ymax = Math.min(by + step, ih)
        for (let bx = 0; bx < iw; bx += step) {
          const xmax = Math.min(bx + step, iw)
          let hit = false
          for (let y = by; y < ymax && !hit; y++) {
            const row = y * iw * 4
            for (let x = bx; x < xmax; x++) {
              const i = row + x * 4
              const a = data[i + 3] ?? 0
              if (a <= SOURCE_ALPHA_THRESHOLD) continue
              const r = data[i] ?? 0
              const g = data[i + 1] ?? 0
              const b = data[i + 2] ?? 0
              const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
              if (luma < SOURCE_LUMA_THRESHOLD) {
                hit = true
                break
              }
            }
          }
          if (hit) {
            collected.push({ x: bx + (xmax - bx) / 2, y: by + (ymax - by) / 2 })
          }
        }
      }
      dots = collected
      srcW = iw
      srcH = ih
    }

    function draw(now: number) {
      if (!canvas || !ctx) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      ctx.clearRect(0, 0, vw, vh)

      if (!dots.length || srcW === 0 || srcH === 0) {
        if (!stopped && !reduceMotion) rafId = requestAnimationFrame(draw)
        return
      }

      const scale = Math.min(vw / srcW, vh / srcH) * FIT_RATIO
      const drawW = srcW * scale
      const drawH = srcH * scale
      const ox = (vw - drawW) / 2
      const oy = (vh - drawH) / 2

      const TOTAL = FLASH_HOLD_MS + FLASH_FADE_MS
      if (flashes.length) {
        flashes = flashes.filter((f) => now - f.t0 < TOTAL)
      }
      if (!reduceMotion) {
        while (now >= nextFlashAt && flashes.length < MAX_ACTIVE_FLASHES) {
          const idx = (Math.random() * dots.length) | 0
          flashes.push({ dot: idx, t0: now })
          nextFlashAt =
            now + FLASH_INTERVAL_MS * (1 - FLASH_INTERVAL_JITTER + Math.random())
        }
      }

      const flashAlpha = new Map<number, number>()
      for (const f of flashes) {
        const age = now - f.t0
        const alpha =
          age < FLASH_HOLD_MS ? 1 : 1 - (age - FLASH_HOLD_MS) / FLASH_FADE_MS
        const prev = flashAlpha.get(f.dot)
        if (prev === undefined || alpha > prev) flashAlpha.set(f.dot, alpha)
      }

      ctx.fillStyle = `rgba(90, 106, 48, ${BASE_ALPHA})`
      for (let k = 0; k < dots.length; k++) {
        const d = dots[k]!
        const x = ox + d.x * scale
        const y = oy + d.y * scale
        ctx.beginPath()
        ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      }

      if (flashAlpha.size) {
        for (const [idx, alpha] of flashAlpha) {
          const d = dots[idx]
          if (!d) continue
          const x = ox + d.x * scale
          const y = oy + d.y * scale
          ctx.fillStyle = `rgba(255, 90, 58, ${alpha * 0.28})`
          ctx.beginPath()
          ctx.arc(x, y, DOT_RADIUS + 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = `rgba(255, 90, 58, ${alpha})`
          ctx.beginPath()
          ctx.arc(x, y, DOT_RADIUS + 0.4, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      if (!stopped && !reduceMotion) rafId = requestAnimationFrame(draw)
    }

    function pauseAnim() {
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
    }
    function resumeAnim() {
      if (stopped || reduceMotion || rafId) return
      rafId = requestAnimationFrame(draw)
    }
    function onVisibility() {
      if (typeof document === 'undefined') return
      if (document.visibilityState === 'visible') resumeAnim()
      else pauseAnim()
    }

    function onResize() {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        fitCanvas()
        draw(performance.now())
      })
    }

    fitCanvas()

    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      sampleImage(img)
      draw(performance.now())
      if (!reduceMotion) rafId = requestAnimationFrame(draw)
    }
    img.onerror = () => {
      // silent: leave background empty if asset missing
    }
    img.src = '/russia-map.png'

    window.addEventListener('resize', onResize)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }
    return () => {
      stopped = true
      cancelAnimationFrame(rafId)
      cancelAnimationFrame(resizeRaf)
      window.removeEventListener('resize', onResize)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none"
    />
  )
}
