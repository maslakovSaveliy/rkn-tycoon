import Decimal from 'break_infinity.js'

export const CURRENT_SAVE_VERSION = 4
export type SaveVersion = number

export interface GameState {
  blocks: Decimal
  totalBlocksEver: Decimal
  clickValue: Decimal
  cps: Decimal
  prestigeMult: number
  lastTick: number
  tickCount: number
  uptimeStartMs: number
  /** Accumulated seconds of active play. Used by the leaderboard for sanity. */
  playtimeSeconds: number
  purchasedClickUpgrades: string[]
  censorCounts: Record<string, number>
  offlineEarnings: {
    durationMs: number
    earned: Decimal
  } | null
  unlockedAchievements: string[]
  achievementToastQueue: { id: string; shownAt: number }[]
  telegramLeakStreak: number
  prestigeStars: number
  activeMultipliers: ActiveMultiplier[]
  clickBoosts: ClickBoost[]
  activeEvent: ActiveEvent | null
  nextEventSpawnAt: number
}

export type MultKind = 'click' | 'cps'

export interface ActiveMultiplier {
  id: string
  kind: MultKind
  value: number
  expiresAt: number
}

export interface ClickBoost {
  id: string
  value: number
  clicksRemaining: number
}

export interface ActiveEvent {
  id: string
  spawnedAt: number
  expiresAt: number
  x: number
  y: number
}

export interface SavePayload {
  version: SaveVersion
  state: GameState
}

export function initialState(): GameState {
  return {
    blocks: new Decimal(0),
    totalBlocksEver: new Decimal(0),
    clickValue: new Decimal(1),
    cps: new Decimal(0),
    prestigeMult: 1.0,
    lastTick: Date.now(),
    tickCount: 0,
    uptimeStartMs: 0,
    playtimeSeconds: 0,
    purchasedClickUpgrades: [],
    censorCounts: {},
    offlineEarnings: null,
    unlockedAchievements: [],
    achievementToastQueue: [],
    telegramLeakStreak: 0,
    prestigeStars: 0,
    activeMultipliers: [],
    clickBoosts: [],
    activeEvent: null,
    nextEventSpawnAt: 0,
  }
}
