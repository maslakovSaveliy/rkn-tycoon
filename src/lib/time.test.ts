import { describe, expect, it } from 'vitest'
import { formatDuration } from './time'

describe('formatDuration — RU pluralization', () => {
  it('handles sub-second', () => {
    expect(formatDuration(0)).toBe('меньше секунды')
    expect(formatDuration(999)).toBe('меньше секунды')
  })

  it('seconds with proper case forms', () => {
    expect(formatDuration(1_000)).toBe('1 секунду')
    expect(formatDuration(2_000)).toBe('2 секунды')
    expect(formatDuration(5_000)).toBe('5 секунд')
    expect(formatDuration(11_000)).toBe('11 секунд') // 11-14 always third form
    expect(formatDuration(21_000)).toBe('21 секунду')
    expect(formatDuration(22_000)).toBe('22 секунды')
    expect(formatDuration(25_000)).toBe('25 секунд')
    expect(formatDuration(59_000)).toBe('59 секунд')
  })

  it('minutes with proper case forms', () => {
    expect(formatDuration(60_000)).toBe('1 минуту')
    expect(formatDuration(2 * 60_000)).toBe('2 минуты')
    expect(formatDuration(5 * 60_000)).toBe('5 минут')
    expect(formatDuration(12 * 60_000)).toBe('12 минут')
    expect(formatDuration(21 * 60_000)).toBe('21 минуту')
    expect(formatDuration(59 * 60_000)).toBe('59 минут')
  })

  it('hours with proper case forms', () => {
    expect(formatDuration(60 * 60_000)).toBe('1 час')
    expect(formatDuration(2 * 60 * 60_000)).toBe('2 часа')
    expect(formatDuration(5 * 60 * 60_000)).toBe('5 часов')
    expect(formatDuration(11 * 60 * 60_000)).toBe('11 часов')
    expect(formatDuration(21 * 60 * 60_000)).toBe('21 час')
  })

  it('truncates rather than rounding', () => {
    expect(formatDuration(1_999)).toBe('1 секунду')
    expect(formatDuration(119_999)).toBe('1 минуту')
  })
})
