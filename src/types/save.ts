import Decimal from 'break_infinity.js'

export const CURRENT_SAVE_VERSION = 5
export type SaveVersion = number

export interface GameState {
  blocks: Decimal
  totalBlocksEver: Decimal
  clickValue: Decimal
  cps: Decimal
  prestigeMult: number
  /** Wall-clock timestamp of the most recent in-session tick. Useful for
   * detecting stalled ticks; NOT a reliable signal for offline progress
   * (overwritten on every 100ms tick — see persistedAt below). */
  lastTick: number
  /** Wall-clock timestamp of the most recent successful localStorage write
   * (or server save hydration). This is what offline progress is computed
   * against: `now - persistedAt` is the true gap since the player's state
   * was last durably captured, even if the browser crashed mid-session. */
  persistedAt: number
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
    persistedAt: Date.now(),
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
