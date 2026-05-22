/**
 * Unit tests for leaderboard anti-cheat sanity checks.
 * The DB layer is mocked at the module boundary so we only exercise the
 * validation/decision logic in upsertFromSave.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// `import 'server-only'` throws when imported outside a Server Component.
// Stub it out so vitest can load the module under test.
vi.mock('server-only', () => ({}))

const mockFindUnique = vi.fn()
const mockUpsert = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    leaderboardEntry: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}))

import {
  compareTbe,
  computeMaxTbeExponent,
  MIN_PLAYTIME_SEC,
  upsertFromSave,
} from './leaderboardRepo'

beforeEach(() => {
  mockFindUnique.mockReset()
  mockUpsert.mockReset()
})

describe('computeMaxTbeExponent', () => {
  it('grows logarithmically with playtime', () => {
    const e1m = computeMaxTbeExponent(60, 0)
    const e1h = computeMaxTbeExponent(3600, 0)
    expect(e1h - e1m).toBeCloseTo(Math.log10(3600 / 60), 5)
  })

  it('scales with prestige stars', () => {
    const noStars = computeMaxTbeExponent(3600, 0)
    const someStars = computeMaxTbeExponent(3600, 100) // 3× prestige mult
    expect(someStars).toBeGreaterThan(noStars)
    expect(someStars - noStars).toBeCloseTo(Math.log10(3), 2)
  })
})

describe('compareTbe', () => {
  it('orders by exponent first', () => {
    expect(compareTbe(5, 10, 5, 11)).toBeLessThan(0)
    expect(compareTbe(5, 12, 5, 11)).toBeGreaterThan(0)
  })

  it('orders by mantissa when exponents match', () => {
    expect(compareTbe(2, 10, 3, 10)).toBeLessThan(0)
    expect(compareTbe(3, 10, 2, 10)).toBeGreaterThan(0)
  })

  it('returns 0 on exact equality', () => {
    expect(compareTbe(5, 10, 5, 10)).toBe(0)
  })
})

describe('upsertFromSave — sanity checks', () => {
  it('rejects non-finite numbers', async () => {
    const result = await upsertFromSave({
      userId: 'u1',
      tbeMantissa: Number.POSITIVE_INFINITY,
      tbeExponent: 10,
      prestigeStars: 0,
      playtimeSeconds: 600,
    })
    expect(result).toEqual({ ok: false, reason: 'invalid_numbers' })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('rejects negative stars', async () => {
    const result = await upsertFromSave({
      userId: 'u1',
      tbeMantissa: 1,
      tbeExponent: 10,
      prestigeStars: -1,
      playtimeSeconds: 600,
    })
    expect(result).toEqual({ ok: false, reason: 'invalid_numbers' })
  })

  it(`rejects playtime below ${String(MIN_PLAYTIME_SEC)}s`, async () => {
    const result = await upsertFromSave({
      userId: 'u1',
      tbeMantissa: 1,
      tbeExponent: 5,
      prestigeStars: 0,
      playtimeSeconds: MIN_PLAYTIME_SEC - 1,
    })
    expect(result).toEqual({ ok: false, reason: 'min_playtime' })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('rejects implausible TBE for short playtime (BPS ceiling)', async () => {
    // 1e9999 with 60s playtime and 0 stars is impossible.
    const result = await upsertFromSave({
      userId: 'u1',
      tbeMantissa: 1,
      tbeExponent: 9999,
      prestigeStars: 0,
      playtimeSeconds: 60,
    })
    expect(result).toEqual({ ok: false, reason: 'bps_ceiling' })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('accepts a believable submission', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockUpsert.mockResolvedValue({})

    const result = await upsertFromSave({
      userId: 'u1',
      tbeMantissa: 5,
      tbeExponent: 10, // ~5e10, 10 minutes
      prestigeStars: 0,
      playtimeSeconds: 600,
    })
    expect(result).toEqual({ ok: true })
    expect(mockUpsert).toHaveBeenCalledTimes(1)
  })

  it('rejects TBE downgrade at same stars (monotonicity)', async () => {
    mockFindUnique.mockResolvedValue({
      tbeMantissa: 5,
      tbeExponent: 20,
      prestigeStars: 0,
    })

    const result = await upsertFromSave({
      userId: 'u1',
      tbeMantissa: 5,
      tbeExponent: 15, // lower than existing
      prestigeStars: 0,
      playtimeSeconds: 600,
    })
    expect(result).toEqual({ ok: false, reason: 'tbe_downgrade' })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('rejects star downgrade', async () => {
    mockFindUnique.mockResolvedValue({
      tbeMantissa: 5,
      tbeExponent: 15,
      prestigeStars: 10,
    })

    const result = await upsertFromSave({
      userId: 'u1',
      tbeMantissa: 5,
      tbeExponent: 16,
      prestigeStars: 5, // fewer stars than existing
      playtimeSeconds: 600,
    })
    expect(result).toEqual({ ok: false, reason: 'tbe_downgrade' })
  })

  it('allows TBE reset on prestige (more stars even if TBE smaller)', async () => {
    mockFindUnique.mockResolvedValue({
      tbeMantissa: 5,
      tbeExponent: 18,
      prestigeStars: 5,
    })
    mockUpsert.mockResolvedValue({})

    const result = await upsertFromSave({
      userId: 'u1',
      tbeMantissa: 1,
      tbeExponent: 12, // smaller TBE, but more stars
      prestigeStars: 10,
      playtimeSeconds: 600,
    })
    // tbeExponent 12 with 10 stars + 600s should fit under the ceiling
    expect(result).toEqual({ ok: true })
    expect(mockUpsert).toHaveBeenCalledTimes(1)
  })
})
