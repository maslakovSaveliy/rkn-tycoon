'use client'

import { useCallback } from 'react'
import type { ClickUpgradeDef } from '@/data/clickUpgrades'
import { formatNumber } from '@/lib/numbers'
import { useGameStore } from '@/state/gameStore'

interface Props {
  upgrade: ClickUpgradeDef
}

export function UpgradeCard({ upgrade }: Props) {
  const blocks = useGameStore((s) => s.blocks)
  const purchased = useGameStore((s) =>
    s.purchasedClickUpgrades.includes(upgrade.id),
  )
  const purchaseClickUpgrade = useGameStore((s) => s.purchaseClickUpgrade)

  const affordable = blocks.gte(upgrade.cost)
  const handleBuy = useCallback(() => {
    purchaseClickUpgrade(upgrade.id)
  }, [purchaseClickUpgrade, upgrade.id])

  return (
    <button
      type="button"
      onClick={handleBuy}
      disabled={purchased || !affordable}
      aria-label={`Купить апгрейд: ${upgrade.name}`}
      className={`text-left w-full border p-3 font-mono transition-colors disabled:cursor-not-allowed ${
        purchased
          ? 'border-rkn-fg/30 opacity-40'
          : affordable
            ? 'border-rkn-fg hover:bg-rkn-fg hover:text-rkn-bg cursor-pointer'
            : 'border-rkn-fg/30 opacity-50'
      }`}
    >
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-sm font-bold uppercase tracking-wide">
          {upgrade.name}
        </span>
        <span className="text-xs opacity-70 whitespace-nowrap">
          ×{String(upgrade.multiplier)}
        </span>
      </div>
      <p className="text-[11px] opacity-70 mt-1 leading-snug">
        {upgrade.description}
      </p>
      <div className="text-xs mt-2 flex justify-between">
        <span className="opacity-60">
          {purchased ? 'куплено' : `цена: ${formatNumber(upgrade.cost)}`}
        </span>
      </div>
    </button>
  )
}
