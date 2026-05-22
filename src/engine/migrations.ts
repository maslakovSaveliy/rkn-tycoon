import type { SavePayload, GameState } from '@/types/save'
import { CURRENT_SAVE_VERSION, initialState } from '@/types/save'

export class MigrationError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'MigrationError'
  }
}

/** Apply per-version patches in sequence. Single source of truth — shared
 * by both the standalone codec (engine/migrations.migrate) and the Zustand
 * persist middleware (state/gameStore migrate config). */
export function migrateState(
  state: unknown,
  fromVersion: number,
): { state: GameState; version: number } {
  let s = state as Partial<GameState>
  let v = fromVersion

  if (v === 1) {
    s = { ...s, purchasedClickUpgrades: [], censorCounts: {} }
    v = 2
  }

  if (v === 2) {
    s = {
      ...s,
      unlockedAchievements: [],
      telegramLeakStreak: 0,
      prestigeStars: 0,
    }
    v = 3
  }

  if (v === 3) {
    s = { ...s, playtimeSeconds: 0 }
    v = 4
  }

  if (v === 4) {
    // Old saves were written with only `lastTick` — best approximation for
    // `persistedAt` is whatever lastTick said. On their next persist the
    // storage layer will overwrite it with the real Date.now().
    const previousLastTick =
      typeof (s as { lastTick?: unknown }).lastTick === 'number'
        ? (s as { lastTick: number }).lastTick
        : Date.now()
    s = { ...s, persistedAt: previousLastTick }
    v = 5
  }

  return { state: s as GameState, version: v }
}

export function migrate(payload: { version: number; state: unknown }): SavePayload {
  const { state, version } = migrateState(payload.state, payload.version)

  if (version !== CURRENT_SAVE_VERSION) {
    throw new MigrationError(
      `Cannot migrate from save version ${String(version)} to ${String(CURRENT_SAVE_VERSION)}`,
    )
  }

  return { version: CURRENT_SAVE_VERSION, state }
}

export function safeRehydrate(decoded: unknown): SavePayload {
  if (decoded == null) {
    return { version: CURRENT_SAVE_VERSION, state: initialState() }
  }
  try {
    if (
      typeof decoded !== 'object' ||
      !('version' in decoded) ||
      typeof (decoded as { version: unknown }).version !== 'number'
    ) {
      throw new Error('save shape invalid: missing or non-numeric version field')
    }
    return migrate(decoded as { version: number; state: unknown })
  } catch (err) {
    console.error('[save] corrupted save, starting fresh:', err)
    return { version: CURRENT_SAVE_VERSION, state: initialState() }
  }
}

export function safeRehydrateFromString(
  raw: string | null,
  parse: (s: string) => unknown,
): SavePayload {
  if (raw === null) return { version: CURRENT_SAVE_VERSION, state: initialState() }
  try {
    const decoded = parse(raw)
    return safeRehydrate(decoded)
  } catch (err) {
    console.error('[save] JSON parse failed, starting fresh:', err)
    return { version: CURRENT_SAVE_VERSION, state: initialState() }
  }
}
