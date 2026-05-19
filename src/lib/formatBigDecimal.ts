const SUFFIXES = [
  { exp: 12, label: 'Т' },
  { exp: 9, label: 'Б' },
  { exp: 6, label: 'М' },
  { exp: 3, label: 'К' },
] as const

const SCIENTIFIC_THRESHOLD = 15

/**
 * Format a mantissa+exponent pair (already split form of a break_infinity.js
 * Decimal) using the same К/М/Б/Т ramp as `formatNumber` from lib/numbers.ts.
 * Used by server-rendered pages where we don't ship break_infinity.js.
 */
export function formatMantissaExponent(mantissa: number, exponent: number): string {
  if (!Number.isFinite(mantissa) || !Number.isFinite(exponent)) return '∞'
  if (mantissa === 0) return '0'

  const negative = mantissa < 0
  const absM = negative ? -mantissa : mantissa
  const sign = negative ? '-' : ''

  if (exponent >= SCIENTIFIC_THRESHOLD) {
    return `${sign}${absM.toFixed(2)}e${String(exponent)}`
  }

  for (const { exp: threshold, label } of SUFFIXES) {
    if (exponent >= threshold) {
      const scaled = absM * Math.pow(10, exponent - threshold)
      return `${sign}${scaled.toFixed(2)}${label}`
    }
  }

  const raw = absM * Math.pow(10, exponent)
  if (Number.isInteger(raw)) return `${sign}${String(raw)}`
  return `${sign}${raw.toFixed(2).replace(/\.?0+$/, '')}`
}
