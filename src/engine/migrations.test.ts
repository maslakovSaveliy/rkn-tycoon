import Decimal from 'break_infinity.js'
import { describe, expect, it, vi } from 'vitest'
import { CURRENT_SAVE_VERSION, initialState } from '@/types/save'
import { MigrationError, migrate, safeRehydrate } from './migrations'

describe('migrate — identity at current version', () => {
  it('returns a current-version payload unchanged (identity)', () => {
    const state = { ...initialState(), blocks: new Decimal('42') }
    const result = migrate({ version: CURRENT_SAVE_VERSION, state })
    expect(result.version).toBe(CURRENT_SAVE_VERSION)
    expect(result.state).toBe(state) // same reference
  })

  it('throws MigrationError on an unknown future version', () => {
    expect(() => migrate({ version: 999, state: {} })).toThrow(MigrationError)
  })
})

describe('migrate — v1 → v4 (chained through Phase 10)', () => {
  it('seeds Phase-3/5/10 fields on a v1 save without touching blocks', () => {
    const v1State = {
      blocks: new Decimal('500'),
      totalBlocksEver: new Decimal('500'),
      clickValue: new Decimal(1),
      cps: new Decimal(0),
      prestigeMult: 1,
      lastTick: 12345,
      tickCount: 50,
      uptimeStartMs: 0,
    }
    const result = migrate({ version: 1, state: v1State })
    expect(result.version).toBe(CURRENT_SAVE_VERSION)
    expect(result.state.blocks.eq(500)).toBe(true)
    expect(result.state.purchasedClickUpgrades).toEqual([])
    expect(result.state.censorCounts).toEqual({})
    expect(result.state.unlockedAchievements).toEqual([])
    expect(result.state.telegramLeakStreak).toBe(0)
    expect(result.state.prestigeStars).toBe(0)
    expect(result.state.playtimeSeconds).toBe(0)
    expect(result.state.tickCount).toBe(50)
  })
})

describe('migrate — v3 → v4 (Phase 10 leaderboards)', () => {
  it('seeds playtimeSeconds=0 on a v3 save without touching anything else', () => {
    const v3State = {
      blocks: new Decimal('1000'),
      totalBlocksEver: new Decimal('1000'),
      clickValue: new Decimal(2),
      cps: new Decimal(5),
      prestigeMult: 1.02,
      lastTick: 0,
      tickCount: 0,
      uptimeStartMs: 0,
      purchasedClickUpgrades: ['rubber-stamp'],
      censorCounts: { intern: 3 },
      unlockedAchievements: ['first-complaint'],
      telegramLeakStreak: 0,
      prestigeStars: 1,
    }
    const result = migrate({ version: 3, state: v3State })
    expect(result.version).toBe(CURRENT_SAVE_VERSION)
    expect(result.state.playtimeSeconds).toBe(0)
    expect(result.state.purchasedClickUpgrades).toEqual(['rubber-stamp'])
    expect(result.state.prestigeStars).toBe(1)
    expect(result.state.unlockedAchievements).toEqual(['first-complaint'])
  })
})

describe('migrate — v4 → v5 (offline-progress persistedAt)', () => {
  it('seeds persistedAt from the v4 lastTick value', () => {
    const v4State = {
      blocks: new Decimal('1000'),
      totalBlocksEver: new Decimal('1000'),
      clickValue: new Decimal(1),
      cps: new Decimal(0),
      prestigeMult: 1,
      lastTick: 1_700_000_000_000,
      tickCount: 0,
      uptimeStartMs: 0,
      playtimeSeconds: 0,
      purchasedClickUpgrades: [],
      censorCounts: {},
      unlockedAchievements: [],
      telegramLeakStreak: 0,
      prestigeStars: 0,
    }
    const result = migrate({ version: 4, state: v4State })
    expect(result.version).toBe(CURRENT_SAVE_VERSION)
    expect(result.state.persistedAt).toBe(1_700_000_000_000)
  })

  it('defaults persistedAt to now() when lastTick is missing', () => {
    const before = Date.now()
    const result = migrate({
      version: 4,
      state: { blocks: new Decimal('1') } as unknown as Partial<unknown>,
    })
    const after = Date.now()
    expect(result.state.persistedAt).toBeGreaterThanOrEqual(before)
    expect(result.state.persistedAt).toBeLessThanOrEqual(after)
  })
})

describe('safeRehydrate — corrupted-save fallback', () => {
  it('returns a fresh initial state when input is null', () => {
    const r = safeRehydrate(null)
    expect(r.version).toBe(CURRENT_SAVE_VERSION)
    expect(r.state.blocks.eq(0)).toBe(true)
  })

  it('falls back when input is the wrong shape (no version field)', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // suppress noise
    })
    const r = safeRehydrate({ random: 'object' })
    expect(r.version).toBe(CURRENT_SAVE_VERSION)
    expect(r.state.blocks.eq(0)).toBe(true)
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('falls back when migration throws on an unknown version', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // suppress noise
    })
    const r = safeRehydrate({ version: 42, state: {} })
    expect(r.version).toBe(CURRENT_SAVE_VERSION)
    expect(r.state.blocks.eq(0)).toBe(true)
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
})
