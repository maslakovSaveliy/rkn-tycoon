import { describe, expect, it } from 'vitest'
import { runAccumulator } from './tick'

describe('runAccumulator', () => {
  it('250ms delta with 0ms initial gives 2 steps + 50ms remainder', () => {
    expect(runAccumulator(250, 0, 100)).toEqual({ steps: 2, remainder: 50 })
  })

  it('99ms delta gives 0 steps and full delta as remainder', () => {
    expect(runAccumulator(99, 0, 100)).toEqual({ steps: 0, remainder: 99 })
  })

  it('catches up at the 600-step safety cap after long tab-hides', () => {
    const r = runAccumulator(3_600_000, 0, 100) // 1h of deltas → naive 36k steps
    expect(r.steps).toBe(600)
    expect(r.remainder).toBe(0)
  })

  it('carries remainder across calls correctly', () => {
    const a = runAccumulator(150, 0, 100) // 1 step, 50 remainder
    expect(a).toEqual({ steps: 1, remainder: 50 })
    const b = runAccumulator(75, a.remainder, 100) // 125 >= 100 → 1 step, 25 remainder
    expect(b).toEqual({ steps: 1, remainder: 25 })
  })

  it('respects custom step size', () => {
    expect(runAccumulator(500, 0, 250)).toEqual({ steps: 2, remainder: 0 })
  })
})
