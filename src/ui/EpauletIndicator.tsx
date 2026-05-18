'use client'

import { useGameStore } from '@/state/gameStore'

export function EpauletIndicator() {
  const stars = useGameStore((s) => s.prestigeStars)
  if (stars <= 0) return null

  const visual =
    stars <= 5 ? '★'.repeat(stars) : `★ × ${String(stars)}`

  return (
    <span
      aria-label={`Звёзды Цензора: ${String(stars)}`}
      title={`Звёзды Цензора: ${String(stars)} (+${String((2 * stars).toFixed(0))}% к доходу)`}
      className="border border-current px-3 py-1 text-xs uppercase font-mono tracking-wider text-glow"
    >
      {visual}
    </span>
  )
}
