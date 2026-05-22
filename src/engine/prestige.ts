import type Decimal from 'break_infinity.js'

export const PRESTIGE_THRESHOLD = 1e9
export const PRESTIGE_MULT_PER_STAR = 0.02
/** Cap projected stars to prevent saturating-to-Infinity through `.toNumber()`
 * on very large totals (tampered saves or extreme prestige loops). A million
 * stars is already 20000× prestige mult — well past any legitimate play. */
const MAX_PROJECTED_STARS = 1_000_000

export function projectedStars(totalBlocksEver: Decimal): number {
  if (totalBlocksEver.lt(PRESTIGE_THRESHOLD)) return 0
  // Fast path: when scaled fits in Number precision, sqrt directly so that
  // exact integer squares (e.g. 25 → 5) round correctly without float drift.
  const scaled = totalBlocksEver.div(PRESTIGE_THRESHOLD).toNumber()
  if (Number.isFinite(scaled) && scaled <= Number.MAX_SAFE_INTEGER) {
    return Math.min(Math.floor(Math.sqrt(scaled)), MAX_PROJECTED_STARS)
  }
  // Slow path: TBE is too large for `.toNumber()` — compute via log10 so we
  // never hit Infinity. stars = sqrt(TBE/T) ⇒ log10(stars) = (log10(TBE) - log10(T)) / 2.
  const log10Stars =
    (totalBlocksEver.log10() - Math.log10(PRESTIGE_THRESHOLD)) / 2
  if (!Number.isFinite(log10Stars) || log10Stars <= 0) return 0
  if (log10Stars >= Math.log10(MAX_PROJECTED_STARS)) return MAX_PROJECTED_STARS
  return Math.min(Math.floor(Math.pow(10, log10Stars)), MAX_PROJECTED_STARS)
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
