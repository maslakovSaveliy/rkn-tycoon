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
    <div className="flex flex-col items-center gap-1">
      <div className="text-5xl md:text-7xl font-mono font-bold tabular-nums tracking-tight text-glow">
        {formatNumber(blocks)}
      </div>
      <div className="text-sm uppercase tracking-wider opacity-60 font-mono">
        блокировок
      </div>
      <div className="text-xs opacity-50 font-mono mt-1 flex gap-4">
        <span>+{formatNumber(perClick)} / клик</span>
        <span>+{formatNumber(perSecond)} / сек</span>
      </div>
    </div>
  )
}
