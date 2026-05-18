import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import { OFFLINE_CAP_MS, computeOfflineGains } from './offline'

describe('computeOfflineGains', () => {
  it('returns zero for negative/zero gap (clock skew or fresh save)', () => {
    const r = computeOfflineGains(2000, 1000, new Decimal(10), 1)
    expect(r.durationMs).toBe(0)
    expect(r.earned.eq(0)).toBe(true)
  })

  it('credits cps * dt * prestigeMult over a normal gap', () => {
    // 5 minutes offline at 10 CPS, prestige ×2 → 5*60*10*2 = 6000.
    const lastTick = 1_000_000
    const now = lastTick + 5 * 60 * 1000
    const r = computeOfflineGains(lastTick, now, new Decimal(10), 2)
    expect(r.durationMs).toBe(5 * 60 * 1000)
    expect(r.earned.eq(6000)).toBe(true)
  })

  it('caps duration at 1 hour for very long gaps', () => {
    // 6 hours offline at 100 CPS → cap to 1h → 1*3600*100 = 360_000.
    const lastTick = 0
    const now = lastTick + 6 * 60 * 60 * 1000
    const r = computeOfflineGains(lastTick, now, new Decimal(100), 1)
    expect(r.durationMs).toBe(OFFLINE_CAP_MS)
    expect(r.earned.eq(360_000)).toBe(true)
  })

  it('returns zero earnings when cps is zero (player has no censors yet)', () => {
    const r = computeOfflineGains(0, 60_000, new Decimal(0), 1)
    expect(r.durationMs).toBe(60_000)
    expect(r.earned.eq(0)).toBe(true)
  })

  it('respects sub-second gaps without exploding precision', () => {
    // 500ms at 10 CPS → 5.
    const r = computeOfflineGains(0, 500, new Decimal(10), 1)
    expect(r.durationMs).toBe(500)
    expect(r.earned.eq(5)).toBe(true)
  })
})
