import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS } from '@/data/achievements'
import { findNewlyUnlocked } from './achievements'

function baseState() {
  return {
    blocks: new Decimal(0),
    totalBlocksEver: new Decimal(0),
    tickCount: 0,
    purchasedClickUpgrades: [] as string[],
    censorCounts: {} as Record<string, number>,
    prestigeStars: 0,
    telegramLeakStreak: 0,
  }
}

describe('findNewlyUnlocked', () => {
  it('returns nothing for a freshly initialized state', () => {
    expect(findNewlyUnlocked(ACHIEVEMENTS, baseState(), [])).toEqual([])
  })

  it('fires «first-complaint» as soon as totalBlocksEver >= 1', () => {
    const s = { ...baseState(), totalBlocksEver: new Decimal(1) }
    const got = findNewlyUnlocked(ACHIEVEMENTS, s, [])
    expect(got).toContain('first-complaint')
  })

  it('skips already-unlocked achievements', () => {
    const s = { ...baseState(), totalBlocksEver: new Decimal(1) }
    expect(findNewlyUnlocked(ACHIEVEMENTS, s, ['first-complaint'])).toEqual([])
  })

  it('fires multiple at once when the state jumps past several thresholds', () => {
    const s = {
      ...baseState(),
      totalBlocksEver: new Decimal('1e9'), // first + 1k + 1M + 1B
    }
    const got = findNewlyUnlocked(ACHIEVEMENTS, s, [])
    expect(got).toEqual(
      expect.arrayContaining([
        'first-complaint',
        'registry-filled',
        'mid-level-bureaucrat',
        'great-censor',
      ]),
    )
  })

  it('fires «staffing-table» at 50 of any censor', () => {
    const s = { ...baseState(), censorCounts: { intern: 50 } }
    const got = findNewlyUnlocked(ACHIEVEMENTS, s, [])
    expect(got).toContain('staffing-table')
  })

  it('fires «yarovaya-passed» when Закон Яровой is purchased', () => {
    const s = { ...baseState(), purchasedClickUpgrades: ['yarovaya-act'] }
    const got = findNewlyUnlocked(ACHIEVEMENTS, s, [])
    expect(got).toContain('yarovaya-passed')
  })

  it('fires «great-firewall-junior» at 100 ТСПУ Эшелонов', () => {
    const s = { ...baseState(), censorCounts: { 'tspu-echelon': 100 } }
    const got = findNewlyUnlocked(ACHIEVEMENTS, s, [])
    expect(got).toContain('great-firewall-junior')
  })

  it('Phase-6 prestige achievements stay locked at prestigeStars=0', () => {
    const s = baseState()
    const got = findNewlyUnlocked(ACHIEVEMENTS, s, [])
    expect(got).not.toContain('first-medal')
    expect(got).not.toContain('service-veteran')
  })

  it('fires «vpn-what-thats» when telegramLeakStreak reaches 10', () => {
    const s = { ...baseState(), telegramLeakStreak: 10 }
    const got = findNewlyUnlocked(ACHIEVEMENTS, s, [])
    expect(got).toContain('vpn-what-thats')
  })
})
