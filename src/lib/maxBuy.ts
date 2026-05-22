import Decimal from 'break_infinity.js'

const MAX_BATCH = 1_000_000
/** Beyond this exponent, `Math.pow(ratio, n)` overflows to Infinity for
 * ratio = 1.15 (1.15^~5100 ≈ Number.MAX_VALUE). Use Decimal arithmetic above
 * this threshold so totalCost never becomes Infinity → NaN → save corruption. */
const SAFE_NUMBER_POW_EXPONENT = 5000

export interface MaxBuyResult {
  count: number
  totalCost: Decimal
}

/** Multiply baseCost by ratio^count, dispatching to Number arithmetic in the
 * safe range (preserves the original float-precision behaviour our tests
 * depend on) and to Decimal arithmetic only when ratio^count would overflow. */
function applyRatioPow(base: Decimal, ratio: number, count: number): Decimal {
  if (count <= SAFE_NUMBER_POW_EXPONENT) {
    return base.mul(Math.pow(ratio, count))
  }
  return base.mul(Decimal.pow(ratio, count))
}

/** (ratio^n - 1) / (ratio - 1), again split-path. */
function geometricFactor(ratio: number, n: number): Decimal {
  const ratioMinusOne = ratio - 1
  if (n <= SAFE_NUMBER_POW_EXPONENT) {
    return new Decimal((Math.pow(ratio, n) - 1) / ratioMinusOne)
  }
  return Decimal.pow(ratio, n).sub(1).div(ratioMinusOne)
}

export function maxBuyCensor(
  blocks: Decimal,
  baseCost: Decimal,
  currentCount: number,
  ratio = 1.15,
): MaxBuyResult {
  const nextCost = applyRatioPow(baseCost, ratio, currentCount)

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

  const totalCost = nextCost.mul(geometricFactor(ratio, n))

  return { count: n, totalCost }
}

export function geometricSeriesCost(
  baseCost: Decimal,
  currentCount: number,
  n: number,
  ratio = 1.15,
): Decimal {
  if (n <= 0) return new Decimal(0)
  const nextCost = applyRatioPow(baseCost, ratio, currentCount)
  return nextCost.mul(geometricFactor(ratio, n))
}
