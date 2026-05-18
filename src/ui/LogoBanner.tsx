'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const AsciiLogo = dynamic(
  () => import('./AsciiLogo').then((m) => m.AsciiLogo),
  {
    ssr: false,
    loading: () => <LogoFallback />,
  },
)

export function LogoBanner() {
  const dims = useResponsiveDims()

  return (
    <div className="flex justify-center select-none">
      <AsciiLogo width={dims.w} height={dims.h} />
    </div>
  )
}

function LogoFallback() {
  return (
    <div className="font-mono font-bold text-rkn-fg text-glow text-2xl tracking-[0.35em] uppercase">
      РКН&nbsp;СИМУЛЯТОР
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
