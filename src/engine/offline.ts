import Decimal from 'break_infinity.js'

export const OFFLINE_CAP_MS = 3_600_000
export const OFFLINE_MODAL_THRESHOLD_MS = 60_000

export interface OfflineGains {
  durationMs: number
  earned: Decimal
}

export function computeOfflineGains(
  lastTick: number,
  now: number,
  cps: Decimal,
  prestigeMult: number,
): OfflineGains {
  const rawDt = now - lastTick
  if (rawDt <= 0) {
    return { durationMs: 0, earned: new Decimal(0) }
  }
  const durationMs = Math.min(rawDt, OFFLINE_CAP_MS)
  const seconds = durationMs / 1000
  const earned = cps.mul(seconds).mul(prestigeMult)
  return { durationMs, earned }
}
