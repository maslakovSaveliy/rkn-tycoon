import { describe, expect, it } from 'vitest'
import type { ActiveMultiplier, ClickBoost } from '@/types/save'
import {
  aggregateActiveMultiplier,
  aggregateClickBoosts,
  consumeClickBoosts,
  pruneExpiredMultipliers,
} from './multipliers'

const now = 10_000

function mult(
  partial: Partial<ActiveMultiplier> & Pick<ActiveMultiplier, 'id'>,
): ActiveMultiplier {
  return {
    kind: 'click',
    value: 2,
    expiresAt: now + 1000,
    ...partial,
  }
}

describe('pruneExpiredMultipliers', () => {
  it('drops expired entries and keeps live ones', () => {
    const live = mult({ id: 'a', expiresAt: now + 500 })
    const dead = mult({ id: 'b', expiresAt: now - 1 })
    expect(pruneExpiredMultipliers([live, dead], now)).toEqual([live])
  })

  it('returns the same array reference when nothing expired (alloc avoidance)', () => {
    const list = [mult({ id: 'a' }), mult({ id: 'b' })]
    expect(pruneExpiredMultipliers(list, now)).toBe(list)
  })

  it('returns an empty array when everything expired', () => {
    const list = [
      mult({ id: 'a', expiresAt: now - 1 }),
      mult({ id: 'b', expiresAt: now - 1 }),
    ]
    expect(pruneExpiredMultipliers(list, now)).toEqual([])
  })
})

describe('aggregateActiveMultiplier', () => {
  it('returns 1 when no multipliers of the requested kind apply', () => {
    expect(aggregateActiveMultiplier([], 'click', now)).toBe(1)
    const cpsOnly = [mult({ id: 'a', kind: 'cps', value: 5 })]
    expect(aggregateActiveMultiplier(cpsOnly, 'click', now)).toBe(1)
  })

  it('multiplies all live multipliers of the requested kind', () => {
    const list = [
      mult({ id: 'a', kind: 'click', value: 2 }),
      mult({ id: 'b', kind: 'click', value: 3 }),
      mult({ id: 'c', kind: 'cps', value: 10 }), // ignored
    ]
    expect(aggregateActiveMultiplier(list, 'click', now)).toBe(6)
    expect(aggregateActiveMultiplier(list, 'cps', now)).toBe(10)
  })

  it('skips expired multipliers', () => {
    const list = [
      mult({ id: 'a', kind: 'click', value: 2, expiresAt: now - 1 }),
      mult({ id: 'b', kind: 'click', value: 3, expiresAt: now + 1 }),
    ]
    expect(aggregateActiveMultiplier(list, 'click', now)).toBe(3)
  })
})

describe('click boosts (counter-bound)', () => {
  it('aggregates only boosts with counter > 0', () => {
    const list: ClickBoost[] = [
      { id: 'a', value: 7, clicksRemaining: 5 },
      { id: 'b', value: 2, clicksRemaining: 0 },
    ]
    expect(aggregateClickBoosts(list)).toBe(7)
  })

  it('decrements each boost and drops at zero', () => {
    const list: ClickBoost[] = [
      { id: 'a', value: 7, clicksRemaining: 2 },
      { id: 'b', value: 3, clicksRemaining: 1 },
    ]
    const after = consumeClickBoosts(list)
    expect(after).toEqual([{ id: 'a', value: 7, clicksRemaining: 1 }])
  })

  it('returns an empty array when none remain', () => {
    const list: ClickBoost[] = [{ id: 'a', value: 7, clicksRemaining: 1 }]
    expect(consumeClickBoosts(list)).toEqual([])
  })
})
