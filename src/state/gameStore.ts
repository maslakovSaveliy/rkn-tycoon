import Decimal from 'break_infinity.js'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ACHIEVEMENTS } from '@/data/achievements'
import { CENSORS, CENSOR_COST_RATIO, CENSORS_BY_ID } from '@/data/censors'
import { CLICK_UPGRADES_BY_ID } from '@/data/clickUpgrades'
import { EVENTS_BY_ID, pickRandomEvent, resolveEffect } from '@/data/events'
import { applyClick, applyTick, findNewlyUnlocked } from '@/engine'
import {
  computePrestigeMult,
  pendingStarGain,
  projectedStars,
} from '@/engine/prestige'
import {
  OFFLINE_MODAL_THRESHOLD_MS,
  computeOfflineGains,
} from '@/engine/offline'
import { geometricSeriesCost, maxBuyCensor } from '@/lib/maxBuy'
import type { GameState } from '@/types/save'
import { CURRENT_SAVE_VERSION, initialState } from '@/types/save'
import { PERSIST_STORAGE_KEY, persistStorage } from './persistStorage'

export interface GameStore extends GameState {
  hydrated: boolean
  tick: (dtMs: number) => void
  click: () => void
  purchaseClickUpgrade: (id: string) => void
  purchaseCensor: (id: string, count: number | 'max') => void
  dismissOfflineEarnings: () => void
  dismissAchievementToast: (id: string) => void
  clickEvent: () => void
  devSpawnEvent: (id: string) => void
  performPrestige: () => void
  devSetBlocks: (raw: string) => void
  devSetCps: (raw: string) => void
  /** Replace the entire game state from a server payload (after auth sync). */
  applyServerSave: (state: GameState) => void
}

function computeClickValue(state: Pick<GameState, 'purchasedClickUpgrades'>): Decimal {
  let value = new Decimal(1)
  for (const id of state.purchasedClickUpgrades) {
    const def = CLICK_UPGRADES_BY_ID[id]
    if (!def) continue
    value = value.mul(def.multiplier)
  }
  return value
}

function computeCps(state: Pick<GameState, 'censorCounts'>): Decimal {
  let total = new Decimal(0)
  for (const def of CENSORS) {
    const count = state.censorCounts[def.id] ?? 0
    if (count <= 0) continue
    total = total.add(def.baseCps.mul(count))
  }
  return total
}

const EVENT_SPAWN_MIN_MS = 90_000
const EVENT_SPAWN_MAX_MS = 300_000
const EVENT_LIFETIME_MS = 13_000

function rollNextSpawnAt(now: number): number {
  const range = EVENT_SPAWN_MAX_MS - EVENT_SPAWN_MIN_MS
  return now + EVENT_SPAWN_MIN_MS + Math.random() * range
}

