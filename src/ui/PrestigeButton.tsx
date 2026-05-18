'use client'

import { useState } from 'react'
import { pendingStarGain } from '@/engine'
import { useGameStore } from '@/state/gameStore'
import { PrestigeModal } from './PrestigeModal'

export function PrestigeButton() {
  const totalBlocksEver = useGameStore((s) => s.totalBlocksEver)
  const prestigeStars = useGameStore((s) => s.prestigeStars)
  const [open, setOpen] = useState(false)

  const gain = pendingStarGain(totalBlocksEver, prestigeStars)
  if (gain <= 0) return null

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
        className="border border-rkn-fg px-3 py-1 text-xs uppercase font-mono hover:bg-rkn-fg hover:text-rkn-bg cursor-pointer transition-colors animate-event-pulse"
        aria-label="Повышение в звании"
      >
        повышение +{String(gain)}★
      </button>
      {open && (
        <PrestigeModal
          gain={gain}
          onClose={() => {
            setOpen(false)
          }}
        />
      )}
    </>
  )
}
