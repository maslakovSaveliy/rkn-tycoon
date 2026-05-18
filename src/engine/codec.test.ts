import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import { decode, encode } from './codec'

describe('codec — single Decimal', () => {
  it('round-trips a single Decimal value through JSON', () => {
    const original = new Decimal('1.23e456')
    const wrapper = { x: original }
    const json = encode(wrapper)
    expect(json).toContain('__D')
    const back = decode<{ x: Decimal }>(json)
    expect(back.x).toBeInstanceOf(Decimal)
    expect(back.x.eq(original)).toBe(true)
  })

  it('handles Decimal that equals zero', () => {
    const original = new Decimal(0)
    const back = decode<{ x: Decimal }>(encode({ x: original }))
    expect(back.x.eq(0)).toBe(true)
  })

  it('handles negative Decimal', () => {
    const original = new Decimal('-1.5e10')
    const back = decode<{ x: Decimal }>(encode({ x: original }))
    expect(back.x.eq(original)).toBe(true)
  })
})

describe('codec — nested Decimals', () => {
  it('round-trips Decimals inside objects and arrays', () => {
    const value = {
      cps: new Decimal('5.5e10'),
      upgrades: [new Decimal('1'), new Decimal('2e3'), new Decimal('0')],
      nested: { deep: { d: new Decimal('1e1000') } },
      plain: 42,
    }
    const back = decode<typeof value>(encode(value))
    expect(back.cps.eq('5.5e10')).toBe(true)
    const u0 = back.upgrades[0]
    const u1 = back.upgrades[1]
    const u2 = back.upgrades[2]
    expect(u0?.eq(1)).toBe(true)
    expect(u1?.eq('2e3')).toBe(true)
    expect(u2?.eq(0)).toBe(true)
    expect(back.nested.deep.d.eq('1e1000')).toBe(true)
    expect(back.plain).toBe(42)
  })

  it('rehydrates a literal __D-shaped object as Decimal (contract is intentional)', () => {
    const json = JSON.stringify({ x: { __D: '7' } })
    const back = decode<{ x: Decimal }>(json)
    expect(back.x).toBeInstanceOf(Decimal)
    expect(back.x.eq(7)).toBe(true)
  })
})
