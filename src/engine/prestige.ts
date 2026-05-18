import type Decimal from 'break_infinity.js'

export const PRESTIGE_THRESHOLD = 1e9
export const PRESTIGE_MULT_PER_STAR = 0.02

export function projectedStars(totalBlocksEver: Decimal): number {
  const scaled = totalBlocksEver.div(PRESTIGE_THRESHOLD).toNumber()
  if (!Number.isFinite(scaled) || scaled <= 0) return 0
  return Math.floor(Math.sqrt(scaled))
}

export function pendingStarGain(
  totalBlocksEver: Decimal,
  currentStars: number,
): number {
  return Math.max(0, projectedStars(totalBlocksEver) - currentStars)
}

export function computePrestigeMult(stars: number): number {
  return 1 + PRESTIGE_MULT_PER_STAR * Math.max(0, stars)
}