function rollSpawnPosition(): { x: number; y: number } {
  return { x: 0.1 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.65 }
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState(),
      hydrated: false,

      tick: (dtMs) => {
        set((s) => {
          const now = Date.now()
          let next = applyTick(s, dtMs, now)

          if (next.activeEvent && now >= next.activeEvent.expiresAt) {
            const wasTgLeak = next.activeEvent.id === 'telegram-leak'
            next = {
              ...next,
              activeEvent: null,
              nextEventSpawnAt: rollNextSpawnAt(now),
              telegramLeakStreak: wasTgLeak ? 0 : next.telegramLeakStreak,
            }
          }
          if (next.nextEventSpawnAt === 0) {
            next = { ...next, nextEventSpawnAt: rollNextSpawnAt(now) }
          }
          if (!next.activeEvent && now >= next.nextEventSpawnAt) {
            const def = pickRandomEvent()
            const pos = rollSpawnPosition()
            next = {
              ...next,
              activeEvent: {
                id: def.id,
                spawnedAt: now,
                expiresAt: now + EVENT_LIFETIME_MS,
                x: pos.x,
                y: pos.y,
              },
            }
          }

          const newly = findNewlyUnlocked(
            ACHIEVEMENTS,
            next,
            next.unlockedAchievements,
          )
          if (newly.length === 0) return next
          return {
            ...next,
            unlockedAchievements: [...next.unlockedAchievements, ...newly],
            achievementToastQueue: [
              ...next.achievementToastQueue,
              ...newly.map((id) => ({ id, shownAt: now })),
            ],
          }
        })
      },
      click: () => {
        set((s) => {
          const now = Date.now()
          const next = applyClick(s, now)
          const newly = findNewlyUnlocked(
            ACHIEVEMENTS,
            next,
            next.unlockedAchievements,
          )
          if (newly.length === 0) return next
          return {
            ...next,
            unlockedAchievements: [...next.unlockedAchievements, ...newly],
            achievementToastQueue: [
              ...next.achievementToastQueue,
              ...newly.map((id) => ({ id, shownAt: now })),
            ],
          }
        })
      },

      purchaseClickUpgrade: (id) => {
        const s = get()
        const def = CLICK_UPGRADES_BY_ID[id]
        if (!def) return
        if (s.purchasedClickUpgrades.includes(id)) return
        if (s.blocks.lt(def.cost)) return
        const purchasedClickUpgrades = [...s.purchasedClickUpgrades, id]
        const clickValue = computeClickValue({ purchasedClickUpgrades })
        set({
          blocks: s.blocks.sub(def.cost),
          purchasedClickUpgrades,
          clickValue,
        })
      },

      purchaseCensor: (id, count) => {
        const s = get()
        const def = CENSORS_BY_ID[id]
        if (!def) return
        const owned = s.censorCounts[id] ?? 0

        let n: number
        let totalCost: Decimal
        if (count === 'max') {
          const r = maxBuyCensor(s.blocks, def.baseCost, owned, CENSOR_COST_RATIO)
          n = r.count
          totalCost = r.totalCost
        } else {
          if (count <= 0) return
          n = count
          totalCost = geometricSeriesCost(def.baseCost, owned, n, CENSOR_COST_RATIO)
        }
        if (n <= 0) return
        if (s.blocks.lt(totalCost)) return

        const censorCounts = { ...s.censorCounts, [id]: owned + n }
        const cps = computeCps({ censorCounts })
        set({
          blocks: s.blocks.sub(totalCost),
          censorCounts,
          cps,
        })
      },

      dismissOfflineEarnings: () => {
        set({ offlineEarnings: null })
      },
      dismissAchievementToast: (id) => {
        set((s) => ({
          achievementToastQueue: s.achievementToastQueue.filter(
            (t) => t.id !== id,
          ),
        }))
      },

      clickEvent: () => {
        const s = get()
        const active = s.activeEvent
        if (!active) return
        const def = EVENTS_BY_ID[active.id]
        if (!def) return
        const now = Date.now()

        const result = resolveEffect(def.effect, {
          eventId: def.id,
          now,
          cps: s.cps,
          prestigeMult: s.prestigeMult,
        })

        const activeMultipliers = [
          ...s.activeMultipliers,
          ...(result.pushMultipliers ?? []),
        ]
        const clickBoosts = [
          ...s.clickBoosts,
          ...(result.pushClickBoosts ?? []),
        ]
        const blocksGain = result.addBlocks
        const newBlocks = blocksGain ? s.blocks.add(blocksGain) : s.blocks
        const newTotal = blocksGain
          ? s.totalBlocksEver.add(blocksGain)
          : s.totalBlocksEver

        const telegramLeakStreak =
          def.id === 'telegram-leak'
            ? s.telegramLeakStreak + 1
            : 0

        const newStars = s.prestigeStars + (result.prestigeStarsDelta ?? 0)
        const next: Partial<GameStore> = {
          activeEvent: null,
          nextEventSpawnAt: rollNextSpawnAt(now),
          activeMultipliers,
          clickBoosts,
          blocks: newBlocks,
          totalBlocksEver: newTotal,
          telegramLeakStreak,
          prestigeStars: newStars,
          prestigeMult:
            newStars === s.prestigeStars
              ? s.prestigeMult
              : computePrestigeMult(newStars),
        }
        set(next)
      },

      performPrestige: () => {
        const s = get()
        const gain = pendingStarGain(s.totalBlocksEver, s.prestigeStars)
        if (gain <= 0) return
        const newStars = projectedStars(s.totalBlocksEver)
        const now = Date.now()
        set({
          blocks: new Decimal(0),
          clickValue: new Decimal(1),
          cps: new Decimal(0),
          purchasedClickUpgrades: [],
          censorCounts: {},
          activeEvent: null,
          activeMultipliers: [],
          clickBoosts: [],
          nextEventSpawnAt: 0,
          prestigeStars: newStars,
          prestigeMult: computePrestigeMult(newStars),
          lastTick: now,
        })
      },

      devSpawnEvent: (id) => {
        const def = EVENTS_BY_ID[id]
        if (!def) return
        const now = Date.now()
        const pos = rollSpawnPosition()
        set({
          activeEvent: {
            id: def.id,
            spawnedAt: now,
            expiresAt: now + EVENT_LIFETIME_MS,
            x: pos.x,
            y: pos.y,
          },
        })
      },

      devSetBlocks: (raw) => {
        set({ blocks: new Decimal(raw) })
      },
      devSetCps: (raw) => {
        set({ cps: new Decimal(raw) })
      },

      applyServerSave: (incoming) => {
        set({
          ...incoming,
          // Session-scoped fields stay local — server save never carries them.
          activeEvent: null,
          activeMultipliers: [],
          clickBoosts: [],
          achievementToastQueue: [],
          offlineEarnings: null,
          nextEventSpawnAt: 0,
          lastTick: Date.now(),
        })
      },
    }),
    {
      name: PERSIST_STORAGE_KEY,
      version: CURRENT_SAVE_VERSION,
      storage: persistStorage,
      partialize: (s) => ({
        blocks: s.blocks,
        totalBlocksEver: s.totalBlocksEver,
        clickValue: s.clickValue,
        cps: s.cps,
        prestigeMult: s.prestigeMult,
        lastTick: s.lastTick,
        tickCount: s.tickCount,
        uptimeStartMs: s.uptimeStartMs,
        purchasedClickUpgrades: s.purchasedClickUpgrades,
        censorCounts: s.censorCounts,
        unlockedAchievements: s.unlockedAchievements,
        telegramLeakStreak: s.telegramLeakStreak,
        prestigeStars: s.prestigeStars,
      }),
      migrate: (persisted, fromVersion) => {
        let p = persisted as Partial<GameStore>
        if (fromVersion <= 1) {
          p = { ...p, purchasedClickUpgrades: [], censorCounts: {} }
        }
        if (fromVersion <= 2) {
          p = {
            ...p,
            unlockedAchievements: [],
            telegramLeakStreak: 0,
            prestigeStars: 0,
          }
        }
        if (fromVersion > CURRENT_SAVE_VERSION) {
          console.warn(
            `[save] dropping save from future version ${String(fromVersion)} (current: ${String(CURRENT_SAVE_VERSION)})`,
          )
          return { ...initialState() } as unknown as Partial<GameStore>
        }
        return p
      },
      onRehydrateStorage: () => (_state, err) => {
        if (err) {
          console.error('[save] rehydrate failed, starting fresh:', err)
        }
        // Defer to a microtask — persist may fire rehydrate before the
        // useGameStore const binding finishes initializing (TDZ).
        queueMicrotask(() => {
          const s = useGameStore.getState()
          const clickValue = computeClickValue(s)
          const cps = computeCps(s)
          const prestigeMult = computePrestigeMult(s.prestigeStars)

          const now = Date.now()
          const gains = computeOfflineGains(s.lastTick, now, cps, prestigeMult)
          const shouldShowModal =
            gains.durationMs >= OFFLINE_MODAL_THRESHOLD_MS &&
            gains.earned.gt(0)

          useGameStore.setState({
            clickValue,
            cps,
            prestigeMult,
            blocks: s.blocks.add(gains.earned),
            totalBlocksEver: s.totalBlocksEver.add(gains.earned),
            lastTick: now,
            offlineEarnings: shouldShowModal ? gains : null,
            hydrated: true,
          })
        })
      },
    },
  ),
)

if (typeof window !== 'undefined') {
  ;(window as unknown as { useGameStore: typeof useGameStore }).useGameStore =
    useGameStore
}
