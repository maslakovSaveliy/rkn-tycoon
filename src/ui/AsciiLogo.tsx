'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { AsciiEffect } from 'three/examples/jsm/effects/AsciiEffect.js'

const LOGO_TEXT = 'RKN SIM'
const CHARS = ' .,-:;=+*x?$#%&@█'

interface Props {
  width?: number
  height?: number
  speed?: number
}

export function AsciiLogo({
  width = 640,
  height = 200,
  speed = 0.5,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (typeof window === 'undefined') return

    const off = document.createElement('canvas')
    const sampleW = 440
    const sampleH = 120
    off.width = sampleW
    off.height = sampleH
    const ctx = off.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, sampleW, sampleH)
    ctx.fillStyle = 'white'
    ctx.font = '900 92px ui-monospace, "JetBrains Mono", "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(LOGO_TEXT, sampleW / 2, sampleH / 2)

    const pixels = ctx.getImageData(0, 0, sampleW, sampleH).data
    const positions: { x: number; y: number }[] = []
    const STRIDE = 2
    for (let y = 0; y < sampleH; y += STRIDE) {
      for (let x = 0; x < sampleW; x += STRIDE) {
        const r = pixels[(y * sampleW + x) * 4]
        if (r !== undefined && r > 128) {
          positions.push({
            x: (x - sampleW / 2) / 2,
            y: (sampleH / 2 - y) / 2,
          })
        }
      }
    }

    const scene = new THREE.Scene()

    const aspect = width / height
    const camera = new THREE.PerspectiveCamera(28, aspect, 0.1, 500)
    camera.position.set(0, 0, 130)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height)

    const dir = new THREE.DirectionalLight(0xffffff, 1.4)
    dir.position.set(1.5, 2, 3)
    scene.add(dir)
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))

    const BOX_DEPTH = 4
    const boxGeom = new THREE.BoxGeometry(1.2, 1.2, BOX_DEPTH)
    const mat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 60 })
    const inst = new THREE.InstancedMesh(boxGeom, mat, positions.length)
    const dummy = new THREE.Object3D()
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]
      if (!p) continue
      dummy.position.set(p.x, p.y, 0)
      dummy.updateMatrix()
      inst.setMatrixAt(i, dummy.matrix)
    }
    inst.instanceMatrix.needsUpdate = true

    // Fit the mesh inside the camera frustum at peak rotation.
    const ROT_Y_MAX = 0.28
    const ROT_X_MAX = 0.08
    const SAFETY = 0.95
    const camDistance = camera.position.z
    const frustumH =
      2 * camDistance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const frustumW = frustumH * aspect
    const meshHalfW = sampleW / 4
    const meshHalfH = sampleH / 4
    const projHalfW =
      meshHalfW * Math.cos(ROT_Y_MAX) + (BOX_DEPTH / 2) * Math.sin(ROT_Y_MAX)
    const projHalfH =
      meshHalfH * Math.cos(ROT_X_MAX) + (BOX_DEPTH / 2) * Math.sin(ROT_X_MAX)
    const fitScale = Math.min(
      ((frustumW * SAFETY) / 2) / projHalfW,
      ((frustumH * SAFETY) / 2) / projHalfH,
    )
    inst.scale.setScalar(fitScale)
    scene.add(inst)

    const effect = new AsciiEffect(renderer, CHARS, {
      invert: true,
      resolution: 0.22,
      scale: 1,
    })
    effect.setSize(width, height)
    const dom = effect.domElement as HTMLElement
    dom.style.color = '#c0d000'
    dom.style.backgroundColor = 'transparent'
    dom.style.fontFamily = 'ui-monospace, "Menlo", "Consolas", monospace'
    dom.style.fontWeight = '700'
    dom.style.lineHeight = '0.85'
    dom.style.letterSpacing = '-0.05em'
    container.appendChild(dom)

    let rafId = 0
    let stopped = false
    let last = performance.now()
    const startedAt = last
    const animate = () => {
      if (stopped) return
      const now = performance.now()
      last = now
      const t = (now - startedAt) / 1000
      inst.rotation.y = Math.sin(t * speed) * 0.28
      inst.rotation.x = Math.sin(t * speed * 0.6) * 0.08
      effect.render(scene, camera)
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)

    return () => {
      stopped = true
      cancelAnimationFrame(rafId)
      try {
        container.removeChild(dom)
      } catch {
        // already detached
      }
      boxGeom.dispose()
      mat.dispose()
      inst.dispose()
      renderer.dispose()
    }
  }, [width, height, speed])

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="РКН СИМУЛЯТОР"
      style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    />
  )
}
