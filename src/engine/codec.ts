import Decimal from 'break_infinity.js'

const DECIMAL_MARKER = '__D' as const

interface DecimalMarker {
  readonly __D: string
}

function isDecimalMarker(v: unknown): v is DecimalMarker {
  return (
    typeof v === 'object' &&
    v !== null &&
    DECIMAL_MARKER in v &&
    typeof (v as DecimalMarker)[DECIMAL_MARKER] === 'string'
  )
}

// Decimal ships toJSON, so the replacer receives a string by default —
// read the untouched value off `this[key]` instead.
export function replacer(this: unknown, key: string, value: unknown): unknown {
  const original =
    typeof this === 'object' && this !== null
      ? (this as Record<string, unknown>)[key]
      : value
  if (original instanceof Decimal) {
    return { [DECIMAL_MARKER]: original.toString() }
  }
  return value
}

export function reviver(_key: string, value: unknown): unknown {
  if (isDecimalMarker(value)) {
    return new Decimal(value[DECIMAL_MARKER])
  }
  return value
}

export function encode(state: unknown): string {
  return JSON.stringify(state, replacer)
}

export function decode<T>(raw: string): T {
  return JSON.parse(raw, reviver) as T
}
