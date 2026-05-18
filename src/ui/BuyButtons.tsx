'use client'

import type Decimal from 'break_infinity.js'
import { formatNumber } from '@/lib/numbers'

interface Props {
  disabled: boolean
  costX1: Decimal
  costX10: Decimal
  maxCount: number
  costMax: Decimal
  onBuy: (count: number | 'max') => void
}

export function BuyButtons({
  disabled,
  costX1,
  costX10,
  maxCount,
  costMax,
  onBuy,
}: Props) {
  return (
    <div className="grid grid-cols-3 gap-1 text-xs font-mono">
      <BuyButton
        label="×1"
        cost={formatNumber(costX1)}
        disabled={disabled}
        onClick={() => {
          onBuy(1)
        }}
      />
      <BuyButton
        label="×10"
        cost={formatNumber(costX10)}
        disabled={disabled}
        onClick={() => {
          onBuy(10)
        }}
      />
      <BuyButton
        label={maxCount > 0 ? `×${String(maxCount)}` : '×0'}
        cost={formatNumber(costMax)}
        disabled={disabled || maxCount === 0}
        onClick={() => {
          onBuy('max')
        }}
      />
    </div>
  )
}

interface BuyButtonProps {
  label: string
  cost: string
  disabled: boolean
  onClick: () => void
}

function BuyButton({ label, cost, disabled, onClick }: BuyButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border border-rkn-fg/60 px-2 py-1 hover:bg-rkn-fg hover:text-rkn-bg disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-rkn-fg transition-colors flex flex-col items-center gap-0.5"
    >
      <span className="font-bold">{label}</span>
      <span className="opacity-70 text-[10px]">{cost}</span>
    </button>
  )
}
