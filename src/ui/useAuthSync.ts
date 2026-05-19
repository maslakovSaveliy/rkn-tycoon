'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from '@/lib/authClient'
import { useGameStore } from '@/state/gameStore'
import { fetchServerSave, pushServerSave } from '@/state/serverSync'
import type { GameState } from '@/types/save'
import { CURRENT_SAVE_VERSION } from '@/types/save'

const PUSH_THROTTLE_MS = 30_000

/**
 * Two-tier sync between localStorage save and Supabase Save row.
 *
 * Conflict resolution rule:
 *   Local is "newer" only if it actually contains progress. A freshly-
 *   hydrated empty store has lastTick = Date.now() but that timestamp
 *   doesn't represent a save — it's just the moment the page loaded.
 *   Comparing it against the server's real updatedAt would always make
 *   the empty local win, clobbering real saves on every other device.
 */
export function useAuthSync(): void {
  const { data: session, isPending } = useSession()
  const hydrated = useGameStore((s) => s.hydrated)
  const applyServerSave = useGameStore((s) => s.applyServerSave)

  const [synced, setSynced] = useState(false)
  const lastUserIdRef = useRef<string | null>(null)
  const lastPushAtRef = useRef(0)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initial merge.
  useEffect(() => {
    if (isPending || !hydrated) return
    if (!session) {
      lastUserIdRef.current = null
      setSynced(false)
      return
    }
    const userId = session.user.id
    if (lastUserIdRef.current === userId) return
    lastUserIdRef.current = userId
    setSynced(false)

    void (async () => {
      try {
        const remote = await fetchServerSave()
        const local = useGameStore.getState()
        const localHasProgress = hasProgress(local)

        if (remote && (!localHasProgress || remote.updatedAt > local.lastTick)) {
          applyServerSave(remote.state)
        } else if (localHasProgress) {
          await pushServerSave({
            state: snapshotPersistable(local),
            version: CURRENT_SAVE_VERSION,
            updatedAt: local.lastTick,
          })
        }
      } finally {
        setSynced(true)
      }
    })()
  }, [session, isPending, hydrated, applyServerSave])

  // Throttled push — runs only after initial merge finished.
  useEffect(() => {
    if (!synced || !session || !hydrated) return

    const pushNow = () => {
      const snap = useGameStore.getState()
      if (!hasProgress(snap)) return
      lastPushAtRef.current = Date.now()
      void pushServerSave({
        state: snapshotPersistable(snap),
        version: CURRENT_SAVE_VERSION,
        updatedAt: Date.now(),
      })
    }

    const schedule = () => {
      if (pushTimerRef.current) return
      const elapsed = Date.now() - lastPushAtRef.current
      const delay = Math.max(0, PUSH_THROTTLE_MS - elapsed)
      pushTimerRef.current = setTimeout(() => {
        pushTimerRef.current = null
        pushNow()
      }, delay)
    }

    const unsubscribe = useGameStore.subscribe(schedule)

    const flush = () => {
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current)
        pushTimerRef.current = null
      }
      pushNow()
    }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('beforeunload', flush)

    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('beforeunload', flush)
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current)
        pushTimerRef.current = null
      }
    }
  }, [synced, session, hydrated])
}

function hasProgress(s: GameState): boolean {
  return (
    s.totalBlocksEver.gt(0) ||
    s.purchasedClickUpgrades.length > 0 ||
    Object.values(s.censorCounts).some((n) => n > 0) ||
    s.prestigeStars > 0
  )
}

function snapshotPersistable(s: ReturnType<typeof useGameStore.getState>): GameState {
  return {
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
    offlineEarnings: null,
    unlockedAchievements: s.unlockedAchievements,
    achievementToastQueue: [],
    telegramLeakStreak: s.telegramLeakStreak,
    prestigeStars: s.prestigeStars,
    activeMultipliers: [],
    clickBoosts: [],
    activeEvent: null,
    nextEventSpawnAt: 0,
  }
}
