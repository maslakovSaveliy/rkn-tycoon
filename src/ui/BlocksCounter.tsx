'use client'

import { formatNumber } from '@/lib/numbers'
import { useGameStore } from '@/state/gameStore'

export function BlocksCounter() {
  const blocks = useGameStore((s) => s.blocks)
  const clickValue = useGameStore((s) => s.clickValue)
  const cps = useGameStore((s) => s.cps)
  const prestigeMult = useGameStore((s) => s.prestigeMult)

  const perClick = clickValue.mul(prestigeMult)
  const perSecond = cps.mul(prestigeMult)

  return (
    <div className="relative flex flex-col items-center gap-1">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -mx-24 -my-10"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0) 72%)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          maskImage:
            'radial-gradient(ellipse at center, black 25%, transparent 78%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 25%, transparent 78%)',
        }}
      />
      <div className="relative text-5xl md:text-7xl font-mono font-bold tabular-nums tracking-tight text-glow">
        {formatNumber(blocks)}
      </div>
      <div className="relative text-sm uppercase tracking-wider opacity-60 font-mono">
        блокировок
      </div>
      <div className="relative text-xs opacity-50 font-mono mt-1 flex gap-4">
        <span>+{formatNumber(perClick)} / клик</span>
        <span>+{formatNumber(perSecond)} / сек</span>
      </div>
    </div>
  )
}
