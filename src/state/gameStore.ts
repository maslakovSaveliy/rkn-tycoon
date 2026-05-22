import Decimal from 'break_infinity.js'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ACHIEVEMENTS } from '@/data/achievements'
import { CENSORS, CENSOR_COST_RATIO, CENSORS_BY_ID } from '@/data/censors'
import { CLICK_UPGRADES_BY_ID } from '@/data/clickUpgrades'
import { EVENTS_BY_ID, pickRandomEvent, resolveEffect } from '@/data/events'
import { applyClick, applyTick, findNewlyUnlocked } from '@/engine'
import { migrateState } from '@/engine/migrations'
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
import { enqueueEvent } from './eventsClient'
import { PERSIST_STORAGE_KEY, persistStorage } from './persistStorage'

const MILESTONES: { id: string; threshold: Decimal }[] = [
  { id: '1k', threshold: new Decimal(1_000) },
  { id: '1m', threshold: new Decimal(1_000_000) },
  { id: '1b', threshold: new Decimal(1_000_000_000) },
  { id: '1t', threshold: new Decimal(1_000_000_000_000) },
]

function emitMilestonesOnce(before: Decimal, after: Decimal, alreadyHit: Set<string>) {
  for (const m of MILESTONES) {
    if (alreadyHit.has(m.id)) continue
    if (before.lt(m.threshold) && after.gte(m.threshold)) {
      alreadyHit.add(m.id)
      enqueueEvent('game.click_milestone', { milestone: m.id })
    }
  }
}

const milestoneHits = new Set<string>()

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
          const before = s.totalBlocksEver
          let next = applyTick(s, dtMs, now)
          emitMilestonesOnce(before, next.totalBlocksEver, milestoneHits)

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
          const before = s.totalBlocksEver
          const next = applyClick(s, now)
          emitMilestonesOnce(before, next.totalBlocksEver, milestoneHits)
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
        enqueueEvent('game.upgrade_purchased', { id })
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
        enqueueEvent('game.censor_purchased', { id, count: n })
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

        // Preserve array identity when nothing is pushed — Zustand uses
        // reference equality for selectors, and the BoostsPanel subscribes
        // to both arrays. Allocating new arrays on every event click would
        // re-render the panel even for events that don't grant boosts.
        const pushedMults = result.pushMultipliers ?? []
        const pushedBoosts = result.pushClickBoosts ?? []
        const activeMultipliers =
          pushedMults.length === 0
            ? s.activeMultipliers
            : [...s.activeMultipliers, ...pushedMults]
        const clickBoosts =
          pushedBoosts.length === 0
            ? s.clickBoosts
            : [...s.clickBoosts, ...pushedBoosts]
        const blocksGain = result.addBlocks
        const newBlocks = blocksGain ? s.blocks.add(blocksGain) : s.blocks
        const newTotal = blocksGain
          ? s.totalBlocksEver.add(blocksGain)
          : s.totalBlocksEver

        // The streak tracks consecutive telegram-leak events resolved by click.
        // A non-TG click is neutral — it neither extends nor breaks the streak.
        // The only reset is on TG-leak expiry without a click, handled in the
        // tick path above.
        const telegramLeakStreak =
          def.id === 'telegram-leak'
            ? s.telegramLeakStreak + 1
            : s.telegramLeakStreak

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
        enqueueEvent('game.event_clicked', { id: def.id })
      },

      performPrestige: () => {
        const s = get()
        const gain = pendingStarGain(s.totalBlocksEver, s.prestigeStars)
        if (gain <= 0) return
        const newStars = projectedStars(s.totalBlocksEver)
        const now = Date.now()
        enqueueEvent('game.prestige_done', { gainedStars: gain, totalStars: newStars })
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
        // Preserve incoming.persistedAt — without it cross-device offline
        // catch-up is impossible: device B would think the save was just made
        // even when device A's last persist was hours ago. Clamp against
        // future-dated values (skewed device clock).
        const now = Date.now()
        const incomingPersistedAt =
          typeof (incoming as { persistedAt?: number }).persistedAt === 'number'
            ? (incoming as { persistedAt: number }).persistedAt
            : now
        const clampedPersistedAt = Math.min(now, incomingPersistedAt)
        set({
          ...incoming,
          // Session-scoped fields stay local — server save never carries them.
          activeEvent: null,
          activeMultipliers: [],
          clickBoosts: [],
          achievementToastQueue: [],
          offlineEarnings: null,
          nextEventSpawnAt: 0,
          lastTick: now,
          persistedAt: clampedPersistedAt,
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
        persistedAt: s.persistedAt,
        tickCount: s.tickCount,
        uptimeStartMs: s.uptimeStartMs,
        playtimeSeconds: s.playtimeSeconds,
        purchasedClickUpgrades: s.purchasedClickUpgrades,
        censorCounts: s.censorCounts,
        unlockedAchievements: s.unlockedAchievements,
        telegramLeakStreak: s.telegramLeakStreak,
        prestigeStars: s.prestigeStars,
      }),
      migrate: (persisted, fromVersion) => {
        if (fromVersion > CURRENT_SAVE_VERSION) {
          console.warn(
            `[save] dropping save from future version ${String(fromVersion)} (current: ${String(CURRENT_SAVE_VERSION)})`,
          )
          return { ...initialState() } as unknown as Partial<GameStore>
        }
        // Delegate to the single migration ladder in engine/migrations.ts so
        // codec-rehydrate and persist-rehydrate can't drift apart on future
        // schema bumps. fromVersion is 1-indexed; ladder patches v1→v2, v2→v3, etc.
        const { state } = migrateState(persisted, fromVersion)
        return state as unknown as Partial<GameStore>
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
          // Offline-progress is measured against the timestamp at which the
          // save was actually written to storage (persistedAt), not the last
          // in-session tick. Clamp future-dated persistedAt against `now` so
          // a skewed device clock can't grant infinite gains.
          const persistedAt = Math.min(now, s.persistedAt || s.lastTick)
          const gains = computeOfflineGains(persistedAt, now, cps, prestigeMult)
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
