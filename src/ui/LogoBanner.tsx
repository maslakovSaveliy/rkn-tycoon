'use client'

import { useEffect, useState, type ComponentType } from 'react'
import { StaticAsciiLogo } from './StaticAsciiLogo'

interface AsciiLogoProps {
  width: number
  height: number
}

export function LogoBanner() {
  const dims = useResponsiveDims()
  const [Animated, setAnimated] = useState<ComponentType<AsciiLogoProps> | null>(
    null,
  )

  useEffect(() => {
    let alive = true
    void import('./AsciiLogo').then((mod) => {
      if (alive) setAnimated(() => mod.AsciiLogo)
    })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="flex justify-center select-none">
      {Animated ? (
        <Animated width={dims.w} height={dims.h} />
      ) : (
        <StaticAsciiLogo width={dims.w} height={dims.h} />
      )}
    </div>
  )
}

function useResponsiveDims(): { w: number; h: number } {
  const [dims, setDims] = useState({ w: 360, h: 170 })
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth
      const isMobile = vw < 640
      const w = isMobile
        ? Math.max(280, vw - 24)
        : Math.max(360, Math.min(700, vw - 32))
      const ratio = isMobile ? 0.46 : 0.3
      const h = Math.round(w * ratio)
      setDims({ w, h })
    }
    compute()
    window.addEventListener('resize', compute)
    return () => {
      window.removeEventListener('resize', compute)
    }
  }, [])
  return dims
}
