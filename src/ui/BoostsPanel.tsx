'use client'

import { useEffect, useState } from 'react'
import { EVENTS_BY_ID } from '@/data/events'
import { useGameStore } from '@/state/gameStore'

export function BoostsPanel() {
  const activeMultipliers = useGameStore((s) => s.activeMultipliers)
  const clickBoosts = useGameStore((s) => s.clickBoosts)
  const [, forceTick] = useState(0)

  const hasTimed = activeMultipliers.length > 0
  useEffect(() => {
    if (!hasTimed) return
    const id = setInterval(() => {
      forceTick((n) => n + 1)
    }, 250)
    return () => {
      clearInterval(id)
    }
  }, [hasTimed])

  if (activeMultipliers.length === 0 && clickBoosts.length === 0) return null

  const now = Date.now()

  return (
    <div className="pointer-events-none fixed left-3 top-14 z-30 flex flex-col gap-1 font-mono">
      {activeMultipliers.map((m) => {
        const def = EVENTS_BY_ID[m.id]
        const remainingMs = Math.max(0, m.expiresAt - now)
        if (remainingMs <= 0) return null
        const remainingSec = Math.ceil(remainingMs / 1000)
        const debuff = m.value < 1
        return (
          <BoostPill
            key={`mult-${m.id}-${String(m.expiresAt)}`}
            glyph={def?.glyph ?? '✦'}
            name={def?.name ?? m.id}
            value={`×${formatMult(m.value)} ${m.kind === 'click' ? 'клик' : 'сек'}`}
            tail={`${String(remainingSec)}с`}
            negative={debuff}
          />
        )
      })}
      {clickBoosts.map((b) => {
        const def = EVENTS_BY_ID[b.id]
        return (
          <BoostPill
            key={`boost-${b.id}-${String(b.clicksRemaining)}`}
            glyph={def?.glyph ?? '✦'}
            name={def?.name ?? b.id}
            value={`×${formatMult(b.value)} клик`}
            tail={`${String(b.clicksRemaining)}×`}
            negative={false}
          />
        )
      })}
    </div>
  )
}

function formatMult(v: number): string {
  if (v >= 10) return v.toFixed(0)
  if (v >= 1) return v.toFixed(v % 1 === 0 ? 0 : 2)
  return v.toFixed(2)
}

function BoostPill({
  glyph,
  name,
  value,
  tail,
  negative,
}: {
  glyph: string
  name: string
  value: string
  tail: string
  negative: boolean
}) {
  const color = negative
    ? 'border-rkn-warning text-rkn-warning'
    : 'border-rkn-fg text-rkn-fg'
  return (
    <div
      className={`flex items-center gap-2 border ${color} bg-rkn-bg/80 backdrop-blur-sm px-2 py-1 text-[11px] uppercase tracking-wider`}
    >
      <span aria-hidden className="text-base leading-none">
        {glyph}
      </span>
      <div className="flex flex-col leading-tight">
        <span className="opacity-80 whitespace-nowrap">{name}</span>
        <span className="text-[10px] opacity-60 tabular-nums whitespace-nowrap">
          {value} · {tail}
        </span>
      </div>
    </div>
  )
}
