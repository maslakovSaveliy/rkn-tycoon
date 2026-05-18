import type Decimal from 'break_infinity.js'

const SUFFIXES = [
  { exp: 12, label: 'Т' },
  { exp: 9, label: 'Б' },
  { exp: 6, label: 'М' },
  { exp: 3, label: 'К' },
] as const

const SCIENTIFIC_THRESHOLD = 15
const INFINITY_EXPONENT_SENTINEL = 9e15

export function formatNumber(d: Decimal): string {
  if (d.exponent >= INFINITY_EXPONENT_SENTINEL) return '∞'
  if (d.mantissa === 0) return '0'

  const negative = d.mantissa < 0
  const absMantissa = negative ? -d.mantissa : d.mantissa
  const exp = d.exponent
  const sign = negative ? '-' : ''

  if (exp >= SCIENTIFIC_THRESHOLD) {
    return `${sign}${absMantissa.toFixed(2)}e${String(exp)}`
  }

  for (const { exp: threshold, label } of SUFFIXES) {
    if (exp >= threshold) {
      const scaled = absMantissa * Math.pow(10, exp - threshold)
      return `${sign}${scaled.toFixed(2)}${label}`
    }
  }

  const raw = absMantissa * Math.pow(10, exp)
  return `${sign}${formatPlain(raw)}`
}

function formatPlain(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(2).replace(/\.?0+$/, '')
}
