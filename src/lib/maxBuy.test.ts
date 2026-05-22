import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import { geometricSeriesCost, maxBuyCensor } from './maxBuy'

describe('maxBuyCensor', () => {
  it('returns 0 when nothing is affordable', () => {
    const r = maxBuyCensor(new Decimal(10), new Decimal(15), 0)
    expect(r.count).toBe(0)
    expect(r.totalCost.eq(0)).toBe(true)
  })

  it('returns 1 when exactly one copy is affordable', () => {
    // baseCost 15, currentCount 0 → first copy costs 15. Player has 20.
    // Second copy would cost 15 * 1.15 = 17.25; total for 2 = 32.25 > 20.
    const r = maxBuyCensor(new Decimal(20), new Decimal(15), 0)
    expect(r.count).toBe(1)
    expect(r.totalCost.eq(15)).toBe(true)
  })

  it('returns the geometric-series count for a generous budget', () => {
    // baseCost 100, currentCount 0, blocks = 10000.
    // Sum_{k=0..n-1} 100 * 1.15^k ≤ 10000
    // ≈ 100*(1.15^n -1)/0.15 ≤ 10000  →  1.15^n ≤ 16 → n ≤ log_1.15(16) ≈ 19.83
    const r = maxBuyCensor(new Decimal(10_000), new Decimal(100), 0)
    expect(r.count).toBe(19)
    // Sanity: total cost is <= budget and >= cost of 19 copies
    expect(r.totalCost.lte(10_000)).toBe(true)
    expect(r.totalCost.gte(100)).toBe(true)
  })

  it('respects currentCount when ramping further', () => {
    // After owning 10, the next copy costs 100 * 1.15^10 ≈ 404.56
    // With 1000 blocks we should afford 2 (404.56 + 465.24 = 869.80 ≤ 1000)
    const r = maxBuyCensor(new Decimal(1_000), new Decimal(100), 10)
    expect(r.count).toBe(2)
  })

  it('caps at MAX_BATCH for runaway budgets', () => {
    // Astronomical budget — should clamp.
    const r = maxBuyCensor(new Decimal('1e308'), new Decimal(15), 0)
    expect(r.count).toBeLessThanOrEqual(1_000_000)
  })

  it('handles non-default ratio', () => {
    // Ratio 2 doubles each step. baseCost 1, budget 7.
    // Sum: 1 + 2 + 4 = 7 → n=3.
    const r = maxBuyCensor(new Decimal(7), new Decimal(1), 0, 2)
    expect(r.count).toBe(3)
    expect(r.totalCost.eq(7)).toBe(true)
  })

  it('does not return Infinity for ridiculously large budgets + high currentCount', () => {
    // currentCount 50_000 means nextCost = 15 * 1.15^50000 — far beyond
    // Number.MAX_VALUE. Without the Decimal-pow fallback this returned NaN.
    const r = maxBuyCensor(
      new Decimal('1e9999'),
      new Decimal(15),
      50_000,
    )
    expect(Number.isFinite(r.count)).toBe(true)
    expect(r.totalCost.lt(new Decimal('1e9999').add(1))).toBe(true)
  })
})

describe('geometricSeriesCost', () => {
  it('returns 0 for n=0', () => {
    expect(geometricSeriesCost(new Decimal(15), 0, 0).eq(0)).toBe(true)
  })

  it('returns base cost for n=1 at currentCount=0', () => {
    expect(geometricSeriesCost(new Decimal(15), 0, 1).eq(15)).toBe(true)
  })

  it('returns ramp-adjusted cost for n=1 at currentCount=10', () => {
    // 15 * 1.15^10
    const expected = 15 * Math.pow(1.15, 10)
    const got = geometricSeriesCost(new Decimal(15), 10, 1)
    expect(got.toNumber()).toBeCloseTo(expected, 5)
  })

  it('matches the closed-form sum for n=3 at currentCount=0', () => {
    // 1 + 1.15 + 1.15^2
    const expected = 1 + 1.15 + 1.15 * 1.15
    const got = geometricSeriesCost(new Decimal(1), 0, 3)
    expect(got.toNumber()).toBeCloseTo(expected, 5)
  })
})
