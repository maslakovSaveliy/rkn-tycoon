'use client'

import { useMemo } from 'react'
import { CLICK_UPGRADES } from '@/data/clickUpgrades'
import { useGameStore } from '@/state/gameStore'
import { UpgradeCard } from './UpgradeCard'

interface Props {
  chrome?: 'standalone' | 'bare'
}

export function UpgradePanel({ chrome = 'standalone' }: Props) {
  const totalBlocksEver = useGameStore((s) => s.totalBlocksEver)
  const purchasedSet = useGameStore((s) => s.purchasedClickUpgrades)

  // Reveal upgrades once the player can preview them (>= 50% of cost).
  const visible = useMemo(() => {
    return CLICK_UPGRADES.filter((u) => {
      if (purchasedSet.includes(u.id)) return true
      return totalBlocksEver.gte(u.cost.mul(0.5))
    })
  }, [totalBlocksEver, purchasedSet])

  return (
    <div className="w-full flex flex-col gap-2">
      {chrome === 'standalone' && (
        <header className="text-xs uppercase tracking-widest opacity-60 sticky top-0 bg-rkn-bg py-1">
          Указы и акты
        </header>
      )}
      {visible.length === 0 ? (
        <p className="text-xs opacity-50 font-mono">
          (накопите блокировки — появятся указы)
        </p>
      ) : (
        visible.map((u) => <UpgradeCard key={u.id} upgrade={u} />)
      )}
    </div>
  )
}
