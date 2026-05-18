'use client'

import Decimal from 'break_infinity.js'
import { useMemo } from 'react'
import { CENSOR_COST_RATIO, type CensorDef } from '@/data/censors'
import { geometricSeriesCost, maxBuyCensor } from '@/lib/maxBuy'
import { formatNumber } from '@/lib/numbers'
import { useGameStore } from '@/state/gameStore'
import { BuyButtons } from './BuyButtons'

interface Props {
  censor: CensorDef
}

export function CensorCard({ censor }: Props) {
  const blocks = useGameStore((s) => s.blocks)
  const prestigeMult = useGameStore((s) => s.prestigeMult)
  const count = useGameStore((s) => s.censorCounts[censor.id] ?? 0)
  const purchaseCensor = useGameStore((s) => s.purchaseCensor)

  const { costX1, costX10, maxCount, costMax, effectiveCps } = useMemo(() => {
    const x1 = geometricSeriesCost(censor.baseCost, count, 1, CENSOR_COST_RATIO)
    const x10 = geometricSeriesCost(censor.baseCost, count, 10, CENSOR_COST_RATIO)
    const max = maxBuyCensor(blocks, censor.baseCost, count, CENSOR_COST_RATIO)
    const eff = censor.baseCps.mul(count).mul(prestigeMult)
    return {
      costX1: x1,
      costX10: x10,
      maxCount: max.count,
      costMax: max.totalCost,
      effectiveCps: eff,
    }
  }, [blocks, count, censor.baseCost, censor.baseCps, prestigeMult])

  const canAffordOne = blocks.gte(costX1)

  return (
    <div className="border border-rkn-fg p-3 font-mono flex flex-col gap-2">
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-sm font-bold uppercase tracking-wide">
          {censor.name}
        </span>
        <span className="text-xs opacity-70 tabular-nums">×{String(count)}</span>
      </div>
      <p className="text-[11px] opacity-70 leading-snug">
        {censor.description}
      </p>
      <div className="text-xs flex justify-between opacity-80">
        <span>
          BPS:{' '}
          {count > 0
            ? formatNumber(effectiveCps)
            : formatNumber(censor.baseCps.mul(prestigeMult)) + ' /шт.'}
        </span>
        <span>след.: {formatNumber(costX1)}</span>
      </div>
      <BuyButtons
        disabled={!canAffordOne}
        costX1={costX1}
        costX10={costX10}
        maxCount={maxCount}
        costMax={costMax.eq(0) ? new Decimal(0) : costMax}
        onBuy={(c) => {
          purchaseCensor(censor.id, c)
        }}
      />
    </div>
  )
}
