'use client'

import { useCallback, useEffect, useState } from 'react'
import { EVENTS_BY_ID } from '@/data/events'
import { useGameStore } from '@/state/gameStore'

export function EventOverlay() {
  const active = useGameStore((s) => s.activeEvent)
  const clickEvent = useGameStore((s) => s.clickEvent)
  const [, forceTick] = useState(0)

  // Refresh the countdown 5×/s without subscribing to the tick stream.
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      forceTick((n) => n + 1)
    }, 200)
    return () => {
      clearInterval(id)
    }
  }, [active])

  const handleClick = useCallback(() => {
    clickEvent()
  }, [clickEvent])

  if (!active) return null
  const def = EVENTS_BY_ID[active.id]
  if (!def) return null

  const now = Date.now()
  const remainingMs = Math.max(0, active.expiresAt - now)
  const remainingSec = Math.ceil(remainingMs / 1000)

  const leftPct = active.x * 100
  const topPct = active.y * 100

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Активное событие: ${def.name}`}
      className={`fixed z-[80] -translate-x-1/2 -translate-y-1/2 border-2 ${
        def.negative
          ? 'border-rkn-warning text-rkn-warning'
          : 'border-rkn-fg text-rkn-fg'
      } bg-rkn-bg/90 backdrop-blur p-3 flex flex-col items-center gap-1 cursor-pointer font-mono animate-event-pulse hover:scale-110 transition-transform`}
      style={{ left: `${String(leftPct)}%`, top: `${String(topPct)}%` }}
    >
      <span className="text-3xl leading-none" aria-hidden>
        {def.glyph}
      </span>
      <span className="text-[10px] uppercase tracking-widest whitespace-nowrap">
        {def.name}
      </span>
      <span className="text-[10px] opacity-70 tabular-nums">
        {String(remainingSec)}с
      </span>
    </button>
  )
}
