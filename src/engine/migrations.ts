import type { SavePayload, GameState } from '@/types/save'
import { CURRENT_SAVE_VERSION, initialState } from '@/types/save'

export class MigrationError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'MigrationError'
  }
}

export function migrate(payload: { version: number; state: unknown }): SavePayload {
  let { version, state } = payload

  if (version === 1) {
    state = {
      ...(state as Partial<GameState>),
      purchasedClickUpgrades: [],
      censorCounts: {},
    }
    version = 2
  }

  if (version === 2) {
    state = {
      ...(state as Partial<GameState>),
      unlockedAchievements: [],
      telegramLeakStreak: 0,
      prestigeStars: 0,
    }
    version = 3
  }

  if (version === 3) {
    state = {
      ...(state as Partial<GameState>),
      playtimeSeconds: 0,
    }
    version = 4
  }

  if (version !== CURRENT_SAVE_VERSION) {
    throw new MigrationError(
      `Cannot migrate from save version ${String(version)} to ${String(CURRENT_SAVE_VERSION)}`,
    )
  }

  return { version: CURRENT_SAVE_VERSION, state: state as GameState }
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
