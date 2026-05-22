/**
 * Verifies persistedAt-stamp logic — the core invariant offline-progress
 * depends on (the stamp must reflect the actual localStorage-write moment,
 * not the in-memory mutation moment).
 */
import { describe, expect, it } from 'vitest'
import { stampPersistedAt } from './persistStorage'

describe('stampPersistedAt', () => {
  it('writes the provided timestamp into state.persistedAt', () => {
    const before = JSON.stringify({
      state: { blocks: 100, persistedAt: 0 },
      version: 5,
    })
    const after = stampPersistedAt(before, 1_700_000_007_000)
    const parsed = JSON.parse(after) as {
      state: { blocks: number; persistedAt: number }
      version: number
    }
    expect(parsed.state.persistedAt).toBe(1_700_000_007_000)
    // other fields untouched
    expect(parsed.state.blocks).toBe(100)
    expect(parsed.version).toBe(5)
  })

  it('preserves Decimal markers (deep nested __D shape)', () => {
    const before = JSON.stringify({
      state: {
        blocks: { __D: '1.5e10' },
        totalBlocksEver: { __D: '3e20' },
        persistedAt: 0,
      },
      version: 5,
    })
    const after = stampPersistedAt(before, 42)
    const parsed = JSON.parse(after) as {
      state: { blocks: { __D: string }; totalBlocksEver: { __D: string } }
    }
    expect(parsed.state.blocks).toEqual({ __D: '1.5e10' })
    expect(parsed.state.totalBlocksEver).toEqual({ __D: '3e20' })
  })

  it('returns input unchanged when JSON is malformed', () => {
    const broken = 'not-json-{['
    expect(stampPersistedAt(broken, 42)).toBe(broken)
  })

  it('returns input unchanged when state field is missing', () => {
    const noState = JSON.stringify({ version: 5 })
    const result = stampPersistedAt(noState, 42)
    const parsed = JSON.parse(result) as Record<string, unknown>
    expect(parsed.state).toBeUndefined()
  })
})
