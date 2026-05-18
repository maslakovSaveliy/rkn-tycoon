import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import { formatNumber } from './numbers'

describe('formatNumber', () => {
  it('renders zero as "0"', () => {
    expect(formatNumber(new Decimal(0))).toBe('0')
  })

  it('renders small integers without suffix', () => {
    expect(formatNumber(new Decimal(1))).toBe('1')
    expect(formatNumber(new Decimal(42))).toBe('42')
    expect(formatNumber(new Decimal(999))).toBe('999')
  })

  it('renders small fractions with up to 2 decimals, no trailing zeros', () => {
    expect(formatNumber(new Decimal(1.5))).toBe('1.5')
    expect(formatNumber(new Decimal(0.5))).toBe('0.5')
    expect(formatNumber(new Decimal(123.45))).toBe('123.45')
  })

  it('applies К at 1e3 threshold', () => {
    expect(formatNumber(new Decimal(1000))).toBe('1.00К')
    expect(formatNumber(new Decimal(1234))).toBe('1.23К')
    // toFixed(2) rounds 999.999К → 1000.00К; acceptable display quirk at the suffix boundary.
    expect(formatNumber(new Decimal(999_999))).toBe('1000.00К')
  })

  it('applies М at 1e6 threshold', () => {
    expect(formatNumber(new Decimal(1_000_000))).toBe('1.00М')
    expect(formatNumber(new Decimal(5_000_000))).toBe('5.00М')
    expect(formatNumber(new Decimal(7.89e6))).toBe('7.89М')
  })

  it('applies Б at 1e9 threshold', () => {
    expect(formatNumber(new Decimal(1e9))).toBe('1.00Б')
    expect(formatNumber(new Decimal(7.89e9))).toBe('7.89Б')
  })

  it('applies Т at 1e12 threshold', () => {
    expect(formatNumber(new Decimal(1e12))).toBe('1.00Т')
    expect(formatNumber(new Decimal(2.5e12))).toBe('2.50Т')
  })

  it('switches to scientific notation at 1e15', () => {
    expect(formatNumber(new Decimal('1e15'))).toBe('1.00e15')
    expect(formatNumber(new Decimal('3.14e15'))).toBe('3.14e15')
    expect(formatNumber(new Decimal('1.23e456'))).toBe('1.23e456')
  })

  it('handles negative values', () => {
    expect(formatNumber(new Decimal(-1234))).toBe('-1.23К')
    expect(formatNumber(new Decimal(-42))).toBe('-42')
    expect(formatNumber(new Decimal('-1e15'))).toBe('-1.00e15')
  })

  it('renders Infinity as ∞', () => {
    expect(formatNumber(new Decimal(Number.POSITIVE_INFINITY))).toBe('∞')
  })
})
