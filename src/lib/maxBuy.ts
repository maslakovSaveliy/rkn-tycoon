import Decimal from 'break_infinity.js'

const MAX_BATCH = 1_000_000

export interface MaxBuyResult {
  count: number
  totalCost: Decimal
}

export function maxBuyCensor(
  blocks: Decimal,
  baseCost: Decimal,
  currentCount: number,
  ratio = 1.15,
): MaxBuyResult {
  const nextCost = baseCost.mul(Math.pow(ratio, currentCount))

  if (blocks.lt(nextCost)) {
    return { count: 0, totalCost: new Decimal(0) }
  }

  const ratioMinusOne = ratio - 1
  const inner = blocks.mul(ratioMinusOne).div(nextCost).add(1)
  const log10Ratio = Math.log10(ratio)
  const nFloat = inner.log10() / log10Ratio
  const n = Math.min(Math.floor(nFloat), MAX_BATCH)

  if (n <= 0) {
    return { count: 0, totalCost: new Decimal(0) }
  }

  const totalCost = nextCost.mul(Math.pow(ratio, n) - 1).div(ratioMinusOne)

  return { count: n, totalCost }
}

export function geometricSeriesCost(
  baseCost: Decimal,
  currentCount: number,
  n: number,
  ratio = 1.15,
): Decimal {
  if (n <= 0) return new Decimal(0)
  const nextCost = baseCost.mul(Math.pow(ratio, currentCount))
  return nextCost.mul(Math.pow(ratio, n) - 1).div(ratio - 1)
}
