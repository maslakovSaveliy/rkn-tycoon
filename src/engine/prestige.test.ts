import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  PRESTIGE_THRESHOLD,
  computePrestigeMult,
  pendingStarGain,
  projectedStars,
} from './prestige'

describe('projectedStars', () => {
  it('is zero below the 1e9 threshold', () => {
    expect(projectedStars(new Decimal(0))).toBe(0)
    expect(projectedStars(new Decimal(PRESTIGE_THRESHOLD - 1))).toBe(0)
  })

  it('is 1 at exactly the first threshold', () => {
    expect(projectedStars(new Decimal(PRESTIGE_THRESHOLD))).toBe(1)
  })

  it('follows the floor(sqrt(total/1e9)) formula', () => {
    expect(projectedStars(new Decimal(4 * PRESTIGE_THRESHOLD))).toBe(2)
    expect(projectedStars(new Decimal(9 * PRESTIGE_THRESHOLD))).toBe(3)
    expect(projectedStars(new Decimal(25 * PRESTIGE_THRESHOLD))).toBe(5)
    expect(projectedStars(new Decimal(100 * PRESTIGE_THRESHOLD))).toBe(10)
  })

  it('returns 0 for invalid inputs (NaN, negative)', () => {
    expect(projectedStars(new Decimal(-1))).toBe(0)
  })
})

describe('pendingStarGain', () => {
  it('is zero when projected ≤ current', () => {
    expect(pendingStarGain(new Decimal(PRESTIGE_THRESHOLD), 1)).toBe(0)
    expect(pendingStarGain(new Decimal(PRESTIGE_THRESHOLD), 5)).toBe(0)
  })

  it('reports the delta to the projected total', () => {
    expect(pendingStarGain(new Decimal(9 * PRESTIGE_THRESHOLD), 1)).toBe(2) // 3 - 1
    expect(pendingStarGain(new Decimal(100 * PRESTIGE_THRESHOLD), 0)).toBe(10)
  })

  it('reports 1 at the very first prestige opportunity', () => {
    expect(pendingStarGain(new Decimal(PRESTIGE_THRESHOLD), 0)).toBe(1)
  })
})

describe('computePrestigeMult', () => {
  it('is 1 at 0 stars', () => {
    expect(computePrestigeMult(0)).toBe(1)
  })

  it('adds 2% per star', () => {
    expect(computePrestigeMult(1)).toBeCloseTo(1.02, 10)
    expect(computePrestigeMult(5)).toBeCloseTo(1.1, 10)
    expect(computePrestigeMult(50)).toBeCloseTo(2, 10)
  })

  it('clamps negative inputs to 0', () => {
    expect(computePrestigeMult(-3)).toBe(1)
  })
})
