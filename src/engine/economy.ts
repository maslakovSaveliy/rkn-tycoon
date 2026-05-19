import type Decimal from 'break_infinity.js'
import type { GameState } from '@/types/save'
import {
  aggregateActiveMultiplier,
  aggregateClickBoosts,
  consumeClickBoosts,
  pruneExpiredMultipliers,
} from './multipliers'

export function applyTick(state: GameState, dtMs: number, now: number = Date.now()): GameState {
  const dtSec = dtMs / 1000
  const activeMultipliers = pruneExpiredMultipliers(state.activeMultipliers, now)
  const cpsMult = aggregateActiveMultiplier(activeMultipliers, 'cps', now)
  const passive = state.cps.mul(dtSec).mul(state.prestigeMult).mul(cpsMult)
  return {
    ...state,
    blocks: state.blocks.add(passive),
    totalBlocksEver: state.totalBlocksEver.add(passive),
    lastTick: Date.now(),
    tickCount: state.tickCount + 1,
    playtimeSeconds: state.playtimeSeconds + dtSec,
    activeMultipliers,
  }
}

export function applyClick(state: GameState, now: number = Date.now()): GameState {
  const activeMultipliers = pruneExpiredMultipliers(state.activeMultipliers, now)
  const clickMult = aggregateActiveMultiplier(activeMultipliers, 'click', now)
  const counterMult = aggregateClickBoosts(state.clickBoosts)
  const gain = state.clickValue.mul(state.prestigeMult).mul(clickMult).mul(counterMult)
  return {
    ...state,
    blocks: state.blocks.add(gain),
    totalBlocksEver: state.totalBlocksEver.add(gain),
    activeMultipliers,
    clickBoosts: consumeClickBoosts(state.clickBoosts),
  }
}

export function effectiveCps(state: GameState, now: number = Date.now()): Decimal {
  const cpsMult = aggregateActiveMultiplier(state.activeMultipliers, 'cps', now)
  return state.cps.mul(state.prestigeMult).mul(cpsMult)
}

export function effectiveClickValue(state: GameState, now: number = Date.now()): Decimal {
  const clickMult = aggregateActiveMultiplier(state.activeMultipliers, 'click', now)
  const counterMult = aggregateClickBoosts(state.clickBoosts)
  return state.clickValue.mul(state.prestigeMult).mul(clickMult).mul(counterMult)
}
